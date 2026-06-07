#!/usr/bin/env node

/**
 * One-time script to generate 26 letter-sound MP3 files using Google Cloud TTS.
 *
 * Usage:
 *   GOOGLE_TTS_API_KEY="YOUR_KEY" node scripts/generate-letter-sounds.mjs
 *   or: node scripts/generate-letter-sounds.mjs "YOUR_KEY"
 *
 * Output: public/audio/letters/a.mp3 … z.mp3
 */

import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const OUT_DIR = join(ROOT, 'public', 'audio', 'letters')

const API_KEY = process.env.GOOGLE_TTS_API_KEY || process.argv[2] || ''

if (!API_KEY) {
  console.error('ERROR: No API key provided.')
  console.error('  Set GOOGLE_TTS_API_KEY env var or pass as first argument:')
  console.error('    node scripts/generate-letter-sounds.mjs "YOUR_API_KEY"')
  process.exit(1)
}

const ENDPOINT = 'https://texttospeech.googleapis.com/v1/text:synthesize'
const VOICE = 'en-US-Neural2-F'
const RATE = 0.85

const LETTERS = Array.from({ length: 26 }, (_, i) =>
  String.fromCharCode(65 + i)
) // ['A', 'B', …, 'Z']

async function generateLetter(letter) {
  const body = {
    input: { text: letter },
    voice: { languageCode: 'en-US', name: VOICE },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: RATE,
    },
  }

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(
      `TTS API returned ${res.status} ${res.statusText}${text ? ': ' + text : ''}`
    )
  }

  const json = await res.json()
  if (!json.audioContent) {
    throw new Error('TTS API response missing audioContent')
  }

  const buffer = Buffer.from(json.audioContent, 'base64')
  const filename = join(OUT_DIR, `${letter.toLowerCase()}.mp3`)
  writeFileSync(filename, buffer)
  return filename
}

async function main() {
  // Ensure output directory exists
  if (!existsSync(OUT_DIR)) {
    mkdirSync(OUT_DIR, { recursive: true })
  }

  console.log(`Generating ${LETTERS.length} letter MP3s with voice "${VOICE}"…\n`)

  let success = 0
  let failed = 0

  for (const letter of LETTERS) {
    try {
      const path = await generateLetter(letter)
      console.log(`  ✓ ${letter} → ${path}`)
      success++
    } catch (err) {
      console.error(`  ✗ ${letter}: ${err.message}`)
      failed++
    }

    // Rate limiting: 1-second gap between calls
    if (letter !== LETTERS[LETTERS.length - 1]) {
      await new Promise((r) => setTimeout(r, 1000))
    }
  }

  console.log(`\nDone. ${success} generated, ${failed} failed.`)
  if (failed > 0) process.exit(1)
}

main()
