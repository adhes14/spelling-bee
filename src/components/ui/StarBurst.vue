<template>
  <canvas ref="canvasRef" class="starburst-canvas"></canvas>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const canvasRef = ref(null)
let animationFrameId = null

// Particle class
class Particle {
  constructor(x, y) {
    this.x = x
    this.y = y
    
    // Spread in all directions
    const angle = Math.random() * Math.PI * 2
    const speed = Math.random() * 8 + 4 // Velocity magnitude
    
    this.vx = Math.cos(angle) * speed
    this.vy = Math.sin(angle) * speed - (Math.random() * 3) // Give it a slight initial upward boost
    
    // Size and colors
    this.size = Math.random() * 12 + 6
    const colors = [
      '#FF3366', // var(--color-accent-pink)
      '#33CCFF', // var(--color-accent-cyan)
      '#9933FF', // var(--color-accent-purple)
      '#FFCC00', // var(--color-accent-star)
      '#FF66B2', // bright pink
      '#33FF99', // bright green
      '#FF9933'  // bright orange
    ]
    this.color = colors[Math.floor(Math.random() * colors.length)]
    this.alpha = 1
    this.decay = Math.random() * 0.015 + 0.01
    this.gravity = 0.22
    
    // Rotation for stars and sparkles
    this.rotation = Math.random() * Math.PI * 2
    this.rotationSpeed = (Math.random() - 0.5) * 0.1
    
    // Particle shape type
    const types = ['star', 'sparkle', 'circle']
    this.type = types[Math.floor(Math.random() * types.length)]
  }

  update() {
    this.vy += this.gravity
    this.x += this.vx
    this.y += this.vy
    this.alpha -= this.decay
    this.rotation += this.rotationSpeed
  }

  draw(ctx) {
    ctx.save()
    ctx.translate(this.x, this.y)
    ctx.rotate(this.rotation)
    ctx.globalAlpha = Math.max(0, this.alpha)
    ctx.fillStyle = this.color
    ctx.shadowBlur = 10
    ctx.shadowColor = this.color

    if (this.type === 'circle') {
      ctx.beginPath()
      ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2)
      ctx.fill()
    } else if (this.type === 'star') {
      this.drawStar(ctx, 5, this.size, this.size / 2)
    } else if (this.type === 'sparkle') {
      this.drawStar(ctx, 4, this.size, this.size / 4)
    }

    ctx.restore()
  }

  drawStar(ctx, spikes, outerRadius, innerRadius) {
    let rot = (Math.PI / 2) * 3
    let cx = 0
    let cy = 0
    let x = cx
    let y = cy
    let step = Math.PI / spikes

    ctx.beginPath()
    ctx.moveTo(cx, cy - outerRadius)
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius
      y = cy + Math.sin(rot) * outerRadius
      ctx.lineTo(x, y)
      rot += step

      x = cx + Math.cos(rot) * innerRadius
      y = cy + Math.sin(rot) * innerRadius
      ctx.lineTo(x, y)
      rot += step
    }
    ctx.lineTo(cx, cy - outerRadius)
    ctx.closePath()
    ctx.fill()
  }
}

const particles = []

function initBurst() {
  const canvas = canvasRef.value
  if (!canvas) return
  
  const ctx = canvas.getContext('2d')
  
  // Set canvas bounds to cover window
  const resizeCanvas = () => {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
  }
  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)
  
  const centerX = canvas.width / 2
  const centerY = canvas.height * 0.45 // Explode slightly above center of screen
  
  // Create 120 particles
  for (let i = 0; i < 120; i++) {
    particles.push(new Particle(centerX, centerY))
  }
  
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]
      p.update()
      p.draw(ctx)
      
      if (p.alpha <= 0) {
        particles.splice(i, 1)
      }
    }
    
    if (particles.length > 0) {
      animationFrameId = requestAnimationFrame(animate)
    }
  }
  
  animate()
  
  onBeforeUnmount(() => {
    window.removeEventListener('resize', resizeCanvas)
  })
}

onMounted(() => {
  initBurst()
})

onBeforeUnmount(() => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }
})
</script>

<style scoped>
.starburst-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 9999;
}
</style>
