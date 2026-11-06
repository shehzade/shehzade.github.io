/**
 * AstraLabs Fast Motion Engine & Interactive Dot Matrix
 * Ported & optimized with high-speed boot ignition, pointer lens, and click shockwaves.
 */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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

  const easeIO = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

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

  // Grouped brightness rendering buckets for maximum 60fps/120fps performance
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

    // Advance shockwave pulses
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
    if (reduceMotion) {
      sea.ramp = 0;
      drawSea(performance.now());
      return;
    }
    if (!sea.running) {
      sea.running = true;
      requestAnimationFrame(seaLoop);
    }
  }

  // Fast ignition sequence: 550ms rapid sweep
  function ignite() {
    return new Promise(done => {
      if (reduceMotion) {
        done();
        return;
      }
      const t0 = performance.now();
      const DUR = 550;
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

  // Event Listeners for interactive pointer lens & shockwave click ripples
  if (!reduceMotion) {
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

  // Start fast ignition immediately on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      ignite().then(startSea);
    });
  } else {
    ignite().then(startSea);
  }
})();
