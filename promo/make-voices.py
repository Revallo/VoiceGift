# The 12 wishes for the promo video, from promo/voices.json (same method as the old scripts/demo-voices.py).
#   uv run --with edge-tts promo/make-voices.py
# Output in promo/build/voices/:  NN.wav  16 kHz mono 16-bit (what the app gets, like the browser recorder)
#                                 NN-hq.wav 48 kHz mono, same trim (what the video's soundtrack uses)
import asyncio, json, os, subprocess, tempfile
import edge_tts

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'build', 'voices')
VOICES = {'F': 'id-ID-GadisNeural', 'M': 'id-ID-ArdiNeural'}
# trim the silence at both ends, then 150 ms of lead-in (both files get the same, so they line up)
TRIM = 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,adelay=150'


def ff(*args):
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', *args], check=True)


async def main():
    os.makedirs(OUT, exist_ok=True)
    data = json.load(open(os.path.join(HERE, 'voices.json'), encoding='utf-8'))
    for i, p in enumerate(data['voices']):
        wav = os.path.join(OUT, f'{i:02d}.wav')
        if os.path.exists(wav):
            continue
        with tempfile.TemporaryDirectory() as tmp:
            mp3 = os.path.join(tmp, 'v.mp3')
            for attempt in range(6):  # the TTS service drops connections now and then
                try:
                    await edge_tts.Communicate(p.get('say', p['text']), VOICES[p['voice']], rate=p['rate'], pitch=p['pitch']).save(mp3)
                    break
                except Exception as e:
                    print('retry', i, e.__class__.__name__)
                    await asyncio.sleep(2 + attempt * 2)
            else:
                raise SystemExit(f'TTS failed for voice {i}')
            ff('-i', mp3, '-af', TRIM, '-ar', '48000', '-ac', '1', os.path.join(OUT, f'{i:02d}-hq.wav'))
            ff('-i', mp3, '-af', TRIM, '-ar', '16000', '-ac', '1', '-sample_fmt', 's16', '-map_metadata', '-1', '-bitexact', wav)
        print(wav)


asyncio.run(main())
