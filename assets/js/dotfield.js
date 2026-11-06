/**
 * AstraLabs Fast Motion Engine & Verbatim Boot Sequence
 * Features:
 * - Boot Ignition wave & multi-wave Sea dotfield
 * - Wordmark terminal typing boot with bracket snap & tube flicker
 * - Corner registration mark alignment & strobe lock
 * - Telemetry real-time clock strobe
 * - Byline typewriter with crimson block cursor (no layout shift)
 * - Interactive pointer lens, click ripples, and brand glitch
 */
(function () {
  'use strict';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const R2 = (a, b) => a + Math.random() * (b - a);

  /* Motion keyframes */
  const hard = kf => kf.map(k => ({ ...k, easing: 'steps(1, end)' }));
  const STROBE = hard([
    { opacity: 0 },
    { opacity: 1, offset: 0.12 },
    { opacity: 0, offset: 0.24 },
    { opacity: 1, offset: 0.4 },
    { opacity: 0.35, offset: 0.56 },
    { opacity: 1, offset: 0.72 },
    { opacity: 1 }
  ]);
  const TUBE = hard([
    { opacity: 0 },
    { opacity: 0.85, offset: 0.08 },
    { opacity: 0, offset: 0.12 },
    { opacity: 0, offset: 0.3 },
    { opacity: 0.5, offset: 0.33 },
    { opacity: 0.1, offset: 0.36 },
    { opacity: 1, offset: 0.52 },
    { opacity: 0.35, offset: 0.55 },
    { opacity: 1, offset: 0.6 },
    { opacity: 1 }
  ]);
  const SNAP = 'cubic-bezier(.3, 1.35, .5, 1)';

  /* ================= 1. DOT FIELD CANVAS ================= */
  const canvas = document.createElement('canvas');
  canvas.id = 'al-field';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:-1;display:block;';
  document.body.prepend(canvas);

  const ctx = canvas.getContext('2d');
  let W = window.innerWidth, H = window.innerHeight;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  const resize = () => {
    W = window.innerWidth;
    H = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    grid = null;
  };
  resize();
  window.addEventListener('resize', resize, { passive: true });

  const origin = () => [W / 2, H / 2];
  const reach = (cx, cy) => Math.max(
    Math.hypot(cx, cy),
    Math.hypot(W - cx, cy),
    Math.hypot(cx, H - cy),
    Math.hypot(W - cx, H - cy)
  );
  const easeIO = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  // 4-component wave superposition (AstraLabs Sea System)
  const SEA = [
    [620, 18, 9, 0.34],
    [430, 112, 7, 0.26],
    [300, 205, 11, 0.20],
    [760, 290, 6, 0.20]
  ].map(([l, deg, v, w], i) => {
    const a = deg * Math.PI / 180;
    return {
      kx: Math.cos(a) * 2 * Math.PI / l,
      ky: Math.sin(a) * 2 * Math.PI / l,
      w: v * 2 * Math.PI / l,
      a: w,
      p: i * 1.7
    };
  });

  const sea = { ramp: 0, running: false, t0: performance.now() };
  const pulses = [];
  const LENS_R = 90;
  const lens = { x: 0, y: 0, tx: 0, ty: 0, k: 0, on: false };

  let grid = null;
  function buildGrid() {
    const xs = [], ys = [];
    const step = 16;
    for (let gx = 8; gx < W; gx += step) {
      for (let gy = 8; gy < H; gy += step) {
        xs.push(gx);
        ys.push(gy);
      }
    }
    const n = xs.length;
    const [cx, cy] = origin();
    const max = reach(cx, cy);
    const g = {
      n,
      x: Float32Array.from(xs),
      y: Float32Array.from(ys),
      rest: new Float32Array(n),
      sa: new Float32Array(n * 4),
      ca: new Float32Array(n * 4)
    };
    for (let i = 0; i < n; i++) {
      g.rest[i] = 0.08 + Math.max(0, 1 - Math.hypot(xs[i] - cx, ys[i] - cy) / max) * 0.16;
      SEA.forEach((w, j) => {
        const ph = xs[i] * w.kx + ys[i] * w.ky + w.p;
        g.sa[i * 4 + j] = Math.sin(ph);
        g.ca[i * 4 + j] = Math.cos(ph);
      });
    }
    grid = g;
  }

  const LEVELS = 80;
  const boneB = Array.from({ length: LEVELS + 1 }, () => []);
  const redB = Array.from({ length: LEVELS + 1 }, () => []);
  const boneStyle = boneB.map((_, i) => `rgba(237,230,225,${(i / LEVELS).toFixed(3)})`);
  const redStyle = redB.map((_, i) => `rgba(255,51,68,${(i / LEVELS).toFixed(3)})`);

  function drawIgnition(p) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const [cx, cy] = origin();
    const max = reach(cx, cy);
    const R = max * p;
    const step = 16;
    for (let gx = 8; gx < W; gx += step) {
      for (let gy = 8; gy < H; gy += step) {
        const d = Math.hypot(gx - cx, gy - cy);
        const edge = Math.max(0, 1 - d / max);
        if (d > R) {
          ctx.fillStyle = 'rgba(237,230,225,0.06)';
          ctx.fillRect(gx - 0.75, gy - 0.75, 1.5, 1.5);
          continue;
        }
        const ring = Math.max(0, 1 - Math.abs(d - R) / 28);
        ctx.fillStyle = ring > 0.05 && p < 1
          ? `rgba(255,51,68,${Math.min(1, 0.4 + ring * 0.8)})`
          : `rgba(237,230,225,${0.08 + edge * 0.16})`;
        ctx.fillRect(gx - 0.75, gy - 0.75, 1.5, 1.5);
      }
    }
  }

  function drawSea(now) {
    if (!grid) buildGrid();
    const t = (now - sea.t0) / 1000;
    const amp = 0.14 * sea.ramp;
    const sb = SEA.map(w => Math.sin(t * w.w) * w.a);
    const cb = SEA.map(w => Math.cos(t * w.w) * w.a);
    const lk = lens.k > 0.01 ? lens.k : 0;
    const lx = lens.x, ly = lens.y;
    const LR2 = LENS_R * LENS_R;
    const { n, x, y, rest, sa, ca } = grid;

    for (let i = 0; i <= LEVELS; i++) {
      boneB[i].length = 0;
      redB[i].length = 0;
    }

    for (let i = pulses.length - 1; i >= 0; i--) {
      const p = pulses[i];
      const elapsed = now - p.t0;
      if (elapsed > 900) {
        pulses.splice(i, 1);
      } else {
        p.r = (elapsed / 900) * p.max;
      }
    }

    for (let i = 0; i < n; i++) {
      const gx = x[i], gy = y[i];
      let ring = 0;
      for (const p of pulses) {
        const r = 1 - Math.abs(Math.hypot(gx - p.x, gy - p.y) - p.r) / 24;
        if (r > ring) ring = r;
      }
      if (ring > 0.05) {
        const alpha = Math.min(LEVELS, Math.round((0.35 + ring * 0.65) * LEVELS));
        redB[alpha].push(i, 18);
        continue;
      }

      const k = i * 4;
      const h = sa[k] * cb[0] - ca[k] * sb[0] +
                sa[k + 1] * cb[1] - ca[k + 1] * sb[1] +
                sa[k + 2] * cb[2] - ca[k + 2] * sb[2] +
                sa[k + 3] * cb[3] - ca[k + 3] * sb[3];
      let a = rest[i] + h * amp;
      let sz = 15;

      if (lk) {
        const dx = gx - lx, dy = gy - ly, d2 = dx * dx + dy * dy;
        if (d2 < LR2) {
          const f = 1 - Math.sqrt(d2) / LENS_R;
          const ff = f * f * (3 - 2 * f) * lk;
          a += ff * 0.22;
          sz = Math.round(15 + ff * 5);
        }
      }
      const bIndex = Math.min(LEVELS, Math.max(1, Math.round(a * LEVELS)));
      boneB[bIndex].push(i, sz);
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const paint = (buckets, styles) => {
      for (let lv = 0; lv <= LEVELS; lv++) {
        const b = buckets[lv];
        if (!b.length) continue;
        ctx.fillStyle = styles[lv];
        for (let j = 0; j < b.length; j += 2) {
          const idx = b[j], sz = b[j + 1] / 10;
          ctx.fillRect(x[idx] - sz / 2, y[idx] - sz / 2, sz, sz);
        }
      }
    };

    paint(boneB, boneStyle);
    paint(redB, redStyle);
  }

  function seaLoop(now) {
    if (!sea.running) return;
    if (sea.ramp < 1) sea.ramp = Math.min(1, sea.ramp + 1 / 60);
    lens.x += (lens.tx - lens.x) * 0.22;
    lens.y += (lens.ty - lens.y) * 0.22;
    lens.k += ((lens.on ? 1 : 0) - lens.k) * 0.12;
    if (!document.hidden) drawSea(now);
    requestAnimationFrame(seaLoop);
  }

  function startSea() {
    if (reduce) {
      sea.ramp = 0;
      drawSea(performance.now());
      return;
    }
    if (!sea.running) {
      sea.running = true;
      requestAnimationFrame(seaLoop);
    }
  }

  function ignite() {
    return new Promise(done => {
      if (reduce) {
        done();
        return;
      }
      const t0 = performance.now();
      const DUR = 480;
      const f = () => {
        const t = Math.min(1, (performance.now() - t0) / DUR);
        drawIgnition(Math.max(0.001, easeIO(t)));
        if (t >= 1) {
          done();
          return;
        }
        requestAnimationFrame(f);
      };
      f();
    });
  }

  /* ================= 2. CLOCK TELEMETRY ================= */
  const pad = n => String(n).padStart(2, '0');
  function initClock() {
    const clock = document.getElementById('clock');
    if (!clock) return;
    const tick = () => {
      const d = new Date();
      clock.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
      setTimeout(tick, 1000 - d.getMilliseconds());
    };
    tick();
  }

  /* ================= 3. REGISTRATION MARKS ALIGN ================= */
  async function registerAlign() {
    const regs = [...document.querySelectorAll('.reg')];
    if (!regs.length) return;
    document.body.classList.remove('booting-hud');
    await Promise.all(regs.map(async (r, i) => {
      await wait(i * 80);
      const jumps = 2;
      for (let k = 0; k < jumps; k++) {
        Object.assign(r.style, {
          left: R2(8, 92) + '%',
          top: R2(8, 88) + '%',
          right: 'auto',
          bottom: 'auto',
          opacity: '1'
        });
        await wait(R2(50, 90));
        r.style.opacity = '0';
        await wait(R2(40, 70));
      }
      r.removeAttribute('style');
      if (!reduce) {
        r.animate(STROBE, { duration: 320 });
      }
      await wait(280);
    }));
  }

  /* ================= 4. WORDMARK BOOT SEQUENCE ================= */
  async function bootWordmark() {
    const logo = document.getElementById('logo');
    if (!logo) return;

    const lb = logo.querySelector('.brand-lb');
    const rb = logo.querySelector('.brand-rb');
    const slash = logo.querySelector('.brand-slash');
    const textA = logo.querySelector('.brand-text-a');
    const textB = logo.querySelector('.brand-text-b');
    const statusDot = logo.querySelector('.status-dot');

    const strA = textA ? textA.textContent.trim() : 'SHEHZADE';
    const strB = textB ? textB.textContent.trim() : 'ABDULLAH ANSARI';

    if (textA) textA.textContent = '';
    if (textB) textB.textContent = '';
    logo.classList.remove('booting');

    if (statusDot && !reduce) {
      statusDot.animate(TUBE, { duration: 500, fill: 'backwards' });
    }

    if (!reduce) {
      [lb, slash, rb].filter(Boolean).forEach(el => el.animate(STROBE, { duration: 280, fill: 'backwards' }));
    }

    // Terminal slash spinner
    const spinnerFrames = ['/', '-', '\\', '|', '/', '-', '\\', '//'];
    let spinIdx = 0;
    const spinInterval = setInterval(() => {
      if (slash) {
        slash.textContent = spinnerFrames[spinIdx % (spinnerFrames.length - 1)];
        spinIdx++;
      }
    }, 70);

    await wait(180);

    // Type text A
    if (textA) {
      for (let i = 1; i <= strA.length; i++) {
        textA.textContent = strA.slice(0, i);
        await wait(36);
      }
    }

    await wait(90);

    // Type text B
    if (textB) {
      for (let i = 1; i <= strB.length; i++) {
        textB.textContent = strB.slice(0, i);
        await wait(32);
      }
    }

    clearInterval(spinInterval);
    if (slash) slash.textContent = '//';

    // Snap bracket bounce
    if (!reduce && lb && rb) {
      lb.animate([{ transform: 'none' }, { transform: 'translateX(-7px)', offset: 0.4 }, { transform: 'none' }], { duration: 280, easing: SNAP });
      rb.animate([{ transform: 'none' }, { transform: 'translateX(7px)', offset: 0.4 }, { transform: 'none' }], { duration: 280, easing: SNAP });
    }

    await wait(200);
  }

  /* ================= 5. BYLINE TYPEWRITER ================= */
  async function typeByline() {
    const el = document.getElementById('byline');
    if (!el) return;
    const fullText = el.getAttribute('data-text') || el.textContent.trim();
    if (!fullText) return;

    const render = (n, showCursor) => {
      const typed = fullText.slice(0, n);
      const rest = fullText.slice(n);
      el.innerHTML = `${typed}${showCursor ? '<span class="cur"></span>' : ''}<span class="rest">${rest}</span>`;
    };

    render(0, true);
    await wait(160);

    for (let i = 1; i <= fullText.length; i++) {
      render(i, true);
      const ch = fullText[i - 1];
      const pause = (ch === '/' || ch === ',' || ch === '-' || ch === '.') ? 110 : 26;
      await wait(pause);
    }

    await wait(200);
    render(fullText.length, false);
  }

  /* ================= 6. GLITCH ON BRAND INTERACTION ================= */
  function initGlitch() {
    const logo = document.getElementById('logo');
    if (!logo || reduce) return;

    let isGlitching = false;
    const glitch = async () => {
      if (isGlitching) return;
      isGlitching = true;
      const textA = logo.querySelector('.brand-text-a');
      const textB = logo.querySelector('.brand-text-b');
      const origA = textA ? textA.textContent : '';
      const origB = textB ? textB.textContent : '';
      const chars = '01#@%&*!§?';

      for (let f = 0; f < 5; f++) {
        if (textA) {
          textA.textContent = origA.split('').map(c => Math.random() < 0.25 ? chars[Math.floor(Math.random() * chars.length)] : c).join('');
        }
        if (textB) {
          textB.textContent = origB.split('').map(c => Math.random() < 0.25 ? chars[Math.floor(Math.random() * chars.length)] : c).join('');
        }
        await wait(R2(25, 55));
      }
      if (textA) textA.textContent = origA;
      if (textB) textB.textContent = origB;
      isGlitching = false;
    };

    logo.addEventListener('pointerenter', e => {
      if (e.pointerType === 'mouse') glitch();
    });
    logo.addEventListener('click', glitch);
  }

  /* ================= 7. EVENT LISTENERS ================= */
  if (!reduce) {
    window.addEventListener('pointerdown', e => {
      if (e.button > 0) return;
      if (pulses.length >= 4) pulses.shift();
      pulses.push({
        x: e.clientX,
        y: e.clientY,
        t0: performance.now(),
        r: 0,
        max: reach(e.clientX, e.clientY)
      });
    }, { passive: true });

    window.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      if (!lens.on && lens.k < 0.01) {
        lens.x = e.clientX;
        lens.y = e.clientY;
      }
      lens.tx = e.clientX;
      lens.ty = e.clientY;
      lens.on = true;
    }, { passive: true });

    document.documentElement.addEventListener('pointerleave', () => { lens.on = false; });
    window.addEventListener('blur', () => { lens.on = false; });
  }

  /* ================= 8. MASTER BOOT SEQUENCE ================= */
  async function boot() {
    initClock();
    initGlitch();

    if (reduce) {
      document.body.classList.remove('booting-hud');
      const logo = document.getElementById('logo');
      if (logo) logo.classList.remove('booting');
      startSea();
      return;
    }

    const logo = document.getElementById('logo');
    if (logo) logo.classList.add('booting');
    document.body.classList.add('booting-hud');

    drawIgnition(0.0001);

    // 1. Ignition wave expands from center
    await ignite();
    startSea();

    // 2. Wordmark terminal boot sequence
    await bootWordmark();

    // 3. Registration marks align into corners
    await registerAlign();

    // 4. Clock telemetry strobes on
    const clock = document.getElementById('clock');
    if (clock) {
      clock.animate(STROBE, { duration: 300 });
    }

    // 5. Byline types out behind block cursor
    await typeByline();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
