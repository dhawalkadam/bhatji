# भटजी — a hands-free Diwali pooja guide

Open it, tap **सुरू करा** once, and put the phone down. Bhatji speaks each step in Marathi, shows only the mantra or instruction that matters right now, pauses for you to repeat each mantra line, and listens for a few words:

| Say | What happens |
|---|---|
| **झालं** (or पुढे, हो, done) | next step |
| **पुन्हा** (or परत, repeat) | repeat this step |
| **थांबा** (or wait) | pause — say **चला** to continue |
| **मागे** (or back) | previous step |

If you say nothing, Bhatji waits, asks “झालं का?”, and then carries on by himself, so the pooja never gets stuck. Tapping the screen shows small fallback buttons.

All six days are included: Vasubaras, Dhanteras, Narak Chaturdashi, Lakshmi Pujan, Padwa and Bhaubeej. The app picks today's (or the next) pooja automatically, and you can choose another day.

## Put it online (GitHub Pages)

1. Upload these files to the repo (keep the `audio` and `tools` folders).
2. Repo → **Settings → Pages** → Source: **Deploy from a branch** → Branch: **main**, folder **/ (root)** → Save.
3. After a minute the site is at `https://<your-username>.github.io/<repo-name>/`.
4. Open that link in **Chrome** on your phone. Allow the microphone when asked.

The microphone only works on the real https site, not when opening the file directly.

## Bhatji's voice

Until clips are recorded, the phone's built-in voice is used. To use your VoiceStudio “Bhatji” voice:

1. In VoiceStudio, turn on **Settings → VoiceStudio API**.
2. In this folder on your laptop run:
   ```
   python3 tools/make_voice.py --list-voices
   python3 tools/make_voice.py --voice Bhatji --day lakshmi
   ```
   (Leave out `--day` to make all 145 clips. Add `--mantra-speed 0.8` for slower mantras if your engine supports speed.)
3. Upload the new files in `audio/` (including `audio/manifest.json`) to the repo.

`voice-script.txt` lists every line with its clip id, if you'd rather make clips by hand in VoiceStudio: save each as `audio/<id>.mp3` and add it to `audio/manifest.json` as `"<id>": "<id>.mp3"`.

The spoken text uses simpler spellings so the voice pronounces them well (अक्शता, नमह, numbers as words). The screen still shows the correct spelling.

## Files

- `index.html`, `style.css`, `app.js` — the app
- `content.json` — every day's steps, mantras and clip ids
- `voice-script.json` / `voice-script.txt` — the lines to record
- `audio/` — recorded clips + `manifest.json`
- `tools/make_voice.py` — batch-records clips through VoiceStudio's local API

The mantras and steps follow common Maharashtrian practice. Family traditions differ, so adapt freely.
