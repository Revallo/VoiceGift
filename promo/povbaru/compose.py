# "povbaru" (the tumpeng reel), put together like promo/compose.py: the screen recording inside a phone, a soundtrack
# made here from scratch (bells, a chat "ting", an original music-box tune, the cut) + the friends' voices.
#   py promo/povbaru/compose.py   (needs numpy and ffmpeg; run povbaru/record.mjs and povbaru/overlays.mjs first)
# Out: promo/out/povbaru.mp4 (1080×1920, 30 fps, -14 LUFS, no caption, like pov-2) + one frame as .jpg
import json, math, os, re, subprocess, wave
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
B = os.path.join(HERE, 'build')
VOICES = os.path.join(HERE, '..', 'build', 'voices')  # shared with the cake video, read only
OUT = os.path.join(HERE, '..', 'out')
OV = os.path.join(B, 'overlays')
SR = 48000
FPS = 30
# the intro: black lock screen at 23:59, 00:00 at FLIP, the chat notification at NOTIF, tapped at NOTIF_TAP
FLIP, NOTIF, NOTIF_TAP, INTRO = 1.8, 2.7, 4.1, 4.4
TR = 0.55            # after the tap, the gift's page opens out of the notification card (INTRO → INTRO + TR)
CARD = (84, 900, 894, 1062)  # the notification card on the lock screen (overlays.mjs)
END = 3.6            # the closing card: the home page in a phone, "Link di bio"
PHONE = dict(x=180, y=350, w=720, h=1558)      # same as overlays.mjs
END_PHONE = dict(x=235, y=470, w=508, h=1100)  # the closing card's phone, same as overlays.mjs
SCALE = PHONE['w'] / 390                   # CSS px → video px
CAPTIONS = (2,)  # overlays.mjs CAPTIONS: none

data = json.load(open(os.path.join(HERE, '..', 'voices.json'), encoding='utf-8'))
tl = json.load(open(os.path.join(B, 'timeline.json'), encoding='utf-8'))
ev = tl['events']
taps = [e for e in ev if e['ev'] == 'tap']
lits = sorted({e['i']: e['s'] for e in ev if e['ev'] == 'lit'}.values())
cut = next(e for e in ev if e['ev'] == 'cut')
confetti = next(e for e in ev if e['ev'] == 'confetti')['s']
open_tap, blow_tap, voice_taps = taps[0], taps[-1], taps[1:-1]
voices = []  # (voice index, start in the recording, duration)
for k, t in zip(data['heard'], voice_taps):
    v = next(e for e in ev if e['ev'] == 'voice' and e['s'] >= t['s'] - 0.05)
    voices.append((k, v['s'], v['dur']))

# ---- the edit: (from, to, speed) in recording seconds ----
# Everything plays at its real speed; only the waits in between are cut.
def voice_len(k, d):
    m = mood_wav(k)
    return wave.open(m).getnframes() / SR if m else d


def mood_wav(k):
    m = os.path.join(B, 'voices', f'{k:02d}-mood.wav')
    return m if data['voices'][k].get('mood') and os.path.exists(m) else None


segs = [(open_tap['s'] - 1.2, lits[-1] + 1.3, 1.0)]            # the ready screen, the tap, 12 dishes served, "Happy birthday"
for (k, s, d), t in zip(voices, voice_taps):
    segs.append((t['s'] - 0.5, s + voice_len(k, d) + 0.35, 1.0))  # tap a dish, hear the whole voice (with its mood)
segs += [(blow_tap['s'] - 0.4, confetti + 1.9, 1.0)]           # "Cut the tumpeng", tap to cut, the dishes hop, confetti
SCREEN_LEN = sum((b - a) / sp for a, b, sp in segs)
T_END = INTRO + SCREEN_LEN
D = T_END + END


def at(r):
    """Recording seconds → video seconds (None if that moment was cut)."""
    t = INTRO
    for a, b, sp in segs:
        if a <= r <= b:
            return t + (r - a) / sp
        t += (b - a) / sp
    return None


print(f'video {D:.2f}s: intro {INTRO}, screen {SCREEN_LEN:.2f}, end card from {T_END:.2f}')

