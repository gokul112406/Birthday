/**
 * =====================================================================
 *  ROMANTIC BIRTHDAY WEBSITE – script.js
 * =====================================================================
 */

/* ── CONFIG ─────────────────────────────────────────────────────────── */
const CONFIG = {
  BIRTHDAY: new Date(2026, 6, 24, 0, 0, 0),
  TOTAL_BUTTERFLIES: 8,
  HEART_COUNT: 22,
  SPARKLE_COUNT: 35,
  NO_FLEE_RADIUS: 130,          // px – Step 2 flee trigger distance
  NO2_MOVE_DURATION: 600000,    // ms – Step 2 NO button moves for 10 mins then stops
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
let currentStep     = 0;
let caughtCount     = 0;
let countdownInterval = null;
let butterflies     = [];
let butterflyRAF    = null;
let isPaused        = false;
let isTransitioning = false;

/* ── STEP 2 NO BUTTON STATE ─────────────────────────────────────────── */
let noBtn2HomeX    = 0, noBtn2HomeY = 0;
let noBtn2CurX     = 0, noBtn2CurY  = 0;
let noBtn2W        = 0, noBtn2H     = 0;
let noBtn2Moving   = false;   // true while the button is away / returning
let noBtn2Locked   = false;   // true after 1 min – stops all movement
let noBtn2RAFId    = null;
let noBtn2TimerId  = null;    // 1-min timer

/* ═══════════════════════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  createPopupOverlay();
  initGlobalHearts();
  initGlobalSparkles();
  initMusicPlayer();
  setupButtons();
  startCountdown();
  setupJarClick();
});

/* ─── Shared popup overlay (reused for Step 2 & Step 4 messages) ─── */
function createPopupOverlay() {
  const el = document.createElement('div');
  el.id = 'msg-popup';
  el.style.cssText = `
    display:none; position:fixed; inset:0; z-index:9999;
    align-items:center; justify-content:center;
    background:rgba(0,0,0,0.55); backdrop-filter:blur(6px);
  `;
  el.innerHTML = `
    <div id="msg-popup-box" style="
      background:linear-gradient(135deg,rgba(255,180,210,0.25),rgba(200,130,255,0.2));
      border:1.5px solid rgba(255,255,255,0.4);
      border-radius:24px;
      padding: clamp(28px,6vw,48px) clamp(28px,7vw,56px);
      max-width:min(88vw,440px);
      text-align:center;
      box-shadow:0 12px 60px rgba(200,80,150,0.35);
      backdrop-filter:blur(20px);
      animation:fadeSlideUp 0.4s both;
    ">
      <div id="msg-popup-emoji" style="font-size:clamp(2.5rem,8vw,3.5rem);margin-bottom:12px;">😏</div>
      <p id="msg-popup-text" style="
        font-family:'Dancing Script',cursive;
        font-size:clamp(1.2rem,4vw,1.7rem);
        color:#ffd6e7;
        line-height:1.55;
        margin-bottom:20px;
      "></p>
      <button id="msg-popup-close" style="
        padding:12px 36px;
        border-radius:50px;
        background:linear-gradient(135deg,#e64980,#845ef7);
        border:2px solid rgba(255,255,255,0.35);
        color:#fff;
        font-family:'Dancing Script',cursive;
        font-size:1.1rem;
        cursor:pointer;
        box-shadow:0 0 18px rgba(230,73,128,0.5);
      ">Okay 💖</button>
    </div>
  `;
  document.body.appendChild(el);
  document.getElementById('msg-popup-close').addEventListener('click', closePopup);
  el.addEventListener('click', (e) => { if (e.target === el) closePopup(); });
}

function showPopup(text, emoji = '😏') {
  document.getElementById('msg-popup-text').textContent  = text;
  document.getElementById('msg-popup-emoji').textContent = emoji;
  const popup = document.getElementById('msg-popup');
  popup.style.display = 'flex';
}

function closePopup() {
  document.getElementById('msg-popup').style.display = 'none';
}

/* ═══════════════════════════════════════════════════════════════════════
   NAVIGATION
═══════════════════════════════════════════════════════════════════════ */
function goToStep(next) {
  if (next === currentStep || isTransitioning) return;
  isTransitioning = true;

  const curEl  = document.getElementById(`step-${currentStep}`);
  const nextEl = document.getElementById(`step-${next}`);
  if (!curEl || !nextEl) { isTransitioning = false; return; }

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
    if (next === 6) initStep6();
  }));
}

