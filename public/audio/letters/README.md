# Letter Sound MP3s

This directory contains 26 static MP3 files (`a.mp3` through `z.mp3`) used by
the spelling bee app for letter-key feedback during gameplay.

## How to generate

Run the one-time generation script from the repository root:

```bash
GOOGLE_TTS_API_KEY="your-google-cloud-api-key" node scripts/generate-letter-sounds.mjs
```

Or pass the key as a CLI argument:

```bash
node scripts/generate-letter-sounds.mjs "your-google-cloud-api-key"
```

The script uses Google Cloud Text-to-Speech (`en-US-Neural2-F` voice, MP3
format, speaking rate 0.85) and writes one MP3 per letter of the alphabet.

A valid Google Cloud API key with the Text-to-Speech API enabled is required.

## Without API key / fallback

If the MP3 files are not present (e.g., after a fresh clone or if the
generation script was never run), letter-key presses will silently produce no
audio feedback. The app continues to function normally — the letter sounds are
cosmetic and not critical for gameplay.

## Why static?

Letter sounds are played on every keyboard press (the most frequent audio
interaction in the app). Serving them as static, Service-Worker-precached MP3s
eliminates latency, avoids IndexedDB lookups, and incurs zero API cost at
runtime.
