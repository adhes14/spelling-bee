// Self-contained synthesizer using Web Audio API for offline sound effects
export function useAudioFeedback() {
  
  const getAudioContext = () => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return null
    return new AudioContextClass()
  }

  // Plays a pleasant, sparkly success sound (chime)
  const playSuccessSound = () => {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime
    
    // First note
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(523.25, now) // C5
    osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.15) // E5
    
    gain1.gain.setValueAtTime(0.15, now)
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.3)
    
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    
    // Second note (slightly delayed)
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(783.99, now + 0.12) // G5
    osc2.frequency.exponentialRampToValueAtTime(1046.50, now + 0.3) // C6
    
    gain2.gain.setValueAtTime(0, now)
    gain2.gain.setValueAtTime(0.15, now + 0.12)
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.45)
    
    osc2.connect(gain2)
    gain2.connect(ctx.destination)

    osc1.start(now)
    osc1.stop(now + 0.3)
    
    osc2.start(now + 0.12)
    osc2.stop(now + 0.45)
  }

  // Plays a soft, non-destructive low buzz sound for mistakes
  const playErrorSound = () => {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'triangle' // softer than saw/square
    osc.frequency.setValueAtTime(130.81, now) // C3
    osc.frequency.linearRampToValueAtTime(80, now + 0.25)
    
    gain.gain.setValueAtTime(0.2, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.25)
  }

  // Plays a subtle click when a letter drops in correctly
  const playClickSound = () => {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(329.63, now) // E4
    osc.frequency.exponentialRampToValueAtTime(440.00, now + 0.08) // A4
    
    gain.gain.setValueAtTime(0.1, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.08)
  }

  return {
    playSuccessSound,
    playErrorSound,
    playClickSound
  }
}
