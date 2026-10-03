(() => {

'use strict';



const APP_SCRIPT_URL = document.currentScript?.src || new URL('assets/js/app.js', location.href).href;

const SITE_ROOT_URL = new URL('../../', APP_SCRIPT_URL);

const siteUrl = path => new URL(path, SITE_ROOT_URL).href;



async function fetchJson(path) {

  const response = await fetch(siteUrl(path));

  if (!response.ok) throw new Error(`Failed to load ${path}: ${response.status}`);

return response.json();

}



function resolveSiteUrl(value) {

  if (!value || value === '#' || /^(?:[a-z]+:|#)/i.test(value)) return value;

return siteUrl(value);

}



// Pixelchemy Research — shared site interactions



// Theme persistence

const toggle = document.getElementById('theme-toggle');

const storedTheme = localStorage.getItem('theme');

if (storedTheme) document.documentElement.dataset.theme = storedTheme;

if (toggle) {

  toggle.addEventListener('click', () => {

    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';

    document.documentElement.dataset.theme = next;

    localStorage.setItem('theme', next);

  });

}



// Fixed navigation state + active link

const navbar = document.querySelector('.navbar');

const updateNavbar = () => navbar?.classList.toggle('is-scrolled', window.scrollY > 14);

updateNavbar();

window.addEventListener('scroll', updateNavbar, { passive: true });



(() => {

  const here = location.pathname.replace(/\/+$/, '') || '/';

  document.querySelectorAll('.nav-links a').forEach(a => {

    const target = new URL(a.href, location.href).pathname.replace(/\/+$/, '') || '/';

    const currentFile = here.split('/').pop();

    const targetFile = target.split('/').pop();

    if ((currentFile && currentFile === targetFile) || (here === '/' && targetFile === 'index.html')) {

      a.classList.add('active');

    }

  });

})();



// Scroll reveal

const revealTargets = document.querySelectorAll('.section, .card, .publication, .research-item, .news-card, .person, .project-content');

revealTargets.forEach(el => el.classList.add('reveal'));

if ('IntersectionObserver' in window) {

  const revealObserver = new IntersectionObserver(entries => {

    entries.forEach(entry => {

      if (entry.isIntersecting) {

        entry.target.classList.add('visible');

        revealObserver.unobserve(entry.target);

      }

    });

  }, { threshold: 0.07 });

  revealTargets.forEach(el => revealObserver.observe(el));

} else {

  revealTargets.forEach(el => el.classList.add('visible'));

}



// Spatial foreground surfaces. These elements sit above the cube field and

// receive a moving projected shadow when a cube passes behind them.

const spatialSurfaceSelector = [

  '.card', '.news-card', '.research-item', '.person', '.publication',

  '.project-content', '.announcement-link'

].join(',');

let spatialSurfaces = [];

function refreshSpatialSurfaces() {

  spatialSurfaces = Array.from(document.querySelectorAll(spatialSurfaceSelector));

  spatialSurfaces.forEach(el => el.classList.add('spatial-surface'));

}

refreshSpatialSurfaces();

let spatialRefreshQueued = false;

new MutationObserver(() => {

  if (spatialRefreshQueued) return;

  spatialRefreshQueued = true;

  requestAnimationFrame(() => {

    spatialRefreshQueued = false;

    refreshSpatialSurfaces();

  });

}).observe(document.body, { childList: true, subtree: true });



// Back-to-top control

(() => {

  const button = document.createElement('button');

  button.className = 'back-to-top';

  button.type = 'button';

  button.setAttribute('aria-label', 'Back to top');

  button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 15l6-6 6 6"/></svg>';

  document.body.appendChild(button);



  const update = () => button.classList.toggle('visible', window.scrollY > 420);

  update();

  window.addEventListener('scroll', update, { passive: true });

  button.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

})();



// Interactive probability trail.

// The path stores recent pointer positions. Each particle targets a sampled

// point behind the cursor plus a Gaussian offset, creating a moving density tail.

(() => {

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;



  const canvas = document.createElement('canvas');

  canvas.className = 'probability-field';

  canvas.setAttribute('aria-hidden', 'true');

  document.body.prepend(canvas);



  const ctx = canvas.getContext('2d', { alpha: true });

  let width = innerWidth;

  let height = innerHeight;

  let dpr = 1;

  let particles = [];

  let trail = [];

  let pointer = { x: width * .5, y: height * .35, active: false, lastMove: 0 };

  let ambient = 0;



  const gaussian = () => {

    let u = 0, v = 0;

    while (u === 0) u = Math.random();

    while (v === 0) v = Math.random();

return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);

  };



  const makeParticle = () => ({

    x: Math.random() * width,

    y: Math.random() * height,

    vx: 0,

    vy: 0,

    gx: gaussian(),

    gy: gaussian(),

    ageBias: Math.pow(Math.random(), .62),

    size: .75 + Math.random() * 1.9,

    phase: Math.random() * Math.PI * 2,

    seed: Math.random()

  });



  const resize = () => {

    dpr = Math.min(devicePixelRatio || 1, 2);

    width = innerWidth;

    height = innerHeight;

    canvas.width = Math.round(width * dpr);

    canvas.height = Math.round(height * dpr);

    canvas.style.width = width + 'px';

    canvas.style.height = height + 'px';

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const count = Math.max(82, Math.min(170, Math.round((width * height) / 9300)));

    particles = Array.from({ length: count }, makeParticle);

  };



  const pushTrail = (x, y, force = false) => {

    const now = performance.now();

    const head = trail[0];

    if (force || !head || Math.hypot(x - head.x, y - head.y) > 6 || now - head.t > 28) {

      trail.unshift({ x, y, t: now });

      trail = trail.slice(0, 36);

    }

  };



  const movePointer = (x, y) => {

    pointer.x = x;

    pointer.y = y;

    pointer.active = true;

    pointer.lastMove = performance.now();

    pushTrail(x, y);

  };



  window.addEventListener('pointermove', e => movePointer(e.clientX, e.clientY), { passive: true });

  window.addEventListener('pointerdown', e => {

    movePointer(e.clientX, e.clientY);

    pushTrail(e.clientX, e.clientY, true);

    particles.forEach(p => { p.gx = gaussian(); p.gy = gaussian(); });

  }, { passive: true });

  window.addEventListener('pointerleave', () => { pointer.active = false; }, { passive: true });

  window.addEventListener('blur', () => { pointer.active = false; });

  window.addEventListener('resize', resize, { passive: true });



  const pointAtBias = bias => {

    if (!trail.length) return { x: pointer.x, y: pointer.y, age: 0, index: 0 };

    const maxIndex = trail.length - 1;

    const index = Math.min(maxIndex, Math.floor(bias * maxIndex));

    const point = trail[index];

return { ...point, index, age: maxIndex ? index / maxIndex : 0 };

  };



  const drawTrailDensity = (dark, activity) => {

    if (!trail.length || activity <= .02) return;

    const samples = [0, .16, .34, .56, .78];

    samples.forEach((bias, i) => {

      const p = pointAtBias(bias);

      const radius = 60 + i * 20;

      const alpha = (.070 - i * .010) * activity;

      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);

      g.addColorStop(0, dark ? `rgba(64,181,246,${alpha})` : `rgba(14,137,213,${alpha})`);

      g.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.fillStyle = g;

      ctx.beginPath();

      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);

      ctx.fill();

    });

  };



  const frame = t => {

    ambient = t * .00025;

    const now = performance.now();

    const dark = document.documentElement.dataset.theme === 'dark';

    const sinceMove = now - pointer.lastMove;

    const activity = Math.max(0, Math.min(1, 1 - (sinceMove - 120) / 1200));



// Keep the cursor head fresh while moving; decay old points smoothly.

    trail = trail.filter(p => now - p.t < 1550);

    if (!trail.length && pointer.active) pushTrail(pointer.x, pointer.y, true);



    ctx.clearRect(0, 0, width, height);

    drawTrailDensity(dark, activity);



    particles.forEach(p => {

      let targetX, targetY, tailAge;

      if (trail.length && activity > .02) {

        const tp = pointAtBias(p.ageBias);

        tailAge = tp.age;



// Wider Gaussian farther down the tail; newest mass remains tighter.

        const sigmaX = 30 + tailAge * 76;

        const sigmaY = 22 + tailAge * 56;

        targetX = tp.x + p.gx * sigmaX + Math.sin(ambient * 8 + p.phase) * (3 + tailAge * 7);

        targetY = tp.y + p.gy * sigmaY + Math.cos(ambient * 7 + p.phase) * (3 + tailAge * 7);

      } else {

        tailAge = .75;

        const cx = width * (.50 + .13 * Math.sin(ambient * .8));

        const cy = height * (.40 + .08 * Math.cos(ambient));

        targetX = cx + p.gx * Math.max(120, width * .12);

        targetY = cy + p.gy * Math.max(80, width * .075);

      }



      const stiffness = activity > .02 ? .014 : .0044;

      const damping = activity > .02 ? .885 : .945;

      p.vx += (targetX - p.x) * stiffness;

      p.vy += (targetY - p.y) * stiffness;

      p.vx *= damping;

      p.vy *= damping;

      p.x += p.vx;

      p.y += p.vy;



      const headWeight = 1 - Math.min(1, tailAge);

      const motionAlpha = activity > .02 ? (.16 + headWeight * .42) * activity : .10;

      const radius = p.size + headWeight * 1.75;



      ctx.fillStyle = dark

        ? `rgba(78,188,248,${motionAlpha})`

        : `rgba(9,126,202,${motionAlpha})`;

      ctx.beginPath();

      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);

      ctx.fill();



      if (p.seed > .73 && activity > .35) {

        ctx.strokeStyle = dark

          ? `rgba(127,215,255,${.10 * activity})`

          : `rgba(34,158,224,${.085 * activity})`;

        ctx.lineWidth = 1;

        ctx.beginPath();

        ctx.arc(p.x, p.y, radius + 3, 0, Math.PI * 2);

        ctx.stroke();

      }

    });



    requestAnimationFrame(frame);

  };



  const resetTrail = (fade = false) => {

    trail = [];

    pointer.active = false;

    pointer.lastMove = 0;

    particles.forEach(p => {

      p.gx = gaussian();

      p.gy = gaussian();

      p.vx *= .18;

      p.vy *= .18;

    });

    if (fade) canvas.classList.add('is-resetting');

    ctx.clearRect(0, 0, width, height);

  };



  window.addEventListener('pixelchemy:navigation-start', () => resetTrail(true));

  window.addEventListener('pageshow', () => {

    resetTrail(false);

    canvas.classList.remove('is-resetting');

  });



  resize();

  requestAnimationFrame(frame);

})();







