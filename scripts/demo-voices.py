# Makes the demo voices in public/demo/ from public/demo/voices.json (run once; the WAVs are committed).
# Needs: pip install edge-tts, and ffmpeg on the PATH.
#   python scripts/demo-voices.py
# Output: public/demo/<occasion>-<nn>.wav, 16 kHz mono 16-bit (same format as the browser recorder).
import asyncio, json, os, subprocess, tempfile
import edge_tts

ROOT = os.path.join(os.path.dirname(__file__), '..', 'public', 'demo')
VOICES = {'F': 'id-ID-GadisNeural', 'M': 'id-ID-ArdiNeural'}


async def main():
    data = json.load(open(os.path.join(ROOT, 'voices.json'), encoding='utf-8'))
    for occasion, people in data.items():
        if occasion.startswith('_'):
            continue
        for i, p in enumerate(people):
            out = os.path.join(ROOT, f'{occasion}-{i + 1:02d}.wav')
            if os.path.exists(out):
                continue
            with tempfile.TemporaryDirectory() as tmp:
                mp3 = os.path.join(tmp, 'v.mp3')
                for attempt in range(6):  # the TTS service drops connections now and then
                    try:
                        await edge_tts.Communicate(p['text'], VOICES[p['voice']], rate=p['rate'], pitch=p['pitch']).save(mp3)
                        break
                    except Exception as e:
                        print('retry', occasion, i + 1, e.__class__.__name__)
                        await asyncio.sleep(2 + attempt * 2)
                else:
                    raise SystemExit(f'TTS failed for {occasion} {i + 1}')
                # trim the silence at both ends, then 16 kHz mono 16-bit WAV
                trim = 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,adelay=150'
                subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', mp3, '-af', trim, '-ar', '16000', '-ac', '1', '-sample_fmt', 's16', '-map_metadata', '-1', '-bitexact', out], check=True)
            print(out)


asyncio.run(main())
