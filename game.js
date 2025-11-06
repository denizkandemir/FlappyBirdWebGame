monsters = window.MONSTERS;
questions = window.QUESTIONS;

(function () {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  let W = canvas.width;
  let H = canvas.height;
  let availableMonsters = monsters.slice();
  let collidedMonsterIds = [];
  let currentProfile = {}
  let ballSize = 40;
  let correctlyAnsweredQuestionIds = []; // YENİ - Sadece doğru cevaplanlar
  let incorrectlyAnsweredQuestionIds = []; // YENİ - Yanlış cevaplanlar
  let fleeCount = 0;

  let answeredQuestionIds = [];
  let collection = [];
  let state = "start";
  let score = 0;
  let lives = 2;
  let capturesRun = 0;
  let lostBattlesRun = 0;
  let balls = Number(localStorage.getItem("angryflappy_balls") || 0);
  let activeUnit = { name: "", hpMax: 2, power: 2, isMonster: false, mon: null };
  let high = Number(localStorage.getItem("angryflappy_high") || 0);
  let bestCaptInRun = Number(
    localStorage.getItem("angryflappy_bestcaprun") || 0
  );
  let runMaxLives = 2;
  let runPower = 2;

  function checkGameCompletion() {
    const totalQuestions = questions.length;
    const totalAnswered = answeredQuestionIds.length;
    const correctAnswers = correctlyAnsweredQuestionIds.length;
    const incorrectAnswers = incorrectlyAnsweredQuestionIds.length;

    const allQuestionsCompleted = totalAnswered >= totalQuestions;

    const successRate = totalAnswered > 0 ? (correctAnswers / totalAnswered) * 100 : 0;

    console.log("Game Progress:", {
      totalQuestions,
      answered: totalAnswered,
      correct: correctAnswers,
      incorrect: incorrectAnswers,
      fled: fleeCount,
      successRate: successRate.toFixed(1) + "%"
    });

    if (allQuestionsCompleted) {
      console.log("GAME COMPLETION TRIGGERED!");
      triggerGameCompletion(true, successRate, correctAnswers, incorrectAnswers, fleeCount);
    }
  }

  function showCompletionMessage(type, bonus, ballsBonus, fleePenalty, correctCount, incorrectCount, fleeCount, totalScore) {
    const gameOverPanel = document.querySelector("#gameOver .panel");
    if (!gameOverPanel) return;

    const existingMsg = gameOverPanel.querySelector(".completion-message");
    if (existingMsg) {
      existingMsg.remove();
    }

    const completionDiv = document.createElement("div");
    completionDiv.className = "completion-message";
    completionDiv.style.cssText = `
    background: linear-gradient(45deg, #00ff00, #00ffff);
    color: #000;
    padding: 15px;
    margin: 15px 0;
    border-radius: 8px;
    text-align: center;
    font-family: 'Press Start 2P', monospace;
    font-size: 9px;
    animation: completionGlow 2s ease-in-out infinite;
  `;

    const totalQuestions = correctCount + incorrectCount;
    const successRate = totalQuestions > 0 ? ((correctCount / totalQuestions) * 100).toFixed(1) : "0";

    // TOTAL SCORE HESAPLA - aynı mantık triggerGameCompletion'daki gibi
    const distance = score;
    const mult = runMaxLives === 1 && runPower === 1 ? 2.0 :
      (runMaxLives === 1 && runPower === 2) || (runMaxLives === 2 && runPower === 1) ? 1.5 : 1.0;
    const base = distance * 10 + capturesRun * 80;
    const penalty = lostBattlesRun * 40 + fleePenalty;
    const totalFinalScore = Math.max(0, Math.round(((base - penalty) + bonus + ballsBonus) * mult));

    completionDiv.innerHTML = `
    <div style="margin-bottom: 8px; font-size: 11px; font-weight: bold;">${type}</div>
    <div style="margin-bottom: 5px;">✓ Correct Answers: ${correctCount}/${totalQuestions} (${successRate}%)</div>
    <div style="margin-bottom: 5px;">✗ Wrong Answers: ${incorrectCount}</div>
    ${fleeCount > 0 ? `<div style="margin-bottom: 5px;">🏃 Fled Battles: ${fleeCount}</div>` : ''}
    <div style="margin-bottom: 5px;">Performance Bonus: +${bonus} points</div>
    ${ballsBonus > 0 ? `<div style="margin-bottom: 5px;">Balls Bonus: +${ballsBonus} points</div>` : ''}
    ${fleePenalty > 0 ? `<div style="margin-bottom: 5px;">Flee Penalty: -${fleePenalty} points</div>` : ''}
    <div style="margin-bottom: 8px; font-size: 12px; font-weight: bold; color: #ff0080;">🏆 TOTAL SCORE: ${totalFinalScore} POINTS 🏆</div>
    <div style="color: #ff0080; font-weight: bold;">🎉 GAME COMPLETE! 🎉</div>
  `;

    const h2 = gameOverPanel.querySelector("h2");
    if (h2) {
      h2.insertAdjacentElement("afterend", completionDiv);
    }
  }

  function triggerGameCompletion(questionsCompleted, successRate, correctCount, incorrectCount, fleeCount) {
    state = "gameover";
    document.body.classList.remove("in-battle");

    let completionBonus = 0;
    let completionType = "";
    let performanceGrade = "";

    if (questionsCompleted) {
      if (successRate >= 90) {
        performanceGrade = "PERFECT COMPLETION";
        completionBonus = 5000;
      } else if (successRate >= 75) {
        performanceGrade = "EXCELLENT PERFORMANCE";
        completionBonus = 3500;
      } else if (successRate >= 60) {
        performanceGrade = "GOOD PERFORMANCE";
        completionBonus = 2500;
      } else if (successRate >= 40) {
        performanceGrade = "FAIR PERFORMANCE";
        completionBonus = 1500;
      } else {
        performanceGrade = "POOR PERFORMANCE";
        completionBonus = 500;
      }

      completionType = `${performanceGrade} (${successRate.toFixed(1)}%)`;
    }

    const ballsBonus = balls * 50;
    const fleePenalty = fleeCount * 100;

    const distance = score;
    const mult = runMaxLives === 1 && runPower === 1 ? 2.0 :
      (runMaxLives === 1 && runPower === 2) || (runMaxLives === 2 && runPower === 1) ? 1.5 : 1.0;
    const base = distance * 10 + capturesRun * 80;
    const penalty = lostBattlesRun * 40 + fleePenalty;
    const runScore = Math.max(0, Math.round(((base - penalty) + completionBonus + ballsBonus) * mult));

    let bestScoreVal = Number(localStorage.getItem("angryflappy_bestscore") || 0);
    bestScoreVal = Math.max(bestScoreVal, runScore);
    localStorage.setItem("angryflappy_bestscore", String(bestScoreVal));

    high = Math.max(high, score);
    localStorage.setItem("angryflappy_high", String(high));

    try {
      document.getElementById("prevDistance").textContent = `${distance} m`;
      document.getElementById("prevCaptures").textContent = String(capturesRun);
      document.getElementById("prevScore").textContent = String(runScore);

      const gameOverTitle = document.querySelector("#gameOver h2");
      if (gameOverTitle) {
        let titleColor = "#00ff00";
        if (successRate < 60) titleColor = "#ffaa00";
        if (successRate < 40) titleColor = "#ff4444";

        gameOverTitle.textContent = performanceGrade;
        gameOverTitle.style.color = titleColor;
      }
    } catch (e) { }

    try {
      document.getElementById("bestDistance").textContent = `${high} m`;
      document.getElementById("bestCaptures").textContent = String(bestCaptInRun);
      document.getElementById("bestScoreVal").textContent = String(bestScoreVal);
    } catch (e) { }

    // TOTAL SCORE'u da gönder
    showCompletionMessage(completionType, completionBonus, ballsBonus, fleePenalty, correctCount, incorrectCount, fleeCount, runScore);

    renderCollectionPaged(dexEl);
    updateSendButtons();

    gameOverEl.classList.add("show");
  }

  function loadCollection() {
    try {
      const data = JSON.parse(localStorage.getItem("angryflappy_collection") || "[]");
      // Eski format kontrolü - string array'ı obje array'ına çevir
      if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'string') {
        const converted = data.map(id => ({ id, amount: 1 }));
        // Converted data'yı hemen kaydet
        localStorage.setItem("angryflappy_collection", JSON.stringify(converted));
        console.log("Collection converted from string to object format");
        return converted;
      }
      return data;
    } catch (e) {
      return [];
    }
  }
  function saveCollection(collection) {
    localStorage.setItem("angryflappy_collection", JSON.stringify(collection));
  }

  collection = loadCollection();

  const startScreen = document.getElementById("startScreen");
  const startBtn = document.getElementById("startBtn");
  const sendBtnStart = document.getElementById("sendBtnStart");
  const gameOverEl = document.getElementById("gameOver");
  const sendBtnOver = document.getElementById("sendBtnOver");
  const finalScore = document.getElementById("finalScore");

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
  } catch (e) { }

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

  let playerPower = 2;

  window.addEventListener("af:login:done", () => {
    let displayName = activeUnit.name;
    if (!displayName || displayName === "Error Display Name" || displayName === "Error Reset Game" || displayName === "") {
      try {
        let currentProfile = null;

        if (window.profile) {
          currentProfile = window.profile;
        }
        else if (window.AF_SaveManager && window.AF_SaveManager.profile) {
          currentProfile = window.AF_SaveManager.profile;
        }
        else {
          currentProfile = JSON.parse(localStorage.getItem("profile") || "{}");
        }


        if (currentProfile && currentProfile.firstName) {
          displayName = currentProfile.firstName;
        } else if (currentProfile && currentProfile.firstName && currentProfile.lastName) {
          displayName = currentProfile.firstName + " " + currentProfile.lastName;
        } else if (currentProfile && currentProfile.firstName) {
          displayName = currentProfile.firstName;
        } else {
          displayName = "Name Error";
        }
      } catch (e) {
        console.log("Profile error:", e);
        displayName = "Name Error";
      }
    }
  });

  let resumeAt = 0;

  let isPaused = false;
  let pauseOverlay = null;
  let pauseBtn = null;
  let resumeBtn = null;
  let mainMenuBtn = null;

  document.addEventListener('DOMContentLoaded', () => {
    pauseOverlay = document.getElementById("pauseOverlay");
    pauseBtn = document.getElementById("pauseBtn");
    resumeBtn = document.getElementById("resumeBtn");
    mainMenuBtn = document.getElementById("mainMenuBtn");

    if (pauseBtn) {
      pauseBtn.addEventListener("click", togglePause);
    }

    if (resumeBtn) {
      resumeBtn.addEventListener("click", resumeGame);
    }

    if (mainMenuBtn) {
      mainMenuBtn.addEventListener("click", goToMainMenu);
    }
  });

  function pauseGame() {
    if (state !== "playing" || isPaused) return;

    isPaused = true;

    if (pauseOverlay) {
      pauseOverlay.classList.add("show");
    }

    const hudWrap = document.getElementById("hudWrap");
    if (hudWrap) {
      hudWrap.style.display = "none";
    }

    console.log("Game Paused");
  }

  function resumeGame() {
    if (!isPaused) return;

    isPaused = false;
    console.log("Resuming game...");

    if (pauseOverlay) {
      pauseOverlay.classList.remove("show");
    }

    const hudWrap = document.getElementById("hudWrap");
    if (hudWrap && state === "playing") {
      hudWrap.style.display = "";
    }

    resumeAt = performance.now() + 500;

    console.log("Game Resumed");
  }

  function togglePause() {
    if (isPaused) {
      resumeGame();
    } else {
      pauseGame();
    }
  }

  function goToMainMenu() {
    isPaused = false;
    if (pauseOverlay) {
      pauseOverlay.classList.remove("show");
    }

    if (state === "battle") {
      endBattle(false, false);
    }

    state = "start";
    startScreen.classList.add("show");
    gameOverEl.classList.remove("show");

    const hudWrap = document.getElementById("hudWrap");
    if (hudWrap) {
      hudWrap.style.display = "none";
    }

    console.log("Returned to Main Menu");
  }

  function onKeyDown(e) {
    console.log("Key pressed:", e.code, "State:", state); // Debug


    if (e.code === "Escape" || e.code === "ESC" || e.key === "Esc" || e.key === "esc") {
      e.preventDefault();
      console.log("ESC pressed, state:", state, "isPaused:", isPaused);
      if (state === "playing") {
        togglePause();
      } else if (state === "battle") {
        console.log("ESC in battle, clicking flee");
        if (fleeBtn && !fleeBtn.disabled) {
          fleeBtn.click();
        }
      }
      return;
    }

    if (e.code === "Space") {
      if (state === "battle" || isPaused) return;
      e.preventDefault();
      handlePressDown();
    }
  }
  const S = {
    gravity: 1600,
    flap: 320,
    pipeGap: 180,
    pipeW: 86,
    pipeSpacing: 360,
    speed: 240,
    birdR: 16.5,
    invulnMs: 1200,
    spawnEverySec: [2, 5],
    monsterBaseSpeed: 90,
    groundSpeed: 140,
    hopCooldown: [0.8, 1.7],
    hopVy: -820,
    groundGravityMul: 0.8,
    itemEverySec: [2, 3],
    maxLives: 2,
    battleZoom: 1.18,
    camX: 0.32,
    camY: 0.65,
  };

  let rng = mulberry32(Date.now() % 4294967295);
  let last = performance.now();

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
          } catch (e) { }
          try {
            const selStart = document.getElementById("monsterSelectStart");
            if (selStart && typeof updateMonsterSelect === "function")
              updateMonsterSelect(selStart);
          } catch (e) { }
        }
      } catch (e) { }

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
        } catch (e) { }
      } catch (e) { }
    });
  } catch (e) { }
  lives = activeUnit.hpMax;
  capturesRun = 0;
  lostBattlesRun = 0;
  runMaxLives = activeUnit.hpMax;
  runPower = activeUnit.power;

  // Collection
  collection = loadCollection();

  const CAPTURE_ATTEMPT_BONUS = 0.15; // 15%
  let captureAttemptsInBattle = 0;

  function updateMonsterSelect(selectEl) {
    if (!selectEl) return;
    while (selectEl.firstChild) selectEl.removeChild(selectEl.firstChild);

    const placeholder = document.createElement("option");
    placeholder.value = "";
    selectEl.appendChild(placeholder);

    const list = (collection || [])
      .slice()
      .map((item) => {
        // Yeni format: { id, amount }
        const id = item.id || item; // Geriye uyumluluk için
        const amount = item.amount || 1;

        const [c, f, k] = id.split("-").map((n) => parseInt(n));
        const monsterObj = window.MONSTERS.find(m => m.id === id);
        const name = monsterObj ? monsterObj.name : "Unknown";
        const hp = monsterObj ? (monsterObj.stats?.maxhp ?? monsterObj.stats?.hp ?? 1) : 1;
        const power = monsterObj ? (monsterObj.stats?.power ?? 1) : 1;

        return { id, name, hp, power, amount };
      })
      .filter(m => m.amount > 0) // Amount 0 olanları gösterme
      .sort((a, b) => a.name.localeCompare(b.name, "fr"));

    for (const m of list) {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = `${m.name} (x${m.amount}) — PV ${m.hp} • ⚡ ${m.power}`;
      if (selectedMonsterId && selectedMonsterId === m.id) opt.selected = true;
      selectEl.appendChild(opt);
    }

    selectEl.onchange = (e) => {
      selectedMonsterId = e.target.value || null;
      updateSendButtons();
    };
  }

  try {
    const selStart = document.getElementById("monsterSelectStart");
    if (selStart) updateMonsterSelect(selStart);
  } catch (e) { }

  try {
    if (dexStart) renderCollectionPaged(dexStart);
  } catch (e) { }
  function loadCollection() {
    try {
      return JSON.parse(localStorage.getItem("angryflappy_collection") || "[]");
    } catch (e) {
      return [];
    }
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

  let checkSize = false;
  if (window.innerWidth <= 480) {
    checkSize = true;
  }

  const bird = {
    x: checkSize ? W * 0.05 : W * 0.1,
    y: H / 2,
    vy: 0,
    r: S.birdR,
    tilt: 0,
    invulnUntil: 0,
    trail: [],
  };
  let pipes = [];
  let nextPipeX = 600;
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

  function resizeCanvas() {
    if (window.innerWidth <= 768) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      W = canvas.width;
      H = canvas.height;

      world.groundY = H - 80;

      if (window.innerWidth <= 480) {
        bird.x = W * 0.13;
      } else {
        bird.x = W * 0.15;
      }

      if (bird.y > world.groundY - S.birdR) {
        bird.y = world.groundY - S.birdR;
      }
    } else {
      canvas.width = 900;
      canvas.height = 900;
      W = canvas.width;
      H = canvas.height;
      world.groundY = H - 80;
      bird.x = 220;
    }
  }

  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('orientationchange', () => {
    setTimeout(resizeCanvas, 100);
  });

  document.addEventListener('DOMContentLoaded', resizeCanvas);

  let touchStartY = 0;
  let touchEndY = 0;

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    touchStartY = e.touches[0].clientY;
    handlePressDown();
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
  }, { passive: false });

  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    touchEndY = e.changedTouches[0].clientY;
    handlePressUp();
  }, { passive: false });

  let lastTouchEnd = 0;
  canvas.addEventListener('touchend', (e) => {
    const now = (new Date()).getTime();
    if (now - lastTouchEnd <= 300) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  }, false);

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
        <defs><clipPath id="clip${i}"><rect x="0" y="0" width="${(32 * pct) / 100
        }" height="29"></rect></clipPath></defs>
        <path d="M16 29S1 19 1 9a8 8 0 0 1 15-3 8 8 0 0 1 15 3c0 10-15 20-15 20z" fill="#e5e7eb" stroke="#1f2937" stroke-width="1"></path>
        <g clip-path="url(#clip${i})">
          <path d="M16 29S1 19 1 9a8 8 0 0 1 15-3 8 8 0 0 1 15 3c0 10-15 20-15 20z" fill="#e11d48"></path>
        </g>
      </svg>`;
    }
    return html;
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
      const w = W;
      const h = H;
      const t = performance.now() / 1000;

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
    const scale = getScaleFactor();
    const margin = 120 * scale;
    const gapSize = (S.pipeGap || 200) * scale;

    const pipeWidth = 80 * scale;
    const gapY = margin + Math.random() * (H - 2 * margin - gapSize);

    pipes.push({
      x: x,
      y: 0,
      w: pipeWidth,
      h: H,
      gapY: gapY,
      gapH: gapSize,
      passed: false
    });
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

  const Categories = ["Flying", "Earth", "Ceiling"];

  // ---------- Monsters ----------
  function createMonsterCandidate() {
    const candidates = availableMonsters.filter(m => !collidedMonsterIds.includes(m.id));
    if (candidates.length === 0) {
      return null;
    }
    const idx = Math.floor(rng() * candidates.length);
    const m = candidates[idx];

    let x = W + 50;
    let y;
    if (m.category === "Earth") {
      y = world.groundY - 24;
    } else if (m.category === "Ceiling") {
      y = 24;
    } else {
      y = randRange(80, world.groundY - 200);
    }

    return {
      id: m.id,
      name: m.name,
      catIdx: categoryIndex(m.category),
      x,
      y,
      r: 20,
      vx: -S.speed * 0.5,
      vy: 0,
      state: "idle",
      wob: rng() * Math.PI * 2,
      midAirUsed: false,
      img: m.img,
      maxhp: m.stats?.maxhp ?? m.stats?.hp ?? 1,
      power: m.stats?.power ?? 1,
    };
  }

  function categoryIndex(categoryName) {
    return Categories.indexOf(categoryName);
  }

  function createMonster() {
    return createMonsterCandidate();
  }

  let lastBattledMonster = null;

  function startBattleIfCollision(mon) {
    const collisionRadius = (S.birdR + mon.r) * 1.2;
    const dist = Math.hypot(bird.x - mon.x, bird.y - mon.y);
    if (dist < collisionRadius && Date.now() > bird.invulnUntil) {
      lastBattledMonster = mon;
      startBattle({ ...mon });
      return true;
    }
    return false;
  }
  const FLOOR_H = 40;

  function drawBird(scale = 1) {
    const size = S.birdR * 2 * scale;
    const birdImg = drawBird._birdImg || new window.Image();
    if (!drawBird._birdImgLoaded) {
      birdImg.src = "assets/bird.png";
      birdImg.onload = () => { drawBird._birdImgLoaded = true; };
      drawBird._birdImg = birdImg;
    }
    if (birdImg.complete && birdImg.naturalWidth > 0) {
      ctx.save();
      ctx.translate(bird.x, bird.y);
      ctx.drawImage(birdImg, -size / 2, -size / 2, size, size);
      ctx.restore();
    }
  }

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
      }
    }
    ctx.restore();
  }

  function fillBattleMenuDetails(mon, battleHp, power) {
    const playerName = document.getElementById("playerName");
    const playerHp = document.getElementById("playerHp");
    const playerPowerEl = document.getElementById("playerPower");
    const monName = document.getElementById("monsterName");
    const monHp = document.getElementById("monsterHp");
    const monPowerEl = document.getElementById("monsterPower");
    const captureRateP = document.getElementById("captureRate");

    let displayName = activeUnit.name;
    if (!displayName || displayName === "Error Display Name" || displayName === "Error Reset Game" || displayName === "") {
      try {
        let currentProfile = null;

        if (window.profile) {
          currentProfile = window.profile;
        }
        else if (window.AF_SaveManager && window.AF_SaveManager.profile) {
          currentProfile = window.AF_SaveManager.profile;
        }
        else {
          currentProfile = JSON.parse(localStorage.getItem("profile") || "{}");
        }

        console.log("Profile found:", currentProfile);

        if (currentProfile && currentProfile.firstName) {
          displayName = currentProfile.firstName;
        } else if (currentProfile && currentProfile.firstName && currentProfile.lastName) {
          displayName = currentProfile.firstName + " " + currentProfile.lastName;
        } else if (currentProfile && currentProfile.firstName) {
          displayName = currentProfile.firstName;
        } else {
          displayName = "Dresseur";
        }
      } catch (e) {
        console.log("Profile error:", e);
        displayName = "Name Error";
      }
    }

    const captureRate = getCaptureRate(mon, battleHp, power);
    captureRateP.textContent = `${captureRate} % `;
    monName.textContent = mon.name || "Error Fill Menu Details";
    const monsterHpVal = (battle && battle.hp != null ? battle.hp : mon.maxhp);
    monHp.innerHTML = `<img class="top-menu-icon" src="assets/pixelHeart.png" alt="Heart Icon">`.repeat(Math.round(monsterHpVal));
    monPowerEl.innerHTML = `<img class="top-menu-icon" src="assets/pixelPower.png" alt="Power Icon">`.repeat(mon.power || 1);
    captureBtn.textContent = "Capture ( " + `${captureRate} % ` + ")"
    playerHp.innerHTML = `<img class="top-menu-icon" src="assets/pixelHeart.png" alt="Heart Icon">`.repeat(Math.round(lives));
    playerPowerEl.innerHTML = `<img class="top-menu-icon" src="assets/pixelPower.png" alt="Power Icon">`.repeat(activeUnit.power);
    playerName.textContent = displayName;
    const playerBalls = document.getElementById("playerBalls");
    if (playerBalls) {
      ballSize = window.innerWidth <= 480 ? 30 : window.innerWidth <= 768 ? 40 : 50;

      playerBalls.innerHTML =
        `<svg class="ballIcon" height="${ballSize}" viewBox="0 0 64 64" width="${ballSize}" style="vertical-align:middle;">
        <circle cx="32" cy="32" fill="#00d4ff" r="14"></circle>
        <circle cx="32" cy="32" fill="#fff" r="5"></circle>
      </svg> <span style="font-weight:bold;"> X ${balls}</span>`;
    }
  }

  window.addEventListener("resize", updateBallSize);
  function updateBallSize() {
    const playerBalls = document.getElementById("playerBalls");
    if (playerBalls) {
      ballSize = window.innerWidth <= 480 ? 30 : window.innerWidth <= 768 ? 40 : 50;
      playerBalls.innerHTML =
        `<svg class="ballIcon" height="${ballSize}" viewBox="0 0 64 64" width="${ballSize}" style="vertical-align:middle;">
    <circle cx="32" cy="32" fill="#00d4ff" r="14"></circle>
    <circle cx="32" cy="32" fill="#fff" r="5"></circle>
  </svg> <span style="font-weight:bold;"> X ${balls}</span>`;
    }
  }

  // ---------- Battle flow ----------
  function startBattle(mon) {

    if (pauseBtn) {
      pauseBtn.style.display = "none";
    }

    anim.monsterLungeT = 0;
    anim.playerLungeT = 0;
    anim.hurtFlashT = 0;
    anim.worldHurtT = 0;
    anim.capture.active = false;
    anim.capture.phase = "idle";
    anim.capture.success = false; // ← Bu çok önemli!
    anim.capture.t0 = 0;
    anim.capture.t1 = 0;
    anim.capture.holdUntil = 0;
    anim.capture.fromX = 0;
    anim.capture.fromY = 0;
    anim.capture.toX = 0;
    anim.capture.toY = 0;

    const hudWrap = document.getElementById("hudWrap");
    if (hudWrap) hudWrap.style.display = "none";
    state = "battle";
    document.body.classList.add("in-battle");
    captureAttemptsInBattle = 0;
    battle = {
      mon: mon,
      hp: mon.maxhp,
      maxhp: mon.maxhp,
      power: mon.power

    };
    fillBattleMenuDetails(mon, battle.hp, activeUnit.power);
    positionBattleOverlay();
    battleOverlay.classList.add("show");
    questionText.textContent = pickQuestion();
    battleAnswer.value = "";
    captureHint.textContent = "";
    setTimeout(() => battleAnswer.focus(), 40);
    captureBtn.disabled = !(battle.hp <= 0 && balls > 0);
  }

  function showFleeAndEnd(consumedLife) {
    console.log("showFleeAndEnd called, consumedLife:", consumedLife);

    if (consumedLife) {
      if (lives > 0.5) {
        lives = roundToHalf(lives - 0.5);
      } else {
        lives = 0.5;
      }
      updateHUD();
    }

    if (lastBattledMonster) {
      const idx = monsters.indexOf(lastBattledMonster);
      if (idx !== -1) {
        lastBattledMonster.x = -9999;
        lastBattledMonster.y = -9999;
        console.log("Monster moved off-screen after flee");
      }
    }

    setTimeout(() => {
      console.log("Ending battle after flee/wrong answer");
      endBattle(false, false);
    }, 500);
  }

  function endBattle(consumedLife, wasCaptured) {
    console.log("endBattle called, state before:", state);

    const hudWrap = document.getElementById("hudWrap");
    if (hudWrap) hudWrap.style.display = "";

    if (battleOverlay) {
      battleOverlay.classList.remove("show");
    }

    document.body.classList.remove("in-battle");

    if (consumedLife) {
      if (lives > 0.5) lives = roundToHalf(lives - 0.5);
      else lives = 0.5;
      updateHUD();
    }

    lastBattledMonster = null;

    battle = null;
    captureAttemptsInBattle = 0;

    state = "playing";
    resumeAt = performance.now() + 1000;

    bird.invulnUntil = Date.now() + 2000;

    if (pauseBtn && state === "playing") {
      pauseBtn.style.display = "block";
    }

    console.log("endBattle finished, state after:", state);
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

  function positionBattleOverlay() {
    const dialogH = dialogTurn.getBoundingClientRect().height;

    if (window.innerWidth <= 768) {
      battleToi.style.bottom = "10px";
      battleToi.style.left = "10px";
      battleToi.style.right = "10px";
      battleToi.style.position = "fixed";
    } else {
      battleToi.style.bottom = 18 + dialogH + 8 + "px";
      battleToi.style.position = "absolute";
    }

    battleToi.classList.remove("hidden");
  }
  window.addEventListener("resize", () => {
    if (state === "battle") positionBattleOverlay();
  });

  function pickQuestion() {
    const unanswered = questions.filter(q => !answeredQuestionIds.includes(q.id));
    if (unanswered.length === 0) return "No more questions!";
    const idx = Math.floor(Math.random() * unanswered.length);
    return unanswered[idx].question;
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

  function onPointerUp(e) {
    e.preventDefault();
    handlePressUp();
  }
  function onKeyUp(e) {
    if (e.code === "Space") {
      handlePressUp();
    }
  }
  canvas.addEventListener("pointerdown", onPointerDown, { passive: false });
  canvas.addEventListener("pointerup", onPointerUp, { passive: false });

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  if (startBtn) {
    startBtn.addEventListener("click", () => {
      availableMonsters = monsters.slice();
      collidedMonsterIds = [];
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

  function getScaleFactor() {
    if (window.innerWidth <= 480) return 0.7;
    if (window.innerWidth <= 768) return 0.8;
    if (window.innerWidth <= 1024) return 0.9;
    return 1.0;
  }

  function startWithMonster(id) {
    resetGame();

    const monsterObj = availableMonsters.find(m => m.id === id);
    if (!monsterObj) return;

    let playerName = "";

    if (window.innerWidth <= 480) {
      bird.x = W * 0.13;
    } else if (window.innerWidth <= 768) {
      bird.x = W * 0.15;
    } else {
      bird.x = 220;
    }
    try {
      if (window.profile) {
        playerName = window.profile.firstName || window.profile.fullName || "error";
      } else if (window.AF_SaveManager && window.AF_SaveManager.profile) {
        const profile = window.AF_SaveManager.profile;
        playerName = profile.firstName || profile.fullName || "error";
      } else {
        const profile = JSON.parse(localStorage.getItem("__profile__") || "{}");
        playerName = profile.firstName || profile.fullName || "error";
        if (profile.firstName) {
          playerName = profile.firstName;
        }
      }
    } catch (e) {
      playerName = "error fetching name";
    }

    const mon = {
      id: monsterObj.id,
      name: monsterObj.name,
      category: monsterObj.category,
      form: monsterObj.form,
      color: monsterObj.color,
      stats: monsterObj.stats,
      img: monsterObj.img,
      catIdx: categoryIndex(monsterObj.category),
      r: monsterObj.r || S.birdR,
      maxhp: monsterObj.stats?.maxhp ?? monsterObj.stats?.hp ?? S.maxLives,
      power: monsterObj.stats?.power ?? playerPower,
    };

    activeUnit = {
      name: mon.name,
      hpMax: mon.maxhp,
      power: mon.power,
      isMonster: true,
      monster: mon,
    };

    bird.r = mon.r;
    lives = activeUnit.hpMax;
    score = 0;
    capturesRun = 0;
    lostBattlesRun = 0;
    runMaxLives = activeUnit.hpMax;
    runPower = activeUnit.power;
    control.mode = "fly"; // Her zaman klasik uçan mod
    control.jumps = 0;
    control.maxJumps = 4;
    control.glide = control.glideMax = 1.0;
    control.hold = false;
    control.ceilingLockY = null;
    control.fastFallTimer = 0;
    updateHUD();
    startScreen.classList.remove("show");
    gameOverEl.classList.remove("show");
    if (window.innerWidth <= 480) {
      bird.x = W * 0.13;
    } else if (window.innerWidth <= 768) {
      bird.x = W * 0.15;
    } else {
      bird.x = 220;
    }
    bird.vy = 0;
    bird.tilt = 0;
    bird.invulnUntil = 0;
    bird.y = H / 2;
    pipes = [];
    nextPipeX = 600;
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

  // ---------- Game reset / HUD ----------
  function resetGame() {
    isPaused = false;
    if (pauseOverlay) {
      pauseOverlay.classList.remove("show");
    }
    /* ensure bird defaults */
    selectedMonsterId = null;
    if (typeof control !== "undefined") {
      control.mode = "fly";
      control.jumps = 0;
      control.maxJumps = 4;
      control.glide = control.glideMax = 1.0;
      control.hold = false;
    }

    anim.monsterLungeT = 0;
    anim.playerLungeT = 0;
    anim.hurtFlashT = 0;
    anim.worldHurtT = 0;
    anim.capture.active = false;
    anim.capture.phase = "idle";
    anim.capture.success = false;
    anim.capture.t0 = 0;
    anim.capture.t1 = 0;
    anim.capture.holdUntil = 0;

    if (window.innerWidth <= 480) {
      bird.x = W * 0.13;
    } else if (window.innerWidth <= 768) {
      bird.x = W * 0.15;
    } else {
      bird.x = 220;
    }

    bird.y = H / 2;

    let displayName = activeUnit.name;
    if (!displayName || displayName === "Error Display Name" || displayName === "Error Reset Game" || displayName === "") {
      try {
        let currentProfile = null;

        if (window.profile) {
          currentProfile = window.profile;
        }
        else if (window.AF_SaveManager && window.AF_SaveManager.profile) {
          currentProfile = window.AF_SaveManager.profile;
        }
        else {
          currentProfile = JSON.parse(localStorage.getItem("profile") || "{}");
        }

        console.log("Profile found:", currentProfile);

        if (currentProfile && currentProfile.firstName) {
          displayName = currentProfile.firstName;
        } else if (currentProfile && currentProfile.firstName && currentProfile.lastName) {
          displayName = currentProfile.firstName + " " + currentProfile.lastName;
        } else if (currentProfile && currentProfile.firstName) {
          displayName = currentProfile.firstName;
        } else {
          displayName = "Name Error Reset Game";
        }
      } catch (e) {
        console.log("Profile error:", e);
        displayName = "Name Error Reset Game";
      }
    }
    updateHUD();
    activeUnit = {
      name: displayName,
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

    if (window.innerWidth <= 480) {
      bird.x = W * 0.13;
    } else if (window.innerWidth <= 768) {
      bird.x = W * 0.15;
    } else {
      bird.x = 220;
    }

    bird.y = H / 2;
    bird.vy = 0;
    bird.tilt = 0;
    bird.invulnUntil = 0;
    bird.trail = [];
    pipes = [];
    nextPipeX = 600;
    monsterTimer = 0;
    items = [];
    itemTimer = 1.5;
    world.scrollX = 0;
    world.stars = null;
    world.buildings = null;
    state = "playing";
    renderCollectionPaged(dexStart);
    updateSendButtons();
    if (pauseBtn) {
      pauseBtn.style.display = "block";
    }
  }
  function updateHUD() {
    livesEl.innerHTML = heartsHTML(lives, activeUnit.hpMax);
    scoreEl.textContent = score;
    ballsCountEl.textContent = balls;
    if (hudPowerVal) hudPowerVal.textContent = String(activeUnit.power);
    if (pauseBtn) {
      pauseBtn.style.display = (state === "playing" && !isPaused) ? "block" : "none";
    }
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
    if (state !== "playing" || isPaused) return;
    if (performance.now() < resumeAt) return;

    checkGameCompletion();

    const dx = S.speed * dt;
    world.scrollX += dx;

    if (pauseBtn) {
      pauseBtn.style.display = (state === "playing" && !isPaused) ? "block" : "none";
    }

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

    monsterTimer -= dt;
    if (monsterTimer <= 0) {
      if (answeredQuestionIds.length < questions.length) {
        const newMonster = createMonster();
        if (newMonster) {
          monsters.push(newMonster);
        }
      }
      monsterTimer = randRange(S.spawnEverySec[0], S.spawnEverySec[1]);
    }
    for (let m of monsters) {
      const cat = Categories[m.catIdx];
      if (cat === "Flying") {
        m.x -= S.speed * 0.58 * dt;
        m.wob += (0.8 + rng() * 0.6) * dt;
        m.y += Math.sin(m.wob * 2.2) * 20 * dt + (rng() - 0.5) * 12 * dt;
      } else if (cat === "Earth") {
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





  function drawBirdTrail(ctx, bird) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const trailLength = bird.trail.length;
    for (let i = 0; i < trailLength; i++) {
      const a = Math.max(0, 0.35 - i * 0.02);
      if (a <= 0) continue;
      const pos = bird.trail[i];
      if (!pos) continue;
      ctx.fillStyle = `rgba(0,194,255,${a})`;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
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
      const monsterId = activeUnit.monster.id;
      const collectionItem = collection.find(item => item.id === monsterId);

      if (collectionItem && collectionItem.amount > 0) {
        collectionItem.amount -= 1;
        console.log(`${activeUnit.monster.name} amount decreased to ${collectionItem.amount}`);

        if (collectionItem.amount <= 0) {
          const index = collection.findIndex(item => item.id === monsterId);
          if (index !== -1) {
            collection.splice(index, 1);
            console.log(`${activeUnit.monster.name} removed from collection (amount reached 0)`);
          }
        }

        saveCollection(collection);

        try {
          renderCollectionPaged(dexStart);
          renderCollectionPaged(dexEl);
          updateMonsterSelect(document.getElementById("monsterSelectStart"));
        } catch (e) { }
      }
    }

    if (activeUnit && activeUnit.isMonster) {
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
    } catch (e) { }
    try {
      document.getElementById("bestDistance").textContent = `${high} m`;
      document.getElementById("bestCaptures").textContent =
        String(bestCaptInRun);
      document.getElementById("bestScoreVal").textContent = String(
        Number(localStorage.getItem("angryflappy_bestscore") || 0)
      );
    } catch (e) { }

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
    } catch (e) { }
    renderCollectionPaged(dexEl);
    updateSendButtons();
    gameOverEl.classList.add("show");

    if (battle) {
      endBattle(true, false);
    } else {
      triggerGameOverReal();
    }
  }

  function showCorruptionChoice(mon) {
    state = "corrupt";
    document.body.classList.remove("in-battle");
    if (!corruptOverlay) {
      triggerGameOverReal();
      return;
    }

    const cost = Math.max(5, (mon.maxhp + mon.power) * 2);

    corruptTitle.textContent = `${mon.name} is corrupted`;
    corruptVisual.innerHTML = "";
    if (trashBtn) trashBtn.style.display = "";
    try {
      const img = new Image();
      img.alt = mon.name;
      img.src = mon.img || "";
      corruptVisual.appendChild(img);
    } catch (e) {
      /* ignore */
    }
    saveBtn.textContent = `USE ${cost} BALLS`;
    saveBtn.disabled = balls < cost;
    trashBtn.onclick = () => {
      if (corruptOverlay) corruptOverlay.classList.remove("show");
      // Remove from collection
      const idx = collection.indexOf(mon.id);
      if (idx >= 0) {
        collection.splice(idx, 1);
        saveCollection(collection);
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
    } catch (e) { }
    corruptOverlay.classList.add("show");
  }

  function triggerGameOverReal() {
    state = "gameover";
    document.body.classList.remove("in-battle");
    if (typeof battleOverlay !== "undefined") {
      try {
        battleOverlay.classList.remove("show");
      } catch (e) { }
    }
    renderCollectionPaged(dexEl);
    updateSendButtons();
    gameOverEl.classList.add("show");
  }
  // ---------- Rendering ----------
  function drawWorldNormal() {
    worldHelpers.synthParallaxBG();

    for (let p of pipes) drawPipe(p);
    drawNeonEdges();
    for (let it of items) drawItem(it);
    for (let m of monsters) {
      drawMonster(m);
      if (state === "playing") drawStars(m);
    }

    if (!activeUnit.isMonster) {
      // Bird ile oynanıyorsa sadece bird ve trail çiz
      drawBirdTrail(ctx, bird);
      const birdImg = drawWorldNormal._birdImg || new Image();
      if (!drawWorldNormal._birdImgLoaded) {
        birdImg.src = "assets/bird.png";
        birdImg.onload = () => { drawWorldNormal._birdImgLoaded = true; };
        drawWorldNormal._birdImg = birdImg;
      }
      if (birdImg.complete && birdImg.naturalWidth > 0) {
        ctx.save();
        ctx.translate(bird.x, bird.y);
        ctx.drawImage(birdImg, -S.birdR, -S.birdR, S.birdR * 2, S.birdR * 2);
        ctx.restore();
      }
    } else if (activeUnit.monster) {
      // Monster ile oynanıyorsa SADECE monster çiz
      bird.trail = [];
      bird.r = activeUnit.monster.r || S.birdR;
      const me = activeUnit.monster;
      const pm = { ...me, x: bird.x, y: bird.y, r: me.r };
      drawMonster(pm);
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



  function getBattlePositions() {
    return {
      enemyBaseX: W * 0.72,
      enemyBaseY: H * 0.55,
      playerScreenX: W * 0.28,
      playerScreenY: H * 0.55
    };
  }


  function drawBattleOverlays() {
    if (!battle) return;

    ctx.save();
    ctx.fillStyle = "#181c2a";
    ctx.fillRect(0, 0, W, H);

    const gradBG = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, W / 2);
    gradBG.addColorStop(0, "#2b314a");
    gradBG.addColorStop(1, "#181c2a");
    ctx.fillStyle = gradBG;
    ctx.globalAlpha = 0.7;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
    ctx.restore();

    // Fixed positioning - player directly faces enemy
    const enemyBattleX = W * 0.72, enemyBattleY = H * 0.55;
    const playerBattleX = W * 0.28, playerBattleY = enemyBattleY; // Same Y as enemy, facing position

    const t = performance.now();
    const monLunge = t < anim.monsterLungeT ? 1 - (anim.monsterLungeT - t) / 220 : 0;
    const plyLunge = t < anim.playerLungeT ? 1 - (anim.playerLungeT - t) / 220 : 0;
    const hurtA = t < anim.hurtFlashT ? (anim.hurtFlashT - t) / 160 : 0;

    // Calculate actual positions with lunge animations
    const finalPlayerX = playerBattleX + 40 * plyLunge;
    const finalPlayerY = playerBattleY; // Keep same Y level as enemy
    const finalEnemyX = enemyBattleX - 40 * monLunge;
    const finalEnemyY = enemyBattleY;

    // Draw player character at correct position with correct image
    ctx.save();
    if (activeUnit.isMonster) {
      // Draw the selected monster at battle position
      ctx.translate(finalPlayerX, finalPlayerY);
      const playerMonster = {
        ...activeUnit.monster,
        x: 0,
        y: 0
      };
      drawMonster(playerMonster, 2.0);
    } else {
      // For bird, draw directly at battle position without using global bird coordinates
      const size = S.birdR * 2 * 2.0; // scale = 2.0
      const birdImg = drawBird._birdImg || new window.Image();
      if (!drawBird._birdImgLoaded) {
        birdImg.src = "assets/bird.png";
        birdImg.onload = () => { drawBird._birdImgLoaded = true; };
        drawBird._birdImg = birdImg;
      }
      if (birdImg.complete && birdImg.naturalWidth > 0) {
        ctx.drawImage(birdImg, finalPlayerX - size / 2, finalPlayerY - size / 2, size, size);
      }
    }
    ctx.restore();

    // Draw enemy monster at correct position
    ctx.save();
    ctx.translate(finalEnemyX, finalEnemyY);
    drawMonster({ ...battle.mon, x: 0, y: 0 }, 2.0);
    ctx.restore();

    ctx.save();
    const gradShadowPlayer = ctx.createRadialGradient(
      finalPlayerX,
      finalPlayerY + 80,
      5,
      finalPlayerX,
      finalPlayerY + 80,
      60
    );
    gradShadowPlayer.addColorStop(0, "rgba(0,0,0,0.35)");
    gradShadowPlayer.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradShadowPlayer;
    ctx.beginPath();
    ctx.ellipse(finalPlayerX, finalPlayerY + 80, 60, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    const gradShadowEnemy = ctx.createRadialGradient(
      finalEnemyX,
      finalEnemyY + 80,
      5,
      finalEnemyX,
      finalEnemyY + 80,
      60
    );
    gradShadowEnemy.addColorStop(0, "rgba(0,0,0,0.35)");
    gradShadowEnemy.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradShadowEnemy;
    ctx.beginPath();
    ctx.ellipse(finalEnemyX, finalEnemyY + 80, 60, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Capture animation
    if (anim.capture.active) {
      const now = performance.now();
      if (anim.capture.phase === "fly") {
        const p = Math.min(
          1,
          (now - anim.capture.t0) / (anim.capture.t1 - anim.capture.t0)
        );
        const x = anim.capture.fromX + (anim.capture.toX - anim.capture.fromX) * p;
        const y = anim.capture.fromY + (anim.capture.toY - anim.capture.fromY) * p;
        const r = 10 + 20 * p;
        drawNeonBall(x, y, r);
        if (p >= 1) {
          anim.capture.phase = "hold";
          anim.capture.holdUntil = now + 1000;
        }
      } else if (anim.capture.phase === "hold") {
        // Draw ball enclosing the monster
        drawNeonBall(finalEnemyX, finalEnemyY, 52);
        ctx.save();
        ctx.globalAlpha = 0.55;
        ctx.translate(finalEnemyX, finalEnemyY);
        drawMonster({ ...battle.mon, x: 0, y: 0 }, 2.2);
        ctx.restore();
        if (now >= anim.capture.holdUntil) {
          anim.capture.phase = "result";
          anim.capture.t0 = now;
        }
      } else if (anim.capture.phase === "result") {
        const text = anim.capture.success ? "Capture Successful" : "Capture Failed";
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
            const id = battle.mon.id;
            if (!collection.includes(id)) {
              collection.push(id);
              saveCollection(collection);
              try {
                renderCollectionPaged(dexStart);
                renderCollectionPaged(dexEl);
              } catch (e) { }
            }
            capturesRun++;
            if (capturesRun > bestCaptInRun) {
              bestCaptInRun = capturesRun;
              localStorage.setItem("angryflappy_bestcaprun", String(bestCaptInRun));
            }
            anim.capture.active = false;
            console.log("draw battle calls")

            showFleeAndEnd(false);
          } else {
            anim.capture.active = false;
            if (Math.random() < 0.5) enemyAttack();
          }
        }
      }
    }

    // Hurt flash effect
    if (hurtA > 0) {
      ctx.fillStyle = `rgba(255,0,0,${Math.min(0.35, hurtA)})`;
      ctx.fillRect(0, 0, W, H);
    }

    // Flee banner
    if (battle && battle.fleeBannerUntil && performance.now() < battle.fleeBannerUntil) {
      ctx.save();
      ctx.font = "48px monospace";
      ctx.fillStyle = "#ffffff";
      const text = "ESCAPED";
      const m = ctx.measureText(text);
      const x = (W - m.width) / 2, y = H * 0.18;
      ctx.lineWidth = 6;
      ctx.strokeStyle = "#111827";
      ctx.strokeText(text, x, y);
      ctx.fillText(text, x, y);
      ctx.restore();
    }

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

  answerBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (!battle) return;
    anim.playerLungeT = performance.now() + 220;

    const currentQuestion = questionText.textContent;
    const qObj = questions.find(q => q.question === currentQuestion);
    const userAnswer = battleAnswer.value.trim();

    function normalize(s) {
      return String(s).toLowerCase().replace(/\s+/g, "");
    }

    let isCorrect = false;
    if (qObj && qObj.answer && Array.isArray(qObj.answer)) {
      isCorrect = qObj.answer.some(answer =>
        normalize(userAnswer) === normalize(answer)
      );
    }

    // TRACKING - Soru ID'sini uygun array'e ekle
    if (qObj) {
      if (!answeredQuestionIds.includes(qObj.id)) {
        answeredQuestionIds.push(qObj.id);
      }

      if (isCorrect) {
        if (!correctlyAnsweredQuestionIds.includes(qObj.id)) {
          correctlyAnsweredQuestionIds.push(qObj.id);
        }
      } else {
        if (!incorrectlyAnsweredQuestionIds.includes(qObj.id)) {
          incorrectlyAnsweredQuestionIds.push(qObj.id);
        }
      }
    }

    if (isCorrect) {
      battle.hp = Math.max(0, roundToHalf(battle.hp - activeUnit.power));
      fillBattleMenuDetails(battle.mon, battle.hp, activeUnit.power);

      if (battle.hp <= 0) {
        captureHint.textContent = "Monster defeated! Automatic capture...";
        captureHint.className = "hint capture-correct";
        if (lastBattledMonster) {
          lastBattledMonster.x = -9999;
          lastBattledMonster.y = -9999;
        }

        handleCaptureSuccess();
        return;
      }

      captureHint.textContent = "Correct! You attacked the monster.";
      captureHint.className = "hint capture-correct";

      setTimeout(() => {
        captureHint.textContent = "";
        captureHint.className = "hint";
      }, 3000);

      questionText.textContent = pickQuestion();
      battleAnswer.value = "";
      setTimeout(() => battleAnswer.focus(), 30);

    } else {
      captureHint.textContent = "Wrong answer! Battle ended.";
      captureHint.className = "hint capture-wrong";

      setTimeout(() => {
        console.log("Wrong answer - ending battle");
        showFleeAndEnd(false, false);
      }, 500);
      return;
    }

    updateHUD();
  });


  fleeBtn.addEventListener("click", () => {
    ++lostBattlesRun;
    fleeCount++;
    showFleeAndEnd(true);
  });

  function getCaptureRate(mon, hp, playerPower) {
    let rate = (100 - ((hp * 10) + (playerPower * 5)));
    rate = Math.max(0, rate);
    return parseInt(rate, 10);
  }

  window.handleCaptureSuccess = function handleCaptureSuccess() {
    if (!battle || anim.capture.active) return;
    if (balls <= 0) {
      captureHint.textContent = "No balls left!";
      captureHint.className = "hint capture-wrong";
      return;
    }

    balls -= 1;
    saveBalls();
    updateHUD();

    const captureRate = getCaptureRate(battle.mon, battle.hp, activeUnit.power);
    const success = Math.random() * 100 < captureRate;

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

    setTimeout(() => {
      if (battle && battle.mon) {
        if (success) {
          const id = battle.mon.id;

          let existing = collection.find(item => {
            if (typeof item === 'object' && item.id === id) return true;
            if (typeof item === 'string' && item === id) return true;
            return false;
          });

          if (existing) {
            if (typeof existing === 'string') {
              const index = collection.indexOf(existing);
              collection[index] = { id: existing, amount: 2 }; // 1 + 1 = 2
              console.log(`${battle.mon.name} converted to object format with amount 2`);
            } else if (typeof existing === 'object') {
              existing.amount += 1;
              console.log(`${battle.mon.name} amount increased to ${existing.amount}`);
            }
          } else {
            collection.push({ id, amount: 1 });
            console.log(`${battle.mon.name} captured for the first time`);
          }

          saveCollection(collection);
          try {
            renderCollectionPaged(dexStart);
            renderCollectionPaged(dexEl);
          } catch (e) { }

          if (lastBattledMonster) {
            lastBattledMonster.x = -9999;
            lastBattledMonster.y = -9999;
          }

          capturesRun++;
          if (capturesRun > bestCaptInRun) {
            bestCaptInRun = capturesRun;
            localStorage.setItem("angryflappy_bestcaprun", String(bestCaptInRun));
          }

          const extraHp = Math.floor(Math.random() * 2) + 1;
          activeUnit.hpMax += extraHp;
          lives = activeUnit.hpMax;
          updateHUD();

          captureHint.textContent = `Monster captured! +${extraHp} HP`;
          captureHint.className = "hint capture-correct";

          setTimeout(() => {
            endBattle(false, true);
            setTimeout(() => {
              checkGameCompletion();
            }, 100);
          }, 1500);

        } else {
          captureHint.textContent = "Capture failed!";
          captureHint.className = "hint capture-wrong";
          if (lastBattledMonster) {
            lastBattledMonster.x = -9999;
            lastBattledMonster.y = -9999;
          }

          setTimeout(() => {
            endBattle(false, false);
          }, 500);
        }
      }
    }, 500);
  };

  function enemyAttack() {
    if (!battle) return;
    anim.monsterLungeT = performance.now() + 220;
    const dmg = dmgReceivedFrom(battle.power);
    if (dmg <= 0) return;
    anim.hurtFlashT = performance.now() + 160;
    if (lives <= 0.5) {
      ++lostBattlesRun;
      console.log("enemy attack calls")

      showFleeAndEnd(false);
      return;
    }
    if (lives - dmg < 0.5) {
      lives = 0.5;
      updateHUD();
      ++lostBattlesRun;
      console.log("enemy attack calls");
      showFleeAndEnd(false);
      return;
    }
    lives = Math.max(0.5, roundToHalf(lives - dmg));
    updateHUD();
  }

  // ---------- Collection rendering ----------
  function renderCollectionPaged(container) {
    container.innerHTML = "";
    const list = loadCollection().slice();
    const scope = container.closest(".panel") || document;
    const bySel = scope.querySelector("#sortByStart, #sortBy");
    const dirSel = scope.querySelector("#sortDirStart, #sortDir");

    function computeList() {
      const by = bySel ? bySel.value : "alpha";
      const dir = dirSel ? dirSel.value : "asc";

      const arr = list
        .map((item) => {
          // Yeni format: { id, amount }
          const id = item.id || item; // Geriye uyumluluk
          const amount = item.amount || 1;

          const monsterObj = window.MONSTERS.find(m => m.id === id);
          if (!monsterObj) {
            console.warn("Monster not found for ID:", id);
            return null;
          }

          const [c, f, k] = id.split("-").map((n) => parseInt(n));
          const name = monsterObj.name;
          const hp = monsterObj.stats?.maxhp ?? monsterObj.stats?.hp ?? 1;
          const power = monsterObj.stats?.power ?? 1;
          const img = monsterObj.img;

          return { id, c, f, k, name, hp, power, img, amount };
        })
        .filter(item => item !== null && item.amount > 0); // Amount 0 olanları gösterme

      arr.sort((a, b) => {
        let v = 0;
        if (by === "alpha") {
          v = a.name.localeCompare(b.name);
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
        const card = document.createElement("div");
        card.className = "card selectable";

        const thumb = document.createElement("div");
        thumb.className = "thumb";
        const img = document.createElement("img");
        img.alt = e.name;
        img.width = 56;
        img.height = 56;
        img.style.imageRendering = "pixelated";
        img.src = e.img || "assets/placeholder.png";
        thumb.appendChild(img);

        const box = document.createElement("div");
        const title = document.createElement("div");
        title.className = "title";
        title.textContent = `${e.name} (x${e.amount})`; // Amount göster

        const meta = document.createElement("div");
        meta.className = "meta";
        meta.textContent = `HP: ${e.hp} • Power: ${e.power} • Level: ${e.hp + e.power}`;

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

  // ---------- Main loop ----------
  function loop(ts) {
    const dt = Math.min(0.033, (ts - last) / 1000);
    last = ts;
    if (state === "playing") update(dt);
    ctx.clearRect(0, 0, W, H);
    if (state === "battle") {
      drawBattleOverlays();
    } else {
      drawWorldNormal();
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);


  const startOverBtn = document.getElementById("startOverBtn");
  if (startOverBtn) {
    startOverBtn.addEventListener("click", () => {
      console.log("Start Over clicked - Complete reset");

      startOverBtn.disabled = true;
      startOverBtn.textContent = "RESTARTING...";

      setTimeout(() => {
        gameOverEl.classList.remove("show");
        if (corruptOverlay) corruptOverlay.classList.remove("show");

        collection.length = 0;
        localStorage.removeItem("angryflappy_collection");
        saveCollection(collection);

        high = 0;
        bestCaptInRun = 0;

        localStorage.removeItem("angryflappy_high");
        localStorage.removeItem("angryflappy_bestcaprun");
        localStorage.removeItem("angryflappy_bestscore");

        availableMonsters = monsters.slice();
        collidedMonsterIds.length = 0;
        answeredQuestionIds.length = 0;
        selectedMonsterId = null;
        answeredQuestionIds.length = 0;
        correctlyAnsweredQuestionIds = [];
        incorrectlyAnsweredQuestionIds = [];
        fleeCount = 0;

        startNewGame();

        try {
          renderCollectionPaged(dexStart);
          renderCollectionPaged(dexEl);
          updateMonsterSelect(document.getElementById("monsterSelectStart"));
        } catch (e) {
          console.log("UI update error:", e);
        }

        startOverBtn.disabled = false;
        startOverBtn.textContent = "START OVER";

        console.log("Complete game reset - All data cleared");
      }, 500); 
    });
  }

  function startNewGame() {
    gameOverEl.classList.remove("show");
    if (corruptOverlay) corruptOverlay.classList.remove("show");

    const completionMsg = document.querySelector(".completion-message");
    if (completionMsg) {
      completionMsg.remove();
    }

    const gameOverTitle = document.querySelector("#gameOver h2");
    if (gameOverTitle) {
      gameOverTitle.textContent = "GAME OVER";
      gameOverTitle.style.color = "";
    }

    if (pauseOverlay) {
      pauseOverlay.classList.remove("show");
    }

    selectedMonsterId = null;

    if (window.innerWidth <= 480) {
      bird.x = W * 0.13;
    } else if (window.innerWidth <= 768) {
      bird.x = W * 0.15;
    } else {
      bird.x = 220;
    }

    bird.y = H / 2;
    bird.vy = 0;
    bird.tilt = 0;
    bird.invulnUntil = Date.now() + 3000;
    bird.trail = [];

    answeredQuestionIds.length = 0;
    correctlyAnsweredQuestionIds = [];
    incorrectlyAnsweredQuestionIds = [];
    fleeCount = 0;
    anim.monsterLungeT = 0;
    anim.playerLungeT = 0;
    anim.hurtFlashT = 0;
    anim.worldHurtT = 0;
    anim.capture.active = false;
    anim.capture.phase = "idle";
    anim.capture.success = false;
    anim.capture.t0 = 0;
    anim.capture.t1 = 0;
    anim.capture.holdUntil = 0;
    anim.capture.fromX = 0;
    anim.capture.fromY = 0;
    anim.capture.toX = 0;
    anim.capture.toY = 0;

    if (typeof control !== "undefined") {
      control.mode = "fly";
      control.jumps = 0;
      control.maxJumps = 4;
      control.glide = control.glideMax = 1.0;
      control.hold = false;
      control.ceilingLockY = null;
      control.fastFallTimer = 0;
    }

    let displayName = "Player";
    try {
      let currentProfile = null;

      if (window.profile) {
        currentProfile = window.profile;
      }
      else if (window.AF_SaveManager && window.AF_SaveManager.profile) {
        currentProfile = window.AF_SaveManager.profile;
      }
      else {
        currentProfile = JSON.parse(localStorage.getItem("profile") || "{}");
      }

      if (currentProfile && currentProfile.firstName) {
        displayName = currentProfile.firstName;
      } else {
        displayName = "Player";
      }
    } catch (e) {
      displayName = "Player";
    }

    activeUnit = {
      name: displayName,
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

    pipes = [];
    nextPipeX = 600;
    monsterTimer = 0;
    items = [];
    itemTimer = 1.5;
    world.scrollX = 0;
    world.stars = null;
    world.buildings = null;

    battle = null;
    captureAttemptsInBattle = 0;
    lastBattledMonster = null;

    state = "playing";

    const hudWrap = document.getElementById("hudWrap");
    if (hudWrap) {
      hudWrap.style.display = "";
    }

    updateHUD();
    updateSendButtons();

    if (pauseBtn) {
      pauseBtn.style.display = "block";
    }

    console.log("New game started");
  }
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

if (startScreen) {
  startScreen.classList.add("show");
}
if (splash) {
  splash.style.display = "none";
}

try {
  if (dexStart) renderCollectionPaged(dexStart);
} catch (e) { }
try {
  const selStart = document.getElementById("monsterSelectStart");
  if (selStart) updateMonsterSelect(selStart);
} catch (e) { }

const ballLossEl = document.getElementById("ballLoss");
const ballLossMsg = document.getElementById("ballLossMsg");
const ballLossOk = document.getElementById("ballLossOk");

if (ballLossOk) {
  ballLossOk.addEventListener("click", () => {
    if (ballLossEl) ballLossEl.classList.remove("show");
    triggerGameOverReal();
  });
}
