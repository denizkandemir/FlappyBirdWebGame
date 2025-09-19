// Angry Flappy: Monsters & Quiz Battles — v8.2 (half-hearts, new damage/capture/heal)
(function () {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  let W = canvas.width,
    H = canvas.height;

  const startScreen = document.getElementById("startScreen");
  const startBtn = document.getElementById("startBtn");
  const sendBtnStart = document.getElementById("sendBtnStart");
  const gameOverEl = document.getElementById("gameOver");
  const sendBtnOver = document.getElementById("sendBtnOver");
  const finalScore = document.getElementById("finalScore");
  const ballLossEl = document.getElementById("ballLoss");
  const ballLossMsg = document.getElementById("ballLossMsg");
  const ballLossOk = document.getElementById("ballLossOk");
  const bestScore = document.getElementById("bestScore");
  const corruptOverlay = document.getElementById("corruptOverlay");
  const corruptTitle = document.getElementById("corruptTitle");
  const corruptVisual = document.getElementById("corruptVisual");
  const trashBtn = document.getElementById("trashBtn");
  const saveBtn = document.getElementById("saveBtn");
  const retryBtn = document.getElementById("retryBtn");
  const scoreEl = document.getElementById("score");
  const livesEl = document.getElementById("lives");
  const ballsCountEl = document.getElementById("ballsCount");
  const hudPowerVal = document.getElementById("hudPowerVal");

  const dexStart = document.getElementById("pokedexStart");
  const dexEl = document.getElementById("pokedex");
  /* init start collection */
  try {
    if (dexStart) renderCollectionPaged(dexStart);
  } catch (e) {}

  // Battle overlay DOM
  const battleOverlay = document.getElementById("battleOverlay");
  const dialogTurn = document.getElementById("dialogTurn");
  const questionText = document.getElementById("questionText");
  const battleAnswer = document.getElementById("battleAnswer");
  const answerBtn = document.getElementById("answerBtn");
  const fleeBtn = document.getElementById("fleeBtn");
  const captureBtn = document.getElementById("captureBtn");
  const captureHint = document.getElementById("captureHint");
  const battleToi = document.getElementById("battleToi");

  const playerName = "Dresseur";
  let playerPower = 2;
  let activeUnit = { name: playerName, hpMax: 2, power: 2, isMonster: false };
  let resumeAt = 0;

  const S = {
    gravity: 1600,
    flap: 420,
    pipeGap: 180,
    pipeW: 86,
    pipeSpacing: 360,
    speed: 240,
    birdR: 18,
    invulnMs: 1200,
    spawnEverySec: [4, 7],
    monsterBaseSpeed: 90,
    groundSpeed: 140,
    hopCooldown: [0.8, 1.7],
    hopVy: -820,
    groundGravityMul: 0.8,
    itemEverySec: [6, 10],
    maxLives: 2,
    battleZoom: 1.18,
    camX: 0.32,
    camY: 0.65,
  };

  let state = "start";
  let rng = mulberry32(Date.now() % 4294967295);
  let last = performance.now();

  let high = Number(localStorage.getItem("angryflappy_high") || 0);
  let bestCaptInRun = Number(
    localStorage.getItem("angryflappy_bestcaprun") || 0
  );
  let balls = Number(localStorage.getItem("angryflappy_balls") || 0);

  // Sync from selected profile after login
  try {
    window.addEventListener("af:login:done", () => {
      // Refresh collection from profile-backed storage
      try {
        if (typeof loadCollection === "function") {
          collection = loadCollection();
          // rerender dex and selects
          try {
            if (typeof renderCollectionPaged === "function") {
              const d = document.getElementById("dexStart");
              if (d) renderCollectionPaged(d);
            }
          } catch (e) {}
          try {
            const selStart = document.getElementById("monsterSelectStart");
            if (selStart && typeof updateMonsterSelect === "function")
              updateMonsterSelect(selStart);
          } catch (e) {}
        }
      } catch (e) {}

      try {
        high = Number(localStorage.getItem("angryflappy_high") || 0);
        bestCaptInRun = Number(
          localStorage.getItem("angryflappy_bestcaprun") || 0
        );
        balls = Number(localStorage.getItem("angryflappy_balls") || 0);
        const bestScoreEl = document.getElementById("bestScore");
        if (bestScoreEl) {
          bestScoreEl.textContent = String(
            Number(localStorage.getItem("angryflappy_bestscore") || 0)
          );
        }
        // Also refresh dropdowns if needed
        try {
          const selStart = document.getElementById("monsterSelectStart");
          if (selStart && typeof updateMonsterSelect === "function")
            updateMonsterSelect(selStart);
        } catch (e) {}
      } catch (e) {}
    });
  } catch (e) {}
  let score = 0;
  let lives = activeUnit.hpMax;
  let capturesRun = 0;
  let lostBattlesRun = 0;
  let runMaxLives = activeUnit.hpMax;
  let runPower = activeUnit.power;

  // Collection
  let collection = loadCollection();

  // Capture tuning: +15% per ball thrown in current battle
  const CAPTURE_ATTEMPT_BONUS = 0.15; // 15%
  let captureAttemptsInBattle = 0;

  // Build dropdown(s) for selecting a captured monster
  function updateMonsterSelect(selectEl) {
    if (!selectEl) return;
    // Clear and rebuild
    while (selectEl.firstChild) selectEl.removeChild(selectEl.firstChild);
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "-- Aucun — (jouer sans monstre)";
    selectEl.appendChild(placeholder);
    // Build nice label for each captured monster
    const list = (collection || [])
      .slice()
      .map((id) => {
        const [c, f, k] = id.split("-").map((n) => parseInt(n));
        const name = monsterName(c, f, k);
        const hp = hpForId(c, f, k);
        const power = powerForId(c, f, k);
        return { id, name, hp, power };
      })
      .sort((a, b) => a.name.localeCompare(b.name, "fr"));
    for (const m of list) {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = `${m.name} — PV ${m.hp} • Puissance ${m.power}`;
      if (selectedMonsterId && selectedMonsterId === m.id) opt.selected = true;
      selectEl.appendChild(opt);
    }
    // Wire events (overwrite any previous one)
    selectEl.onchange = (e) => {
      selectedMonsterId = e.target.value || null;
      updateSendButtons();
    };
  }

  /* render dexStart after load */
  try {
    const selStart = document.getElementById("monsterSelectStart");
    if (selStart) updateMonsterSelect(selStart);
  } catch (e) {}

  try {
    if (dexStart) renderCollectionPaged(dexStart);
  } catch (e) {}
  function loadCollection() {
    try {
      return JSON.parse(localStorage.getItem("angryflappy_collection") || "[]");
    } catch (e) {
      return [];
    }
  }
  function saveCollection() {
    localStorage.setItem("angryflappy_collection", JSON.stringify(collection));
  }
  function ballIconLossSVG() {
    return `<svg aria-hidden="true" class="ballIcon" height="36" viewBox="0 0 64 64" width="36">
<defs>
<radialGradient cx="50%" cy="50%" id="gGlowLoss" r="50%">
<stop offset="0%" stop-color="#00fff0" stop-opacity="0.9"/>
<stop offset="60%" stop-color="#00d4ff" stop-opacity="0.7"/>
<stop offset="100%" stop-color="#00a3ff" stop-opacity="0.0"/>
</radialGradient>
<linearGradient id="gRingLoss" x1="0%" x2="100%" y1="0%" y2="100%">
<stop offset="0%" stop-color="#66fff9"/>
<stop offset="50%" stop-color="#a067ff"/>
<stop offset="100%" stop-color="#ff4dbe"/>
</linearGradient>
</defs>
<circle cx="32" cy="32" fill="url(#gGlowLoss)" r="22"></circle>
<circle cx="32" cy="32" fill="none" r="15" stroke="url(#gRingLoss)" stroke-width="6"></circle>
<circle cx="32" cy="32" fill="#ffffff" r="3"></circle>
</svg>`;
  }
  function saveBalls() {
    localStorage.setItem("angryflappy_balls", String(balls));
  }

  // World
  const world = { groundY: H - 80, scrollX: 0, stars: null, buildings: null };

  // Monster taxonomy
  const Categories = ["Volant", "Sol", "Plafond"];
  const Forms = {
    Volant: ["Aileron", "Pico", "Spectra", "Raptix", "Zigzag", "Fumee"],
    Sol: ["Blobu", "Crabbo", "Rochet", "Taupin", "Impix", "Herizo"],
    Plafond: ["Araxo", "Goutte", "Stalax", "Chauvi", "Camelo", "Pendu"],
  };
  const Colors = [
    { name: "Rouge", c: "#ef4444" },
    { name: "Azur", c: "#3b82f6" },
    { name: "Jade", c: "#10b981" },
    { name: "Or", c: "#f59e0b" },
    { name: "Violet", c: "#8b5cf6" },
    { name: "Ombre", c: "#374151" },
    { name: "Neige", c: "#e5e7eb" },
    { name: "Cuivre", c: "#b45309" },
    { name: "Rose", c: "#ec4899" },
    { name: "Cyan", c: "#06b6d4" },
  ];
  function deaccent(s) {
    return s.normalize("NFD").replace(/\p{Diacritic}/gu, "");
  }
  function takeFirst3(s) {
    s = deaccent(s).toLowerCase();
    return s.slice(0, 3);
  }
  function takeLast3(s) {
    s = deaccent(s).toLowerCase();
    return s.length <= 3 ? s : s.slice(-3);
  }
  function capFirst(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  function monsterName(catIdx, formIdx, colorIdx) {
    const cat = Categories[catIdx],
      form = Forms[cat][formIdx],
      col = Colors[colorIdx].name;
    const name = takeFirst3(form) + takeFirst3(cat) + takeLast3(col);
    return capFirst(name);
  }
  function monsterId(catIdx, formIdx, colorIdx) {
    return `${catIdx}-${formIdx}-${colorIdx}`;
  }
  function hashStr(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = (h * 31 + s.charCodeAt(i)) | 0;
    }
    return h >>> 0;
  }
  function eyeCountFor(id) {
    return (hashStr(id) % 3) + 1;
  }
  function hpForId(catIdx, formIdx, colorIdx) {
    return ((catIdx * 7 + formIdx * 13 + colorIdx * 17 + 11) % 10) + 1;
  }
  function powerForId(catIdx, formIdx, colorIdx) {
    return ((catIdx * 11 + formIdx * 5 + colorIdx * 23 + 3) % 10) + 1;
  }
  function starsFor(mon) {
    const t = mon.maxhp + mon.power;
    if (t >= 20) return 4;
    if (t >= 17) return 3;
    if (t >= 13) return 2;
    if (t >= 5) return 1;
    return 0;
  }

  // Entities
  const bird = {
    x: 220,
    y: H / 2,
    vy: 0,
    r: S.birdR,
    tilt: 0,
    invulnUntil: 0,
    trail: [],
  };
  let pipes = [];
  let nextPipeX = 600;
  let monsters = [];
  let monsterTimer = 0;
  let items = [];
  let itemTimer = 1.5;

  // Battle state & animations
  let battle = null;
  captureAttemptsInBattle = 0;
  const anim = {
    monsterLungeT: 0,
    playerLungeT: 0,
    hurtFlashT: 0,
    worldHurtT: 0,
    capture: {
      active: false,
      phase: "idle",
      t0: 0,
      t1: 0,
      holdUntil: 0,
      success: false,
      fromX: 0,
      fromY: 0,
      toX: 0,
      toY: 0,
    },
  };

  // Selection + control (player)
  let selectedMonsterId = null;
  let control = {
    mode: "fly",
    jumps: 0,
    maxJumps: 4,
    glide: 1.0,
    glideMax: 1.0,
    hold: false,
    ceilingLockY: null,
    pointerDownAt: 0,
    fastFallTimer: 0,
    holdStart: 0,
  };

  // ---------- Helpers for half-hearts & RNG ----------
  function roundToHalf(v) {
    return Math.round(v * 2) / 2;
  }

  const neonColors = [
    "rgba(120,160,255,0.10)",
    "#00E5FF",
    "#00C2FF",
    "#8AFF00",
    "#FF2E63",
    "#FFD166",
  ];

  function heartsHTML(current, max) {
    let html = "";
    for (let i = 0; i < max; i++) {
      const frac = Math.max(0, Math.min(1, current - i));
      const pct = Math.round(frac * 100);
      html += `<svg viewBox="0 0 32 29" class="heartSvg" aria-hidden="true">
        <defs><clipPath id="clip${i}"><rect x="0" y="0" width="${
        (32 * pct) / 100
      }" height="29"></rect></clipPath></defs>
        <path d="M16 29S1 19 1 9a8 8 0 0 1 15-3 8 8 0 0 1 15 3c0 10-15 20-15 20z" fill="#e5e7eb" stroke="#1f2937" stroke-width="1"></path>
        <g clip-path="url(#clip${i})">
          <path d="M16 29S1 19 1 9a8 8 0 0 1 15-3 8 8 0 0 1 15 3c0 10-15 20-15 20z" fill="#e11d48"></path>
        </g>
      </svg>`;
    }
    return html;
  }

  function drawGBHeartFrac(x, y, frac) {
    const px = [
      "00100100",
      "01111110",
      "11111111",
      "11111111",
      "01111110",
      "00111100",
      "00011000",
    ];
    ctx.fillStyle = "#cfe69b";
    for (let r = 0; r < px.length; r++) {
      for (let c = 0; c < 8; c++) {
        if (px[r][c] === "1") {
          ctx.fillRect(x + c * 2, y + r * 2, 2, 2);
        }
      }
    }
    const cols = Math.round(8 * frac);
    ctx.fillStyle = "#0f380f";
    for (let r = 0; r < px.length; r++) {
      for (let c = 0; c < cols; c++) {
        if (px[r][c] === "1") {
          ctx.fillRect(x + c * 2, y + r * 2, 2, 2);
        }
      }
    }
  }

  function mulberry32(a) {
    return function () {
      var t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }
  function randRange(min, max) {
    return min + (max - min) * rng();
  }

  // ---------- Background (synthwave) ----------
  const worldHelpers = {
    synthParallaxBG() {
      // Canvas boyutları
      const w = W;
      const h = H;
      const t = performance.now() / 1000;

      // Arka plan gradyanı
      ctx.save();
      ctx.fillStyle = ctx.createRadialGradient(
        w * 0.2,
        h * 0.1,
        0,
        w * 0.2,
        h * 0.1,
        Math.max(w, h) * 0.9
      );
      ctx.fillStyle.addColorStop?.(0, "#12224a");
      ctx.fillStyle.addColorStop?.(0.5, "#0c1230");
      ctx.fillStyle.addColorStop?.(1, "#07081A");
      ctx.fillRect(0, 0, w, h);
      ctx.restore();

      // Paralaks grid
      ctx.save();
      ctx.strokeStyle = "rgba(120,160,255,0.10)";
      ctx.lineWidth = 1;
      const s = 32;
      const offset = (t * 32) % s;
      for (let x = -s + offset; x < w; x += s) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = -s + offset; y < h; y += s) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      ctx.restore();
    },
  };

  // ---------- Pipes & neon edges ----------
  function spawnPipe(x) {
    const margin = 120;
    const gapY = randRange(margin, world.groundY - margin - S.pipeGap);
    pipes.push({ x, w: S.pipeW, gapY, gapH: S.pipeGap, passed: false });
  }
  function drawPipe(p) {
    const x = p.x,
      w = p.w,
      gapTop = p.gapY,
      gapBot = p.gapY + p.gapH;
    const t = performance.now() / 1000;
    ctx.save();
    ctx.strokeStyle = "#00ffcc";
    ctx.lineWidth = 3;
    ctx.shadowBlur = 12;
    ctx.shadowColor = "#00ffcc";
    ctx.strokeRect(x + 1, 1, w - 2, gapTop - 2);
    const h2 = H - gapBot - (H - world.groundY);
    ctx.strokeRect(x + 1, gapBot, w - 2, h2);
    ctx.restore();
    ctx.fillStyle = "#050b12";
    ctx.fillRect(x, 0, w, gapTop);
    ctx.fillRect(x, gapBot, w, h2);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, 0, w, gapTop);
    ctx.rect(x, gapBot, w, h2);
    ctx.clip();
    const colW = 10;

    ctx.globalAlpha = 1;
    ctx.restore();
    ctx.save();
    ctx.fillStyle = "rgba(0,255,170,0.3)";
    for (let i = 0; i < 4; i++) {
      const gx = x + Math.random() * w;
      const gy =
        Math.random() < 0.5
          ? Math.random() * gapTop
          : gapBot + Math.random() * h2;
      const gw = 6 + Math.random() * 12;
      const gh = 2 + Math.random() * 4;
      ctx.fillRect(gx, gy, gw, gh);
    }
    ctx.restore();
  }

  // ...diğer kodların üstüne, neon renk dizisinin yanına ekle:

  function drawNeonEdges() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, -600, W, 600);
    ctx.fillRect(0, world.groundY, W, H);

    // HSL tabanlı smooth neon renk
    const t = performance.now() / 1000;
    const neon = `hsl(${(t * 30) % 360}, 95%, 60%)`;

    ctx.save();
    ctx.shadowBlur = 18;
    ctx.shadowColor = neon;
    ctx.strokeStyle = neon;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-20, 0.5);
    ctx.lineTo(W + 20, 0.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-20, world.groundY - 0.5);
    ctx.lineTo(W + 20, world.groundY - 0.5);
    ctx.stroke();
    ctx.restore();

    function glitches(y, count) {
      for (let i = 0; i < count; i++) {
        const w = 6 + Math.random() * 14;
        const h = 2 + Math.random() * 3;
        const x = (Math.random() * W) | 0;
        const yy = y + (Math.random() < 0.5 ? -1 : 1) * (1 + Math.random() * 2);
        ctx.fillStyle = "rgba(0,255,102,0.35)";
        ctx.fillRect(x, yy, w, h);
      }
    }
    glitches(0, 14);
    glitches(world.groundY, 18);
  }

  function drawNeonBall(x, y, r) {
    const gradGlow = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * 1.15);
    gradGlow.addColorStop(0, "rgba(0,255,240,0.9)");
    gradGlow.addColorStop(0.6, "rgba(0,212,255,0.6)");
    gradGlow.addColorStop(1, "rgba(0,163,255,0)");
    ctx.fillStyle = gradGlow;
    ctx.beginPath();
    ctx.arc(x, y, r * 1.05, 0, Math.PI * 2);
    ctx.fill();
    const gradRing = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
    gradRing.addColorStop(0, "#66fff9");
    gradRing.addColorStop(0.5, "#a067ff");
    gradRing.addColorStop(1, "#ff4dbe");
    ctx.strokeStyle = gradRing;
    ctx.lineWidth = Math.max(2, r * 0.24);
    ctx.shadowColor = "#7cf9ff";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.72, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(x, y, Math.max(2, r * 0.12), 0, Math.PI * 2);
    ctx.fill();
  }

  // ---------- Items (balls only) ----------
  function spawnItem() {
    const type = "ball";
    const x = W + 40;
    let y = randRange(80, world.groundY - 100);
    // Find the nearest pipe by x at spawn time
    if (pipes.length) {
      let best = null,
        bestDx = 1e9;
      for (let p of pipes) {
        const dx = Math.abs(p.x - x);
        if (dx < bestDx) {
          bestDx = dx;
          best = p;
        }
      }
      if (best) {
        const margin = 18;
        const gapTop = best.gapY + margin;
        const gapBot = best.gapY + best.gapH - margin;
        if (gapBot > gapTop) {
          y = clamp(randRange(gapTop, gapBot), 80, world.groundY - 100);
        }
      }
    }
    items.push({ type, x, y, r: 14 });
  }
  function drawItem(it) {
    drawNeonBall(it.x, it.y, 14);
  }

  // ---------- Monsters ----------
  function createMonsterCandidate() {
    // monsters dizisi monsters.js'den global olarak gelir
    const idx = Math.floor(rng() * monsters.length);
    const m = monsters[idx];

    console.log(monsters);

    // Oyun içi pozisyon ve hareket değerlerini ayarla
    let x = W + 50;
    let y;
    if (m.category === "Sol") {
      y = world.groundY - 24;
    } else if (m.category === "Plafond") {
      y = 24;
    } else {
      y = randRange(80, world.groundY - 200);
    }

    return {
      id: m.id,
      name: m.name,
      catIdx: categoryIndex(m.category),
      formIdx: formIndex(m.category, m.form),
      colorIdx: colorIndex(m.color.name),
      eyes: 1, // veya monsters.js'de göz sayısı varsa onu kullan
      color: m.color.hex,
      x,
      y,
      r: 20,
      vx: -S.speed * 0.5,
      vy: 0,
      state: "idle",
      maxhp: m.stats.hp,
      power: m.stats.power,
      wob: rng() * Math.PI * 2,
      midAirUsed: false,
      img: m.img, // img path'i
    };
  }

  function categoryIndex(catName) {
    return Categories.indexOf(catName);
  }

  function formIndex(catName, formName) {
    return Forms[catName].indexOf(formName);
  }

  function colorIndex(colorName) {
    return Colors.findIndex((c) => c.name === colorName);
  }

  function acceptanceFor(mon) {
    const s = starsFor(mon);
    let starFactor = 1.0;
    if (s === 1) starFactor = 0.6;
    else if (s === 2) starFactor = 0.3;
    else if (s === 3) starFactor = 0.08;
    else if (s === 4) starFactor = 0.02;
    const statFactor = ((11 - mon.maxhp) / 10) * ((11 - mon.power) / 10);
    return Math.min(1, starFactor * statFactor);
  }

  function createMonster() {
    return createMonsterCandidate();
  }

  function startBattleIfCollision(mon) {
    const dist = Math.hypot(bird.x - mon.x, bird.y - mon.y);
    if (dist < S.birdR + mon.r && Date.now() > bird.invulnUntil) {
      startBattle({ ...mon });
      monsters = monsters.filter((mm) => mm !== mon);
      return true;
    }
    return false;
  }
  // Sabitler (yoksa bunları ekle)
  const FLOOR_H = 40; // zemindeki çizginin kalınlığı
  // bird objesi (oyunda zaten varsa birleştir)

  // --- Geometry Dash tarzı bird ---
  function drawBird(scale = 1) {
    const size = S.birdR * 2 * scale;
    const t = performance.now() / 1000;
    const bob = Math.sin(t * 6) * 3 * scale;
    const rot = bird.tilt * 0.15;

    ctx.save();
    ctx.translate(bird.x, bird.y + bob);
    ctx.rotate(rot);

    // Glow arkası
    const halo = ctx.createRadialGradient(0, 0, size * 0.25, 0, 0, size * 1.15);
    halo.addColorStop(0, "rgba(34,231,255,0.18)");
    halo.addColorStop(1, "rgba(34,231,255,0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, size * 1.1, 0, Math.PI * 2);
    ctx.fill();

    // Kare gövde
    ctx.fillStyle = "rgba(10,18,26,0.96)";
    ctx.fillRect(-size / 2, -size / 2, size, size);

    // Neon çerçeve
    ctx.strokeStyle = "#22e7ff";
    ctx.lineWidth = 4 * scale;
    ctx.shadowBlur = 16 * scale;
    ctx.shadowColor = "#66f7ff";
    ctx.strokeRect(-size / 2 + 0.5, -size / 2 + 0.5, size - 1, size - 1);
    ctx.shadowBlur = 0;

    // Çapraz çizgiler
    ctx.strokeStyle = "rgba(34,231,255,0.32)";
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.moveTo(-size / 2, -size / 2);
    ctx.lineTo(size / 2, size / 2);
    ctx.moveTo(size / 2, -size / 2);
    ctx.lineTo(-size / 2, size / 2);
    ctx.stroke();

    // Yüz
    ctx.fillStyle = "#fff";
    ctx.fillRect(-size * 0.28, -size * 0.18, 6, 8);
    ctx.fillRect(-size * 0.08, -size * 0.18, 6, 8);
    ctx.fillRect(-size * 0.28, size * 0.12, size * 0.56, 4);

    ctx.restore();
  }

  // --- DRAW LOOP ENTEGRASYONU ---
  // draw() fonksiyonunun içine şunları sırayla koy:
  // 1) drawBackGrid()
  // 2) drawScanline()
  // 3) borular
  // 4) trail
  // 5) drawBird()

  function drawMonster(mon, scale = 1) {
    ctx.save();
  ctx.translate(mon.x, mon.y);
  if (mon.img) {
    let img = drawMonster._imgCache?.[mon.img];
    if (!img) {
      img = new window.Image();
      img.src = mon.img;
      drawMonster._imgCache = drawMonster._imgCache || {};
      drawMonster._imgCache[mon.img] = img;
    }
    if (img.complete && img.naturalWidth > 0) {
      const r = (mon.r || 20) * scale;
      ctx.drawImage(img, -r, -r, r * 2, r * 2);
    } else {
      drawMonsterBody(mon, ctx, scale);
    }
  } else {
    drawMonsterBody(mon, ctx, scale);
  }
  ctx.restore();
  }

 
  function shade(hex, k) {
    const c = parseInt(hex.slice(1), 16);
    let r = (c >> 16) & 255,
      g = (c >> 8) & 255,
      b = c & 255;
    r = Math.max(0, Math.min(255, Math.round(r * k)));
    g = Math.max(0, Math.min(255, Math.round(g * k)));
    b = Math.max(0, Math.min(255, Math.round(b * k)));
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  // ---------- Battle flow ----------
  function startBattle(mon) {
    const hudWrap = document.getElementById("hudWrap");
    if (hudWrap) hudWrap.style.display = "none"; // HUD toggle on battle
    state = "battle";
    document.body.classList.add("in-battle");
    captureAttemptsInBattle = 0;
    battle = { mon: mon, hp: mon.maxhp, maxhp: mon.maxhp, power: mon.power };
    battleToi.innerHTML = toiPanelHTML();
    positionBattleOverlay();
    battleOverlay.classList.add("show");
    questionText.textContent = pickQuestion();
    battleAnswer.value = "";
    captureHint.textContent = "";
    setTimeout(() => battleAnswer.focus(), 40);
  }
  function showFleeAndEnd(consumedLife) {
    anim.monsterLungeT = performance.now() + 220;
    if (battle) battle.fleeBannerUntil = performance.now() + 500;
    if (consumedLife) {
      if (lives > 0.5) {
        lives = roundToHalf(lives - 0.5);
      } else {
        lives = 0.5;
      }
      updateHUD();
      battleToi.innerHTML = toiPanelHTML();
    }
    setTimeout(() => {
      endBattle(false);
    }, 420);
  }
  function endBattle(consumedLife) {
    const hudWrap = document.getElementById("hudWrap");
    if (hudWrap) hudWrap.style.display = ""; // HUD back after battle
    battleOverlay.classList.remove("show");
    document.body.classList.remove("in-battle");
    if (consumedLife) {
      if (lives > 0.5) lives = roundToHalf(lives - 0.5);
      else lives = 0.5;
      updateHUD();
    }
    battle = null;
    captureAttemptsInBattle = 0;
    resumeAt = performance.now() + 900;
    state = "playing";
    bird.invulnUntil = Date.now() + 700;
  }
  function neonBallSVG(size = 20) {
    return `<svg class="ballIcon" viewBox='0 0 64 64' width='${size}' height='${size}' aria-hidden='true'>
    <defs>
      <radialGradient id='gGlow2' cx='50%' cy='50%' r='50%'>
        <stop offset='0%' stop-color='#00fff0' stop-opacity='0.9'/>
        <stop offset='60%' stop-color='#00d4ff' stop-opacity='0.7'/>
        <stop offset='100%' stop-color='#00a3ff' stop-opacity='0.0'/>
      </radialGradient>
      <linearGradient id='gRing2' x1='0%' y1='0%' x2='100%' y2='100%'>
        <stop offset='0%' stop-color='#66fff9'/>
        <stop offset='50%' stop-color='#a067ff'/>
        <stop offset='100%' stop-color='#ff4dbe'/>
      </linearGradient>
    </defs>
    <circle cx='32' cy='32' r='22' fill='url(#gGlow2)'></circle>
    <circle cx='32' cy='32' r='15' fill='none' stroke='url(#gRing2)' stroke-width='6'></circle>
    <circle cx='32' cy='32' r='3' fill='#ffffff'></circle>
  </svg>`;
  }
  function toiPanelHTML() {
    const hearts = heartsHTML(lives, activeUnit.hpMax);
    const bolts = "⚡".repeat(activeUnit.power);
    return `<div class="toi-left"><span class="toi-name">${
      activeUnit.name || "Dresseur"
    }</span></div>
            <div class="toi-stats">
              <div class="toi-hearts">${hearts}</div>
              <div class="toi-balls">${neonBallSVG(
                20
              )} <strong>x ${balls}</strong></div>
              <div class="toi-power" title="Puissance">${bolts}</div>
            </div>`;
  }
  function positionBattleOverlay() {
    const dialogH = dialogTurn.getBoundingClientRect().height;
    battleToi.classList.remove("hidden");
    battleToi.style.bottom = 18 + dialogH + 8 + "px";
  }
  window.addEventListener("resize", () => {
    if (state === "battle") positionBattleOverlay();
  });

  function pickQuestion() {
    const core = [questions[0], questions[1], questions[2]];
    const pool = core.concat(questions);
    return pool[Math.floor(rng() * pool.length)];
  }

  // ---------- Input ----------
  function handlePressDown() {
    if (state !== "playing") return;
    control.pointerDownAt = performance.now();
    control.holdStart = control.pointerDownAt;
    control.hold = true;
    if (control.mode === "fly") {
      bird.vy = -S.flap;
      bird.tilt = -0.5;
    } else if (control.mode === "ground") {
      if (control.jumps < control.maxJumps) {
        bird.vy = -S.flap * 1.2;
        control.jumps++;
      }
    } else if (control.mode === "ceiling") {
      control.ceilingLockY = null;
    }
  }
  function handlePressUp() {
    if (state !== "playing") return;
    const dur = performance.now() - control.pointerDownAt;
    control.hold = false;
    if (control.mode === "ground") {
      if (control.glide < control.glideMax) {
        control.fastFallTimer = 0.6;
      }
    } else if (control.mode === "ceiling") {
      if (dur < 160) {
        // Quick tap: snap back up fast and lock to the ceiling
        bird.vy = -S.flap * 1.3;
        bird.y = Math.max(bird.r + 2, bird.y - 60);
        control.ceilingLockY = bird.r + 2;
      } else {
        // Long press released: stop descent immediately and hold this altitude
        bird.vy = 0;
        control.ceilingLockY = bird.y;
      }
    }
  }
  function onPointerDown(e) {
    e.preventDefault();
    handlePressDown();
  }
  function onKeyDown(e) {
    if (e.code === "Space") {
      e.preventDefault();
      handlePressDown();
    }
  }
  function onPointerUp(e) {
    e.preventDefault();
    handlePressUp();
  }
  function onKeyUp(e) {
    if (e.code === "Space") {
      e.preventDefault();
      handlePressUp();
    }
  }
  canvas.addEventListener("pointerdown", onPointerDown, { passive: false });
  canvas.addEventListener("pointerup", onPointerUp, { passive: false });
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  if (startBtn) {
    startBtn.addEventListener("click", () => {
      startScreen.classList.remove("show");
      selectedMonsterId = null;
      resetGame();
    });
  }
  if (retryBtn) {
    retryBtn.addEventListener("click", () => {
      if (corruptOverlay) corruptOverlay.classList.remove("show");
      gameOverEl.classList.remove("show");
      selectedMonsterId = null;
      resetGame();
    });
  }

  function updateSendButtons() {
    const on = !!selectedMonsterId;
    if (sendBtnStart) {
      sendBtnStart.classList.toggle("ghost", !on);
    }
    if (sendBtnOver) {
      sendBtnOver.classList.toggle("ghost", !on);
    }
  }
  function startWithMonster(id) {
    const [c, f, k] = id.split("-").map((n) => parseInt(n));
    const mon = {
      id: id,
      name: monsterName(c, f, k),
      catIdx: c,
      formIdx: f,
      colorIdx: k,
      color: Colors[k].c,
      eyes: eyeCountFor(id),
      maxhp: hpForId(c, f, k),
      power: powerForId(c, f, k),
      r: 18,
    };
    activeUnit = {
      name: mon.name,
      hpMax: mon.maxhp,
      power: mon.power,
      isMonster: true,
      monster: mon,
    };
    lives = activeUnit.hpMax;
    score = 0;
    capturesRun = 0;
    lostBattlesRun = 0;
    control.mode = c === 0 ? "fly" : c === 1 ? "ground" : "ceiling";
    control.jumps = 0;
    control.maxJumps = 4;
    control.glide = control.glideMax = 1.0;
    control.hold = false;
    control.ceilingLockY = null;
    control.fastFallTimer = 0;
    runMaxLives = activeUnit.hpMax;
    runPower = activeUnit.power;
    updateHUD();
    startScreen.classList.remove("show");
    gameOverEl.classList.remove("show");
    bird.x = 220;
    bird.vy = 0;
    bird.tilt = 0;
    bird.invulnUntil = 0;
    if (control.mode === "ground") {
      bird.y = world.groundY - bird.r - 1;
    } else if (control.mode === "ceiling") {
      bird.y = bird.r + 2;
    } else {
      bird.y = H / 2;
    }
    pipes = [];
    nextPipeX = 600;
    monsters = [];
    monsterTimer = 0;
    items = [];
    itemTimer = 1.5;
    world.scrollX = 0;
    world.stars = null;
    world.buildings = null;
    state = "playing";
  }
  if (sendBtnStart) {
    sendBtnStart.addEventListener("click", () => {
      if (selectedMonsterId) startWithMonster(selectedMonsterId);
    });
  }
  if (sendBtnOver) {
    sendBtnOver.addEventListener("click", () => {
      if (gameOverEl) gameOverEl.classList.remove("show");
      if (corruptOverlay) corruptOverlay.classList.remove("show");
      if (selectedMonsterId) startWithMonster(selectedMonsterId);
    });
  }

  // ---------- Damage & capture ----------
  function randHalfUpTo(maxPow) {
    const steps = Math.floor(maxPow * 2) + 1;
    const k = Math.floor(rng() * steps);
    return k * 0.5;
  }
  function dmgReceivedFrom(powerEnemy) {
    const pick = randHalfUpTo(powerEnemy);
    const raw = pick / 2;
    return roundToHalf(raw);
  }
  function dmgInflictedFrom(powerPlayer) {
    const pick = randHalfUpTo(powerPlayer);
    const raw = pick / 1.5;
    return roundToHalf(raw);
  }
  function captureProbability(
    playerPow,
    playerHp,
    enemyPow,
    enemyHp,
    enemyMaxHp
  ) {
    // Nouveau calcul: base 60% à niveau égal (niveau = puissance + vie max),
    // décroît rapidement si l'ennemi est au-dessus, monte si on est au-dessus.
    // Garde les bonus existants: affaiblir l'ennemi ↑, et chaque balle lancée ↑ (géré ailleurs).
    const playerLevel = playerPow + activeUnit.hpMax; // niveau joueur = puissance + vie max
    const enemyLevel = enemyPow + enemyMaxHp; // niveau ennemi = puissance + vie max
    const delta = playerLevel - enemyLevel; // différence de niveau (peut être négative)

    // Sigmoïde calibrée: P(delta=0) ≈ 0.60, P(delta=-9) ≈ 0.10
    const k = 0.289136; // pente
    const x0 = -1.401; // décalage
    const base = 1 / (1 + Math.exp(-k * (delta - x0)));

    // Bonus quand l'ennemi est affaibli (inchangé dans l'esprit)
    const weaken = 1 - enemyHp / (enemyMaxHp + 0.001);
    let p = base + 0.95 * weaken + (rng() * 0.02 - 0.01); // petite variabilité

    // Encadrement doux
    p = Math.max(0.04, Math.min(0.95, p));
    return p;
  }

  // ---------- Game reset / HUD ----------
  function resetGame() {
    /* ensure bird defaults */
    selectedMonsterId = null;
    if (typeof control !== "undefined") {
      control.mode = "fly";
      control.jumps = 0;
      control.maxJumps = 4;
      control.glide = control.glideMax = 1.0;
      control.hold = false;
    }
    activeUnit = {
      name: playerName,
      hpMax: S.maxLives,
      power: playerPower,
      isMonster: false,
    };
    score = 0;
    lives = activeUnit.hpMax;
    capturesRun = 0;
    lostBattlesRun = 0;
    runMaxLives = activeUnit.hpMax;
    runPower = activeUnit.power;
    updateHUD();
    bird.x = 220;
    bird.y = H / 2;
    bird.vy = 0;
    bird.tilt = 0;
    bird.invulnUntil = 0;
    bird.trail = []; // <-- Bunu ekle!
    pipes = [];
    nextPipeX = 600;
    monsters = [];
    monsterTimer = 0;
    items = [];
    itemTimer = 1.5;
    world.scrollX = 0;
    world.stars = null;
    world.buildings = null;
    state = "playing";
    renderCollectionPaged(dexStart);
    updateSendButtons();
  }
  function updateHUD() {
    livesEl.innerHTML = heartsHTML(lives, activeUnit.hpMax);
    scoreEl.textContent = score;
    ballsCountEl.textContent = balls;
    if (hudPowerVal) hudPowerVal.textContent = String(activeUnit.power);
  }

  // ---------- Player physics / AI ----------
  function spawnPipeIfNeeded() {
    while (nextPipeX < world.scrollX + W + 200) {
      spawnPipe(nextPipeX);
      nextPipeX += S.pipeSpacing;
    }
  }
  function drawStars(mon) {
    const s = starsFor(mon);
    if (s <= 0) return;
    ctx.save();
    ctx.translate(mon.x, mon.y - mon.r - 14);
    for (let i = 0; i < s; i++) {
      const x = (i - (s - 1) / 2) * 14;
      drawStar(x, 0, 6);
    }
    ctx.restore();
  }
  function drawStar(x, y, r) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "#fbbf24";
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = i * ((Math.PI * 2) / 5) - Math.PI / 2;
      const rr = i % 2 === 0 ? r : r * 0.5;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function playerSafeOnTopOfPipe() {
    // Extended safe zone on the TOP of bottom pipe so walking near edges doesn't trigger side-hit
    const padX = S.birdR + 14; // horizontal forgiveness beyond pipe edges
    const padYTop = 24; // vertical forgiveness above top surface
    for (let p of pipes) {
      const topY = p.gapY + p.gapH;
      const withinX = bird.x > p.x - padX && bird.x < p.x + p.w + padX;
      const feetY = bird.y + S.birdR;
      if (withinX && feetY >= topY - 8 && feetY <= topY + padYTop) {
        return true;
      }
    }
    return false;
  }
  function collidesWithPipe() {
    const OVERHANG = 16;
    const TOP_BAND = 22;
    for (let p of pipes) {
      // If we're essentially on the top band (GROUND mode), treat as safe platform.
      const topY = p.gapY + p.gapH;
      const feetY = bird.y + S.birdR;
      const onTopBand =
        control.mode === "ground" &&
        feetY >= topY - 6 &&
        feetY <= topY + TOP_BAND &&
        bird.x > p.x - OVERHANG &&
        bird.x < p.x + p.w + OVERHANG;
      if (onTopBand) {
        continue;
      }

      if (bird.x + S.birdR > p.x && bird.x - S.birdR < p.x + p.w) {
        const gapTop = p.gapY,
          gapBot = p.gapY + p.gapH;
        if (bird.y - S.birdR < gapTop || bird.y + S.birdR > gapBot) {
          return true;
        }
      }
    }
    return false;
  }

  function update(dt) {
    if (state !== "playing") return;
    if (performance.now() < resumeAt) return;
    const dx = S.speed * dt;
    world.scrollX += dx;
    // Player physics by mode
    if (control.mode === "fly") {
      bird.vy += S.gravity * dt;
    } else if (control.mode === "ground") {
      const g = S.gravity * 1.35 * (control.fastFallTimer > 0 ? 1.5 : 1.0);
      if (control.hold && control.glide > 0) {
        bird.vy += -bird.vy * 0.5 * dt;
        control.glide = Math.max(0, control.glide - dt);
      } else {
        bird.vy += g * dt;
      }
    } else if (control.mode === "ceiling") {
      const held = control.hold;
      const heldDur = performance.now() - control.holdStart;
      if (held && heldDur > 150) {
        // Active descent under gravity
        bird.vy += S.gravity * 0.7 * dt;
        control.ceilingLockY = null;
      } else {
        // Hold altitude exactly at lock; no drift
        const target =
          control.ceilingLockY != null ? control.ceilingLockY : S.birdR + 2;
        const diff = target - bird.y;
        // Strong corrective acceleration + damping
        bird.vy += clamp(diff * 40, -800, 800) * dt;
        // If very close to target, snap & zero velocity
        if (Math.abs(diff) < 0.6) {
          bird.y = target;
          bird.vy = 0;
        }
      }
    }
    bird.y += bird.vy * dt;
    bird.tilt = clamp(bird.tilt + (bird.vy > 0 ? 2 : -2) * dt, -0.9, 1.0);

    spawnPipeIfNeeded();
    for (let p of pipes) {
      p.x -= dx;
      if (!p.passed && p.x + p.w < bird.x) {
        p.passed = true;
        score += 1;
        scoreEl.textContent = score;
      }
    }
    pipes = pipes.filter((p) => p.x + p.w > -50);

    // Items
    itemTimer -= dt;
    if (itemTimer <= 0) {
      spawnItem();
      itemTimer = randRange(S.itemEverySec[0], S.itemEverySec[1]);
    }
    for (let it of items) {
      it.x -= dx;
    }
    for (let it of items) {
      if (Math.hypot(bird.x - it.x, bird.y - it.y) < S.birdR + (it.r || 12)) {
        if (it.type === "ball") {
          balls += 1;
          saveBalls();
        }
        updateHUD();
        it.x = -9999;
      }
    }
    items = items.filter((it) => it.x > -100);

    // Monsters (AI untouched)
    monsterTimer -= dt;
    if (monsterTimer <= 0) {
      monsters.push(createMonster());
      monsterTimer = randRange(S.spawnEverySec[0], S.spawnEverySec[1]);
    }
    for (let m of monsters) {
      const cat = Categories[m.catIdx];
      if (cat === "Volant") {
        m.x -= S.speed * 0.58 * dt;
        m.wob += (0.8 + rng() * 0.6) * dt;
        m.y += Math.sin(m.wob * 2.2) * 20 * dt + (rng() - 0.5) * 12 * dt;
      } else if (cat === "Sol") {
        if ((!m.hopCd || m.hopCd <= 0) && m.vy === 0) {
          m.vy = S.hopVy;
          m.hopCd = randRange(S.hopCooldown[0], S.hopCooldown[1]);
          m.midAirUsed = false;
        } else {
          m.hopCd -= dt;
          if (!m.midAirUsed && rng() < 0.008 && m.vy > -60) {
            m.vy += S.hopVy * 0.6;
            m.midAirUsed = true;
          }
        }
        m.x -= S.groundSpeed * dt;
        m.vy += S.gravity * dt * S.groundGravityMul;
        m.y += m.vy * dt;
        const ground = world.groundY - 20;
        if (m.y > ground) {
          m.y = ground;
          m.vy = 0;
        }
      } else {
        const ceiling = 24;
        if (
          (!m.dropCd || m.dropCd <= 0) &&
          m.vy === 0 &&
          Math.abs(m.y - ceiling) < 2
        ) {
          m.vy = Math.abs(S.hopVy) * 0.9;
          m.dropCd = randRange(S.hopCooldown[0], S.hopCooldown[1]);
          m.midAirUsed = false;
        } else {
          m.dropCd -= dt;
          if (!m.midAirUsed && rng() < 0.008 && m.vy < 60) {
            m.vy += Math.abs(S.hopVy) * 0.5;
            m.midAirUsed = true;
          }
        }
        m.vy -= S.gravity * dt * S.groundGravityMul;
        m.y += m.vy * dt;
        if (m.y < ceiling) {
          m.y = ceiling;
          m.vy = 0;
        }
        m.x -= S.groundSpeed * 0.6 * dt;
      }
      if (startBattleIfCollision(m)) break;
    }
    monsters = monsters.filter((m) => m.x > -120 && m.y < H + 220);

    // Platform top landing reset for player ground mode
    if (control.mode === "ground") {
      for (let p of pipes) {
        const topY = p.gapY + p.gapH;
        const withinX =
          bird.x > p.x - (S.birdR + 14) && bird.x < p.x + p.w + (S.birdR + 14);
        const comingDown = bird.vy >= -20;
        if (
          withinX &&
          bird.y + S.birdR >= topY - 8 &&
          bird.y + S.birdR <= topY + 24 &&
          comingDown
        ) {
          bird.y = topY - S.birdR;
          bird.vy = 0;
          control.jumps = 0;
          control.glide = control.glideMax;
          control.fastFallTimer = 0;
        }
      }
    }

    // Collisions (no death on ground/ceiling for related modes; safe on pipe top for ground)
    const hitGround = bird.y + S.birdR > world.groundY;
    const hitCeil = bird.y - S.birdR < 0;
    const pipeHit = collidesWithPipe();
    const safeTop = control.mode === "ground" && playerSafeOnTopOfPipe();
    const hitNow =
      Date.now() > bird.invulnUntil &&
      ((control.mode === "ground" ? false : hitGround) ||
        (control.mode === "ceiling" ? false : hitCeil) ||
        (pipeHit && !safeTop));
    if (hitNow) {
      anim.worldHurtT = performance.now() + 220;
      consumeLife();
      if (lives > 0) {
        bird.invulnUntil = Date.now() + S.invulnMs;
        bird.vy = -S.flap * 0.8;
        bird.y = Math.min(bird.y, world.groundY - S.birdR - 4);
      }
    }
    if (control.mode === "ground") {
      if (hitGround) {
        bird.y = world.groundY - S.birdR;
        bird.vy = 0;
        control.jumps = 0;
        control.glide = control.glideMax;
        control.fastFallTimer = 0;
      }
    } else if (control.mode === "ceiling") {
      if (hitCeil) {
        bird.y = S.birdR;
        bird.vy = 0;
        control.ceilingLockY = S.birdR + 2;
      }
    } else {
      bird.y = clamp(bird.y, S.birdR, world.groundY - S.birdR - 1);
    }

    if (control.fastFallTimer > 0)
      control.fastFallTimer = Math.max(0, control.fastFallTimer - dt);

    bird.y += bird.vy * dt;
    bird.trail.push({ x: bird.x, y: bird.y });
    while (bird.trail.length > 20) bird.trail.shift();
  }

  function consumeLife() {
    lives = roundToHalf(lives - 1);
    if (lives <= 0) {
      triggerGameOver();
    }
    updateHUD();
  }
  function triggerGameOver() {
    if (activeUnit && activeUnit.isMonster && activeUnit.monster) {
      showCorruptionChoice(activeUnit.monster);
      return;
    }
    state = "gameover";
    document.body.classList.remove("in-battle");
    high = Math.max(high, score);
    localStorage.setItem("angryflappy_high", String(high));
    const distance = score;
    const mult =
      runMaxLives === 1 && runPower === 1
        ? 2.0
        : (runMaxLives === 1 && runPower === 2) ||
          (runMaxLives === 2 && runPower === 1)
        ? 1.5
        : 1.0;
    const base = distance * 10 + capturesRun * 80;
    const penalty = lostBattlesRun * 40;
    const runScore = Math.max(0, Math.round((base - penalty) * mult));
    let bestScoreVal = Number(
      localStorage.getItem("angryflappy_bestscore") || 0
    );
    bestScoreVal = Math.max(bestScoreVal, runScore);
    localStorage.setItem("angryflappy_bestscore", String(bestScoreVal));
    try {
      document.getElementById("prevDistance").textContent = `${distance} m`;
      document.getElementById("prevCaptures").textContent = String(capturesRun);
      document.getElementById("prevScore").textContent = String(runScore);
    } catch (e) {}
    try {
      document.getElementById("bestDistance").textContent = `${high} m`;
      document.getElementById("bestCaptures").textContent =
        String(bestCaptInRun);
      document.getElementById("bestScoreVal").textContent = String(
        Number(localStorage.getItem("angryflappy_bestscore") || 0)
      );
    } catch (e) {}

    // If we lost WITHOUT a monster, display ball-loss overlay first
    try {
      if (!activeUnit || !activeUnit.isMonster) {
        const lost = Math.floor(balls * 0.25);
        if (lost > 0) {
          balls = Math.max(0, balls - lost);
          saveBalls();
          updateHUD();
        }
        showBallLossOverlay(lost);
        return;
      }
    } catch (e) {}
    renderCollectionPaged(dexEl);
    updateSendButtons();
    gameOverEl.classList.add("show");
  }

  function showCorruptionChoice(mon) {
    state = "corrupt";
    document.body.classList.remove("in-battle");
    if (!corruptOverlay) {
      triggerGameOverReal();
      return;
    }
    const level = (mon.maxhp || 0) + (mon.power || 0);
    const cost = level * 2 + 5;
    corruptTitle.textContent = `${mon.name} est corrompu`;
    corruptVisual.innerHTML = "";
    if (trashBtn) trashBtn.style.display = "";
    try {
      const img = new Image();
      img.alt = mon.name;
      img.src = renderMonsterPreview(mon, 112);
      corruptVisual.appendChild(img);
    } catch (e) {
      /* ignore */
    }
    saveBtn.textContent = `UTILISER ${cost} BALLS`;
    saveBtn.disabled = balls < cost;
    trashBtn.onclick = () => {
      if (corruptOverlay) corruptOverlay.classList.remove("show");
      // Remove from collection
      const idx = collection.indexOf(mon.id);
      if (idx >= 0) {
        collection.splice(idx, 1);
        saveCollection();
      }
      selectedMonsterId = null;
      corruptOverlay.classList.remove("show");
      triggerGameOverReal();
    };
    saveBtn.onclick = () => {
      if (corruptOverlay) corruptOverlay.classList.remove("show");
      if (balls >= cost) {
        balls -= cost;
        saveBalls();
        corruptOverlay.classList.remove("show");
        triggerGameOverReal();
      } else {
        // not enough balls => small feedback
        saveBtn.classList.add("danger");
        setTimeout(() => saveBtn.classList.remove("danger"), 400);
      }
    };
    corruptOverlay.classList.add("show");
  }
  function showBallLossOverlay(lost) {
    state = "corrupt";
    document.body.classList.remove("in-battle");
    if (!corruptOverlay) {
      triggerGameOverReal();
      return;
    }
    try {
      corruptTitle.textContent = `You lost ${lost} balls`;
      // Visual: one large ball
      corruptVisual.innerHTML =
        '<div style="display:flex;justify-content:center;margin:8px 0 12px">' +
        ballIconLossSVG() +
        "</div>";
      // Use a single OK button
      if (trashBtn) trashBtn.style.display = "none";
      if (saveBtn) {
        saveBtn.textContent = "OK";
        saveBtn.disabled = false;
        saveBtn.onclick = () => {
          if (trashBtn) trashBtn.style.display = "";
          corruptOverlay.classList.remove("show");
          triggerGameOverReal();
        };
      }
    } catch (e) {}
    corruptOverlay.classList.add("show");
  }

  function triggerGameOverReal() {
    state = "gameover";
    document.body.classList.remove("in-battle");
    if (typeof battleOverlay !== "undefined") {
      try {
        battleOverlay.classList.remove("show");
      } catch (e) {}
    }
    renderCollectionPaged(dexEl);
    updateSendButtons();
    gameOverEl.classList.add("show");
  }
  // ---------- Rendering ----------
  function drawWorldNormal() {
    worldHelpers.synthParallaxBG();

    for (let p of pipes) {
      drawPipe(p);
    }
    drawNeonEdges();
    for (let it of items) {
      drawItem(it);
    }
    for (let m of monsters) {
      drawMonster(m);
      if (state === "playing") drawStars(m);
    }
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < bird.trail.length; i++) {
      const tr = bird.trail[i];
      const a = Math.max(0, 0.35 - i * 0.015);
      if (a <= 0) continue;
      ctx.fillStyle = `rgba(0,194,255,${a})`; // Neon mavi
      ctx.beginPath();
      ctx.arc(tr.x, tr.y, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    if (activeUnit.isMonster) {
      const me = activeUnit.monster;
      const pm = { ...me, x: bird.x, y: bird.y, r: me.r };
      drawMonster(pm);
    } else {
      drawBird();
    }

    const tvh = performance.now();
    if (tvh < anim.worldHurtT) {
      const a = Math.min(0.35, ((anim.worldHurtT - tvh) / 220) * 0.35 + 0.1);
      ctx.save();
      ctx.fillStyle = `rgba(255,0,0,${a})`;
      ctx.fillRect(0, 0, W, 16);
      ctx.fillRect(0, H - 16, W, 16);
      ctx.fillRect(0, 16, 16, H - 32);
      ctx.fillRect(W - 16, 16, 16, H - 32);
      ctx.restore();
    }
  }

  function drawWorldZoomed() {
    const z = S.battleZoom;
    ctx.save();
    ctx.translate(W * S.camX, H * S.camY);
    ctx.scale(z, z);
    ctx.translate(-bird.x, -bird.y);
    drawWorldNormal();
    ctx.restore();
  }

  function drawGBPanel(x, y, w, h) {
    ctx.fillStyle = "#0f380f";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "#9bbc0f";
    ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
    ctx.fillStyle = "#8bac0f";
    ctx.fillRect(x + 8, y + 8, w - 16, h - 16);
  }

  function getBattlePositions() {
    const enemyBaseX = W * 0.72,
      enemyBaseY = H * 0.55;
    const playerScreenX = W * 0.18,
      playerScreenY = H * 0.7;
    return { enemyBaseX, enemyBaseY, playerScreenX, playerScreenY };
  }

  function drawBattleOverlays() {
    if (!battle) return;
    // Player box
    {
      const boxW = 340,
        boxH = 110,
        boxX = 20,
        boxY = 20;
      drawGBPanel(boxX, boxY, boxW, boxH);
      ctx.fillStyle = "#0f380f";
      ctx.font = "16px monospace";
      ctx.fillText(activeUnit.name || "Dresseur", boxX + 14, boxY + 28);
      for (let i = 0; i < activeUnit.hpMax; i++) {
        const x = boxX + 14 + i * 18;
        const y = boxY + 48;
        const frac = Math.max(0, Math.min(1, lives - i));
        drawGBHeartFrac(x, y, frac);
      }
      for (let i = 0; i < Math.min(10, activeUnit.power); i++) {
        const x = boxX + 14 + i * 14;
        const y = boxY + 78;
        drawGBBolt(x, y);
      }
      ctx.save();
      const bx = boxX + boxW - 90,
        by = boxY + 70;
      ctx.translate(bx, by);
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      ctx.rect(-10, -10, 20, 10);
      ctx.clip();
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fillStyle = "#ef4444";
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = "#111";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(10, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 3.8, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = "#0f380f";
      ctx.font = "16px monospace";
      ctx.fillText("x " + balls, boxX + boxW - 64, boxY + 76);
    }

    // Enemy box
    {
      const boxW = 340,
        boxH = 110,
        boxX = W - 20 - boxW,
        boxY = 20;
      drawGBPanel(boxX, boxY, boxW, boxH);
      ctx.fillStyle = "#0f380f";
      ctx.font = "16px monospace";
      ctx.fillText(battle.mon.name, boxX + 14, boxY + 28);
      for (let i = 0; i < battle.maxhp; i++) {
        const x = boxX + 14 + i * 18;
        const y = boxY + 48;
        const frac = Math.max(0, Math.min(1, battle.hp - i));
        drawGBHeartFrac(x, y, frac);
      }
      for (let i = 0; i < Math.min(10, battle.power); i++) {
        const x = boxX + 14 + i * 14;
        const y = boxY + 78;
        drawGBBolt(x, y);
      }
    }

    const t = performance.now();
    const monLunge =
      t < anim.monsterLungeT ? 1 - (anim.monsterLungeT - t) / 220 : 0;
    const plyLunge =
      t < anim.playerLungeT ? 1 - (anim.playerLungeT - t) / 220 : 0;
    const hurtA = t < anim.hurtFlashT ? (anim.hurtFlashT - t) / 160 : 0;
    const enemyBaseX = W * 0.72,
      enemyBaseY = H * 0.55;
    const enemyX = enemyBaseX - 40 * monLunge;
    const enemyY = enemyBaseY;
    // Capture animation
    if (anim.capture.active) {
      const now = performance.now();
      if (anim.capture.phase === "fly") {
        const p = Math.min(
          1,
          (now - anim.capture.t0) / (anim.capture.t1 - anim.capture.t0)
        );
        const x =
          anim.capture.fromX + (anim.capture.toX - anim.capture.fromX) * p;
        const y =
          anim.capture.fromY + (anim.capture.toY - anim.capture.fromY) * p;
        const r = 10 + 20 * p;
        drawNeonBall(x, y, r);
        if (p >= 1) {
          anim.capture.phase = "hold";
          anim.capture.holdUntil = now + 1000;
        }
      } else if (anim.capture.phase === "hold") {
        // Draw ball enclosing the monster
        drawNeonBall(enemyX, enemyY, 52);
        ctx.save();
        ctx.globalAlpha = 0.55;
        ctx.translate(enemyX, enemyY);
        drawMonsterBody(battle.mon, ctx, 2.2);
        ctx.restore();
        if (now >= anim.capture.holdUntil) {
          anim.capture.phase = "result";
          anim.capture.t0 = now;
        }
      } else if (anim.capture.phase === "result") {
        const text = anim.capture.success ? "CATCH" : "RATÉ";
        ctx.save();
        ctx.font = "48px monospace";
        ctx.fillStyle = "#ffffff";
        const m = ctx.measureText(text);
        const x = (W - m.width) / 2,
          y = H * 0.24;
        ctx.lineWidth = 6;
        ctx.strokeStyle = "#111827";
        ctx.strokeText(text, x, y);
        ctx.fillText(text, x, y);
        ctx.restore();
        if (now - anim.capture.t0 > 650) {
          if (anim.capture.success) {
            // Success: add to collection, bump counters, then end
            const id = battle.mon.id;
            if (!collection.includes(id)) {
              collection.push(id);
              saveCollection();
              try {
                renderCollectionPaged(dexStart);
                renderCollectionPaged(dexEl);
              } catch (e) {}
            }
            capturesRun++;
            if (capturesRun > bestCaptInRun) {
              bestCaptInRun = capturesRun;
              localStorage.setItem(
                "angryflappy_bestcaprun",
                String(bestCaptInRun)
              );
            }
            anim.capture.active = false;
            showFleeAndEnd(false);
          } else {
            anim.capture.active = false;
            if (Math.random() < 0.5) enemyAttack();
          }
        }
      }
    }
    ctx.save();
    const grad = ctx.createRadialGradient(
      enemyX,
      enemyY + 80,
      5,
      enemyX,
      enemyY + 80,
      60
    );
    grad.addColorStop(0, "rgba(0,0,0,0.35)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(enemyX, enemyY + 80, 60, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.translate(enemyX, enemyY);
    drawMonsterBody(battle.mon, ctx, 2.2);
    ctx.restore();

    const playerScreenX = W * 0.18 + 40 * plyLunge;
    const playerScreenY = H * 0.7;
    ctx.save();
    ctx.translate(playerScreenX, playerScreenY);
    if (activeUnit.isMonster) {
      drawMonsterBody(activeUnit.monster, ctx, 2.0);
    } else {
      drawBird(1.6);
    }
    ctx.restore();

    if (hurtA > 0) {
      ctx.fillStyle = `rgba(255,0,0,${Math.min(0.35, hurtA)})`;
      ctx.fillRect(0, 0, W, H);
    }
    if (
      battle &&
      battle.fleeBannerUntil &&
      performance.now() < battle.fleeBannerUntil
    ) {
      ctx.save();
      ctx.font = "48px monospace";
      ctx.fillStyle = "#ffffff";
      const text = "FUITE";
      const m = ctx.measureText(text);
      const x = (W - m.width) / 2,
        y = H * 0.18;
      ctx.lineWidth = 6;
      ctx.strokeStyle = "#111827";
      ctx.strokeText(text, x, y);
      ctx.fillText(text, x, y);
      ctx.restore();
    }

    // Disable input in DOM during capture animation
    if (anim.capture && anim.capture.active) {
      answerBtn.disabled = true;
      fleeBtn.disabled = true;
      captureBtn.disabled = true;
    } else {
      answerBtn.disabled = false;
      fleeBtn.disabled = false;
      captureBtn.disabled = false;
    }
  }
  function drawGBBolt(x, y) {
    ctx.fillStyle = "#0f380f";
    const pts = [
      [0, 0],
      [6, 0],
      [2, 8],
      [8, 8],
      [0, 16],
      [2, 10],
      [-4, 10],
    ];
    ctx.beginPath();
    ctx.moveTo(x + pts[0][0], y + pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(x + pts[i][0], y + pts[i][1]);
    }
    ctx.closePath();
    ctx.fill();
  }

  // ---------- Turn buttons ----------
  answerBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (!battle) return;
    anim.playerLungeT = performance.now() + 220;
    const dmg = dmgInflictedFrom(activeUnit.power);
    battle.hp = Math.max(0, roundToHalf(battle.hp - dmg));
    captureHint.textContent = dmg <= 0 ? "Raté…" : `Touché (-${dmg})`;
    if (battle.hp <= 0) {
      const enemyStrength = battle.maxhp + battle.power;
      const myStrength = activeUnit.hpMax + activeUnit.power;
      let heal = 0.5;
      if (enemyStrength > myStrength) {
        const diff = battle.maxhp - lives;
        heal = roundToHalf(Math.max(0, diff) / 1.5);
        if (heal < 0.5) heal = 0.5;
      }
      lives = Math.min(activeUnit.hpMax, roundToHalf(lives + heal));
      updateHUD();
      showFleeAndEnd(false);
      return;
    }
    questionText.textContent = pickQuestion();
    battleAnswer.value = "";
    setTimeout(() => battleAnswer.focus(), 30);
    enemyAttack();
  });
  fleeBtn.addEventListener("click", () => {
    ++lostBattlesRun;
    showFleeAndEnd(true);
  });
  captureBtn.addEventListener("click", () => {
    if (!battle || anim.capture.active) return;
    if (balls <= 0) {
      captureHint.textContent = "Pas de balle !";
      return;
    }
    balls -= 1;
    saveBalls();
    updateHUD();
    battleToi.innerHTML = toiPanelHTML();
    let p = captureProbability(
      activeUnit.power,
      lives,
      battle.power,
      battle.hp,
      battle.maxhp
    );
    // Apply per-attempt bonus before this throw
    p = Math.min(0.99, p + captureAttemptsInBattle * CAPTURE_ATTEMPT_BONUS);
    const roll = rng();
    // Count this attempt after computing p
    captureAttemptsInBattle += 1;
    const success = roll < p;
    // Start capture animation
    const pos = getBattlePositions();
    anim.capture.active = true;
    anim.capture.phase = "fly";
    anim.capture.success = success;
    anim.capture.t0 = performance.now();
    anim.capture.t1 = anim.capture.t0 + 520;
    anim.capture.fromX = pos.playerScreenX + 20;
    anim.capture.fromY = pos.playerScreenY - 30;
    anim.capture.toX = pos.enemyBaseX - 10;
    anim.capture.toY = pos.enemyBaseY - 10;
    captureHint.textContent = success
      ? `Tentative… (${Math.round(p * 100)}%)`
      : `Tentative… (${Math.round(p * 100)}%)`;
  });

  function enemyAttack() {
    if (!battle) return;
    anim.monsterLungeT = performance.now() + 220;
    const dmg = dmgReceivedFrom(battle.power);
    if (dmg <= 0) return;
    anim.hurtFlashT = performance.now() + 160;
    if (lives <= 0.5) {
      ++lostBattlesRun;
      showFleeAndEnd(false);
      return;
    }
    if (lives - dmg < 0.5) {
      lives = 0.5;
      updateHUD();
      battleToi.innerHTML = toiPanelHTML();
      ++lostBattlesRun;
      showFleeAndEnd(false);
      return;
    }
    lives = Math.max(0.5, roundToHalf(lives - dmg));
    updateHUD();
    battleToi.innerHTML = toiPanelHTML();
  }

  // ---------- Collection rendering ----------
  function renderCollectionPaged(container) {
    container.innerHTML = "";
    const list = collection.slice();
    const scope = container.closest(".panel") || document;
    const bySel = scope.querySelector("#sortByStart, #sortBy");
    const dirSel = scope.querySelector("#sortDirStart, #sortDir");
    function computeList() {
      const by = bySel ? bySel.value : "alpha";
      const dir = dirSel ? dirSel.value : "asc";
      const arr = list.map((id) => {
        const [c, f, k] = id.split("-").map((n) => parseInt(n));
        const name = monsterName(c, f, k);
        const hp = hpForId(c, f, k);
        const power = powerForId(c, f, k);
        return { id, c, f, k, name, hp, power, level: hp + power };
      });
      arr.sort((a, b) => {
        let v = 0;
        if (by === "alpha") {
          v = a.name.localeCompare(b.name);
        } else if (by === "level") {
          v = a.level - b.level;
        } else if (by === "power") {
          v = a.power - b.power;
        } else if (by === "hp") {
          v = a.hp - b.hp;
        }
        return dir === "asc" ? v : -v;
      });
      return arr;
    }
    function renderAll() {
      container.innerHTML = "";
      const arr = computeList();
      if (arr.length === 0) {
        const p = document.createElement("p");
        p.textContent = "You have not captured any monsters yet.";
        p.classList.add("warning-p");
        container.appendChild(p);
        return;
      }
      for (const e of arr) {
        const col = Colors[e.k].c;
        const mon = {
          id: e.id,
          name: e.name,
          catIdx: e.c,
          formIdx: e.f,
          colorIdx: e.k,
          eyes: eyeCountFor(e.id),
          color: col,
          r: 18,
          maxhp: e.hp,
          power: e.power,
        };
        const card = document.createElement("div");
        card.className = "card selectable";
        const thumb = document.createElement("div");
        thumb.className = "thumb";
        const img = document.createElement("img");
        img.alt = e.name;
        img.width = 56;
        img.height = 56;
        img.style.imageRendering = "pixelated";
        img.src = renderMonsterPreview(mon, 56);
        thumb.appendChild(img);
        const box = document.createElement("div");
        const title = document.createElement("div");
        title.className = "title";
        title.textContent = e.name;
        const meta = document.createElement("div");
        meta.className = "meta";
        meta.textContent = `PV: ${e.hp} • Puissance: ${e.power} • Niveau: ${
          e.hp + e.power
        }`;
        box.appendChild(title);
        box.appendChild(meta);
        card.appendChild(thumb);
        card.appendChild(box);
        container.appendChild(card);
        card.addEventListener("click", () => {
          selectedMonsterId = e.id;
          for (const n of container.querySelectorAll(".card"))
            n.classList.remove("selected");
          card.classList.add("selected");
          updateSendButtons();
        });
      }
    }
    renderAll();
    if (bySel) bySel.onchange = renderAll;
    if (dirSel) dirSel.onchange = renderAll;
  }
  function renderCollection(container) {
    if (!container) return;
    container.innerHTML = "";
    if (collection.length === 0) {
      const p = document.createElement("p");
      p.textContent = "Aucun monstre capturé pour l'instant.";
      container.appendChild(p);
      return;
    }
    for (let id of collection) {
      const [catIdx, formIdx, colorIdx] = id.split("-").map((n) => parseInt(n));
      const name = monsterName(catIdx, formIdx, colorIdx);
      const hp = hpForId(catIdx, formIdx, colorIdx);
      const power = powerForId(catIdx, formIdx, colorIdx);
      const col = Colors[colorIdx].c;
      const mon = {
        id,
        name,
        catIdx,
        formIdx,
        colorIdx,
        eyes: eyeCountFor(id),
        color: col,
        r: 18,
        maxhp: hp,
        power: power,
      };
      const card = document.createElement("div");
      card.className = "card selectable";
      const thumb = document.createElement("div");
      thumb.className = "thumb";
      const img = document.createElement("img");
      img.alt = name;
      img.width = 56;
      img.height = 56;
      img.style.imageRendering = "pixelated";
      img.src = renderMonsterPreview(mon, 56);
      thumb.appendChild(img);
      const box = document.createElement("div");
      const title = document.createElement("div");
      title.className = "title";
      title.textContent = name;
      const meta = document.createElement("div");
      meta.className = "meta";
      meta.textContent = `PV: ${hp} • Puissance: ${power}`;
      box.appendChild(title);
      box.appendChild(meta);
      card.appendChild(thumb);
      card.appendChild(box);
      container.appendChild(card);
      card.addEventListener("click", () => {
        selectedMonsterId = id;
        for (const n of container.querySelectorAll(".card"))
          n.classList.remove("selected");
        card.classList.add("selected");
        updateSendButtons();
      });
    }
  }
  function renderMonsterPreview(mon, size) {
    const off = document.createElement("canvas");
    off.width = size;
    off.height = size;
    const c2 = off.getContext("2d");
    c2.translate(size / 2, size / 2);
    const tmp = { ...mon, x: 0, y: 0, r: Math.min(18, size * 0.28) };
    drawMonsterBody(tmp, c2, 1.0);
    return off.toDataURL();
  }

  // ---------- Battle extras ----------
  function drawGBBolt(x, y) {
    ctx.fillStyle = "#0f380f";
    const pts = [
      [0, 0],
      [6, 0],
      [2, 8],
      [8, 8],
      [0, 16],
      [2, 10],
      [-4, 10],
    ];
    ctx.beginPath();
    ctx.moveTo(x + pts[0][0], y + pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(x + pts[i][0], y + pts[i][1]);
    }
    ctx.closePath();
    ctx.fill();
  }

  // ---------- Main loop ----------
  function loop(ts) {
    const dt = Math.min(0.033, (ts - last) / 1000);
    last = ts;
    if (state === "playing") update(dt);
    ctx.clearRect(0, 0, W, H);
    if (state === "battle") {
      drawWorldZoomed();
      drawBattleOverlays();
    } else {
      drawWorldNormal();
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
/* SPLASH */
const splash = document.getElementById("splash");
const splashLogo = document.getElementById("splashLogo");
const startScreen = document.getElementById("startScreen");

function playBootChime() {
  try {
    const actx = new (window.AudioContext || window.webkitAudioContext)();
    const now = actx.currentTime;
    function tone(freq, start, dur, gain = 0.15) {
      const osc = actx.createOscillator();
      const g = actx.createGain();
      osc.type = "square";
      osc.frequency.value = freq;
      osc.connect(g);
      g.connect(actx.destination);
      g.gain.setValueAtTime(0.0001, now + start);
      g.gain.exponentialRampToValueAtTime(gain, now + start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
      osc.start(now + start);
      osc.stop(now + start + dur + 0.05);
    }
    // A tiny GB-like arpeggio
    tone(392, 0.0, 0.12); // G4
    tone(523.25, 0.1, 0.12); // C5
    tone(659.25, 0.2, 0.18); // E5
  } catch (e) {
    /* ignore */
  }
}

function runSplash() {
  if (!splash) return;
  splashLogo.style.transition = "transform 1800ms cubic-bezier(.18,.9,.18,1.1)";
  requestAnimationFrame(() => {
    splashLogo.style.transform = "translateY(0)";
  });
  setTimeout(() => {
    playBootChime();
    // Hide splash, show start screen
    splash.classList.remove("show");
    splash.style.display = "none";
    startScreen.classList.add("show");
    try {
      if (dexStart) renderCollectionPaged(dexStart);
    } catch (e) {}
    try {
      const selStart = document.getElementById("monsterSelectStart");
      if (selStart) updateMonsterSelect(selStart);
    } catch (e) {}
  }, 3000);
}
// Hide start at first, splash visible
if (startScreen) {
  startScreen.classList.remove("show");
}
runSplash();
if (ballLossOk) {
  ballLossOk.addEventListener("click", () => {
    if (ballLossEl) ballLossEl.classList.remove("show");
    triggerGameOverReal();
  });
}
