// Standalone test for Taiwan Mobile's BRONCI ASR API (spec V3.22). Touches no app code.
//
//   node --env-file=.env scripts/bronci-test.mjs path/to/file.wav [--edit-test]
//
// .env: ASR_BASE_URL, ASR_USERNAME, ASR_PASSWORD, ASR_MODEL (optional), ASR_INSECURE=1 (optional, private IPs only).
// Prefer NODE_EXTRA_CA_CERTS=path/to/company-ca.pem over ASR_INSECURE for the test environment.
// See scripts/README-bronci.md. The functions below (login, getTicket, streamFile, getSubtitle, putEdited,
// deleteEdited) are written so they can later move into lib/asr.js.

import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { isIP } from "node:net";
import WebSocket from "ws";

const HTTP_TIMEOUT_MS = 30_000;
const STREAM_TIMEOUT_MS = 120_000;
const CHUNK_BYTES = 64 * 1024; // each frame must stay < 384 KB
const CHUNK_DELAY_MS = 20;
const OUT_DIR = join(import.meta.dirname, "out");

const WS_CODES = {
  100: "preparing",
  180: "ready (start sending audio)",
  200: "transcript update",
  202: "no text recognised from the audio",
  204: "all audio processed (done)",
  408: "idle timeout",
  415: "unsupported type / sample rate / channels",
  440: "no audio received in time",
  486: "no free ASR worker (server full, try later)",
  500: "ASR error",
  502: "cannot reach ASR",
  503: "ASR fault",
  599: "unknown error",
};

const LOGIN_ERRORS = {
  42210: "wrong username or password",
  42211: "account is disabled",
  42212: "account has expired",
  42213: "account is temporarily locked (too many failed logins), wait before trying again",
};

// ---------- small helpers ----------

const mask = (s) => (s ? `${String(s).slice(0, 6)}…` : "(none)");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ok = (step, msg = "") => console.log(`[${step}] OK   ${msg}`);
const fail = (step, msg = "") => console.log(`[${step}] FAIL ${msg}`);
const pretty = (v) => JSON.stringify(v, null, 2);

function die(step, msg) {
  fail(step, msg);
  process.exit(1);
}