// Bouncing 3D cube background.

// Count and motion parameters are controlled in /config/site-config.json.

(() => {

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;



  const fallback = {

    enabled: true,

    count: 10,

    sizeMin: 30,

    sizeMax: 64,

    speedMin: 34,

    speedMax: 78,

    rotationSpeedMin: .35,

    rotationSpeedMax: 1.15,

    shatterFragments: 16,

    respawnDelayMs: 260,

    lightOpacity: .44,

    darkOpacity: .58,

    opacity: 1

  };



  const configUrl = siteUrl('config/site-config.json');



  fetch(configUrl)

    .then(r => r.ok ? r.json() : {})

    .catch(() => ({}))

    .then(siteConfig => {

      const config = { ...fallback, ...(siteConfig.backgroundCubes || {}) };

      if (!config.enabled) return;

      startCubeField(config);

    });



  function startCubeField(config) {

    const canvas = document.createElement('canvas');

    canvas.className = 'cube-field';

    canvas.setAttribute('aria-hidden', 'true');

    document.body.prepend(canvas);

    const ctx = canvas.getContext('2d', { alpha: true });



    let width = innerWidth;

    let height = innerHeight;

    let dpr = 1;

    let cubes = [];

    let shards = [];

    let lastT = performance.now();

    const count = Math.max(0, Math.min(40, Math.round(Number(config.count) || 0)));



    const rand = (a, b) => a + Math.random() * (b - a);

    const sign = () => Math.random() < .5 ? -1 : 1;



    function hexToRgb(hex, fallback) {

      if (typeof hex !== 'string') return fallback;

      const value = hex.trim().replace('#', '');

      const full = value.length === 3 ? value.split('').map(c => c + c).join('') : value;

      if (!/^[0-9a-fA-F]{6}$/.test(full)) return fallback;

return [parseInt(full.slice(0,2),16), parseInt(full.slice(2,4),16), parseInt(full.slice(4,6),16)];

    }



    function mixRgb(a, b, t) {

return a.map((v, i) => Math.round(v * (1 - t) + b[i] * t));

    }



    const lightBase = hexToRgb(config.color, [0, 119, 182]);

    const darkBase = hexToRgb(config.darkModeColor, mixRgb(lightBase, [255,255,255], .42));

    const globalOpacityRaw = Number(config.opacity);

    const globalOpacity = Number.isFinite(globalOpacityRaw) ? Math.max(0, Math.min(1, globalOpacityRaw)) : 1;



    const palette = dark => {

      const base = dark ? darkBase : lightBase;

      const white = [255,255,255];

      const black = [0,0,0];

return dark ? {

        edge: mixRgb(base, white, .38),

        faceA: mixRgb(base, black, .12),

        faceB: mixRgb(base, white, .18),

        glow: mixRgb(base, white, .25),

        opacity: (Number(config.darkOpacity) || .58) * globalOpacity

      } : {

        edge: mixRgb(base, black, .34),

        faceA: mixRgb(base, black, .10),

        faceB: mixRgb(base, white, .16),

        glow: mixRgb(base, black, .05),

        opacity: (Number(config.lightOpacity) || .44) * globalOpacity

      };

    };



// Project a soft shadow from the nearest cube onto visible foreground

// surfaces. This makes cubes read as objects moving behind translucent panels.

    let spatialFrame = 0;

    function updateSpatialShadows() {

      spatialFrame++;

      if (spatialFrame % 2 !== 0 || !spatialSurfaces.length) return;



      const dark = document.documentElement.dataset.theme === 'dark';

      const maxDistance = Math.max(180, Math.min(360, Math.min(width, height) * .36));

      spatialSurfaces.forEach(el => {

        const rect = el.getBoundingClientRect();

        if (rect.bottom < -20 || rect.top > height + 20 || rect.right < -20 || rect.left > width + 20) {

          el.style.setProperty('--cube-shadow-alpha', '0');

return;

        }



        let best = null;

        let bestDistance = Infinity;

        for (const cube of cubes) {

          const px = Math.max(rect.left, Math.min(cube.x, rect.right));

          const py = Math.max(rect.top, Math.min(cube.y, rect.bottom));

          const dx = cube.x - px;

          const dy = cube.y - py;

          const d = Math.hypot(dx, dy);

          if (d < bestDistance) {

            bestDistance = d;

            best = cube;

          }

        }



        if (!best || bestDistance > maxDistance) {

          el.style.setProperty('--cube-shadow-alpha', '0');

return;

        }



        const localX = best.x - rect.left;

        const localY = best.y - rect.top;

        const proximity = 1 - Math.min(1, bestDistance / maxDistance);

        const alpha = Math.pow(proximity, 1.7) * (dark ? .34 : .28);

        const size = Math.max(80, Math.min(175, best.size * 2.15 + 58));

        el.style.setProperty('--cube-shadow-x', `${localX.toFixed(1)}px`);

        el.style.setProperty('--cube-shadow-y', `${localY.toFixed(1)}px`);

        el.style.setProperty('--cube-shadow-size', `${size.toFixed(1)}px`);

        el.style.setProperty('--cube-shadow-alpha', alpha.toFixed(3));

      });

    }



    function randomVelocity() {

      const speed = rand(Number(config.speedMin) || 34, Number(config.speedMax) || 78);

      const angle = rand(0, Math.PI * 2);

return { vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed };

    }



    function makeCube(fromEdge = false) {

      const size = rand(Number(config.sizeMin) || 30, Number(config.sizeMax) || 64);

      const radius = size * .78;

      let x, y;

      if (fromEdge) {

        const side = Math.floor(Math.random() * 4);

        if (side === 0) { x = radius + 2; y = rand(radius, Math.max(radius, height - radius)); }

        else if (side === 1) { x = width - radius - 2; y = rand(radius, Math.max(radius, height - radius)); }

        else if (side === 2) { x = rand(radius, Math.max(radius, width - radius)); y = radius + 2; }

        else { x = rand(radius, Math.max(radius, width - radius)); y = height - radius - 2; }

      } else {

        x = rand(radius, Math.max(radius, width - radius));

        y = rand(radius, Math.max(radius, height - radius));

      }

      const v = randomVelocity();

      const rmin = Number(config.rotationSpeedMin) || .35;

      const rmax = Number(config.rotationSpeedMax) || 1.15;

return {

        id: Math.random().toString(36).slice(2),

        x, y, size, radius,

        vx: v.vx, vy: v.vy,

        rx: rand(0, Math.PI * 2), ry: rand(0, Math.PI * 2), rz: rand(0, Math.PI * 2),

        vrx: sign() * rand(rmin, rmax),

        vry: sign() * rand(rmin, rmax),

        vrz: sign() * rand(rmin * .45, rmax * .75),

        birth: performance.now(),

        bounds: null

      };

    }



    function resize() {

      dpr = Math.min(devicePixelRatio || 1, 2);

      width = innerWidth;

      height = innerHeight;

      canvas.width = Math.round(width * dpr);

      canvas.height = Math.round(height * dpr);

      canvas.style.width = width + 'px';

      canvas.style.height = height + 'px';

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      cubes.forEach(c => {

        c.x = Math.min(Math.max(c.radius, c.x), Math.max(c.radius, width - c.radius));

        c.y = Math.min(Math.max(c.radius, c.y), Math.max(c.radius, height - c.radius));

      });

    }



    const vertices = [

      [-1,-1,-1], [1,-1,-1], [1,1,-1], [-1,1,-1],

      [-1,-1, 1], [1,-1, 1], [1,1, 1], [-1,1, 1]

    ];

    const faces = [

      [0,1,2,3], [4,5,6,7], [0,1,5,4],

      [2,3,7,6], [1,2,6,5], [0,3,7,4]

    ];



    function rotatePoint(v, cube) {

      let [x,y,z] = v;

      const cx = Math.cos(cube.rx), sx = Math.sin(cube.rx);

      const cy = Math.cos(cube.ry), sy = Math.sin(cube.ry);

      const cz = Math.cos(cube.rz), sz = Math.sin(cube.rz);

      let y1 = y * cx - z * sx, z1 = y * sx + z * cx;

      y = y1; z = z1;

      let x1 = x * cy + z * sy; z1 = -x * sy + z * cy;

      x = x1; z = z1;

      x1 = x * cz - y * sz; y1 = x * sz + y * cz;

return [x1, y1, z];

    }



    function projectCube(cube) {

      const half = cube.size * .5;

      const scaleIn = Math.min(1, (performance.now() - cube.birth) / 340);

      const easedBirth = 1 - Math.pow(1 - scaleIn, 3);

return vertices.map(v => {

        const r = rotatePoint(v, cube);

        const persp = 1 + r[2] * .075;

return {

          x: cube.x + r[0] * half * persp * easedBirth,

          y: cube.y + r[1] * half * persp * easedBirth,

          z: r[2]

        };

      });

    }



    function rgba(rgb, a) { return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`; }



    function drawCube(cube, dark) {

      const pal = palette(dark);

      const pts = projectCube(cube);

      const xs = pts.map(p => p.x), ys = pts.map(p => p.y);

      cube.bounds = { minX: Math.min(...xs)-6, maxX: Math.max(...xs)+6, minY: Math.min(...ys)-6, maxY: Math.max(...ys)+6 };



      const ordered = faces.map((idx, i) => ({ idx, i, z: idx.reduce((s, k) => s + pts[k].z, 0) / idx.length }))

        .sort((a,b) => a.z - b.z);



      ctx.save();

      ctx.shadowColor = rgba(pal.glow, dark ? .23 : .15);

      ctx.shadowBlur = dark ? 13 : 8;

      ordered.forEach((f, order) => {

        const shade = (f.z + 1.75) / 3.5;

        const alpha = pal.opacity * (.10 + shade * .15);

        const blend = order / Math.max(1, ordered.length - 1);

        const col = pal.faceA.map((v, i) => Math.round(v * (1-blend) + pal.faceB[i] * blend));

        ctx.beginPath();

        f.idx.forEach((k, j) => j ? ctx.lineTo(pts[k].x, pts[k].y) : ctx.moveTo(pts[k].x, pts[k].y));

        ctx.closePath();

        ctx.fillStyle = rgba(col, alpha);

        ctx.fill();

      });

      ctx.shadowBlur = 0;

      ctx.strokeStyle = rgba(pal.edge, pal.opacity * .88);

      ctx.lineWidth = dark ? 1.45 : 1.35;

      const edges = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];

      edges.forEach(([a,b]) => {

        ctx.beginPath(); ctx.moveTo(pts[a].x, pts[a].y); ctx.lineTo(pts[b].x, pts[b].y); ctx.stroke();

      });

      ctx.restore();

    }



    function shatterCube(index) {

      const cube = cubes[index];

      if (!cube) return;

      const dark = document.documentElement.dataset.theme === 'dark';

      const pal = palette(dark);

      const fragmentCount = Math.max(6, Math.min(40, Math.round(Number(config.shatterFragments) || 16)));

      for (let i = 0; i < fragmentCount; i++) {

        const angle = rand(0, Math.PI * 2);

        const speed = rand(70, 190);

        shards.push({

          x: cube.x + rand(-cube.size*.18, cube.size*.18),

          y: cube.y + rand(-cube.size*.18, cube.size*.18),

          vx: Math.cos(angle) * speed + cube.vx * .3,

          vy: Math.sin(angle) * speed + cube.vy * .3,

          rot: rand(0, Math.PI * 2),

          spin: rand(-5, 5),

          size: rand(2.5, Math.max(4, cube.size * .12)),

          life: 1,

          color: i % 2 ? pal.faceA : pal.edge

        });

      }

      cubes.splice(index, 1);

      setTimeout(() => {

        if (cubes.length < count) cubes.push(makeCube(true));

      }, Math.max(0, Number(config.respawnDelayMs) || 260));

    }



    function hitCube(x, y) {

      for (let i = cubes.length - 1; i >= 0; i--) {

        const b = cubes[i].bounds;

        if (b && x >= b.minX && x <= b.maxX && y >= b.minY && y <= b.maxY) return i;

      }

return -1;

    }



    document.addEventListener('pointerdown', e => {

      if (e.button !== 0) return;

      if (e.target.closest('a,button,input,select,textarea,[role="button"],[contenteditable="true"]')) return;

      const index = hitCube(e.clientX, e.clientY);

      if (index >= 0) shatterCube(index);

    });



    function updateCube(c, dt) {

      c.x += c.vx * dt; c.y += c.vy * dt;

      c.rx += c.vrx * dt; c.ry += c.vry * dt; c.rz += c.vrz * dt;

      const r = c.radius;

      if (c.x - r <= 0 && c.vx < 0) { c.x = r; c.vx = Math.abs(c.vx); }

      if (c.x + r >= width && c.vx > 0) { c.x = width - r; c.vx = -Math.abs(c.vx); }

      if (c.y - r <= 0 && c.vy < 0) { c.y = r; c.vy = Math.abs(c.vy); }

      if (c.y + r >= height && c.vy > 0) { c.y = height - r; c.vy = -Math.abs(c.vy); }

    }



    function updateShards(dt, dark) {

      const pal = palette(dark);

      shards = shards.filter(s => s.life > 0);

      shards.forEach(s => {

        s.x += s.vx * dt; s.y += s.vy * dt;

        s.vx *= Math.pow(.955, dt * 60);

        s.vy = s.vy * Math.pow(.955, dt * 60) + 32 * dt;

        s.rot += s.spin * dt;

        s.life -= dt * 1.55;

        const a = Math.max(0, s.life) * pal.opacity;

        ctx.save();

        ctx.translate(s.x, s.y); ctx.rotate(s.rot);

        ctx.fillStyle = rgba(s.color, a * .52);

        ctx.strokeStyle = rgba(pal.edge, a);

        ctx.lineWidth = 1;

        ctx.fillRect(-s.size*.5, -s.size*.5, s.size, s.size);

        ctx.strokeRect(-s.size*.5, -s.size*.5, s.size, s.size);

        ctx.restore();

      });

    }



    function frame(t) {

      const dt = Math.min(.035, Math.max(.001, (t - lastT) / 1000));

      lastT = t;

      const dark = document.documentElement.dataset.theme === 'dark';

      ctx.clearRect(0, 0, width, height);

      cubes.forEach(c => { updateCube(c, dt); drawCube(c, dark); });

      updateSpatialShadows();

      updateShards(dt, dark);

      requestAnimationFrame(frame);

    }



    resize();

    cubes = Array.from({ length: count }, () => makeCube(false));

    addEventListener('resize', resize, { passive: true });

    requestAnimationFrame(frame);

  }

})();





// Stable document navigation.

// Native same-site navigation is kept bfcache-safe; only transient effects are reset.

(() => {

  function resetTransientState() {

    document.body?.classList.remove('page-leaving');

    const stale = document.getElementById('gv-page-handoff');

    if (stale) stale.remove();

    window.dispatchEvent(new Event('pixelchemy:navigation-reset'));

  }



// Clear all transient UI both on ordinary loads and bfcache restores.

  window.addEventListener('pageshow', resetTransientState);

  window.addEventListener('pagehide', () => {

    const stale = document.getElementById('gv-page-handoff');

    if (stale) stale.remove();

  });



// Reset the pointer trail immediately before a same-site navigation, but

// leave navigation itself to the browser. This keeps Back/Forward reliable.

  document.addEventListener('click', event => {

    const anchor = event.target.closest('a[href]');

    if (!anchor || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    if (anchor.target === '_blank' || anchor.hasAttribute('download')) return;

    const href = anchor.getAttribute('href');

    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('javascript:')) return;

    const url = new URL(anchor.href, location.href);

    if (url.origin !== location.origin) return;

    window.dispatchEvent(new Event('pixelchemy:navigation-start'));

  }, { capture: true });

})();





// -----------------------------------------------------------------------------

// Data-driven page modules

// -----------------------------------------------------------------------------



async function initNews() {

  const announcement = document.getElementById('hero-announcement');

  const homeGrid = document.getElementById('home-news-grid');

  const list = document.getElementById('news-list');

  if (!announcement && !homeGrid && !list) return;



  const data = await fetchJson('data/news.json');

  data.sort((a, b) => b.date.localeCompare(a.date));

  const formatDate = date => new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {

    year: 'numeric', month: 'short', day: 'numeric'

  });



  if (announcement && data.length) {

    const latest = data[0];

    const title = announcement.querySelector('.announcement-title');

    if (title) title.textContent = latest.title || latest.text || 'Latest research update';

    announcement.href = resolveSiteUrl(latest.link || 'news.html');

    announcement.hidden = false;

  }



  if (homeGrid) {

    data.slice(0, 3).forEach(item => {

      const article = document.createElement('article');

      article.className = 'news-card';

      article.innerHTML = `

        <div class="news-topline">

          <span class="news-type">${item.type || 'Update'}</span>

          <span class="news-date">${formatDate(item.date)}</span>

        </div>

        <h3 class="news-title">${item.title || item.text}</h3>

        <p class="news-text">${item.text || ''}</p>

        ${item.link ? `<a class="text-link" href="${resolveSiteUrl(item.link)}">Read more →</a>` : ''}`;

      homeGrid.appendChild(article);

    });

  }



  if (list) {

    list.classList.add('news-list');

    data.forEach(item => {

      const row = document.createElement('article');

      row.className = 'news-row';

      row.innerHTML = `

        <div>

          <div class="news-date">${formatDate(item.date)}</div>

          <div class="news-type" style="margin-top:10px">${item.type || 'Update'}</div>

        </div>

        <div>

          <h3>${item.title || item.text}</h3>

          <p>${item.text || ''}</p>

          ${item.link ? `<a class="text-link" href="${resolveSiteUrl(item.link)}" style="margin-top:12px">Read more →</a>` : ''}

        </div>`;

      list.appendChild(row);

    });

  }

}



async function initPeople() {

  const container = document.getElementById('people-grid');

  if (!container) return;



  const data = await fetchJson('data/people.json');



  const icons = {

    homepage: `

      <svg viewBox="0 0 24 24" aria-hidden="true">

        <path d="M3 10.5 12 3l9 7.5v9a1.5 1.5 0 0 1-1.5 1.5H15v-6H9v6H4.5A1.5 1.5 0 0 1 3 19.5z"/>

      </svg>

    `,



    scholar: `

      <svg viewBox="0 0 24 24" aria-hidden="true">

        <path d="M12 3 2 8l10 5 8-4v6h2V8L12 3zm-6 9v4.5C6 19 8.7 21 12 21s6-2 6-4.5V12l-6 3-6-3z"/>

      </svg>

    `,



    github: `

      <svg viewBox="0 0 24 24" aria-hidden="true">

        <path d="M12 .7a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.1c-3.3.7-4-1.4-4-1.4-.5-1.4-1.3-1.8-1.3-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.6-.3-5.4-1.3-5.4-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17 5.6 18 5.9 18 5.9c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.4 5.9.4.4.8 1.1.8 2.2v3.2c0 .3.2.7.8.6A12 12 0 0 0 12 .7z"/>

      </svg>

    `,



    linkedin: `

      <svg viewBox="0 0 24 24" aria-hidden="true">

        <path d="M4.6 3.2A2.6 2.6 0 1 1 4.6 8.4a2.6 2.6 0 0 1 0-5.2zM2.4 9.8h4.4V22H2.4V9.8zm7.1 0h4.2v1.7h.1c.6-1.1 2-2.3 4.1-2.3 4.4 0 5.2 2.9 5.2 6.6V22h-4.4v-5.5c0-1.3 0-3-1.8-3-1.9 0-2.2 1.5-2.2 2.9V22H9.5V9.8z"/>

      </svg>

    `

  };



  const socialLink = (type, url, label) => {

    if (!url || url === '#') return '';



return `

      <a

        class="person-link"

        href="${resolveSiteUrl(url)}"

        target="_blank"

        rel="noopener noreferrer"

        aria-label="${label}"

        title="${label}"

      >

        ${icons[type]}

      </a>

    `;

  };



  data.forEach(person => {

    const card = document.createElement('div');

    card.className = `person ${person.type === 'leader' ? 'person-leader' : 'person-member'}`;



    card.innerHTML = `

      ${person.type === 'leader'

        ? '<span class="person-badge">Leader</span>'

        : ''

      }

      <img

        src="${resolveSiteUrl(person.image)}"

        alt="${person.name}"

      >



      <h3>${person.name}</h3>



      <p class="person-role" style="color: #f00a7d">

        <b>${person.role}</b>

      </p>



      <p class="person-interests">

        ${person.interests}

      </p>



      <div class="person-links">

        ${socialLink('homepage', person.homepage, 'Homepage')}

        ${socialLink('scholar', person.scholar, 'Google Scholar')}

        ${socialLink('github', person.github, 'GitHub')}

        ${socialLink('linkedin', person.linkedin, 'LinkedIn')}

      </div>

    `;



    container.appendChild(card);

  });

}



async function initProjects() {

  const grid = document.getElementById('projects-grid');

  if (!grid) return;

  const filterBar = document.getElementById('project-filters');

  const allProjects = await fetchJson('data/projects.json');

  let activeFilter = 'all';



  const tagsFor = project => Array.isArray(project.tags) && project.tags.length

    ? project.tags

    : [project.category].filter(Boolean);



  const uniqueTags = () => {

    const tags = [];

    allProjects.forEach(project => tagsFor(project).forEach(tag => {

      if (!tags.includes(tag)) tags.push(tag);

    }));

return tags;

  };



  const render = items => {

    grid.innerHTML = '';



    items.forEach((project, index) => {

      const card = document.createElement('article');



      card.className = 'card project-card filter-enter';

      card.style.animationDelay = `${Math.min(index * 55, 220)}ms`;



      const tags = tagsFor(project)

        .map(tag => `<span class="project-tag">${tag}</span>`)

        .join('');

    const startYear = project.startYear ?? project.venue ?? '';
    const status = project.status || 'Ongoing';
    const statusClass = status.toLowerCase().replace(/\s+/g, '-');



      card.innerHTML = `

        <img

          class="card-image"

          src="${resolveSiteUrl(project.image)}"

          alt="${project.title}"

        >



        <div class="card-body">



          <div class="project-tags">

            ${tags}

          </div>



          <div class="card-title">

            ${project.title}

          </div>



          <p class="card-text">

            ${project.description}

          </p>



          <div class="card-footer">

            <span>

              ${startYear ? `Since ${startYear}` : ''}

            </span>



            <span class="project-status ${statusClass}">

              ${status}

            </span>

          </div>



        </div>

      `;



      grid.appendChild(card);

    });

  };



  const applyFilter = async () => {

    grid.classList.add('is-filtering');

await new Promise(resolve => setTimeout(resolve, 240));

    const items = activeFilter === 'all'

      ? allProjects

      : allProjects.filter(project => tagsFor(project).includes(activeFilter));

    render(items);

    requestAnimationFrame(() => grid.classList.remove('is-filtering'));

  };



  if (filterBar) {

    const options = ['all', ...uniqueTags()];

    filterBar.innerHTML = options.map(tag => {

      const count = tag === 'all'

        ? allProjects.length

        : allProjects.filter(project => tagsFor(project).includes(tag)).length;

return `<button class="filter-btn ${tag === activeFilter ? 'active' : ''}" data-filter="${tag}">${tag === 'all' ? 'All' : tag}<span class="filter-count">${count}</span></button>`;

    }).join('');



    filterBar.querySelectorAll('.filter-btn').forEach(button => {

      button.addEventListener('click', async () => {

        if (button.dataset.filter === activeFilter) return;

        activeFilter = button.dataset.filter;

        filterBar.querySelectorAll('.filter-btn').forEach(item => item.classList.toggle('active', item === button));

await applyFilter();

      });

    });

  }



  render(allProjects);

}



async function initPublications() {

  const container = document.getElementById('publication-list');

  if (!container) return;



  const search = document.getElementById('pub-search');

  const nativeYear = document.getElementById('year-filter');

  const yearUi = document.getElementById('year-select-ui');

  const modal = document.getElementById('bibtex-modal');

  const modalClose = document.getElementById('modal-close');

  const bibtexContent = document.getElementById('bibtex-content');

  const bibtexCopy = document.getElementById('bibtex-copy');

  let selectedYear = 'all';

  let timer = null;

  const publications = await fetchJson('data/publications.json');

  publications.sort((a, b) => b.year - a.year);



  const link = (label, url) => (!url || url === '#')

    ? ''

    : `<a class="pub-link" href="${resolveSiteUrl(url)}" target="_blank" rel="noopener">${label}</a>`;



  const render = items => {

    container.innerHTML = '';

    let currentYear = null;

    items.forEach((publication, index) => {

      if (currentYear !== publication.year) {

        currentYear = publication.year;

        const heading = document.createElement('h2');

        heading.className = 'year-heading';

        heading.textContent = currentYear;

        container.appendChild(heading);

      }

      const card = document.createElement('div');

      card.className = 'publication filter-enter';

      card.style.animationDelay = `${Math.min(index * 55, 220)}ms`;

      card.innerHTML = `

        <img src="${resolveSiteUrl(publication.thumbnail)}" alt="${publication.title}">

        <div>

          <div class="pub-title">${publication.title}</div>

          <div class="pub-authors">${publication.authors.join(', ')}</div>

          <div class="pub-venue">${publication.venue}</div>

          <div class="pub-links">

            ${link('Project', publication.project)}${link('Paper', publication.paper)}${link('arXiv', publication.arxiv)}${link('Code', publication.code)}

            <button class="pub-link bibtex-btn" data-bibtex="${encodeURIComponent(publication.bibtex)}">BibTeX</button>

          </div>

        </div>`;

      container.appendChild(card);

    });



    container.querySelectorAll('.bibtex-btn').forEach(button => {

      button.addEventListener('click', () => {

        if (bibtexContent) bibtexContent.textContent = decodeURIComponent(button.dataset.bibtex);

        modal?.classList.add('show');

      });

    });

    bibtexCopy?.addEventListener('click', async () => {
      const text = bibtexContent?.textContent || '';

      if (!text) return;

      try {
        await navigator.clipboard.writeText(text);

        const label = bibtexCopy.querySelector('span');

        bibtexCopy.classList.add('copied');

        if (label) {
          label.textContent = 'Copied!';
        }

        setTimeout(() => {
          bibtexCopy.classList.remove('copied');

          if (label) {
            label.textContent = 'Copy';
          }
        }, 1500);

      } catch (error) {
        console.error('Failed to copy BibTeX:', error);
      }
    });

  };



  const filtered = () => {

    const query = search?.value.trim().toLowerCase() || '';

return publications.filter(publication => {

      const haystack = [publication.title, publication.venue, ...(publication.authors || [])].join(' ').toLowerCase();

return (!query || haystack.includes(query)) && (selectedYear === 'all' || String(publication.year) === selectedYear);

    });

  };



  const applyFilter = async () => {

    container.classList.add('is-filtering');

await new Promise(resolve => setTimeout(resolve, 230));

    render(filtered());

    requestAnimationFrame(() => container.classList.remove('is-filtering'));

  };



  if (nativeYear && yearUi) {

    const years = [...new Set(publications.map(publication => String(publication.year)))];

    nativeYear.innerHTML = '<option value="all">All years</option>' + years.map(year => `<option value="${year}">${year}</option>`).join('');

    yearUi.innerHTML = `

      <button type="button" class="year-select-trigger" aria-haspopup="listbox" aria-expanded="false">

        <span class="year-select-label">All years</span><span class="year-select-arrow">⌄</span>

      </button>

      <div class="year-select-menu" role="listbox">

        <button type="button" class="year-option active" data-year="all">All years</button>

        ${years.map(year => `<button type="button" class="year-option" data-year="${year}">${year}</button>`).join('')}

      </div>`;



    const trigger = yearUi.querySelector('.year-select-trigger');

    const label = yearUi.querySelector('.year-select-label');

    const options = yearUi.querySelectorAll('.year-option');

    const close = () => {

      yearUi.classList.remove('open');

      trigger?.setAttribute('aria-expanded', 'false');

    };

    trigger?.addEventListener('click', event => {

      event.stopPropagation();

      const open = yearUi.classList.toggle('open');

      trigger.setAttribute('aria-expanded', String(open));

    });

    options.forEach(option => option.addEventListener('click', async () => {

      selectedYear = option.dataset.year;

      nativeYear.value = selectedYear;

      if (label) label.textContent = option.textContent;

      options.forEach(item => item.classList.toggle('active', item === option));

      close();

await applyFilter();

    }));

    document.addEventListener('click', event => { if (!yearUi.contains(event.target)) close(); });

    document.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });

  }



  search?.addEventListener('input', () => {

    clearTimeout(timer);

    timer = setTimeout(applyFilter, 150);

  });

  modalClose?.addEventListener('click', () => modal?.classList.remove('show'));

  modal?.addEventListener('click', event => {

    if (event.target === modal) modal.classList.remove('show');

  });



  render(publications);

}



async function initProjectPage() {

  const title = document.getElementById('project-title');

  if (!title) return;



  const response = await fetch(new URL('project.json', location.href));

  if (!response.ok) throw new Error(`Failed to load project.json: ${response.status}`);

  const project = await response.json();

  document.title = `${project.title} | Pixelchemy Research`;

  title.textContent = `${project.title}: ${project.subtitle}`;



  const authors = document.getElementById('project-authors');

  if (authors) {

    authors.innerHTML = (project.authors || []).map(author =>

      `<a href="${author.url || '#'}">${author.name}</a>`

    ).join(', ');

  }

  const affiliation = document.getElementById('project-affiliation');

  const venue = document.getElementById('project-venue');

  if (affiliation) affiliation.textContent = project.affiliation || '';

  if (venue) venue.textContent = project.venue || '';



  const buttons = document.getElementById('project-buttons');

  const labels = { paper: 'Paper', arxiv: 'arXiv', code: 'Code', demo: 'Demo' };

  if (buttons) {

    Object.entries(project.links || {}).forEach(([key, value]) => {

      if (!value || value === '#') return;

      const anchor = document.createElement('a');

      anchor.href = /^(?:[a-z]+:|#)/i.test(value) ? value : new URL(value, location.href).href;

      anchor.target = '_blank';

      anchor.rel = 'noopener';

      anchor.className = key === 'paper' ? 'btn btn-primary' : 'btn';

      anchor.textContent = labels[key] || key;

      buttons.appendChild(anchor);

    });

  }



  const teaser = document.getElementById('project-teaser');

  if (teaser && project.teaser) teaser.src = new URL(project.teaser, location.href).href;

  const tldr = document.getElementById('project-tldr');

  const abstract = document.getElementById('project-abstract');

  if (tldr) tldr.textContent = project.tldr || '';

  if (abstract) abstract.textContent = project.abstract || '';



  const sections = document.getElementById('project-sections');

  if (sections) {

    (project.sections || []).forEach(section => {

      const block = document.createElement('section');

      const image = section.image ? new URL(section.image, location.href).href : '';

      block.innerHTML = `

        <h2>${section.title}</h2>

        ${image ? `<img src="${image}" alt="${section.title}">` : ''}

        ${section.caption ? `<p class="figure-caption">${section.caption}</p>` : ''}

        <p>${section.text || ''}</p>`;

      sections.appendChild(block);

    });

  }



  const bibtex = document.getElementById('project-bibtex');

  if (bibtex) bibtex.textContent = project.bibtex || '';

}


async function initFeaturedProjects() {

  const container = document.getElementById('featured-projects');

  if (!container) return;



  const projects = await fetchJson('data/projects.json');



  const featuredProjects = projects

    .filter(project => project.featured === true)

    .slice(0, 3);



  container.innerHTML = featuredProjects

    .map(project => {
      const startYear = project.startYear ?? project.venue ?? '';
      const status = project.status || 'Ongoing';
      const statusClass = status.toLowerCase().replace(/\s+/g, '-');

      return `

      <article class="card project-card">



        <img

          class="card-image"

          src="${resolveSiteUrl(project.image)}"

          alt="${project.title}"

        >



        <div class="card-body">



          <div class="card-meta">

            ${project.category}

          </div>



          <div class="card-title">

            ${project.title}

          </div>



          <p class="card-text">

            ${project.description}

          </p>



          <div class="card-footer">

            <span>

              ${startYear ? `Since ${startYear}` : ''}

            </span>



            <span class="project-status ${statusClass}">

              ${status}

            </span>

          </div>



        </div>



      </article>

      `;
    })

    .join('');

}


Promise.allSettled([

  initNews(),

  initPeople(),

  initFeaturedProjects(),

  initProjects(),

  initPublications(),

  initProjectPage()

]).then(results => {

  results.forEach(result => {

    if (result.status === 'rejected') console.error('[Pixelchemy] module init failed:', result.reason);

  });

});



})();