/* ═══════════════════════════════════════════════════════════════════════
   BUTTON SETUP
═══════════════════════════════════════════════════════════════════════ */
function setupButtons() {
  let enteredPin = '';
  
  function updatePinUI() {
    for (let i = 0; i < 4; i++) {
      const bubble = document.getElementById(`pin-${i}`);
      if (!bubble) continue;
      if (i < enteredPin.length) {
        bubble.textContent = enteredPin[i];
        bubble.classList.add('filled');
      } else {
        bubble.textContent = '';
        bubble.classList.remove('filled');
      }
    }
  }

  function verifyPin() {
    if (enteredPin === '1124') {
      goToStep(1);
    } else {
      showPopup("Oops! That's not the right password, my love. 🤫 Try again!", '🔒');
      enteredPin = '';
      updatePinUI();
    }
  }

  document.querySelectorAll('.pin-key').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.dataset.value;
      if (val === 'clear') {
        enteredPin = '';
      } else if (val === 'back') {
        enteredPin = enteredPin.slice(0, -1);
      } else {
        if (enteredPin.length < 4) {
          enteredPin += val;
        }
      }
      updatePinUI();
      if (enteredPin.length === 4) {
        setTimeout(verifyPin, 150);
      }
    });
  });

  document.addEventListener('keydown', (e) => {
    if (currentStep !== 0) return;
    if (e.key >= '0' && e.key <= '9') {
      if (enteredPin.length < 4) {
        enteredPin += e.key;
        updatePinUI();
        if (enteredPin.length === 4) {
          setTimeout(verifyPin, 150);
        }
      }
    } else if (e.key === 'Backspace') {
      enteredPin = enteredPin.slice(0, -1);
      updatePinUI();
    }
  });

  const skip = document.getElementById('skip-btn');
  if (skip) skip.addEventListener('click', () => { clearInterval(countdownInterval); goToStep(2); });

  const yes2 = document.getElementById('yes-btn-2');
  if (yes2) yes2.addEventListener('click', () => goToStep(3));

  const yes4 = document.getElementById('yes-btn-4');
  if (yes4) yes4.addEventListener('click', () => goToStep(5));

  const next5 = document.getElementById('next-btn-5');
  if (next5) next5.addEventListener('click', () => goToStep(6));

  // Step 4 NO button – static, shows popup on click
  const no4 = document.getElementById('no-btn-4');
  if (no4) {
    no4.classList.remove('btn-no-static');   // remove pointer-events:none so click works
    no4.style.pointerEvents = 'auto';
    no4.style.cursor = 'pointer';
    no4.addEventListener('click', () => {
      showPopup("nope, you're not allowed to say that.. you're mine. 💕", '🚫');
    });
    no4.addEventListener('touchend', (e) => {
      e.preventDefault();
      showPopup("nope, you're not allowed to say that.. you're mine. 💕", '🚫');
    }, { passive: false });
  }

  // Quote overlay – tap to continue
  const overlay = document.getElementById('quote-overlay');
  if (overlay) overlay.addEventListener('click', dismissQuote);

  // Pointer handlers for Step 2 NO button
  document.addEventListener('mousemove',  (e) => handlePointer(e.clientX, e.clientY), { passive: true });
  document.addEventListener('touchmove',  (e) => handlePointer(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
  document.addEventListener('touchstart', (e) => handlePointer(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
}

/* ═══════════════════════════════════════════════════════════════════════
   STEP 2 – HEY MY LOVE  (NO button logic)
═══════════════════════════════════════════════════════════════════════ */
function initStep2() {
  const line2   = document.getElementById('step2-line2');
  const buttons = document.getElementById('step2-buttons');
  if (line2)   line2.classList.remove('hidden');
  if (buttons) buttons.classList.remove('hidden');

  // Reset NO button
  const btn = document.getElementById('no-btn-2');
  if (!btn) return;
  btn.style.cssText = '';
  noBtn2Moving  = false;
  noBtn2Locked  = false;
  noBtn2HomeX   = 0;
  noBtn2HomeY   = 0;

  // Start 1-minute timer – after which the NO button freezes in place
  clearTimeout(noBtn2TimerId);
  noBtn2TimerId = setTimeout(() => {
    noBtn2Locked = true;
    // Smoothly return to home one last time then lock
    if (noBtn2Moving) glideNoBtn2Home(btn, true);
  }, CONFIG.NO2_MOVE_DURATION);

  // NO button popup when tapped directly (mobile friendly)
  btn.addEventListener('click', () => {
    showPopup("i can't let you say that.. you're mine 💕", '🥺');
  }, { once: false });
}

/* Capture home position from DOM */
function captureNoBtn2Home() {
  const btn = document.getElementById('no-btn-2');
  if (!btn) return false;
  const r = btn.getBoundingClientRect();
  if (!r.width) return false;
  noBtn2W     = r.width;
  noBtn2H     = r.height;
  noBtn2HomeX = r.left + r.width  / 2;
  noBtn2HomeY = r.top  + r.height / 2;
  noBtn2CurX  = r.left;
  noBtn2CurY  = r.top;
  return true;
}

/* Pointer proximity handler – only for Step 2 */
function handlePointer(cx, cy) {
  if (currentStep !== 2 || isTransitioning || noBtn2Locked) return;

  const btn = document.getElementById('no-btn-2');
  if (!btn) return;

  if (!noBtn2HomeX && !captureNoBtn2Home()) return;

  // Check distance against CURRENT displayed position
  const btnCX = noBtn2Moving ? (noBtn2CurX + noBtn2W / 2) : noBtn2HomeX;
  const btnCY = noBtn2Moving ? (noBtn2CurY + noBtn2H / 2) : noBtn2HomeY;
  const dist  = Math.hypot(cx - btnCX, cy - btnCY);

  if (dist < CONFIG.NO_FLEE_RADIUS && !noBtn2Moving) {
    // Jump to a smooth random new location within viewport
    const margin = 24;
    let randX = margin + Math.random() * (window.innerWidth  - noBtn2W - margin * 2);
    let randY = margin + Math.random() * (window.innerHeight - noBtn2H - margin * 2);

    // Avoid placing it too close to home or too close to cursor
    if (Math.hypot(randX + noBtn2W/2 - noBtn2HomeX, randY + noBtn2H/2 - noBtn2HomeY) < 80) {
      randX = window.innerWidth / 2 - noBtn2W / 2;
      randY = window.innerHeight * 0.15;
    }

    noBtn2CurX   = randX;
    noBtn2CurY   = randY;
    noBtn2Moving = true;

    btn.style.position   = 'fixed';
    btn.style.transition = 'left 0.35s cubic-bezier(0.25,0.46,0.45,0.94), top 0.35s cubic-bezier(0.25,0.46,0.45,0.94)';
    btn.style.left       = `${randX}px`;
    btn.style.top        = `${randY}px`;

    // After a short delay, smoothly glide back home
    setTimeout(() => glideNoBtn2Home(btn, false), 1200);
  }
}

/* Smooth glide back to home position using RAF easing */
function glideNoBtn2Home(btn, lockAfter) {
  cancelAnimationFrame(noBtn2RAFId);
  btn.style.transition = '';   // RAF takes over

  const targetL = noBtn2HomeX - noBtn2W / 2;
  const targetT = noBtn2HomeY - noBtn2H / 2;

  function step() {
    noBtn2CurX += (targetL - noBtn2CurX) * 0.08;
    noBtn2CurY += (targetT - noBtn2CurY) * 0.08;
    btn.style.left = `${noBtn2CurX}px`;
    btn.style.top  = `${noBtn2CurY}px`;

    if (Math.abs(noBtn2CurX - targetL) < 0.8 && Math.abs(noBtn2CurY - targetT) < 0.8) {
      // Snapped back – restore to natural flow
      noBtn2Moving = false;
      btn.style.cssText = '';
      if (lockAfter) noBtn2Locked = true;
    } else {
      noBtn2RAFId = requestAnimationFrame(step);
    }
  }
  noBtn2RAFId = requestAnimationFrame(step);
}

function stopNoBtn2() {
  cancelAnimationFrame(noBtn2RAFId);
  clearTimeout(noBtn2TimerId);
  noBtn2Moving = false;
  noBtn2Locked = false;
  noBtn2HomeX  = 0;
  noBtn2HomeY  = 0;
  const btn = document.getElementById('no-btn-2');
  if (btn) btn.style.cssText = '';
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
  const diff   = CONFIG.BIRTHDAY.getTime() - Date.now();
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
   STEP 3 – BUTTERFLIES  (emoji style 🦋)
═══════════════════════════════════════════════════════════════════════ */
function initStep3() {
  caughtCount = 0;
  isPaused    = false;
  butterflies = [];

  document.getElementById('caught-count').textContent = '0';
  document.getElementById('jar-inner').innerHTML      = '';
  document.getElementById('jar-tap-msg').classList.add('hidden');
  document.getElementById('jar-glow').classList.add('hidden');
  document.getElementById('quote-overlay').classList.add('hidden');
  document.getElementById('quote-text').textContent  = '';
  document.getElementById('step3-title').classList.remove('hidden');
  document.getElementById('step3-hint').classList.remove('hidden');
  document.getElementById('butterfly-arena').classList.remove('hidden');
  document.getElementById('butterfly-progress').classList.remove('hidden');

  const jar = document.getElementById('butterfly-jar');
  jar.style.cssText = '';

  // Garden flowers
  const garden = document.querySelector('.garden-bg');
  if (garden) {
    garden.innerHTML = '';
    ['🌸','🌺','🌷','🌼','🌻','🌹','💐','🌸'].forEach((f, i) => {
      const el = document.createElement('span');
      el.className = 'garden-flower';
      el.textContent = f;
      el.style.left = `${5 + i * 12}%`;
      el.style.bottom = `${Math.random() * 15}%`;
      el.style.animationDelay    = `${Math.random() * 3}s`;
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

  let W = arena.clientWidth || arena.offsetWidth || 300;
  let H = arena.clientHeight || arena.offsetHeight || 220;
  const bfSize = 40;   // emoji butterfly size (px)

  for (let i = 0; i < CONFIG.TOTAL_BUTTERFLIES; i++) {
    const el = document.createElement('div');
    el.className = 'butterfly';
    el.dataset.index = String(i);

    // Use 🦋 emoji directly – scales with font-size
    el.textContent = '🦋';
    el.style.fontSize = 'clamp(28px, 5vw, 40px)';
    el.style.lineHeight = '1';
    el.style.userSelect = 'none';
    el.style.cursor = 'pointer';
    el.style.position = 'absolute';
    // Natural wing flap every 1 second
    el.style.animation = `wingFlap 1s ease-out ${Math.random()}s infinite`;

    const xRange = Math.max(50, W - bfSize * 2.5);
    const yRange = Math.max(50, H - bfSize * 2.5);
    const x = bfSize + Math.random() * xRange;
    const y = bfSize + Math.random() * yRange;
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.8 + Math.random() * 0.8;   // faster speed so movement is clearly visible

    el.style.left = `${x}px`;
    el.style.top  = `${y}px`;

    const bf = { el, x, y, angle, speed, caught: false };
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
  let W = arena.clientWidth || arena.offsetWidth || 300;
  let H = arena.clientHeight || arena.offsetHeight || 220;
  const bfSize = 40;

  butterflies.forEach(bf => {
    if (bf.caught) return;
    
    // Smooth natural turning
    bf.angle += (Math.random() - 0.5) * 0.2;
    let vx = Math.cos(bf.angle) * bf.speed;
    let vy = Math.sin(bf.angle) * bf.speed;

    bf.x += vx;
    bf.y += vy;
    
    // Bounce off walls smoothly by reflecting angle
    if (bf.x < 0) { bf.x = 0; bf.angle = Math.PI - bf.angle; }
    if (bf.x > W - bfSize) { bf.x = W - bfSize; bf.angle = Math.PI - bf.angle; }
    if (bf.y < 0) { bf.y = 0; bf.angle = -bf.angle; }
    if (bf.y > H - bfSize) { bf.y = H - bfSize; bf.angle = -bf.angle; }
    
    bf.el.style.left = `${bf.x}px`;
    bf.el.style.top  = `${bf.y}px`;
  });
  butterflyRAF = requestAnimationFrame(animateButterflies);
}

function captureButterfly(index) {
  const bf = butterflies[index];
  if (!bf || bf.caught || isPaused) return;

  bf.caught = true;
  bf.el.style.opacity = '0.3';
  bf.el.style.pointerEvents = 'none';
  isPaused = true;

  const jar     = document.getElementById('butterfly-jar');
  const jarRect = jar.getBoundingClientRect();
  const bfRect  = bf.el.getBoundingClientRect();

  // Flying clone
  const clone = document.createElement('div');
  clone.textContent  = '🦋';
  clone.style.cssText = `
    position:fixed; left:${bfRect.left}px; top:${bfRect.top}px;
    font-size:clamp(28px,5vw,40px); line-height:1;
    transition:all 0.7s cubic-bezier(0.4,0,0.2,1);
    z-index:999; pointer-events:none;
  `;
  document.body.appendChild(clone);

  requestAnimationFrame(() => requestAnimationFrame(() => {
    clone.style.left      = `${jarRect.left + jarRect.width / 2 - 20}px`;
    clone.style.top       = `${jarRect.top  + jarRect.height / 2 - 20}px`;
    clone.style.transform = 'scale(0.45)';
    clone.style.opacity   = '0.5';

    setTimeout(() => {
      clone.remove();
      addButterflyToJar();
      caughtCount++;
      document.getElementById('caught-count').textContent = caughtCount;
      document.getElementById('quote-text').textContent   = BUTTERFLY_QUOTES[caughtCount - 1];
      document.getElementById('quote-overlay').classList.remove('hidden');
    }, 730);
  }));
}

function addButterflyToJar() {
  const inner = document.getElementById('jar-inner');
  const mini  = document.createElement('span');
  mini.textContent = '🦋';
  mini.style.cssText = `
    font-size:clamp(12px,2.5vw,18px);
    display:inline-block;
    animation:floatY 2s ease-in-out ${Math.random().toFixed(2)}s infinite;
  `;
  inner.appendChild(mini);
}

function dismissQuote() {
  document.getElementById('quote-overlay').classList.add('hidden');
  isPaused = false;
  if (caughtCount === CONFIG.TOTAL_BUTTERFLIES) {
    setTimeout(allCaught, 300);
  }
}

function allCaught() {
  if (butterflyRAF) { cancelAnimationFrame(butterflyRAF); butterflyRAF = null; }

  document.getElementById('step3-title').classList.add('hidden');
  document.getElementById('step3-hint').classList.add('hidden');
  document.getElementById('butterfly-arena').classList.add('hidden');
  document.getElementById('butterfly-progress').classList.add('hidden');

  const jar = document.getElementById('butterfly-jar');
  jar.style.transition = 'transform 0.7s ease';
  jar.style.transform  = 'scale(1.85)';   // bigger jar on completion

  document.getElementById('jar-glow').classList.remove('hidden');
  spawnBurstSparkles(jar);

  setTimeout(() => {
    const tapMsg = document.getElementById('jar-tap-msg');
    tapMsg.textContent = '✨ Tap to Open the Gift 🎁';
    tapMsg.classList.remove('hidden');
  }, 700);
}

function setupJarClick() {
  document.getElementById('butterfly-jar').addEventListener('click', () => {
    if (caughtCount === CONFIG.TOTAL_BUTTERFLIES && !isPaused) goToStep(4);
  });
  document.getElementById('butterfly-jar').addEventListener('touchend', (e) => {
    e.preventDefault();
    if (caughtCount === CONFIG.TOTAL_BUTTERFLIES && !isPaused) goToStep(4);
  }, { passive: false });
}

/* ═══════════════════════════════════════════════════════════════════════
   STEP 4 – BIRTHDAY WISHES
═══════════════════════════════════════════════════════════════════════ */
function initStep4() {
  document.querySelectorAll('.wish-line').forEach(el => {
    el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
  });

  // Balloons
  const bc = document.getElementById('balloons-container');
  bc.innerHTML = '';
  ['🎈','🎀','🎊','🎉','🪅'].forEach(e => {
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
  ['🌹','🌸','💐','🌺'].forEach(e => {
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
  // NO button click handled once in setupButtons()
}

/* ═══════════════════════════════════════════════════════════════════════
   STEP 5 – FINAL PAGE  (I LOVE YOU)
═══════════════════════════════════════════════════════════════════════ */
function initStep5() {
  const container = document.getElementById('global-hearts');
  for (let i = 0; i < 25; i++) {
    setTimeout(() => spawnExtraHeart(container), i * 80);
  }

  // Big heart: tap → burst of small white hearts
  const bigHeart = document.getElementById('big-heart');
  if (!bigHeart) return;

  function heartBurst(e) {
    e.stopPropagation();
    const finalHeartsContainer = document.querySelector('.final-hearts');
    launchWhiteHearts(finalHeartsContainer, 22);
  }
  // Remove old listeners by replacing the element clone trick
  const fresh = bigHeart.cloneNode(true);
  bigHeart.parentNode.replaceChild(fresh, bigHeart);
  fresh.addEventListener('click', heartBurst);
  fresh.addEventListener('touchstart', (e) => { e.preventDefault(); heartBurst(e); }, { passive: false });
}

/* Launch many small white hearts upward inside the box */
function launchWhiteHearts(container, count) {
  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    el.textContent = '♥';
    const size  = 12 + Math.random() * 16;
    const drift = (Math.random() - 0.5) * 250;       // wide spread so hearts flow upward in any direction
    const rise  = 140 + Math.random() * 160;         // keep it within the box height roughly
    const dur   = 0.9 + Math.random() * 0.8;

    el.style.cssText = `
      position:absolute; left:50%; top:50%; 
      transform: translate(-50%, -50%);
      font-size:${size}px; color:#ffffff;
      pointer-events:none; z-index:3000; opacity:1;
      user-select:none;
      text-shadow:0 0 8px rgba(255,255,255,0.95),0 0 18px rgba(255,200,220,0.7);
      transition:transform ${dur}s ease-out, opacity ${dur}s ease-out;
      will-change:transform,opacity;
    `;
    container.appendChild(el);

    const delay = i * 20;
    setTimeout(() => {
      el.style.transform = `translate(calc(-50% + ${drift}px), calc(-50% - ${rise}px)) scale(0.3)`;
      el.style.opacity   = '0';
    }, delay + 16);
    setTimeout(() => el.remove(), delay + dur * 1000 + 200);
  }
}

function spawnExtraHeart(container) {
  const el = document.createElement('span');
  el.className = 'floating-heart';
  el.textContent = '❤️';
  el.style.left            = `${10 + Math.random() * 80}%`;
  el.style.bottom          = '0';
  el.style.fontSize        = `${1.0 + Math.random() * 1.6}rem`;
  el.style.animationDuration = `${4 + Math.random() * 4}s`;
  el.style.animationDelay  = '0s';
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
  el.style.left  = `${Math.random() * 100}%`;
  el.style.fontSize = `${0.6 + Math.random() * 1.3}rem`;
  const dur = 8 + Math.random() * 10;
  el.style.animationDuration = `${dur}s`;
  el.style.animationDelay    = spread ? `-${Math.random() * dur}s` : '0s';
  container.appendChild(el);
  setTimeout(() => el.remove(), (dur + 2) * 1000);
}

/* ═══════════════════════════════════════════════════════════════════════
   STEP 6 – REMINDER (MEMORIES)
═══════════════════════════════════════════════════════════════════════ */
function initStep6() {
  const container = document.getElementById('particles-6');
  if (!container) return;
  container.innerHTML = '';
  const memoryEmojis = ['📸', '💬', '🧸', '💖', '✨', '🍿', '🌹', '💑'];
  for (let i = 0; i < 20; i++) {
    setTimeout(() => {
      const el = document.createElement('span');
      el.className = 'floating-heart';
      el.textContent = memoryEmojis[Math.floor(Math.random() * memoryEmojis.length)];
      el.style.left  = `${5 + Math.random() * 90}%`;
      el.style.bottom = '0';
      el.style.fontSize = `${0.8 + Math.random() * 1.5}rem`;
      el.style.animationDuration = `${6 + Math.random() * 6}s`;
      el.style.animationDelay    = '0s';
      container.appendChild(el);
      setTimeout(() => el.remove(), 12000);
    }, i * 150);
  }
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
  for (let i = 0; i < 22; i++) {
    const dot = document.createElement('div');
    dot.style.cssText = `
      position:fixed; width:${5+Math.random()*6}px; height:${5+Math.random()*6}px;
      border-radius:50%; background:radial-gradient(circle,#fff 0%,#ffb3cc 60%,transparent 100%);
      pointer-events:none; z-index:1000; left:${cx}px; top:${cy}px;
      transition:all 0.9s cubic-bezier(0.4,0,0.2,1); opacity:1;
    `;
    document.body.appendChild(dot);
    const angle = (i / 22) * Math.PI * 2;
    const dist  = 55 + Math.random() * 80;
    setTimeout(() => {
      dot.style.left      = `${cx + Math.cos(angle) * dist}px`;
      dot.style.top       = `${cy + Math.sin(angle) * dist}px`;
      dot.style.opacity   = '0';
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
  audio.muted = false; // Start unmuted

  btn.addEventListener('click', () => {
    audio.muted = !audio.muted;
    if (audio.muted) {
      btn.classList.remove('playing');
      btn.querySelector('.music-icon').textContent = '🎵';
    } else {
      // Just in case it was paused or failed to start initially, try playing it
      audio.play().catch(() => {});
      btn.classList.add('playing');
      btn.querySelector('.music-icon').textContent = '🎶';
    }
  });

  // Attempt initial play
  audio.play().then(() => {
    btn.classList.add('playing');
    btn.querySelector('.music-icon').textContent = '🎶';
  }).catch(() => {
    // If browser blocks autoplay, play on first user interaction anywhere
    const startPlay = () => {
      audio.play().then(() => {
        btn.classList.add('playing');
        btn.querySelector('.music-icon').textContent = '🎶';
        document.removeEventListener('click', startPlay);
        document.removeEventListener('touchstart', startPlay, { passive: true });
      }).catch(() => {});
    };
    document.addEventListener('click', startPlay);
    document.addEventListener('touchstart', startPlay, { passive: true });
  });
}

/* ═══════════════════════════════════════════════════════════════════════
   PARTICLE ORBS PER STEP
═══════════════════════════════════════════════════════════════════════ */
(function injectParticles() {
  [0, 1, 2, 3, 4, 5, 6].forEach(n => {
    const c = document.getElementById(`particles-${n}`);
    if (!c) return;
    for (let i = 0; i < 8; i++) {
      const orb  = document.createElement('div');
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