function isPrivateHost(host) {
  if (isIP(host) !== 4) return false;
  const [a, b] = host.split(".").map(Number);
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

function config() {
  const args = process.argv.slice(2);
  const wavPath = args.find((a) => !a.startsWith("--"));
  const editTest = args.includes("--edit-test");
  if (!wavPath) {
    console.log("Usage: node --env-file=.env scripts/bronci-test.mjs path/to/file.wav [--edit-test]");
    process.exit(1);
  }
  const base = (process.env.ASR_BASE_URL || "").replace(/\/+$/, "");
  const username = process.env.ASR_USERNAME;
  const password = process.env.ASR_PASSWORD;
  const missing = [!base && "ASR_BASE_URL", !username && "ASR_USERNAME", !password && "ASR_PASSWORD"].filter(Boolean);
  if (missing.length) die("config", `missing in .env: ${missing.join(", ")}`);
  let baseHost;
  try {
    baseHost = new URL(base).hostname;
  } catch {
    die("config", `ASR_BASE_URL is not a valid URL: ${base}`);
  }
  const insecure = process.env.ASR_INSECURE === "1";
  if (insecure) {
    if (!isPrivateHost(baseHost)) {
      die("config", `ASR_INSECURE=1 is only allowed for private IPs (10.x, 172.16-31.x, 192.168.x), not "${baseHost}". Use NODE_EXTRA_CA_CERTS instead.`);
    }
    console.log("!".repeat(72));
    console.log("!!  WARNING: ASR_INSECURE=1 — TLS certificate checks are OFF for this run.");
    console.log("!!  Anyone on the network path could read the password and audio.");
    console.log("!!  Test environment only. Prefer NODE_EXTRA_CA_CERTS=path/to/company-ca.pem.");
    console.log("!".repeat(72));
    // Global for Node's fetch (no per-request TLS option without undici); ws also gets rejectUnauthorized:false.
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  }
  return { wavPath, editTest, base, baseHost, username, password, model: process.env.ASR_MODEL || "", insecure };
}

async function api(cfg, method, path, { token, body } = {}) {
  const headers = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(cfg.base + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, json, text };
}

const describeHttp = (r) => `HTTP ${r.status}, body: ${r.json ? JSON.stringify(r.json) : r.text.slice(0, 300) || "(empty)"}`;
const isOk = (r) => r.status >= 200 && r.status < 300 && r.json && Number(r.json.code) === 200;

// ---------- WAV check ----------

function checkWav(path) {
  let buf;
  try {
    buf = readFileSync(path);
  } catch (e) {
    return { error: `cannot read file: ${e.message}` };
  }
  if (buf.length < 44 || buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") {
    return { error: "not a RIFF/WAVE file" };
  }
  let fmt = null;
  let dataBytes = 0;
  for (let p = 12; p + 8 <= buf.length; ) {
    const id = buf.toString("ascii", p, p + 4);
    const size = buf.readUInt32LE(p + 4);
    if (id === "fmt ") {
      let format = buf.readUInt16LE(p + 8);
      // WAVE_FORMAT_EXTENSIBLE: the real format is the first 2 bytes of the sub-format GUID.
      if (format === 0xfffe && size >= 40) format = buf.readUInt16LE(p + 8 + 24);
      fmt = {
        format,
        channels: buf.readUInt16LE(p + 10),
        rate: buf.readUInt32LE(p + 12),
        bits: buf.readUInt16LE(p + 22),
      };
    } else if (id === "data") {
      dataBytes = Math.min(size, buf.length - p - 8);
    }
    p += 8 + size + (size % 2);
  }
  if (!fmt) return { error: "no fmt chunk found" };
  const problems = [];
  if (fmt.format !== 1) problems.push(`format ${fmt.format} (need 1 = PCM)`);
  if (fmt.rate !== 16000) problems.push(`${fmt.rate} Hz (need 16000)`);
  if (fmt.channels !== 1) problems.push(`${fmt.channels} channels (need mono)`);
  if (fmt.bits !== 16) problems.push(`${fmt.bits}-bit (need 16-bit)`);
  if (!dataBytes) problems.push("no audio data");
  const seconds = dataBytes / (fmt.rate * fmt.channels * (fmt.bits / 8) || 1);
  return { buf, fmt, seconds, problems };
}

// ---------- API steps ----------

async function health(cfg) {
  const r = await api(cfg, "GET", "/api/v1/health");
  const d = Array.isArray(r.json?.data) ? r.json.data[0] : null;
  return { ok: isOk(r) && !!d, data: d, r };
}

async function login(cfg) {
  const r = await api(cfg, "POST", "/api/v1/login", {
    body: { username: cfg.username, password: cfg.password, rememberMe: 0 },
  });
  if (isOk(r) && r.json.token) return { token: r.json.token, expiration: r.json.expiration, pwdExpired: r.json.pwdExpired };
  const code = r.json?.code;
  const why = LOGIN_ERRORS[code] || `unexpected response (${describeHttp(r)})`;
  return { error: `code ${code ?? "?"}: ${why}` };
}

async function getTicket(cfg, token) {
  const r = await api(cfg, "GET", "/api/v1/streaming/transcript/access-info", { token });
  if (r.json?.code === 202) return { error: "code 202: empty data (no streaming access for this account?)" };
  const d = Array.isArray(r.json?.data) ? r.json.data[0] : null;
  if (!isOk(r) || !d?.url || !d?.ticket) return { error: describeHttp(r) };
  return { url: d.url, ticket: d.ticket };
}

function buildWsUrl(cfg, url, ticket, audioFilename) {
  const params = new URLSearchParams({
    ticket,
    type: "file",
    rate: "16000",
    saveResult: "1",
    enableTransient: "1",
    audioFilename,
    title: "bronci-test",
  });
  if (cfg.model) params.set("modelName", cfg.model);
  // URLSearchParams encodes like encodeURIComponent except spaces (+); fine for a ticket.
  return `${url}${url.includes("?") ? "&" : "?"}${params}`;
}

// Streams a WAV file and resolves with {taskId, segments, endReceived, statuses, error}.
function streamFile(cfg, wsUrl, wavBuf, log = console.log) {
  return new Promise((resolve) => {
    const state = { taskId: null, segments: new Map(), endReceived: false, statuses: [], error: null };
    let sending = false;
    let liveLine = false;
    let settled = false;

    const clearLive = () => {
      if (liveLine) process.stdout.write("\r\x1b[2K");
      liveLine = false;
    };
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearLive();
      resolve(state);
    };

    const ws = new WebSocket(wsUrl, { rejectUnauthorized: !cfg.insecure, handshakeTimeout: 15_000 });
    const timer = setTimeout(() => {
      state.error = `overall timeout after ${STREAM_TIMEOUT_MS / 1000} s`;
      clearLive();
      log(`    ${state.error}, closing`);
      ws.terminate();
      finish();
    }, STREAM_TIMEOUT_MS);

    async function sendAudio() {
      if (sending) return;
      sending = true;
      let frames = 0;
      for (let i = 0; i < wavBuf.length; i += CHUNK_BYTES) {
        if (ws.readyState !== WebSocket.OPEN) return;
        ws.send(wavBuf.subarray(i, i + CHUNK_BYTES), { binary: true });
        frames++;
        await sleep(CHUNK_DELAY_MS);
      }
      if (ws.readyState !== WebSocket.OPEN) return;
      ws.send("EOS");
      clearLive();
      log(`    sent ${wavBuf.length} bytes in ${frames} frames + "EOS"`);
    }

    ws.on("open", () => log("    connected, waiting for 180 (ready)…"));
    ws.on("unexpected-response", (_req, res) => {
      state.error = `handshake rejected: HTTP ${res.statusCode}`;
      log(`    ${state.error}`);
      finish();
    });
    ws.on("error", (e) => {
      state.error = state.error || `websocket error: ${e.message}`;
      clearLive();
      log(`    ${state.error}`);
      finish();
    });
    ws.on("close", (code, reason) => {
      clearLive();
      log(`    socket closed (${code}${reason?.length ? `, ${reason}` : ""})`);
      finish();
    });

    ws.on("message", (data, isBinary) => {
      if (isBinary) return log(`    (binary message, ${data.length} bytes, ignored)`);
      let m;
      try {
        m = JSON.parse(data.toString());
      } catch {
        clearLive();
        return log(`    (non-JSON message) ${data.toString().slice(0, 200)}`);
      }
      const code = Number(m.code);
      if (m.taskId && !state.taskId) state.taskId = m.taskId;

      if (code === 200 && Array.isArray(m.result)) {
        for (const r of m.result) {
          state.segments.set(Number(r.segment), { text: r.transcript ?? "", final: Number(r.final) === 1 });
          if (Number(r.final) === 1) {
            clearLive();
            log(`    #${r.segment} ✓ ${r.transcript}`);
          } else {
            process.stdout.write(`\r\x1b[2K    #${r.segment} … ${r.transcript}`);
            liveLine = true;
          }
        }
        if (Number(m.end) === 1) {
          state.endReceived = true;
          clearLive();
          log("    end:1 received, server will close");
        }
        return;
      }

      // Status / error message.
      state.statuses.push(code);
      clearLive();
      const meaning = WS_CODES[code] || "unlisted code";
      const extra = [m.message, m.explanation, m.taskId && `taskId=${m.taskId}`].filter(Boolean).join(" | ");
      log(`    code ${code}: ${meaning}${extra ? ` — ${extra}` : ""}`);
      if (code === 180) sendAudio().catch((e) => log(`    send failed: ${e.message}`));
      if (code >= 400) state.error = `server code ${code}: ${meaning}`;
      if (Number(m.end) === 1) state.endReceived = true;
    });
  });
}

