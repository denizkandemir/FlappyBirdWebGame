
// auth/login.js
// Minimal login overlay that asks for [Prénom] + [Nom], then activates the SaveManager profile.
// Shown AFTER the BNI splash has finished.

(function(){
  // Build overlay UI
function ensureStyles(){
  if (document.getElementById('af-login-style')) return;
  const css = `
    .af-login-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,.75);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    .af-login-overlay.show { display: flex; }

    .af-login-card {
      padding: 20px 24px;
      border: 3px solid #0ff;
      background: rgba(10,20,40,0.95);
      border-radius: 8px;
      max-width: 420px;
      width: 92vw;
      box-shadow: 0 0 25px rgba(0,255,255,.4), inset 0 0 10px rgba(0,255,255,.2);
      color: #fff;
      text-align: center;
    }

    .af-login-card h2 {
      font-family: 'Silkscreen','Press Start 2P',monospace;
      font-size: 20px;
      margin: 0 0 12px;
      color: #00e5ff;
      text-shadow: 0 0 6px #00e5ff;
    }

    .af-login-card p {
      margin: 0 0 12px;
      font-size: 14px;
      line-height: 1.4;
      color: #cbd5e1;
    }

    .af-row {
      display: flex;
      gap: 10px;
      margin-bottom: 12px;
      flex-wrap: wrap;
    }

    .af-input {
      flex: 1;
      border: 2px solid #00e5ff;
      background: rgba(255,255,255,0.1);
      color: #fff;
      padding: 10px 12px;
      font-size: 15px;
      border-radius: 4px;
      outline: none;
      box-shadow: inset 0 0 8px rgba(0,229,255,.3);
    }
    .af-input::placeholder {
      color: rgba(255,255,255,.6);
    }
    .af-input:focus {
      border-color: #66f7ff;
      box-shadow: 0 0 12px #22e7ff, inset 0 0 8px rgba(34,231,255,.4);
    }

    .af-btn {
      margin-top: 10px;
      display: inline-block;
      border: 2px solid #00e5ff;
      background: #00e5ff;
      color: #0a0a0a;
      padding: 10px 16px;
      font-weight: 800;
      cursor: pointer;
      border-radius: 4px;
      box-shadow: 0 0 12px rgba(0,229,255,.6);
      transition: transform .1s, background .2s;
    }
    .af-btn:hover {
      background: #22e7ff;
      transform: translateY(-2px);
    }
    .af-btn:active {
      transform: translateY(1px);
    }
    .af-btn:disabled {
      opacity: .5;
      cursor: not-allowed;
      box-shadow: none;
    }

    .af-error {
      color: #f87171;
      font-weight: 700;
      margin-top: 8px;
      display: none;
      text-shadow: 0 0 6px #b91c1c;
    }
  `;
  const style = document.createElement('style');
  style.id = 'af-login-style'; 
  style.textContent = css;
  document.head.appendChild(style);
}

 function buildOverlay() {
  ensureStyles();
  const overlay = document.createElement('div');
  overlay.className = 'af-login-overlay';
  overlay.id = 'afLoginOverlay';
  overlay.innerHTML = `
    <div class="af-login-card">
      <h2>Login</h2>
      <p>Enter your <strong>first name</strong> and <strong>last name</strong> to load your save.</p>
      <div class="af-row">
        <input class="af-input" id="afFirstName" placeholder="First name" autocomplete="given-name" />
        <input class="af-input" id="afLastName" placeholder="Last name" autocomplete="family-name" />
      </div>
      <button class="af-btn" id="afLoginBtn">CONTINUE</button>
      <div class="af-error" id="afLoginErr"></div>
    </div>
  `;
  document.body.appendChild(overlay);
  return overlay;
}


  async function waitSplashThenShow(overlay){
    const splash = document.getElementById('splash');
    // If splash exists, wait until it's hidden by the game's animation.
    if (splash){
      // If splash is already hidden, just show; else watch for its hide
      const isHidden = splash.style.display === 'none' || !splash.classList.contains('show');
      if (isHidden){ overlay.classList.add('show'); return; }
      const obs = new MutationObserver(()=>{
        const hidden = splash.style.display === 'none' || !splash.classList.contains('show');
        if (hidden){ overlay.classList.add('show'); obs.disconnect(); }
      });
      obs.observe(splash, { attributes: true, attributeFilter: ['class','style'] });
      // Safety: if nothing happens in 5s, show anyway
      setTimeout(()=> overlay.classList.add('show'), 5000);
    } else {
      overlay.classList.add('show');
    }
  }

  async function showLogin(){
    const overlay = buildOverlay();
    await waitSplashThenShow(overlay);
    return await new Promise(resolve=>{
      const first = overlay.querySelector('#afFirstName');
      const last = overlay.querySelector('#afLastName');
      const btn = overlay.querySelector('#afLoginBtn');
      const err = overlay.querySelector('#afLoginErr');
      function submit(){
        const firstName = (first.value||'').trim();
        const lastName = (last.value||'').trim();
        if (!firstName || !lastName){
          err.textContent = 'Please enter both first and last names';
          err.style.display = 'block'; return;
        }
        const fullName = `${firstName} ${lastName}`.trim();
        const profileId = (window.AF_sanitizeProfileName ? window.AF_sanitizeProfileName(fullName) : fullName.toLowerCase().replace(/\s+/g,'_'));
        // Activate SaveManager profile
        if (!window.AF_SaveManager){
          alert('SaveManager indisponible. Rechargez la page.');
          return;
        }
        window.AF_SaveManager.useProfile({ firstName, lastName, fullName }).then(profile=>{
          window.__PROFILE__ = profile; // expose
          overlay.remove();
          // After login, update a few UI counters if present (best score, balls, etc.)
          try{
            const best = Number(localStorage.getItem('angryflappy_bestscore')||0);
            const el = document.getElementById('bestScore'); if (el) el.textContent = String(best);
            const balls = Number(localStorage.getItem('angryflappy_balls')||0);
            const bStart = document.getElementById('ballsStart'); if (bStart) bStart.textContent = String(balls);
          }catch(e){}
          // Emit event so the game could react if needed
          window.dispatchEvent(new CustomEvent('af:login:done', { detail: { profile } }));
          resolve(profile);
        });
      }
      first.addEventListener('keydown', e=>{ if (e.key==='Enter') submit(); });
      last.addEventListener('keydown', e=>{ if (e.key==='Enter') submit(); });
      btn.addEventListener('click', submit);
      // autofocus first input
      setTimeout(()=> first.focus(), 50);
    });
  }

  // Public API (global)
  window.AF_showLogin = showLogin;
})();
