# BRONCI ASR test (`bronci-test.mjs`)

A standalone check of Taiwan Mobile's BRONCI ASR API (spec V3.22): log in, stream one WAV, read back the
stored result, and (optionally) test writing a corrected caption back. It does not touch the app
(`lib/`, `api/`, `public/`); its functions (`login`, `getTicket`, `streamFile`, `getSubtitle`, `putEdited`,
`deleteEdited`) are meant to move into `lib/asr.js` later.

## Run

```
npm install
node --env-file=.env scripts/bronci-test.mjs path/to/file.wav [--edit-test]
```

`.env`:

| Variable | |
| --- | --- |
| `ASR_BASE_URL` | `https://asrapi.bronci.ai/gateway` (prod) or `https://172.27.41.176/gateway` (test) |
| `ASR_USERNAME`, `ASR_PASSWORD` | the account (the password is never printed; tokens are shown as the first 6 chars) |
| `ASR_MODEL` | optional; empty = the server's default model |
| `ASR_INSECURE=1` | optional; turns TLS checks off. Only accepted for private IPs (10.x, 172.16–31.x, 192.168.x) and prints a loud warning. Prefer `NODE_EXTRA_CA_CERTS=path/to/company-ca.pem` |

The WAV must be PCM, 16000 Hz, mono, 16-bit (the app's recorder already makes this). Otherwise the script stops and prints:
`ffmpeg -i input.xxx -ar 16000 -ac 1 -sample_fmt s16 output.wav`

## Steps

- **[wav]** checks the file header before anything goes over the network.
- **[0] health**: is the server up, how many ASR workers are free (0 free → expect code 486).
- **[1] login**: gets a bearer token. Never retried: repeated failures can lock the account (42213).
  42210 wrong user/password · 42211 disabled · 42212 expired · 42213 temporarily locked.
- **[2] ticket**: a one-time stream ticket (~30 s) + the WebSocket URL. Warns if that URL's host is
  loopback or differs from `ASR_BASE_URL`; a commented-out `REWRITE` line in `main()` can swap the host.
- **[3] stream**: waits for code 180 (ready), sends the WAV in 64 KB frames, then `EOS`. Every status code is
  printed with its meaning. A changing sentence updates on one line (`…`); a locked one gets its own line (`✓`).
  Gives up after 120 s.
- **[4] results**: (a) task status, (b) the stored subtitle JSON, saved to `scripts/out/<taskId>-original.json`,
  (c) the streaming record, which says **which model** was used.
- **[5] edit-test** (`--edit-test` only): appends ` [edit-test]` to the first caption, `PUT`s it as the
  "edited" version, reads it back, then `DELETE`s the edit so the task returns to the original. This is the
  path we would use to send a friend's corrected caption back to BRONCI.

Steps 4a/4b/4c use endpoints not in the PDF, so their raw JSON is printed; the script searches the response for
the fields it needs and says so if the shape differs.

`scripts/*.wav` and `scripts/out/` are git-ignored.
