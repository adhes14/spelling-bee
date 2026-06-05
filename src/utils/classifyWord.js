/**
 * Classifies a word's spelling difficulty using length, patterns, and characters.
 * Returns the difficulty and an array of reasons.
 * 
 * @param {string} word 
 * @returns {{difficulty: 'easy'|'medium'|'hard', score: number, reasons: string[]}}
 */
export function classifyWord(word) {
  if (!word || typeof word !== 'string') {
    return { difficulty: 'easy', score: 0, reasons: ['No text provided'] }
  }

  const cleanWord = word.trim().toLowerCase()
  const len = cleanWord.length
  let score = 0
  const reasons = []

  // 1. Length points
  if (len <= 4) {
    score += 1.0
    reasons.push(`Short word (${len} letters)`)
  } else if (len >= 5 && len <= 6) {
    score += 2.0
    reasons.push(`Medium-short word (${len} letters)`)
  } else if (len >= 7 && len <= 8) {
    score += 3.5
    reasons.push(`Medium-long word (${len} letters)`)
  } else {
    score += 5.0
    reasons.push(`Long word (${len} letters)`)
  }

  // 2. Complex digraphs & spelling patterns
  const complexPatterns = [
    { regex: /th/gi, name: 'th' },
    { regex: /ch/gi, name: 'ch' },
    { regex: /sh/gi, name: 'sh' },
    { regex: /ph/gi, name: 'ph' },
    { regex: /gh/gi, name: 'gh' },
    { regex: /kn/gi, name: 'kn (silent k)' },
    { regex: /wr/gi, name: 'wr (silent w)' },
    { regex: /gn/gi, name: 'gn (silent g)' },
    { regex: /wh/gi, name: 'wh' },
    { regex: /igh/gi, name: 'igh' },
    { regex: /ough/gi, name: 'ough' }
  ]

  complexPatterns.forEach(pattern => {
    const matches = cleanWord.match(pattern.regex)
    if (matches) {
      const matchCount = matches.length
      score += 1.5 * matchCount
      reasons.push(`Contains spelling pattern: "${pattern.name}"${matchCount > 1 ? ` (x${matchCount})` : ''}`)
    }
  })

  // 3. Vowel digraphs (combinations that can make custom sounds)
  const vowelDigraphs = [
    { regex: /ea/gi, name: 'ea' },
    { regex: /ee/gi, name: 'ee' },
    { regex: /oo/gi, name: 'oo' },
    { regex: /ou/gi, name: 'ou' },
    { regex: /ie/gi, name: 'ie' },
    { regex: /ei/gi, name: 'ei' },
    { regex: /ai/gi, name: 'ai' },
    { regex: /ay/gi, name: 'ay' },
    { regex: /oy/gi, name: 'oy' },
    { regex: /oi/gi, name: 'oi' },
    { regex: /au/gi, name: 'au' },
    { regex: /aw/gi, name: 'aw' }
  ]

  vowelDigraphs.forEach(pattern => {
    // Make sure we don't double count if a pattern is already matched inside complex patterns (like ou inside ough)
    // For example, ough contains ou. We'll skip ou if ough was matched.
    if (pattern.name === 'ou' && cleanWord.includes('ough')) {
      return
    }
    const matches = cleanWord.match(pattern.regex)
    if (matches) {
      const matchCount = matches.length
      score += 0.75 * matchCount
      reasons.push(`Contains vowel combination: "${pattern.name}"${matchCount > 1 ? ` (x${matchCount})` : ''}`)
    }
  })

  // 4. Double consonants (excluding double vowels already counted)
  // e.g. bb, cc, dd, ff, gg, ll, mm, nn, pp, rr, ss, tt, zz
  const doubleConsonantRegex = /([^aeiou])\1/gi
  const doubleConsonants = cleanWord.match(doubleConsonantRegex)
  if (doubleConsonants) {
    score += 0.75 * doubleConsonants.length
    reasons.push(`Contains double consonant: "${doubleConsonants[0]}"`)
  }

  // 5. Spaces, hyphens or special symbols
  if (/[\s]/g.test(cleanWord)) {
    score += 2.0
    reasons.push('Contains spaces (multi-word)')
  }
  if (/[-']/g.test(cleanWord)) {
    score += 1.5
    reasons.push('Contains special characters (hyphen/apostrophe)')
  }

  // 6. Final classification
  let difficulty = 'easy'
  if (score < 2.5) {
    difficulty = 'easy'
  } else if (score >= 2.5 && score < 4.5) {
    difficulty = 'medium'
  } else {
    difficulty = 'hard'
  }

  return {
    difficulty,
    score,
    reasons
  }
}