// The subtitle-json shape is not in the PDF, so look for the first array of objects with a "text" field.
function findSubtitle(json) {
  const seen = new Set();
  const walk = (v, path) => {
    if (!v || typeof v !== "object" || seen.has(v)) return null;
    seen.add(v);
    if (Array.isArray(v) && v.length && v.every((x) => x && typeof x === "object" && "text" in x)) return { arr: v, path };
    for (const [k, child] of Object.entries(v)) {
      const hit = walk(child, `${path}.${k}`);
      if (hit) return hit;
    }
    return null;
  };
  return walk(json, "$");
}

function findSpeakers(json) {
  const seen = new Set();
  const walk = (v) => {
    if (!v || typeof v !== "object" || seen.has(v)) return null;
    seen.add(v);
    if (!Array.isArray(v) && Array.isArray(v.speakers)) return v.speakers;
    for (const child of Object.values(v)) {
      const hit = walk(child);
      if (hit) return hit;
    }
    return null;
  };
  return walk(json);
}

async function getSubtitle(cfg, token, taskId) {
  const r = await api(cfg, "GET", `/api/v1/subtitle/tasks/${encodeURIComponent(taskId)}/subtitle-json`, { token });
  return { r, ok: isOk(r) || (r.status === 200 && r.json && r.json.code === undefined), found: r.json ? findSubtitle(r.json) : null };
}

