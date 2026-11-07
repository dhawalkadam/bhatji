#!/usr/bin/env python3
"""
Make all of Bhatji's voice clips with VoiceStudio, running on this computer.

  1. Open VoiceStudio and make sure your saved "Bhatji" voice profile exists.
  2. Turn on the local API: VoiceStudio → Settings → VoiceStudio API (default http://localhost:3900).
  3. From the repo folder run:
        python3 tools/make_voice.py --list-voices          # see your profile names / ids
        python3 tools/make_voice.py --voice Bhatji          # make every missing clip
        python3 tools/make_voice.py --voice Bhatji --day lakshmi   # only Lakshmi Pujan (+ shared phrases)

Clips are saved in audio/ and audio/manifest.json is updated, so the app plays them instead of the phone voice.
Re-running skips clips that already exist (use --force to remake, or --only <id> to remake one line).
Only Python 3 is needed — no extra packages.
"""
import argparse, json, os, sys, time, urllib.request, urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUDIO = os.path.join(ROOT, "audio")
MANIFEST = os.path.join(AUDIO, "manifest.json")


def http(method, url, body=None, key=None, timeout=300):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if key:
        req.add_header("Authorization", "Bearer " + key)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.status, r.headers.get("Content-Type", ""), r.read()


def find_voices(obj, out):
    """Walk any JSON shape and collect things that look like voice profiles."""
    if isinstance(obj, dict):
        vid = obj.get("id") or obj.get("voice_id") or obj.get("profile_id")
        name = obj.get("name") or obj.get("display_name") or obj.get("label")
        if vid and (name or isinstance(vid, str)):
            out.append((str(vid), str(name or vid)))
        for v in obj.values():
            find_voices(v, out)
    elif isinstance(obj, list):
        for v in obj:
            find_voices(v, out)
    return out


def looks_like_audio(b):
    return len(b) > 1500 and (b[:4] == b"RIFF" or b[:3] == b"ID3" or b[:2] in (b"\xff\xfb", b"\xff\xf3", b"\xff\xf2") or b[:4] == b"OggS" or b[:4] == b"fLaC")


def main():
    ap = argparse.ArgumentParser(description="Generate Bhatji clips with VoiceStudio")
    ap.add_argument("--url", default=os.environ.get("VOICESTUDIO_URL", "http://localhost:3900"))
    ap.add_argument("--key", default=os.environ.get("VOICESTUDIO_KEY"), help="API key, if you turned on authentication")
    ap.add_argument("--voice", default="Bhatji", help="voice profile name (or id)")
    ap.add_argument("--day", help="only clips for one day: vasubaras, dhanteras, narak, lakshmi, padwa, bhaubeej")
    ap.add_argument("--format", default="mp3", choices=["mp3", "wav"])
    ap.add_argument("--speed", type=float, help="speaking speed for instructions, e.g. 0.9 (if your engine supports it)")
    ap.add_argument("--mantra-speed", type=float, help="speaking speed for mantra lines, e.g. 0.8")
    ap.add_argument("--only", help="remake just this clip id")
    ap.add_argument("--force", action="store_true", help="remake clips that already exist")
    ap.add_argument("--list-voices", action="store_true")
    a = ap.parse_args()
    base = a.url.rstrip("/")

    try:
        _, _, raw = http("GET", base + "/v1/audio/voices", key=a.key, timeout=20)
    except Exception as e:
        sys.exit(f"Can't reach VoiceStudio at {base} ({e}).\nOpen VoiceStudio and turn on Settings → VoiceStudio API, then try again.")
    voices = find_voices(json.loads(raw or b"{}"), [])
    if a.list_voices:
        print("Voices VoiceStudio offers:")
        for vid, name in voices:
            print(f"  {name}  →  id: {vid}")
        return
    want = a.voice.lower()
    match = [v for v in voices if v[0].lower() == want or v[1].lower() == want] or [v for v in voices if want in v[1].lower()]
    if not match:
        print(f"No voice profile called '{a.voice}'. Available:")
        for vid, name in voices:
            print(f"  {name}  →  id: {vid}")
        sys.exit("Run again with --voice <name or id>.")
    voice_id, voice_name = match[0]
    print(f"Using voice: {voice_name} ({voice_id})")

    lines = json.load(open(os.path.join(ROOT, "voice-script.json"), encoding="utf-8"))
    if a.only:
        lines = [l for l in lines if l["id"] == a.only]
    elif a.day:
        lines = [l for l in lines if a.day in l["days"] or "all" in l["days"]]
    os.makedirs(AUDIO, exist_ok=True)
    manifest = {}
    if os.path.exists(MANIFEST):
        try:
            manifest = json.load(open(MANIFEST, encoding="utf-8"))
        except Exception:
            manifest = {}

    fmt = a.format
    made = skipped = failed = 0
    for n, l in enumerate(lines, 1):
        fname = f"{l['id']}.{fmt}"
        path = os.path.join(AUDIO, fname)
        if os.path.exists(path) and not (a.force or a.only):
            manifest[l["id"]] = fname
            skipped += 1
            continue
        body = {"model": "tts-1", "voice": voice_id, "input": l["text"], "response_format": fmt}
        sp = a.mantra_speed if l["kind"] == "m" else a.speed
        if sp:
            body["speed"] = sp
        print(f"[{n}/{len(lines)}] {l['id']}  {l['text'][:60]}")
        for attempt in range(3):
            try:
                status, ctype, audio = http("POST", base + "/v1/audio/speech", body, key=a.key)
                if status == 200 and looks_like_audio(audio):
                    open(path, "wb").write(audio)
                    manifest[l["id"]] = fname
                    made += 1
                    break
                if fmt == "mp3" and attempt == 0:
                    print("   mp3 not returned — trying wav")
                    fmt = "wav"; body["response_format"] = "wav"
                    fname = f"{l['id']}.wav"; path = os.path.join(AUDIO, fname)
                    continue
                print(f"   unexpected reply ({status}, {ctype}, {len(audio)} bytes)")
            except urllib.error.HTTPError as e:
                msg = e.read()[:300].decode("utf-8", "ignore")
                if e.code in (401, 403):
                    sys.exit("VoiceStudio refused the request (authentication). Pass your API key with --key.")
                if "speed" in body and e.code in (400, 422):
                    body.pop("speed")
                    print("   engine doesn't accept 'speed' — retrying without it")
                    continue
                print(f"   error {e.code}: {msg}")
            except Exception as e:
                print(f"   error: {e}")
            time.sleep(2)
        else:
            failed += 1
        json.dump(manifest, open(MANIFEST, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    json.dump(manifest, open(MANIFEST, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"\nDone. made {made}, already there {skipped}, failed {failed}. Manifest: audio/manifest.json")
    print("Listen to a few in the audio folder. To remake one: python3 tools/make_voice.py --voice "
          f"\"{a.voice}\" --only <id>")


if __name__ == "__main__":
    main()
