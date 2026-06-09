<template>
  <button 
    class="btn-audio btn-bouncy" 
    :class="{ speaking, disabled: disabled }"
    :disabled="disabled"
    @click="speak"
    aria-label="Listen to word"
  >
    <span class="speaker-icon">🔊</span>
    <span class="pulse-ring"></span>
  </button>
</template>

<script setup>
import { useWordAudio } from '@/composables/useWordAudio'

const props = defineProps({
  word: { type: String, required: true },
  category: { type: String, required: true },
  disabled: { type: Boolean, default: false },
  onSpeak: { type: Function, default: null }
})

const { speakWord, speaking } = useWordAudio()

const speak = () => {
  if (props.disabled) return
  if (props.onSpeak) {
    props.onSpeak()
  } else {
    speakWord(props.word, props.category)
  }
}
</script>

<style scoped>
.btn-audio {
  position: relative;
  width: 90px;
  height: 90px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--color-accent-purple) 0%, #7c3aed 100%);
  box-shadow: 0 8px 0 #5b21b6, 0 15px 25px rgba(124, 58, 237, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: none;
  z-index: 2;
  transition: transform 0.1s ease, box-shadow 0.1s ease;
}

.btn-audio:active {
  transform: translateY(6px);
  box-shadow: 0 2px 0 #5b21b6, 0 10px 15px rgba(124, 58, 237, 0.4);
}

.speaker-icon {
  font-size: 3rem;
  line-height: 1;
  display: inline-block;
  transition: transform 0.2s ease;
}

/* Pulsing effect when speaking */
.btn-audio.speaking {
  animation: bounceSpeaking 0.6s infinite alternate;
}

.btn-audio.speaking .speaker-icon {
  transform: scale(1.15);
}

@keyframes bounceSpeaking {
  0% { transform: scale(1); }
  100% { transform: scale(1.08); }
}

.pulse-ring {
  position: absolute;
  top: -8px;
  left: -8px;
  right: -8px;
  bottom: -8px;
  border: 4px solid var(--color-accent-purple);
  border-radius: 50%;
  opacity: 0;
  pointer-events: none;
}

.btn-audio.speaking .pulse-ring {
  animation: pulseRing 1.2s infinite cubic-bezier(0.215, 0.610, 0.355, 1);
}

@keyframes pulseRing {
  0% {
    transform: scale(0.9);
    opacity: 0.8;
  }
  100% {
    transform: scale(1.3);
    opacity: 0;
  }
}

.btn-audio.disabled {
  opacity: 0.35;
  filter: grayscale(0.6);
  pointer-events: none;
  cursor: not-allowed;
}
</style>