// "HH:MM:SS.mmm"; numbers are taken as seconds unless they look like milliseconds.
function toTimestamp(v, numbersAreMs) {
  if (typeof v === "string") return v;
  const ms = Math.round(numbersAreMs ? Number(v) : Number(v) * 1000) || 0;
  const pad = (n, w = 2) => String(n).padStart(w, "0");
  return `${pad(Math.floor(ms / 3_600_000))}:${pad(Math.floor(ms / 60_000) % 60)}:${pad(Math.floor(ms / 1000) % 60)}.${pad(ms % 1000, 3)}`;
}

function buildEditedBody(items, speakersIn) {
  const nums = items.flatMap((s) => [s.startTime, s.endTime, s.start, s.end]).filter((x) => typeof x === "number");
  const numbersAreMs = nums.length > 0 && Math.max(...nums) > 36_000; // > 10 h in seconds is implausible
  const subtitle = items.map((s, i) => ({
    id: s.id ?? i,
    speaker: s.speaker ?? s.speakerId ?? 0,
    startTime: toTimestamp(s.startTime ?? s.start ?? 0, numbersAreMs),
    endTime: toTimestamp(s.endTime ?? s.end ?? 0, numbersAreMs),
    text: s.text ?? "",
  }));
  const speakers = Array.isArray(speakersIn) && speakersIn.length
    ? speakersIn.map((sp, i) => ({ id: sp.id ?? i, speaker: sp.speaker ?? sp.name ?? `speaker_${i + 1}`, color: sp.color ?? "#3f8cbf" }))
    : [{ id: 0, speaker: "speaker_1", color: "#3f8cbf" }];
  return { body: { category: "dia", type: "edited", subtitle, speakers }, numbersAreMs };
}

async function putEdited(cfg, token, taskId, body) {
  return api(cfg, "PUT", `/api/v1/subtitle/tasks/${encodeURIComponent(taskId)}/subtitle-json`, { token, body });
}

async function deleteEdited(cfg, token, taskId) {
  return api(cfg, "DELETE", `/api/v1/subtitle/tasks/${encodeURIComponent(taskId)}/subtitle-json?type=edited`, { token });
}

async function getTask(cfg, token, taskId) {
  return api(cfg, "GET", `/api/v1/subtitle/tasks/${encodeURIComponent(taskId)}`, { token });
}

// Pull a field from the response wherever it sits (top level, data, data[0], data.list[0]…).
function pick(json, key) {
  const seen = new Set();
  const walk = (v) => {
    if (!v || typeof v !== "object" || seen.has(v)) return undefined;
    seen.add(v);
    if (!Array.isArray(v) && key in v) return v[key];
    for (const child of Object.values(v)) {
      const hit = walk(child);
      if (hit !== undefined) return hit;
    }
    return undefined;
  };
  return walk(json);
}

// ---------- main ----------

