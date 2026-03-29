import Phaser from 'phaser';

// Visual effects helpers for the game

// Floating text that rises and fades (e.g., "+5 Food")
export function floatingText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  color: string = '#ffffff',
  duration: number = 1200
): void {
  const txt = scene.add.text(x, y, text, {
    fontFamily: 'Arial',
    fontSize: '14px',
    color,
    stroke: '#000000',
    strokeThickness: 2,
  }).setOrigin(0.5, 0.5).setDepth(500);

  scene.tweens.add({
    targets: txt,
    y: y - 40,
    alpha: 0,
    duration,
    ease: 'Power2',
    onComplete: () => txt.destroy(),
  });
}

// Screen shake
export function screenShake(scene: Phaser.Scene, intensity: number = 5, duration: number = 200): void {
  scene.cameras.main.shake(duration, intensity / 1000);
}

// Flash a region (e.g., when conquered)
export function flashRegion(
  gfx: Phaser.GameObjects.Graphics,
  points: Array<{ x: number; y: number }>,
  color: number,
  scene: Phaser.Scene
): void {
  if (points.length < 3) return;

  gfx.fillStyle(color, 0.6);
  gfx.beginPath();
  gfx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    gfx.lineTo(points[i].x, points[i].y);
  }
  gfx.closePath();
  gfx.fillPath();

  // Fade out
  scene.tweens.add({
    targets: gfx,
    alpha: 0,
    duration: 600,
    onComplete: () => {
      gfx.alpha = 1;
    },
  });
}

// Explosion particles (for combat)
export function explosionEffect(scene: Phaser.Scene, x: number, y: number, color: number = 0xff6600): void {
  const gfx = scene.add.graphics().setDepth(400);

  // Draw expanding circle
  let radius = 5;
  const expand = scene.time.addEvent({
    delay: 30,
    repeat: 15,
    callback: () => {
      gfx.clear();
      const alpha = 1 - radius / 50;
      gfx.fillStyle(color, alpha * 0.6);
      gfx.fillCircle(x, y, radius);
      gfx.fillStyle(0xffff00, alpha * 0.3);
      gfx.fillCircle(x, y, radius * 0.5);
      radius += 3;
    },
  });

  scene.time.delayedCall(500, () => {
    gfx.destroy();
  });
}

// Build placement effect
export function buildPlaceEffect(scene: Phaser.Scene, x: number, y: number): void {
  const gfx = scene.add.graphics().setDepth(400);
  let size = 15;

  const shrink = scene.time.addEvent({
    delay: 30,
    repeat: 10,
    callback: () => {
      gfx.clear();
      gfx.lineStyle(2, 0x44ff44, size / 15);
      gfx.strokeRect(x - size / 2, y - size / 2, size, size);
      size -= 1;
    },
  });

  scene.time.delayedCall(400, () => gfx.destroy());
}

// Card play effect
export function cardPlayEffect(scene: Phaser.Scene, x: number, y: number, color: number): void {
  const gfx = scene.add.graphics().setDepth(400);
  let r = 3;

  scene.time.addEvent({
    delay: 20,
    repeat: 12,
    callback: () => {
      gfx.clear();
      gfx.lineStyle(2, color, 1 - r / 40);
      gfx.strokeCircle(x, y, r);
      r += 2.5;
    },
  });

  scene.time.delayedCall(300, () => gfx.destroy());
}

// Victory confetti
export function confettiEffect(scene: Phaser.Scene): void {
  const w = scene.cameras.main.width;
  const h = scene.cameras.main.height;
  const colors = [0xff4444, 0x44ff44, 0x4444ff, 0xffff44, 0xff44ff, 0x44ffff, 0xffd700];
  const gfx = scene.add.graphics().setDepth(500).setScrollFactor(0);

  const particles: Array<{ x: number; y: number; vx: number; vy: number; color: number; size: number }> = [];

  for (let i = 0; i < 80; i++) {
    particles.push({
      x: Math.random() * w,
      y: -10 - Math.random() * 50,
      vx: (Math.random() - 0.5) * 3,
      vy: 1 + Math.random() * 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 2 + Math.random() * 4,
    });
  }

  const update = scene.time.addEvent({
    delay: 30,
    loop: true,
    callback: () => {
      gfx.clear();
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05; // gravity
        gfx.fillStyle(p.color, 0.8);
        gfx.fillRect(p.x, p.y, p.size, p.size * 0.6);
      }
    },
  });

  scene.time.delayedCall(4000, () => {
    update.destroy();
    gfx.destroy();
  });
}
