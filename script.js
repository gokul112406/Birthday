/**
 * =====================================================================
 *  ROMANTIC BIRTHDAY WEBSITE – script.js
 *  Handles: Countdown, Step Navigation, Butterflies, NO-Button,
 *           Floating Hearts, Sparkles, Music, Animations
 * =====================================================================
 */

/* ── CONFIG ─────────────────────────────────────────────────────────── */
const CONFIG = {
  BIRTHDAY: new Date(2026, 6, 12, 0, 0, 0),
  TOTAL_BUTTERFLIES: 8,
  NO_FLEE_RADIUS: 120,
  HEART_COUNT: 22,
  SPARKLE_COUNT: 35,
};

/* ── BUTTERFLY QUOTES ─────────────────────────────────────────────── */
const BUTTERFLY_QUOTES = [
  "Your smile is my favorite thing in the world. ❤️",
  "You make my heart flutter like a butterfly. 🦋",
  "I cherish every single moment with you. ✨",
  "You are my sunshine on every cloudy day. ☀️",
  "My love for you grows more every day. 🌸",
  "You're the best thing that ever happened to me. 💖",
  "I love you more than words can ever say. 🥺",
  "You are my forever and always. 💍"
];

/* ── STATE ───────────────────────────────────────────────────────────── */
let currentStep   = 1;
let caughtCount   = 0;
let countdownInterval = null;
let musicPlaying  = false;
let butterflies   = [];
let butterflyRAF  = null;
let isPaused      = false;
let isTransitioning = false;

/* ── NO BUTTON STATE (Step 2) ─────────────────────────────────────── */
// Stays visible at home. Cursor close → jumps to random spot → glides back.
let noBtn2HomeX = 0, noBtn2HomeY = 0;
let noBtn2CurX  = 0, noBtn2CurY  = 0;
let noBtn2W = 0, noBtn2H = 0;
let noBtn2Away  = false;
let noBtn2RAFId = null;
let noBtn2Cooldown = false;   // prevents rapid re-triggering

/* ═══════════════════════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initGlobalHearts();
  initGlobalSparkles();
  initMusicPlayer();
  setupButtons();
  startCountdown();
  setupJarClick();
});

/* ═══════════════════════════════════════════════════════════════════════
   NAVIGATION
═══════════════════════════════════════════════════════════════════════ */
function goToStep(next) {
  if (next === currentStep || isTransitioning) return;
  isTransitioning = true;

  const curEl  = document.getElementById(`step-${currentStep}`);
  const nextEl = document.getElementById(`step-${next}`);
  if (!curEl || !nextEl) { isTransitioning = false; return; }

  // Stop NO button animation when leaving step 2
  if (currentStep === 2) stopNoBtn2();

  curEl.classList.add('exiting');
  curEl.classList.remove('active');
  nextEl.classList.remove('hidden');
  nextEl.style.display = 'flex';

  requestAnimationFrame(() => requestAnimationFrame(() => {
    nextEl.classList.add('active');
    currentStep = next;

    setTimeout(() => {
      curEl.classList.remove('exiting');
      curEl.classList.add('hidden');
      isTransitioning = false;
    }, 900);

    if (next === 2) initStep2();
    if (next === 3) initStep3();
    if (next === 4) initStep4();
    if (next === 5) initStep5();
  }));
}