async function main() {
  const cfg = config();
  const summary = { taskId: null, transcript: "", model: null, editTest: cfg.editTest ? "not run" : "skipped (no --edit-test)" };

  console.log(`BRONCI ASR test → ${cfg.base}`);
  console.log(`user ${cfg.username}, password ${"*".repeat(8)}, model ${cfg.model || "(server default)"}\n`);

  // WAV check first: no point logging in for a file the server will refuse.
  const wav = checkWav(cfg.wavPath);
  if (wav.error) die("wav", `${cfg.wavPath}: ${wav.error}`);
  if (wav.problems.length) {
    fail("wav", `${cfg.wavPath}: ${wav.problems.join(", ")}`);
    console.log("      Convert it with:\n      ffmpeg -i input.xxx -ar 16000 -ac 1 -sample_fmt s16 output.wav");
    process.exit(1);
  }
  ok("wav", `${basename(cfg.wavPath)}: PCM 16000 Hz mono 16-bit, ${wav.seconds.toFixed(1)} s, ${wav.buf.length} bytes`);

  // [0] health
  try {
    const h = await health(cfg);
    if (h.ok) ok(0, `health: availableWorkers=${h.data.availableWorkers}/${h.data.totalWorkers}, status=${h.data.status} (${h.data.statusDesc ?? ""})`);
    else fail(0, `health: ${describeHttp(h.r)}`);
    if (h.ok && Number(h.data.availableWorkers) === 0) console.log("      note: no free workers right now; streaming may get 486");
  } catch (e) {
    die(0, `health: ${e.message}${e.cause ? ` (${e.cause.code || e.cause.message})` : ""} — check the URL / network / certificate`);
  }

  // [1] login (never retried: repeated failures can lock the account)
  let token;
  try {
    const l = await login(cfg);
    if (l.error) die(1, `login: ${l.error}. Not retrying (to avoid locking the account).`);
    token = l.token;
    ok(1, `login: token ${mask(token)}, expires in ${l.expiration ?? "?"} s`);
    if (l.pwdExpired) console.log("      WARNING: pwdExpired is set — the password needs changing soon.");
  } catch (e) {
    die(1, `login: ${e.message}`);
  }

  // [2] ticket (valid ~30 s, so fetched right before connecting)
  const t = await getTicket(cfg, token).catch((e) => ({ error: e.message }));
  if (t.error) die(2, `ticket: ${t.error}`);
  ok(2, `ticket ${mask(t.ticket)}, url ${t.url}`);
  let wsUrlBase = t.url;
  try {
    const wsHost = new URL(t.url).hostname;
    const local = ["localhost", "127.0.0.1", "::1"].includes(wsHost);
    if (local || wsHost !== cfg.baseHost) {
      const why = local ? "is a loopback address" : `differs from ASR_BASE_URL host "${cfg.baseHost}"`;
      console.log(`      WARNING: stream host "${wsHost}" ${why}; it may need rewriting. Trying it as-is.`);
      console.log("      If it fails, uncomment the host rewrite in main() (search for REWRITE).");
    }
    // REWRITE: point the stream at ASR_BASE_URL's host instead of the one the server returned.
    // { const u = new URL(t.url); u.hostname = cfg.baseHost; wsUrlBase = u.toString(); console.log(`      rewritten to ${wsUrlBase}`); }
    if (cfg.insecure && !isPrivateHost(new URL(wsUrlBase).hostname)) {
      die(3, `ASR_INSECURE=1 but the stream host "${new URL(wsUrlBase).hostname}" is not a private IP; refusing.`);
    }
  } catch {
    die(2, `ticket url is not a valid URL: ${t.url}`);
  }

  // [3] stream
  const audioFilename = `test-${Date.now()}.wav`;
  console.log(`[3] ...  streaming as ${audioFilename}`);
  const s = await streamFile(cfg, buildWsUrl(cfg, wsUrlBase, t.ticket, audioFilename), wav.buf);
  summary.taskId = s.taskId;
  summary.transcript = [...s.segments.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v.text).join(" ").trim();
  const done = s.statuses.includes(204) || s.endReceived;
  if (!s.error && done) ok(3, `stream: taskId=${s.taskId ?? "(none)"}, ${s.segments.size} segment(s)`);
  else fail(3, `stream: ${s.error || "ended without 204 / end:1"}; taskId=${s.taskId ?? "(none)"}`);

  // [4] results stored on the server
  let original = null;
  if (!s.taskId) {
    fail(4, "no taskId (code 100 never carried one), skipping result lookups");
  } else {
    const task = await getTask(cfg, token, s.taskId).catch((e) => ({ status: 0, json: null, text: e.message }));
    if (task.json) ok("4a", `task: subtitleStatus=${pick(task.json, "subtitleStatus")}, lastEditTime=${pick(task.json, "lastEditTime")}`);
    else fail("4a", `task: ${describeHttp(task)}`);
    if (task.json) console.log(pretty(task.json).replace(/^/gm, "      "));

    const sub = await getSubtitle(cfg, token, s.taskId).catch((e) => ({ r: { status: 0, json: null, text: e.message } }));
    if (sub.r.json) {
      mkdirSync(OUT_DIR, { recursive: true });
      const file = join(OUT_DIR, `${s.taskId}-original.json`);
      writeFileSync(file, pretty(sub.r.json));
      ok("4b", `subtitle-json saved to ${file}`);
      console.log(pretty(sub.r.json).replace(/^/gm, "      "));
      if (sub.found) console.log(`      subtitle array found at ${sub.found.path} (${sub.found.arr.length} item(s))`);
      else console.log("      NOTE: no array of {text…} items found in this response — shape differs from what we expected.");
      original = sub;
    } else {
      fail("4b", `subtitle-json: ${describeHttp(sub.r)}`);
    }

    const rec = await api(cfg, "GET", `/api/v1/subtitle/tasks/streaming-record?pageIndex=0&pageSize=1&id=${encodeURIComponent(s.taskId)}`, { token }).catch(
      (e) => ({ status: 0, json: null, text: e.message }),
    );
    if (rec.json) {
      const f = (k) => pick(rec.json, k);
      summary.model = [f("modelDisplayName"), f("modelName") && `(${f("modelName")} ${f("modelVersion") ?? ""})`.replace(" )", ")")].filter(Boolean).join(" ") || null;
      ok("4c", `record: modelName=${f("modelName")}, modelVersion=${f("modelVersion")}, modelDisplayName=${f("modelDisplayName")}, audioLength=${f("audioLength")}, wordCount=${f("wordCount")}`);
      if (f("modelName") === undefined) console.log(pretty(rec.json).replace(/^/gm, "      "));
    } else {
      fail("4c", `streaming-record: ${describeHttp(rec)}`);
    }
  }

  // [5] correction write-back
  if (cfg.editTest) {
    summary.editTest = await editTest(cfg, token, s.taskId, original);
  }

  console.log("\n===== summary =====");
  console.log(`taskId:     ${summary.taskId ?? "(none)"}`);
  console.log(`transcript: ${summary.transcript || "(empty)"}`);
  console.log(`model:      ${summary.model ?? "(unknown)"}`);
  console.log(`edit-test:  ${summary.editTest}`);
}

