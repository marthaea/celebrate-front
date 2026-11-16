// The moment a booking is confirmed: confetti in the brand colours and three beats of a drum.
const COLOURS = ["#d42b2b", "#f2b31c", "#24140f", "#fff1d6", "#e8743b"];
const calm = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Showers confetti over the page for about three seconds, then tidies up after itself. */
export function confetti() {
  if (calm()) return;
  const canvas = document.createElement("canvas");
  canvas.className = "confetti";
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.append(canvas);
  const ctx = canvas.getContext("2d");
  const pieces = Array.from({ length: 150 }, (_, i) => ({
    x: canvas.width / 2 + (Math.random() - 0.5) * 120,
    y: canvas.height * 0.35,
    vx: (Math.random() - 0.5) * 16,
    vy: -Math.random() * 15 - 4,
    size: 6 + Math.random() * 7,
    spin: Math.random() * Math.PI,
    turn: (Math.random() - 0.5) * 0.3,
    colour: COLOURS[i % COLOURS.length],
    round: i % 3 === 0,
  }));
  const started = performance.now();
  const frame = (now) => {
    const age = now - started;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = Math.max(0, 1 - Math.max(0, age - 2200) / 900);
    for (const p of pieces) {
      p.vy += 0.32;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.spin += p.turn;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.spin);
      ctx.fillStyle = p.colour;
      if (p.round) {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      }
      ctx.restore();
    }
    if (age < 3100) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
}

/** Three soft drum beats. Browsers only allow sound after the visitor has clicked something. */
export function drumBeat() {
  if (calm()) return;
  try {
    const Audio = window.AudioContext ?? window.webkitAudioContext;
    const audio = new Audio();
    if (audio.state === "suspended") audio.resume().catch(() => {});
    for (const at of [0, 0.19, 0.5]) {
      const start = audio.currentTime + 0.05 + at;
      const tone = audio.createOscillator();
      const volume = audio.createGain();
      tone.frequency.setValueAtTime(165, start);
      tone.frequency.exponentialRampToValueAtTime(52, start + 0.22);
      volume.gain.setValueAtTime(0.0001, start);
      volume.gain.exponentialRampToValueAtTime(0.45, start + 0.01);
      volume.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);
      tone.connect(volume).connect(audio.destination);
      tone.start(start);
      tone.stop(start + 0.32);
    }
    setTimeout(() => audio.close().catch(() => {}), 1500);
  } catch {
    // No sound is fine.
  }
}