/* ═══════════════════════════════════════════════════════════════════════
   BUTTON SETUP
═══════════════════════════════════════════════════════════════════════ */
function setupButtons() {
  // Step 1 – skip
  const skip = document.getElementById('skip-btn');
  if (skip) skip.addEventListener('click', () => {
    clearInterval(countdownInterval);
    goToStep(2);
  });

  // Step 2 YES
  const yes2 = document.getElementById('yes-btn-2');
  if (yes2) yes2.addEventListener('click', () => goToStep(3));

  // Step 4 YES
  const yes4 = document.getElementById('yes-btn-4');
  if (yes4) yes4.addEventListener('click', () => goToStep(5));

  // Quote overlay – tap anywhere to resume
  const overlay = document.getElementById('quote-overlay');
  if (overlay) overlay.addEventListener('click', dismissQuote);

  // NO button flee – mousemove and touch
  document.addEventListener('mousemove',  (e) => handlePointer(e.clientX, e.clientY), { passive: true });
  document.addEventListener('touchmove',  (e) => handlePointer(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
  document.addEventListener('touchstart', (e) => handlePointer(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
}

/* ═══════════════════════════════════════════════════════════════════════
   STEP 2 – NO BUTTON (stays home, flees, returns)
═══════════════════════════════════════════════════════════════════════ */
function initStep2() {
  // Show both buttons immediately
  const line2   = document.getElementById('step2-line2');
  const buttons = document.getElementById('step2-buttons');
  if (line2)   line2.classList.remove('hidden');
  if (buttons) buttons.classList.remove('hidden');

  // Reset NO button to natural in-flow position, clear any inline styles
  const btn = document.getElementById('no-btn-2');
  if (!btn) return;
  btn.style.position  = '';
  btn.style.left      = '';
  btn.style.top       = '';
  btn.style.transform = '';
  btn.style.transition = '';
  noBtn2Away = false;
}

function captureNoBtn2Home() {
  const btn = document.getElementById('no-btn-2');
  if (!btn) return false;
  const r = btn.getBoundingClientRect();
  if (r.width === 0) return false;
  noBtn2W     = r.width;
  noBtn2H     = r.height;
  noBtn2HomeX = r.left + r.width  / 2;  // centre
  noBtn2HomeY = r.top  + r.height / 2;
  noBtn2CurX  = r.left;
  noBtn2CurY  = r.top;
  return true;
}

function handlePointer(cx, cy) {
  if (currentStep !== 2 || isTransitioning) return;

  const btn = document.getElementById('no-btn-2');
  if (!btn) return;

  // Capture home position once when first interaction happens
  if (noBtn2HomeX === 0 && noBtn2HomeY === 0) {
    if (!captureNoBtn2Home()) return;
  }

  // Use current display position centre
  const dispX = noBtn2Away ? (noBtn2CurX + noBtn2W / 2) : noBtn2HomeX;
  const dispY = noBtn2Away ? (noBtn2CurY + noBtn2H / 2) : noBtn2HomeY;

  const dx   = dispX - cx;
  const dy   = dispY - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < CONFIG.NO_FLEE_RADIUS && !noBtn2Away && !noBtn2Cooldown) {
    // ── Cursor is near & button is home → jump to a random visible spot ──
    const margin = 20;
    const randX  = margin + Math.random() * (window.innerWidth  - noBtn2W - margin * 2);
    const randY  = margin + Math.random() * (window.innerHeight - noBtn2H - margin * 2);

    noBtn2CurX = randX;
    noBtn2CurY = randY;
    noBtn2Away = true;
    noBtn2Cooldown = true;

    btn.style.position   = 'fixed';
    btn.style.transition = 'left 0.18s ease-out, top 0.18s ease-out';
    btn.style.left = `${randX}px`;
    btn.style.top  = `${randY}px`;

    // After landing, wait a moment then glide home
    setTimeout(() => {
      glideNoBtn2Home(btn);
    }, 900);
  }
}

function glideNoBtn2Home(btn) {
  cancelAnimationFrame(noBtn2RAFId);
  btn.style.transition = '';  // hand control to RAF

  const targetLeft = noBtn2HomeX - noBtn2W / 2;
  const targetTop  = noBtn2HomeY - noBtn2H / 2;

  function step() {
    noBtn2CurX += (targetLeft - noBtn2CurX) * 0.09;
    noBtn2CurY += (targetTop  - noBtn2CurY) * 0.09;

    btn.style.left = `${noBtn2CurX}px`;
    btn.style.top  = `${noBtn2CurY}px`;

    if (Math.abs(noBtn2CurX - targetLeft) < 1 && Math.abs(noBtn2CurY - targetTop) < 1) {
      // Arrived – snap fully back to natural flow
      noBtn2Away     = false;
      noBtn2Cooldown = false;
      noBtn2HomeX    = 0;   // recapture fresh next time
      noBtn2HomeY    = 0;
      btn.style.position   = '';
      btn.style.left       = '';
      btn.style.top        = '';
      btn.style.transition = '';
    } else {
      noBtn2RAFId = requestAnimationFrame(step);
    }
  }
  noBtn2RAFId = requestAnimationFrame(step);
}

function stopNoBtn2() {
  cancelAnimationFrame(noBtn2RAFId);
  noBtn2Away  = false;
  noBtn2HomeX = 0;
  noBtn2HomeY = 0;
  noBtn2Cooldown = false;
  const btn = document.getElementById('no-btn-2');
  if (btn) {
    btn.style.position  = '';
    btn.style.left      = '';
    btn.style.top       = '';
    btn.style.transition = '';
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   STEP 1 – COUNTDOWN
═══════════════════════════════════════════════════════════════════════ */
function startCountdown() {
  updateCountdown();
  countdownInterval = setInterval(() => {
    if (updateCountdown()) {
      clearInterval(countdownInterval);
      setTimeout(() => goToStep(2), 1800);
    }
  }, 1000);
}

function updateCountdown() {
  const diff = CONFIG.BIRTHDAY.getTime() - Date.now();
  const gridEl = document.getElementById('countdown-display');
  const doneEl = document.getElementById('countdown-done');

  if (diff <= 0) {
    gridEl.style.display = 'none';
    doneEl.classList.remove('hidden');
    return true;
  }

  const s = Math.floor(diff / 1000);
  document.getElementById('cd-days').textContent  = String(Math.floor(s / 86400)).padStart(2, '0');
  document.getElementById('cd-hours').textContent = String(Math.floor((s % 86400) / 3600)).padStart(2, '0');
  document.getElementById('cd-mins').textContent  = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const secsEl = document.getElementById('cd-secs');
  secsEl.textContent = String(s % 60).padStart(2, '0');
  secsEl.classList.remove('tick');
  void secsEl.offsetWidth;
  secsEl.classList.add('tick');
  return false;
}

/* ═══════════════════════════════════════════════════════════════════════
   STEP 3 – BUTTERFLIES
═══════════════════════════════════════════════════════════════════════ */
const BF_COLORS = [
  ['#FF6B9D','#FF9EC4'],
  ['#C084FC','#E9B8FF'],
  ['#F97316','#FED7AA'],
  ['#34D399','#A7F3D0'],
  ['#60A5FA','#BAE6FD'],
  ['#F472B6','#FBD0E4'],
  ['#A78BFA','#DDD6FE'],
  ['#FBBF24','#FEF08A'],
];

function makeButterflyGlow(colors) {
  const [primary, light] = colors;
  const id = primary.slice(1);
  return `<svg viewBox="0 0 80 50" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="wl${id}" cx="70%" cy="40%">
        <stop offset="0%" stop-color="${light}" stop-opacity="0.95"/>
        <stop offset="100%" stop-color="${primary}" stop-opacity="0.7"/>
      </radialGradient>
      <radialGradient id="wr${id}" cx="30%" cy="40%">
        <stop offset="0%" stop-color="${light}" stop-opacity="0.95"/>
        <stop offset="100%" stop-color="${primary}" stop-opacity="0.7"/>
      </radialGradient>
    </defs>
    <g class="wing-left">
      <ellipse cx="28" cy="20" rx="26" ry="18" fill="url(#wl${id})" opacity="0.9"/>
      <ellipse cx="30" cy="38" rx="18" ry="10" fill="${primary}" opacity="0.65"/>
    </g>
    <g class="wing-right">
      <ellipse cx="52" cy="20" rx="26" ry="18" fill="url(#wr${id})" opacity="0.9"/>
      <ellipse cx="50" cy="38" rx="18" ry="10" fill="${primary}" opacity="0.65"/>
    </g>
    <ellipse cx="40" cy="26" rx="4" ry="14" fill="#333" opacity="0.8"/>
    <line x1="38" y1="13" x2="30" y2="4" stroke="#333" stroke-width="1.2" opacity="0.7"/>
    <line x1="42" y1="13" x2="50" y2="4" stroke="#333" stroke-width="1.2" opacity="0.7"/>
    <circle cx="30" cy="4" r="2" fill="${primary}"/>
    <circle cx="50" cy="4" r="2" fill="${primary}"/>
  </svg>`;
}

function initStep3() {
  // Reset state
  caughtCount = 0;
  isPaused    = false;
  butterflies = [];

  // Reset UI
  document.getElementById('caught-count').textContent = '0';
  document.getElementById('jar-inner').innerHTML = '';
  document.getElementById('jar-tap-msg').classList.add('hidden');
  document.getElementById('jar-glow').classList.add('hidden');

  // Hide quote overlay
  const overlay = document.getElementById('quote-overlay');
  overlay.classList.add('hidden');
  document.getElementById('quote-text').textContent = '';

  // Show game elements
  document.getElementById('step3-title').classList.remove('hidden');
  document.getElementById('step3-hint').classList.remove('hidden');
  document.getElementById('butterfly-arena').classList.remove('hidden');
  document.getElementById('butterfly-progress').classList.remove('hidden');

  // Reset jar position
  const jar = document.getElementById('butterfly-jar');
  jar.style.transform  = '';
  jar.style.transition = '';
  jar.style.marginTop  = '';

  // Build garden flowers
  const garden = document.querySelector('.garden-bg');
  if (garden) {
    garden.innerHTML = '';
    ['🌸','🌺','🌷','🌼','🌻','🌹','💐','🌸'].forEach((f, i) => {
      const el = document.createElement('span');
      el.className = 'garden-flower';
      el.textContent = f;
      el.style.left = `${5 + i * 12}%`;
      el.style.bottom = `${Math.random() * 15}%`;
      el.style.animationDelay = `${Math.random() * 3}s`;
      el.style.animationDuration = `${3 + Math.random() * 2}s`;
      garden.appendChild(el);
    });
  }

  spawnButterflies();
}

function spawnButterflies() {
  const arena = document.getElementById('butterfly-arena');
  if (!arena) return;
  arena.querySelectorAll('.butterfly').forEach(b => b.remove());
  butterflies = [];

  if (butterflyRAF) { cancelAnimationFrame(butterflyRAF); butterflyRAF = null; }

  const { width: W, height: H } = arena.getBoundingClientRect();
  const bfW = 54, bfH = 42;

  for (let i = 0; i < CONFIG.TOTAL_BUTTERFLIES; i++) {
    const el = document.createElement('div');
    el.className = 'butterfly';
    el.innerHTML = makeButterflyGlow(BF_COLORS[i % BF_COLORS.length]);
    el.dataset.index = String(i);

    const x = bfW + Math.random() * (W - bfW * 2);
    const y = bfH + Math.random() * (H - bfH * 2);
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.18 + Math.random() * 0.22;   // slow & gentle

    el.style.left = `${x}px`;
    el.style.top  = `${y}px`;
    el.style.setProperty('--wing-speed', `${0.5 + Math.random() * 0.4}s`);

    const bf = { el, x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, speed, caught: false };
    butterflies.push(bf);
    arena.appendChild(el);

    el.addEventListener('click',      ()  => captureButterfly(i));
    el.addEventListener('touchstart', (e) => { e.preventDefault(); captureButterfly(i); }, { passive: false });
  }

  animateButterflies();
}

function animateButterflies() {
  if (isPaused) { butterflyRAF = requestAnimationFrame(animateButterflies); return; }

  const arena = document.getElementById('butterfly-arena');
  if (!arena) return;
  const { width: W, height: H } = arena.getBoundingClientRect();
  const bfW = 54, bfH = 42;

  butterflies.forEach(bf => {
    if (bf.caught) return;

    if (Math.random() < 0.012) {
      const a = Math.random() * Math.PI * 2;
      bf.vx = Math.cos(a) * bf.speed;
      bf.vy = Math.sin(a) * bf.speed;
    }

    bf.x += bf.vx;
    bf.y += bf.vy;

    if (bf.x < 0)       { bf.x = 0;       bf.vx =  Math.abs(bf.vx); }
    if (bf.x > W - bfW) { bf.x = W - bfW; bf.vx = -Math.abs(bf.vx); }
    if (bf.y < 0)       { bf.y = 0;       bf.vy =  Math.abs(bf.vy); }
    if (bf.y > H - bfH) { bf.y = H - bfH; bf.vy = -Math.abs(bf.vy); }

    bf.el.style.left = `${bf.x}px`;
    bf.el.style.top  = `${bf.y}px`;
  });

  butterflyRAF = requestAnimationFrame(animateButterflies);
}

function captureButterfly(index) {
  const bf = butterflies[index];
  if (!bf || bf.caught || isPaused) return;

  bf.caught = true;
  bf.el.classList.add('caught');
  isPaused = true;   // pause remaining butterflies while quote shows

  // Fly-into-jar animation
  const jar     = document.getElementById('butterfly-jar');
  const jarRect = jar.getBoundingClientRect();
  const bfRect  = bf.el.getBoundingClientRect();

  const clone = bf.el.cloneNode(true);
  clone.classList.remove('caught');
  clone.style.cssText = `
    position: fixed;
    left: ${bfRect.left}px; top: ${bfRect.top}px;
    width: ${bfRect.width}px; height: ${bfRect.height}px;
    transition: all 0.7s cubic-bezier(0.4,0,0.2,1);
    z-index: 999; pointer-events: none;
  `;
  document.body.appendChild(clone);

  requestAnimationFrame(() => requestAnimationFrame(() => {
    clone.style.left      = `${jarRect.left + jarRect.width  / 2 - bfRect.width  / 2}px`;
    clone.style.top       = `${jarRect.top  + jarRect.height / 2 - bfRect.height / 2}px`;
    clone.style.transform = 'scale(0.4)';
    clone.style.opacity   = '0.6';

    setTimeout(() => {
      clone.remove();
      addButterflyToJar();
      caughtCount++;
      document.getElementById('caught-count').textContent = caughtCount;

      // Show quote overlay centered in the arena
      document.getElementById('quote-text').textContent = BUTTERFLY_QUOTES[caughtCount - 1];
      document.getElementById('quote-overlay').classList.remove('hidden');

    }, 750);
  }));
}

function addButterflyToJar() {
  const inner = document.getElementById('jar-inner');
  const mini = document.createElement('span');
  mini.textContent = '🦋';
  mini.style.cssText = `
    font-size: clamp(10px, 2vw, 16px);
    display: inline-block;
    animation: floatY 2s ease-in-out ${Math.random()}s infinite;
  `;
  inner.appendChild(mini);
}

function dismissQuote() {
  const overlay = document.getElementById('quote-overlay');
  overlay.classList.add('hidden');
  isPaused = false;

  if (caughtCount === CONFIG.TOTAL_BUTTERFLIES) {
    // All caught – switch to full-page jar view
    setTimeout(allCaught, 300);
  }
}

function allCaught() {
  if (butterflyRAF) { cancelAnimationFrame(butterflyRAF); butterflyRAF = null; }

  // Hide all game UI
  document.getElementById('step3-title').classList.add('hidden');
  document.getElementById('step3-hint').classList.add('hidden');
  document.getElementById('butterfly-arena').classList.add('hidden');
  document.getElementById('butterfly-progress').classList.add('hidden');

  // Enlarge and centre the jar with CSS transition
  const jar = document.getElementById('butterfly-jar');
  jar.style.transition = 'transform 0.6s ease, margin 0.6s ease';
  jar.style.transform  = 'scale(1.5)';
  jar.style.marginTop  = '0';

  // Glow the jar
  document.getElementById('jar-glow').classList.remove('hidden');
  spawnBurstSparkles(jar);

  // Show the "tap to open" message inside the jar
  setTimeout(() => {
    const tapMsg = document.getElementById('jar-tap-msg');
    tapMsg.textContent = '✨ Tap to Open the Gift 🎁';
    tapMsg.classList.remove('hidden');
  }, 600);
}

function setupJarClick() {
  document.getElementById('butterfly-jar').addEventListener('click', () => {
    if (caughtCount === CONFIG.TOTAL_BUTTERFLIES && !isPaused) {
      goToStep(4);
    }
  });
}

/* ═══════════════════════════════════════════════════════════════════════
   STEP 4 – BIRTHDAY WISHES
═══════════════════════════════════════════════════════════════════════ */
function initStep4() {
  // Re-trigger wish animations
  document.querySelectorAll('.wish-line').forEach(el => {
    el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
  });

  // Balloons
  const bc = document.getElementById('balloons-container');
  bc.innerHTML = '';
  ['🎈','🎀','🎊','🎉','🪅'].forEach((e) => {
    for (let j = 0; j < 3; j++) {
      const el = document.createElement('div');
      el.className = 'balloon';
      el.textContent = e;
      el.style.left = `${Math.random() * 95}%`;
      el.style.animationDuration = `${6 + Math.random() * 8}s`;
      el.style.animationDelay    = `${Math.random() * 6}s`;
      bc.appendChild(el);
    }
  });

  // Roses
  const rc = document.getElementById('roses-container');
  rc.innerHTML = '';
  ['🌹','🌸','💐','🌺'].forEach((e) => {
    for (let j = 0; j < 2; j++) {
      const el = document.createElement('div');
      el.className = 'rose-deco';
      el.textContent = e;
      el.style.top  = `${10 + Math.random() * 80}%`;
      el.style.left = `${Math.random() * 90}%`;
      el.style.fontSize = `${1 + Math.random() * 1.5}rem`;
      el.style.animationDuration = `${5 + Math.random() * 8}s`;
      el.style.animationDelay    = `${Math.random() * 4}s`;
      rc.appendChild(el);
    }
  });
}

/* ═══════════════════════════════════════════════════════════════════════
   STEP 5 – FINAL PAGE
═══════════════════════════════════════════════════════════════════════ */
function initStep5() {
  // Big burst of hearts when page appears
  const container = document.getElementById('global-hearts');
  for (let i = 0; i < 20; i++) {
    setTimeout(() => spawnExtraHeart(container), i * 100);
  }

  // Tap/click the big heart → small white hearts fly up from it
  const bigHeart = document.getElementById('big-heart');
  if (bigHeart) {
    function heartBurst(e) {
      e.stopPropagation();
      const r = bigHeart.getBoundingClientRect();
      const originX = r.left + r.width  / 2;
      const originY = r.top  + r.height / 2;
      launchWhiteHearts(originX, originY, 12);
    }
    bigHeart.addEventListener('click',      heartBurst);
    bigHeart.addEventListener('touchstart', (e) => { e.preventDefault(); heartBurst(e); }, { passive: false });
  }
}

/* Launch small white hearts upward from (ox, oy) */
function launchWhiteHearts(ox, oy, count) {
  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    // Small, pure white heart
    el.textContent = '♥';
    const size = 10 + Math.random() * 10;   // 10–20 px
    const drift = (Math.random() - 0.5) * 120;  // horizontal spread
    const rise  = 160 + Math.random() * 200;    // how far up
    const dur   = 1.2 + Math.random() * 1.0;    // animation duration

    el.style.cssText = `
      position: fixed;
      left: ${ox}px;
      top:  ${oy}px;
      font-size: ${size}px;
      color: #ffffff;
      pointer-events: none;
      z-index: 2000;
      opacity: 1;
      user-select: none;
      text-shadow: 0 0 6px rgba(255,255,255,0.9);
      transition: transform ${dur}s ease-out, opacity ${dur}s ease-out;
      will-change: transform, opacity;
    `;
    document.body.appendChild(el);

    // Delay each heart slightly for a staggered burst
    const delay = i * 40;
    setTimeout(() => {
      el.style.transform = `translate(${drift}px, -${rise}px) scale(0.4)`;
      el.style.opacity   = '0';
    }, delay + 20);

    // Remove after animation
    setTimeout(() => el.remove(), delay + dur * 1000 + 100);
  }
}

function spawnExtraHeart(container) {
  const el = document.createElement('span');
  el.className = 'floating-heart';
  el.textContent = '❤️';
  el.style.left = `${10 + Math.random() * 80}%`;
  el.style.bottom = '0';
  el.style.fontSize = `${1.2 + Math.random() * 1.6}rem`;
  el.style.animationDuration = `${4 + Math.random() * 4}s`;
  el.style.animationDelay = '0s';
  container.appendChild(el);
  setTimeout(() => el.remove(), 8000);
}

/* ═══════════════════════════════════════════════════════════════════════
   GLOBAL FLOATING HEARTS
═══════════════════════════════════════════════════════════════════════ */
function initGlobalHearts() {
  const container = document.getElementById('global-hearts');
  const emojis = ['❤️','🩷','💕','💗','💓','💖'];

  for (let i = 0; i < CONFIG.HEART_COUNT; i++) spawnFloatingHeart(container, emojis, true);

  setInterval(() => {
    spawnFloatingHeart(container, emojis, false);
    while (container.children.length > CONFIG.HEART_COUNT + 10) container.firstChild.remove();
  }, 2200);
}

function spawnFloatingHeart(container, emojis, spread) {
  const el = document.createElement('span');
  el.className = 'floating-heart';
  el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
  el.style.left = `${Math.random() * 100}%`;
  el.style.fontSize = `${0.7 + Math.random() * 1.4}rem`;
  const dur = 8 + Math.random() * 10;
  el.style.animationDuration = `${dur}s`;
  el.style.animationDelay = spread ? `-${Math.random() * dur}s` : '0s';
  container.appendChild(el);
  setTimeout(() => el.remove(), (dur + 2) * 1000);
}

/* ═══════════════════════════════════════════════════════════════════════
   GLOBAL SPARKLES
═══════════════════════════════════════════════════════════════════════ */
function initGlobalSparkles() {
  const container = document.getElementById('global-sparkles');
  for (let i = 0; i < CONFIG.SPARKLE_COUNT; i++) {
    const dot = document.createElement('div');
    dot.className = 'sparkle-dot';
    dot.style.left = `${Math.random() * 100}%`;
    dot.style.top  = `${Math.random() * 100}%`;
    dot.style.width = dot.style.height = `${4 + Math.random() * 6}px`;
    const dur = 1.5 + Math.random() * 3;
    dot.style.animationDuration = `${dur}s`;
    dot.style.animationDelay    = `${Math.random() * dur}s`;
    container.appendChild(dot);
  }
}

function spawnBurstSparkles(targetEl) {
  const { left, top, width, height } = targetEl.getBoundingClientRect();
  const cx = left + width / 2, cy = top + height / 2;
  for (let i = 0; i < 20; i++) {
    const dot = document.createElement('div');
    dot.style.cssText = `
      position:fixed; width:${5+Math.random()*6}px; height:${5+Math.random()*6}px;
      border-radius:50%; background:radial-gradient(circle,#fff 0%,#ffb3cc 60%,transparent 100%);
      pointer-events:none; z-index:1000; left:${cx}px; top:${cy}px;
      transition:all 0.9s cubic-bezier(0.4,0,0.2,1); opacity:1;
    `;
    document.body.appendChild(dot);
    const angle = (i / 20) * Math.PI * 2;
    const dist  = 50 + Math.random() * 70;
    setTimeout(() => {
      dot.style.left    = `${cx + Math.cos(angle) * dist}px`;
      dot.style.top     = `${cy + Math.sin(angle) * dist}px`;
      dot.style.opacity = '0';
      dot.style.transform = 'scale(0)';
    }, 50);
    setTimeout(() => dot.remove(), 1000);
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   MUSIC PLAYER
═══════════════════════════════════════════════════════════════════════ */
function initMusicPlayer() {
  const btn   = document.getElementById('music-btn');
  const audio = document.getElementById('bg-music');
  audio.volume = 0.35;

  btn.addEventListener('click', () => {
    if (musicPlaying) {
      audio.pause();
      btn.classList.remove('playing');
      btn.querySelector('.music-icon').textContent = '🎵';
      musicPlaying = false;
    } else {
      audio.play().then(() => {
        btn.classList.add('playing');
        btn.querySelector('.music-icon').textContent = '🎶';
        musicPlaying = true;
      }).catch(() => {});
    }
  });

  audio.play().then(() => {
    btn.classList.add('playing');
    btn.querySelector('.music-icon').textContent = '🎶';
    musicPlaying = true;
  }).catch(() => {});
}

/* ═══════════════════════════════════════════════════════════════════════
   PARTICLE ORBS PER STEP
═══════════════════════════════════════════════════════════════════════ */
(function injectParticles() {
  [1, 2, 3, 4, 5].forEach(n => {
    const c = document.getElementById(`particles-${n}`);
    if (!c) return;
    for (let i = 0; i < 8; i++) {
      const orb = document.createElement('div');
      const size = 60 + Math.random() * 140;
      orb.style.cssText = `
        position:absolute; width:${size}px; height:${size}px; border-radius:50%;
        background:radial-gradient(circle,rgba(255,150,200,0.18) 0%,transparent 70%);
        left:${Math.random()*100}%; top:${Math.random()*100}%;
        animation:floatY ${4+Math.random()*4}s ease-in-out ${Math.random()*4}s infinite alternate;
        pointer-events:none;
      `;
      c.appendChild(orb);
    }
  });
})();