# ================= audio =================
N = int(D * SR) + SR
mix = np.zeros((2, N))
music = np.zeros((2, N))
rng = np.random.default_rng(7)


def add(buf, t, sig, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i >= N: return
    sig = sig[: N - i] * gain
    buf[0, i:i + len(sig)] += sig * math.sqrt((1 - pan) / 2)
    buf[1, i:i + len(sig)] += sig * math.sqrt((1 + pan) / 2)


def env(n, attack=0.004, decay=1.0):
    t = np.arange(n) / SR
    return np.minimum(1, t / attack) * np.exp(-t / decay)


def bell(f, dur=1.6, decay=0.55):
    """A soft bell: a few inharmonic partials, the high ones fading first."""
    n = int(dur * SR); t = np.arange(n) / SR
    s = (np.sin(2 * np.pi * f * t) * env(n, 0.003, decay)
         + 0.45 * np.sin(2 * np.pi * f * 2.76 * t) * env(n, 0.002, decay * 0.45)
         + 0.2 * np.sin(2 * np.pi * f * 5.4 * t) * env(n, 0.001, decay * 0.22))
    return s * np.minimum(1, (n - np.arange(n)) / (0.05 * SR))


def musicbox(f, dur=1.8):
    n = int(dur * SR); t = np.arange(n) / SR
    s = (np.sin(2 * np.pi * f * t) * env(n, 0.002, 0.8)
         + 0.3 * np.sin(2 * np.pi * 2 * f * t + 0.3) * env(n, 0.002, 0.35)
         + 0.1 * np.sin(2 * np.pi * 3.01 * f * t) * env(n, 0.001, 0.15))
    return s * np.minimum(1, (n - np.arange(n)) / (0.05 * SR))


def pad(f, dur):
    n = int(dur * SR); t = np.arange(n) / SR
    a = np.minimum(1, t / 0.25) * np.minimum(1, (dur - t) / 0.5)
    return a * (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 2 * f * t))


def noise(dur, lo, hi):
    n = int(dur * SR)
    spec = np.fft.rfft(rng.standard_normal(n))
    fr = np.fft.rfftfreq(n, 1 / SR)
    spec[(fr < lo) | (fr > hi)] = 0
    s = np.fft.irfft(spec, n)
    return s / (np.abs(s).max() + 1e-9)


def layer(*parts):
    """(offset seconds, signal) pairs → one signal."""
    out = np.zeros(max(int(o * SR) + len(x) for o, x in parts))
    for o, x in parts:
        out[int(o * SR):int(o * SR) + len(x)] += x
    return out


hz = lambda name: 440 * 2 ** ((('C C# D D# E F F# G G# A A# B'.split().index(name[:-1])) + 12 * (int(name[-1]) + 1) - 69) / 12)

# the clock: soft ticks up to midnight, then the chat "ting" when the notification lands, a tap on it
for t in (FLIP - 1.6, FLIP - 0.8, FLIP):
    add(mix, t, noise(0.03, 1500, 5000) * env(int(0.03 * SR), 0.001, 0.008), 0.25)
ting = layer((0, bell(hz('E6'), 0.9, 0.22)), (0.09, 0.6 * bell(hz('B6'), 0.8, 0.2)))
add(mix, NOTIF + 0.04, ting, 0.38)
# a soft whoosh as the page opens out of the notification
wh = noise(TR + 0.25, 500, 4000)
n = len(wh); tt = np.arange(n) / SR
add(mix, INTRO - 0.1, wh * np.sin(np.pi * np.clip(tt / (TR + 0.25), 0, 1)) ** 2, 0.08)

# the app's welcome when the gift opens, then a bell per dish served, a little higher each time
add(mix, at(open_tap['s']), layer(*((k * 0.07, bell(hz(n), 1.4, 0.4)) for k, n in enumerate(['C6', 'E6', 'G6', 'C7']))), 0.13)
for k, r in enumerate(lits):
    add(mix, at(r), bell(hz('G5') * 2 ** (k / 12), 1.5, 0.5), 0.2, pan=(-0.35 if k % 2 else 0.35))