async function editTest(cfg, token, taskId, original) {
  if (!taskId) return (fail(5, "no taskId"), "FAIL (no taskId)");
  if (!original?.found) return (fail(5, "no subtitle array from 4b to edit"), "FAIL (no subtitle array)");
  const MARK = " [edit-test]";
  const items = original.found.arr.map((x) => ({ ...x }));
  items[0].text = `${items[0].text ?? ""}${MARK}`;
  const speakersIn = findSpeakers(original.r.json);
  const { body, numbersAreMs } = buildEditedBody(items, speakersIn);
  console.log(`[5] ...  speakers ${speakersIn?.length ? "reused from 4b" : "built (none in 4b)"}; times ${typeof original.found.arr[0].startTime === "string" ? "kept as strings" : `converted from ${numbersAreMs ? "ms" : "seconds"}`}`);
  console.log(`      first item now: ${JSON.stringify(body.subtitle[0])}`);

  const put = await putEdited(cfg, token, taskId, body).catch((e) => ({ status: 0, json: null, text: e.message }));
  const putOk = isOk(put) && put.json.message === "updated";
  (putOk ? ok : fail)("5b", `PUT edited: ${describeHttp(put)}`);

  const after = await getSubtitle(cfg, token, taskId).catch(() => null);
  const seen = !!after?.found?.arr?.[0]?.text?.includes(MARK.trim());
  (seen ? ok : fail)("5c", `GET after PUT: ${seen ? "edit is there" : "edit NOT found"} (first text: ${JSON.stringify(after?.found?.arr?.[0]?.text)})`);
  if (!seen && after?.r?.json) console.log(pretty(after.r.json).replace(/^/gm, "      "));
  const task = await getTask(cfg, token, taskId).catch(() => null);
  if (task?.json) console.log(`      task: subtitleStatus=${pick(task.json, "subtitleStatus")}, lastEditTime=${pick(task.json, "lastEditTime")}`);

  // Always try to clean up, even if the PUT looked wrong.
  const del = await deleteEdited(cfg, token, taskId).catch((e) => ({ status: 0, json: null, text: e.message }));
  const delOk = isOk(del);
  (delOk ? ok : fail)("5d", `DELETE edited: ${describeHttp(del)}`);
  const reverted = await getSubtitle(cfg, token, taskId).catch(() => null);
  const clean = !!reverted?.found && !reverted.found.arr[0]?.text?.includes(MARK.trim());
  (clean ? ok : fail)("5d", `GET after DELETE: ${clean ? "back to original" : "edit still there or unreadable"} (first text: ${JSON.stringify(reverted?.found?.arr?.[0]?.text)})`);

  const passed = putOk && seen && delOk && clean;
  return passed ? "PASSED (write, read back, revert)" : `FAIL (put=${putOk}, readBack=${seen}, delete=${delOk}, reverted=${clean})`;
}

main().catch((e) => {
  console.error(`\nFATAL: ${e.stack || e.message}`);
  process.exit(1);
});
