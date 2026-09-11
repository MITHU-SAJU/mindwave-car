/**
 * Mindwave Slot Car Racing — Offline HTML5 Canvas Confetti System
 * Lightweight, zero-dependency particle engine
 */

class ConfettiEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.particles = [];
    this.animationId = null;
    this.active = false;
  }

  resize() {
    if (this.canvas) {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    }
  }

  start(colors = ['#00f0ff', '#ff0055', '#ffd700', '#00ff66', '#ffffff']) {
    if (!this.canvas) {
      this.canvas = document.getElementById('confetti-canvas');
      if (this.canvas) this.ctx = this.canvas.getContext('2d');
      else return;
    }

    this.resize();
    this.particles = [];
    const count = 180;

    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height - this.canvas.height,
        size: Math.random() * 8 + 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 6,
        vy: Math.random() * 5 + 4,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        opacity: 1
      });
    }

    this.active = true;
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.animate();
  }

  stop() {
    this.active = false;
    if (this.animationId) cancelAnimationFrame(this.animationId);
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  animate() {
    if (!this.active || !this.ctx) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    let activeParticles = 0;

    this.particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;

      if (p.y < this.canvas.height + 20) {
        activeParticles++;
      }

      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate((p.rotation * Math.PI) / 180);
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.opacity;
      this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      this.ctx.restore();
    });

    if (activeParticles > 0) {
      this.animationId = requestAnimationFrame(() => this.animate());
    } else {
      this.stop();
    }
  }
}

window.confettiEngine = new ConfettiEngine('confetti-canvas');
window.addEventListener('resize', () => window.confettiEngine.resize());