# the voices, each brought to the same speech level
voice_windows = []
for k, s, d in voices:
    with wave.open(mood_wav(k) or os.path.join(VOICES, f'{k:02d}-hq.wav')) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16) / 32768.0
    loud = x[np.abs(x) > 0.02]
    x = x * (10 ** (-17 / 20) / np.sqrt(np.mean(loud ** 2)))
    t = at(s)
    add(mix, t, x)
    voice_windows.append((t, t + len(x) / SR))

# the cut: a soft slice through the rice, the top lifting (a little rising whoosh), a light pop as each dish hops
t0, t1 = at(cut['s']), at(confetti)
add(mix, t0 + 0.02, noise(0.16, 1800, 7000) * env(int(0.16 * SR), 0.002, 0.05), 0.22)
lift = noise(0.7, 600, 3000); tt = np.arange(len(lift)) / SR
add(mix, t0 + 0.08, lift * np.sin(np.pi * tt / 0.7) ** 2, 0.06)
for k, r in enumerate(sorted({e['s'] for e in ev if e['ev'] == 'out'})):
    add(mix, at(r), bell(hz('C6') * 2 ** ((k % 6) * 2 / 12), 0.6, 0.12), 0.07, pan=(-0.3 if k % 2 else 0.3))
for k, n_ in enumerate(['C6', 'E6', 'G6', 'C7', 'E7', 'G7']):
    add(mix, t1 + 0.05 + k * 0.06, bell(hz(n_), 1.6, 0.6), 0.12, pan=(k % 3 - 1) * 0.4)

# the music: an original music-box waltz in F (8 bars of arpeggios), then a rolled F chord on the closing card
eighth = 0.27
bars = [('F3', 'C6 A5 F5 A5 C6 F6'), ('D3', 'D6 A5 F5 A5 D6 E6'), ('A#2', 'F6 D6 A#5 D6 F6 G6'), ('C3', 'E6 C6 G5 C6 E6 G6'),
        ('F3', 'A5 C6 F6 C6 A5 C6'), ('D3', 'F5 A5 D6 A5 F5 E5'), ('A#2', 'D6 A#5 F5 A#5 D6 F6'), ('C3', 'E6 G6 C6 G5 E6 D6')]
t = INTRO
while t < T_END - 0.2:
    for bass, mel in bars:
        if t >= T_END - 0.2: break
        add(music, t, pad(hz(bass), 6 * eighth), 0.18)
        for j, nm in enumerate(mel.split()):
            if t + j * eighth < T_END - 0.15:
                add(music, t + j * eighth, musicbox(hz(nm) / 2), 0.32 if j == 0 else 0.22, pan=0.2 * math.sin(j))
        t += 6 * eighth
for k, nm in enumerate(['F3', 'C4', 'F4', 'A4', 'C5', 'F5']):
    add(music, T_END + k * 0.07, musicbox(hz(nm), 2.4), 0.25)
add(music, T_END, pad(hz('F2'), END + 0.4), 0.2)
# fade in when the gift opens; lower under the voices; fade out at the very end
g = np.ones(N); tt = np.arange(N) / SR
g *= np.clip((tt - INTRO) / 0.5, 0, 1)
duck = np.ones(N)
for a, b in voice_windows:
    duck = np.minimum(duck, np.clip(np.maximum((a - 0.15) - tt, tt - (b + 0.05)) / 0.2, 0.28, 1))
g *= duck * np.clip((D - tt) / 0.5, 0, 1)
mix += music * g * 0.55

mix = mix[:, : int(D * SR)]
raw = os.path.join(B, 'mix-raw.wav')
with wave.open(raw, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(mix.T / max(1.0, np.abs(mix).max() * 1.05), -1, 1) * 32767).astype(np.int16).tobytes())

# -14 LUFS: measure, then a plain gain (no pumping) and a true-peak limiter at -1.5 dBTP
m = subprocess.run(['ffmpeg', '-hide_banner', '-i', raw, '-af', 'loudnorm=I=-14:TP=-1.5:print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
I = float(json.loads(re.search(r'\{[^}]+\}', m).group(0))['input_i'])
audio = os.path.join(B, 'audio.wav')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', raw, '-af', f'volume={-14 - I:.2f}dB,alimiter=limit=0.84:attack=2:release=40:level=disabled', '-ar', str(SR), audio], check=True)
m = subprocess.run(['ffmpeg', '-hide_banner', '-i', audio, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
print('audio', re.findall(r'I:\s+(-?[\d.]+) LUFS', m)[-1], 'LUFS, true peak', re.findall(r'Peak:\s+(-?[\d.]+) dBFS', m)[-1], 'dBTP')

# ================= video =================
def clip(folder, frames, out, w, h):
    """Screencast frames (variable rate, real time) → a steady 60 fps clip of w×h."""
    if os.path.exists(out) and os.path.getmtime(out) > os.path.getmtime(os.path.join(B, 'timeline.json')):
        return out
    lst = os.path.join(B, folder + '.txt')
    with open(lst, 'w') as f:
        for (s, name), nxt in zip(frames, frames[1:] + [[frames[-1][0] + 0.5, None]]):
            f.write(f"file '{folder}/{name}'\nduration {max(0.001, nxt[0] - s):.4f}\n")
        f.write(f"file '{folder}/{frames[-1][1]}'\n")
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst,
                    '-vf', f'scale={w}:{h}:flags=lanczos,fps=60', '-c:v', 'libx264', '-crf', '10', '-preset', 'fast', '-pix_fmt', 'yuv420p', out], check=True)
    return out


screen = clip('screen', tl['frames'], os.path.join(B, 'screen.mp4'), PHONE['w'], PHONE['h'])
home = clip('home', json.load(open(os.path.join(B, 'home', 'frames.json'))), os.path.join(B, 'home.mp4'), END_PHONE['w'], END_PHONE['h'])

taps_out = [(at(t['s']), t['x'], t['y'], 0.32) for t in [open_tap, *voice_taps, blow_tap]]
taps_out.append((at(cut['s']), cut['x'], cut['y'], 0.32))  # tap to cut
taps_out.append((NOTIF_TAP, None, None, 0.3))  # tapping the notification


def inputs(cap):
    """The ffmpeg inputs: {name: index}, args."""
    still = lambda name: ['-loop', '1', '-framerate', str(FPS), '-t', f'{D:.3f}', '-i', os.path.join(OV, name + '.png')]
    items = [('base', ['-f', 'lavfi', '-i', f'color=c=black:s=1080x1920:r={FPS}:d={D:.3f}']), ('screen', ['-i', screen]), ('home', ['-i', home]),
             *((n, still(f)) for n, f in [('bg', 'bg'), ('c2359', 'clock-2359'), ('c0000', 'clock-0000'), ('notif', 'notif'),
                                          ('endbg', 'end-bg'), ('end', 'end'), ('pill', 'end-pill'), ('cap', f'caption-{cap}'), ('tap', 'tap')]),
             ('confetti', ['-framerate', str(FPS), '-i', os.path.join(OV, 'confetti', '%03d.png')]), ('audio', ['-i', audio]),
             ('blank', ['-f', 'lavfi', '-i', f'color=c=black:s=1080x1920:r={FPS}:d={D:.3f}'])]
    return {n: k for k, (n, _) in enumerate(items)}, sum((a for _, a in items), [])


def graph(ix):
    f = []
    # the cut: each piece at real speed, glued
    for k, (a, b, sp) in enumerate(segs):
        f.append(f"[{ix['screen']}:v]trim=start={a:.3f}:end={b:.3f},setpts=(PTS-STARTPTS)/{sp}[s{k}]")
    f.append(''.join(f'[s{k}]' for k in range(len(segs))) + f'concat=n={len(segs)}:v=1:a=0,fps={FPS},setpts=PTS+{INTRO}/TB[scr]')
    f.append(f"[{ix['base']}:v][scr]overlay=x={PHONE['x']}:y={PHONE['y']}:eof_action=pass[v0]")
    f.append(f"[v0][{ix['bg']}:v]overlay,split[v1][rv0]")                       # background + bezel
    f.append(f"[v1][{ix['c2359']}:v]overlay=enable='lt(t,{FLIP})'[v2]")
    f.append(f"[v2][{ix['c0000']}:v]overlay=enable='between(t,{FLIP},{INTRO + TR})'[v3]")
    f.append(f"[{ix['notif']}:v]format=rgba,fade=t=in:st={NOTIF}:d=0.3:alpha=1[nf]")
    f.append(f"[v3][nf]overlay=y='if(lt(t,{NOTIF}),60,60*max(0,1-(t-{NOTIF})/0.3))':enable='between(t,{NOTIF - 0.03},{INTRO + TR})'[v4a]")
    # the transition: the page grows out of the tapped notification card (an eased rectangle, alpha-masked)
    e = f'(1-pow(1-clip((T-{INTRO})/{TR},0,1),3))'
    x0, y0, x1, y1 = CARD
    box = f"between(X,{x0}*(1-{e}),{x1}+{1080 - x1}*{e})*between(Y,{y0}*(1-{e}),{y1}+{1920 - y1}*{e})"
    f.append(f"[rv0]trim=start={INTRO}:end={INTRO + TR + 0.05},format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='255*{box}'[rv]")
    f.append(f"[v4a][rv]overlay=eof_action=pass:enable='between(t,{INTRO},{INTRO + TR})'[v4]")
    last = 'v4'
    f.append(f"[{ix['tap']}:v]split={len(taps_out)}" + ''.join(f'[tp{k}]' for k in range(len(taps_out))))
    for k, (t, x, y, d) in enumerate(taps_out):
        if x is None: x0, y0 = 480 - 48, 1010 - 48  # on the notification card
        else: x0, y0 = PHONE['x'] + x * SCALE - 48, PHONE['y'] + y * SCALE - 48
        f.append(f"[tp{k}]format=rgba,fade=t=out:st={t + d - 0.12:.3f}:d=0.12:alpha=1[tq{k}]")
        f.append(f"[{last}][tq{k}]overlay=x={x0:.0f}:y={y0:.0f}:enable='between(t,{t - 0.03:.3f},{t + d:.3f})'[t{k}]")
        last = f't{k}'
    f.append(f"[{ix['confetti']}:v]format=rgba,setpts=PTS+{at(confetti):.3f}/TB[cf]")  # our confetti burst
    f.append(f'[{last}][cf]overlay=eof_action=pass[w0]')
    f.append(f"[w0][{ix['cap']}:v]overlay=enable='lt(t,{T_END + 0.3:.3f})'[w1]")      # the caption, until the closing card
    # the closing card: the home page live inside a phone, sliding up as it fades in; "Link di bio" bobbing
    f.append(f"[{ix['home']}:v]setpts=PTS-STARTPTS+{T_END:.3f}/TB[hm]")
    f.append(f"[{ix['blank']}:v][hm]overlay=x={END_PHONE['x']}:y={END_PHONE['y']}:eof_action=repeat[e0]")
    f.append(f"[e0][{ix['endbg']}:v]overlay[e01]")
    f.append(f"[e01][{ix['end']}:v]overlay[e1]")
    f.append(f"[{ix['pill']}:v]format=rgba,fade=t=in:st={T_END + 0.6:.3f}:d=0.25:alpha=1[pl]")
    f.append(f"[e1][pl]overlay=y='-16*abs(sin(4*(t-{T_END:.3f})))':enable='gte(t,{T_END + 0.6:.3f})'[e2]")
    f.append(f"[e2]format=rgba,fade=t=in:st={T_END:.3f}:d=0.35:alpha=1[ec]")
    f.append(f"[w1][ec]overlay=y='110*max(0,1-(t-{T_END:.3f})/0.35)':enable='gte(t,{T_END:.3f})',format=yuv420p[out]")
    return ';'.join(f)


os.makedirs(OUT, exist_ok=True)
for c in CAPTIONS:
    name = 'povbaru'
    mp4 = os.path.join(OUT, name + '.mp4')
    ix, args = inputs(c)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *args, '-filter_complex', graph(ix), '-map', '[out]', '-map', f"{ix['audio']}:a",
                    '-t', f'{D:.3f}', '-r', str(FPS), '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-profile:v', 'high',
                    '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', mp4], check=True)
    # a frame to check quickly: Mama's voice playing (her fried chicken)
    a, b = voice_windows[-1]
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{a + 1.6:.2f}', '-i', mp4, '-frames:v', '1', '-q:v', '2', os.path.join(OUT, name + '.jpg')], check=True)
    print(mp4)
