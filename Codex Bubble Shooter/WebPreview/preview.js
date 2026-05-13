const phone = document.getElementById("phone");
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const uiRoot = document.getElementById("uiRoot");

const bubbleColors = ["#f7354b", "#ffdf2d", "#22df58", "#20d6ea", "#234df0", "#bd31ff", "#ff43b8", "#ff8624"];
const saveKey = "bubble-pop-reference-ui-v3";
const defaultState = {
  screen: "levelMap",
  level: 1,
  highest: 1,
  coins: 227,
  lives: 5,
  stars: 0,
  balls: 60,
  combo: 0,
  fireballs: 0,
  bombs: 19,
  rainbows: 2,
  swaps: 13,
  music: true,
  sound: true,
  vibration: true,
  targetedAds: true,
  gameMode: "LEVELS",
  lastDaily: "",
  lastSpin: "",
  dailyDay: 1,
  missionTab: "EASY",
  board: [],
  looseBubbles: [],
  current: 2,
  next: 1
};

const state = loadState();
const runtime = {
  shot: null,
  aim: null,
  useFire: false,
  useBomb: false,
  modal: null,
  spinning: false,
  width: 0,
  height: 0,
  radius: 18,
  topPad: 78,
  shooter: { x: 0, y: 0 }
};

function loadState() {
  try {
    return { ...defaultState, ...JSON.parse(localStorage.getItem(saveKey) || "{}") };
  } catch {
    return { ...defaultState };
  }
}

function persist() {
  const serializable = { ...state, board: [], looseBubbles: [] };
  localStorage.setItem(saveKey, JSON.stringify(serializable));
}

function hash(seed) {
  let x = seed >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  return x >>> 0;
}

function ballsForLevel(level) {
  if (level <= 50) return 60;
  if (level >= 800) return 40;
  return Math.round(60 + (40 - 60) * ((level - 51) / (800 - 51)));
}

function colorCount() {
  return Math.min(8, Math.max(3, 3 + Math.floor(state.level / 180)));
}

function icon(name) {
  const map = {
    coin: '<span class="icon coin">₹</span>',
    plus: '<button class="plus" data-action="store">+</button>',
    heart: '<span class="heart">♥</span>',
    gear: "⚙",
    gift: "🎁",
    target: "🎯",
    star: "★",
    bomb: "💣",
    fire: "🔥",
    rainbow: "🌈",
    music: "♫",
    sound: "🔊",
    vib: "▯",
    ad: "◎",
    back: "‹",
    close: "×",
    spin: "🎡",
    store: "🛒",
    refresh: "↻",
    help: "?",
    menu: "☰"
  };
  return map[name] || name;
}

function topbar(extra = "") {
  return `
    <div class="topbar">
      <div class="chip">${icon("coin")} <span>${state.coins}</span> ${icon("plus")}</div>
      <div class="chip">${icon("heart")} <span>${state.lives}</span> <b>FULL</b></div>
      ${extra || `<button class="round" data-action="settings">${icon("gear")}</button>`}
    </div>`;
}

function setScreen(screen) {
  state.screen = screen;
  runtime.modal = null;
  if (screen === "gameplay" && state.board.length === 0) startLevel(state.level, false);
  render();
  persist();
}

function showModal(type, title, body, actions) {
  runtime.modal = { type, title, body, actions };
  render();
}

function closeModal() {
  runtime.modal = null;
  render();
}

function render() {
  const screens = {
    home: renderHome,
    levelMap: renderLevelMap,
    gameplay: renderGameplayUi,
    missions: renderMissions,
    dailyBonus: renderDailyBonus,
    spin: renderSpin,
    store: renderStore,
    settings: renderSettings
  };
  uiRoot.innerHTML = screens[state.screen]();
  if (runtime.modal) uiRoot.insertAdjacentHTML("beforeend", renderModal());
  bindUi();
}

function renderHome() {
  return `
    <section class="screen active">
      ${topbar()}
      <div class="logo-wrap">
        <span class="orb green" style="left:13%;top:-20px"></span>
        <span class="orb magenta" style="right:12%;top:-32px;animation-delay:.3s"></span>
        <span class="orb" style="left:-2%;top:38px;animation-delay:.6s"></span>
        <span class="orb red" style="right:0;top:50px;animation-delay:.1s"></span>
        <span class="orb yellow" style="right:-7%;top:106px;animation-delay:.7s"></span>
        <div class="logo">BUBBLE <span>SHOOTER</span></div>
      </div>
      <div class="home-actions">
        <button class="btn wide" data-action="missions">${icon("target")} MISSIONS</button>
        <button class="btn" data-action="dailyBonus">${icon("gift")} DAILY BONUS</button>
        <button class="btn" data-action="store">${icon("store")} STORE</button>
        <button class="btn" data-action="spin">${icon("spin")} SPIN</button>
        <button class="btn" data-action="settings">${icon("gear")} SETTINGS</button>
        <button class="btn green wide" data-action="levelMap">LEVEL MAP</button>
      </div>
    </section>`;
}

function renderLevelMap() {
  const currentLevel = Math.min(state.level, state.highest);
  const nodes = levelMapNodes().map(node => {
    const locked = node.level > state.highest;
    const cls = `${node.level === currentLevel ? "current" : ""} ${locked ? "locked" : ""}`;
    const stars = locked ? "" : `<span class="node-stars">${node.level < state.highest ? "★★★" : "☆☆☆"}</span>`;
    return `<button class="level-node ${cls}" style="left:${node.x}%;top:${node.y}%" data-level="${node.level}" ${locked ? "aria-disabled=\"true\"" : ""}>${stars}<b>${node.level}</b></button>`;
  }).join("");
  return `
    <section class="screen active">
      ${topbar(`<button class="round" data-action="settings">${icon("gear")}</button>`)}
      <div class="map-mission panel">
        <span class="tag easy">EASY</span>
        <div class="map-star">${icon("star")}</div>
        <div class="map-mission-copy"><b>Collect Stars</b><div class="progress"><span style="width:${Math.min(100, state.stars / 20 * 100)}%"></span></div><small>${state.stars}/20</small></div>
        <button class="round" data-action="dailyBonus">${icon("gift")}</button>
        <button class="map-drop" data-action="missions">⌄</button>
      </div>
      <div class="side-offers left">
        ${mapOffer("dailyBonus", "📒", "DAILY BONUS", "23:59:28")}
        ${mapOffer("store", "🏆", "STARTER PACK", "30:12:38")}
        ${mapOffer("showInfo", "SALE", "LOCKED", "")}
      </div>
      <div class="side-offers right">
        ${mapOffer("showInfo", "🏁", "LOCKED", "", true)}
        ${mapOffer("showInfo", "👑", "JOLT STREAK", "OFFLINE", true)}
      </div>
      <div class="level-path"><div class="map-road"></div>${nodes}</div>
    </section>`;
}

function levelMapNodes() {
  return [
    { level: 1, x: 42, y: 88 },
    { level: 2, x: 73, y: 82 },
    { level: 3, x: 51, y: 73 },
    { level: 4, x: 23, y: 66 },
    { level: 5, x: 61, y: 60 },
    { level: 6, x: 59, y: 48 },
    { level: 7, x: 26, y: 49 },
    { level: 8, x: 48, y: 38 },
    { level: 9, x: 73, y: 29 },
    { level: 10, x: 33, y: 29 },
    { level: 11, x: 42, y: 16 },
    { level: 12, x: 76, y: 10 }
  ];
}

function mapOffer(action, glyph, label, sub, right = false) {
  return `<button class="map-offer ${right ? "right" : ""}" data-action="${action}"><span>${glyph}</span><b>${label}</b>${sub ? `<small>${sub}</small>` : ""}</button>`;
}

function miniMission(tag, text, value, pct, gift) {
  return `
    <div class="mission-card panel" style="min-height:58px">
      <span class="tag ${tag.toLowerCase()}">${tag}</span>
      <div><b>${text}</b><div class="progress"><span style="width:${pct}%"></span></div><small>${value}</small></div>
      <button class="round" data-action="${gift}">${icon("gift")}</button>
    </div>`;
}

function renderGameplayUi() {
  return `
    <div class="game-hud active">
      <div class="game-top">
        <button class="tool" data-action="quit">${icon("menu")}</button>
        <div class="stars"><span>${icon("star")}</span><span>${icon("star")}</span><span>${icon("star")}</span></div>
        <div class="chip">${state.balls}</div>
      </div>
      <div class="side-tools">
        <button class="tool" data-action="restart">${icon("refresh")}</button>
        <button class="tool" data-action="settings">${icon("gear")}</button>
        <button class="tool" data-action="toggleSound">${icon("music")}</button>
        <button class="tool" data-action="help">${icon("help")}</button>
        <button class="tool" data-action="home">${icon("back")}</button>
      </div>
      <div class="powerbar">
        ${powerButton("fire", icon("fire"), state.combo >= 6 ? "READY" : state.combo + "/6", state.combo >= 6)}
        ${powerButton("bomb", icon("bomb"), state.bombs)}
        ${powerButton("rainbow", icon("rainbow"), state.rainbows)}
        ${powerButton("swap", "⇄", state.swaps)}
      </div>
    </div>`;
}

function powerButton(action, label, badge, ready = false) {
  return `<button class="power ${ready ? "ready" : ""}" data-action="${action}">${label}<span class="badge">${badge}</span></button>`;
}

function renderMissions() {
  const tab = state.missionTab;
  const cards = {
    EASY: `
      ${missionCard("EASY", "Collect 15 Stars", state.stars, 15, "5 coins", "star")}
      ${missionCard("EASY", "Collect 5 Coins", Math.min(5, state.coins % 8), 5, "5 coins", "coin")}`,
    MEDIUM: missionCard("MEDIUM", "Pop 1000 Red Bubbles", 420, 1000, "1 bomb + 4 coins", "red"),
    HARD: missionCard("HARD", "Pop 1600 Blue Bubbles", 675, 1600, "bomb + fire + rainbow + 5 coins", "blue")
  };
  return `
    <section class="screen active">
      <div class="screen-title"><button class="back" data-action="home">${icon("back")}</button><div class="ribbon">Missions</div><button class="close" data-action="home">${icon("close")}</button></div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:8px">
        ${["EASY","MEDIUM","HARD"].map(t => `<button class="btn ${t === tab ? "green" : t === "HARD" ? "red" : "orange"}" style="min-height:48px" data-tab="${t}">${t}</button>`).join("")}
      </div>
      <div class="mission-list">${cards[tab]}</div>
      <div class="chip" style="position:absolute;left:50%;bottom:28px;transform:translateX(-50%)">Missions do not refresh until completed</div>
    </section>`;
}

function missionCard(tier, text, current, target, reward, iconName) {
  const pct = Math.min(100, Math.round(current / target * 100));
  const glyph = iconName === "red" ? "🔴" : iconName === "blue" ? "🔵" : icon(iconName);
  return `
    <div class="mission-card panel">
      <div style="font-size:36px;text-align:center">${glyph}</div>
      <div><span class="tag ${tier.toLowerCase()}">${tier}</span><br><b>${text}</b><div class="progress"><span style="width:${pct}%"></span></div><small>${current} / ${target}</small></div>
      <div style="text-align:center"><b>REWARD</b><br>${reward}<br><button class="btn green" style="min-height:34px;font-size:12px" data-action="claimMission">CLAIM</button></div>
    </div>`;
}

function renderDailyBonus() {
  const rewards = [50, 75, 100, 150, 200, 250, 300, "bomb", "rainbow"];
  return `
    <section class="screen active">
      <div class="screen-title"><span></span><div class="ribbon">Daily Bonus</div><button class="close" data-action="home">${icon("close")}</button></div>
      <div class="panel" style="padding:12px;margin-top:8px">
        <div class="daily-grid">
          ${rewards.map((r, i) => `<div class="day panel ${i + 1 === state.dailyDay ? "active" : ""}"><b>DAY ${i + 1}</b><br><div style="font-size:28px">${typeof r === "number" ? "🪙" : r === "bomb" ? icon("bomb") : icon("rainbow")}</div><b>${typeof r === "number" ? "+" + r : "x1"}</b></div>`).join("")}
        </div>
        <p style="text-align:center;color:var(--ink);font-weight:900">NEXT BONUS IN:<br><span class="chip">23:59:59</span></p>
        <button class="btn green" style="width:100%" data-action="collectDaily">COLLECT</button>
      </div>
    </section>`;
}

function renderSpin() {
  return `
    <section class="screen active">
      <div class="screen-title"><span></span><div class="ribbon">Spin & Win</div><button class="close" data-action="home">${icon("close")}</button></div>
      <div class="pointer"></div>
      <div id="wheel" class="spin-wheel" style="transform:rotate(${state.wheelRotation || 0}deg)"></div>
      <button class="btn green" style="display:block;width:190px;margin:0 auto" data-action="doSpin">SPIN <span class="badge">1</span></button>
      <p style="text-align:center;font-weight:950;text-shadow:0 2px 3px rgba(0,0,0,.35)">SPINS LEFT: ${canFreeSpin() ? 1 : 0}</p>
    </section>`;
}

function renderStore() {
  const packs = [
    ["650 COINS", "₹59.00", 100],
    ["1200 COINS", "₹99.00", 200],
    ["2500 COINS", "₹189.00", 400],
    ["10000 COINS", "₹699.00", 1600]
  ];
  return `
    <section class="screen active">
      ${topbar(`<button class="close" data-action="home">${icon("close")}</button>`)}
      <div class="ribbon">Coin Packs</div>
      <div class="store-grid">
        ${packs.map((p, i) => `<div class="pack panel"><b style="color:#2136cc">${p[0]}</b><div class="coins-stack">🪙</div><button class="btn green" style="width:100%;min-height:42px" data-buy="${i}">${p[1]}</button></div>`).join("")}
      </div>
    </section>`;
}

function renderSettings() {
  return `
    <section class="screen active">
      <div class="screen-title"><span></span><div class="ribbon">Settings</div><button class="close" data-action="home">${icon("close")}</button></div>
      <div class="panel settings-list">
        ${settingRow("music", icon("music"), "MUSIC", state.music)}
        ${settingRow("sound", icon("sound"), "SOUND", state.sound)}
        ${settingRow("vibration", icon("vib"), "VIBRATION", state.vibration)}
        ${settingRow("targetedAds", icon("ad"), "TARGETED ADS", state.targetedAds)}
        <button class="btn red" style="min-height:44px" data-action="deleteAccount">🗑 DELETE ACCOUNT</button>
        <div style="text-align:center;color:var(--ink);font-size:12px;font-weight:900">SELECT GAME MODE:</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:7px">${["CLASSIC","LEVELS","ARCADE"].map(m => `<button class="btn green" style="min-height:42px;font-size:12px;filter:${state.gameMode === m ? "saturate(1.5)" : "grayscale(.4)"}" data-mode="${m}">${m}</button>`).join("")}</div>
      </div>
    </section>`;
}

function settingRow(keyName, glyph, label, enabled) {
  return `<div class="setting-row"><span style="font-size:25px">${glyph}</span><span>${label}</span><button class="toggle ${enabled ? "" : "off"}" data-toggle="${keyName}" aria-label="${label}"></button></div>`;
}

function renderModal() {
  const buttons = runtime.modal.actions.map(a => `<button class="btn ${a.className || ""}" data-modal-action="${a.id}">${a.label}</button>`).join("");
  return `<div class="modal active"><div class="dialog panel"><button class="close" style="position:absolute;right:-13px;top:-17px" data-action="closeModal">${icon("close")}</button><h2>${runtime.modal.title}</h2><p>${runtime.modal.body}</p><div class="dialog-actions">${buttons}</div></div></div>`;
}

function bindUi() {
  uiRoot.querySelectorAll("[data-action]").forEach(el => el.addEventListener("click", () => handleAction(el.dataset.action)));
  uiRoot.querySelectorAll("[data-level]").forEach(el => el.addEventListener("click", () => {
    const level = Number(el.dataset.level);
    if (level <= state.highest) {
      state.level = level;
      startLevel(level);
      setScreen("gameplay");
    } else {
      showModal("locked", "LEVEL LOCKED", `Complete level ${state.highest} to unlock level ${level}.`, [{ id: "ok", label: "OK", className: "green", run: closeModal }]);
    }
  }));
  uiRoot.querySelectorAll("[data-tab]").forEach(el => el.addEventListener("click", () => {
    state.missionTab = el.dataset.tab;
    render();
  }));
  uiRoot.querySelectorAll("[data-toggle]").forEach(el => el.addEventListener("click", () => {
    state[el.dataset.toggle] = !state[el.dataset.toggle];
    render();
    persist();
  }));
  uiRoot.querySelectorAll("[data-mode]").forEach(el => el.addEventListener("click", () => {
    state.gameMode = el.dataset.mode;
    render();
    persist();
  }));
  uiRoot.querySelectorAll("[data-buy]").forEach(el => el.addEventListener("click", () => buyPack(Number(el.dataset.buy))));
  uiRoot.querySelectorAll("[data-modal-action]").forEach(el => el.addEventListener("click", () => {
    const action = runtime.modal.actions.find(a => a.id === el.dataset.modalAction);
    if (action) action.run();
  }));
}

function handleAction(action) {
  const nav = {
    home: () => setScreen("levelMap"),
    levelMap: () => setScreen("levelMap"),
    play: () => { startLevel(Math.min(state.level, state.highest)); setScreen("gameplay"); },
    missions: () => setScreen("missions"),
    dailyBonus: () => setScreen("dailyBonus"),
    spin: () => setScreen("spin"),
    store: () => setScreen("store"),
    settings: () => setScreen("settings")
  };
  if (nav[action]) return nav[action]();
  if (action === "restart") return startLevel(state.level);
  if (action === "quit") return quitPopup();
  if (action === "help") return showModal("help", "How To Play", "Aim anywhere above the shooter. Match 3 same color bubbles. Bounce from walls and use power-ups carefully.", [{ id: "ok", label: "OK", className: "green", run: closeModal }]);
  if (action === "toggleSound") { state.sound = !state.sound; render(); persist(); return; }
  if (action === "fire") { if (state.combo >= 6 || state.fireballs > 0) { if (state.combo < 6) state.fireballs--; runtime.useFire = true; render(); } return; }
  if (action === "bomb") { if (state.bombs > 0) { state.bombs--; runtime.useBomb = true; render(); persist(); } return; }
  if (action === "rainbow") { if (state.rainbows > 0) { state.rainbows--; state.current = 99; render(); persist(); } return; }
  if (action === "swap") { if (state.swaps > 0) { state.swaps--; [state.current, state.next] = [state.next, state.current]; render(); persist(); } return; }
  if (action === "rewardAd") return rewardAd();
  if (action === "collectDaily") return collectDaily();
  if (action === "doSpin") return doSpin();
  if (action === "claimMission") return claimMission();
  if (action === "deleteAccount") return confirmDelete();
  if (action === "closeModal") return closeModal();
  if (action === "showInfo") return showModal("info", "Jolt Streak", "Streak rewards unlock online in the full Unity build.", [{ id: "ok", label: "OK", className: "green", run: closeModal }]);
}

function startLevel(level, doRender = true) {
  state.level = Math.max(1, Math.min(6000, level));
  state.balls = ballsForLevel(state.level);
  state.combo = 0;
  runtime.useFire = false;
  runtime.useBomb = false;
  state.board = [];
  state.looseBubbles = [];
  const rows = Math.min(13, Math.max(5, 5 + Math.floor(state.level / 120)));
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < 10; col++) {
      const fill = row < 2 || hash(state.level * 4099 + row * 193 + col * 71) % 1000 < 930 - row * 18;
      if (fill) state.board.push({ row, col, color: hash(state.level * 997 + row * 113 + col * 37) % colorCount() });
    }
  }
  state.current = hash(state.level * 3) % colorCount();
  state.next = hash(state.level * 5 + 1) % colorCount();
  if (doRender) render();
  persist();
}

function boardAt(row, col) {
  return state.board.find(b => b.row === row && b.col === col);
}

function removeAt(row, col) {
  const index = state.board.findIndex(b => b.row === row && b.col === col);
  if (index >= 0) state.board.splice(index, 1);
}

function neighbors(row, col) {
  const even = [[-1,-1],[-1,0],[0,-1],[0,1],[1,-1],[1,0]];
  const odd = [[-1,0],[-1,1],[0,-1],[0,1],[1,0],[1,1]];
  return (row % 2 ? odd : even).map(([dr, dc]) => ({ row: row + dr, col: col + dc }));
}

function resize() {
  const rect = phone.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.floor(rect.width * ratio);
  canvas.height = Math.floor(rect.height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  runtime.width = rect.width;
  runtime.height = rect.height;
  runtime.radius = Math.max(13, Math.min(22, rect.width / 23));
  runtime.topPad = state.screen === "gameplay" ? 58 : 88;
  runtime.shooter = { x: rect.width / 2, y: rect.height - 102 };
}

function cellToWorld(row, col) {
  const r = runtime.radius;
  return {
    x: r * 1.4 + col * r * 1.78 + (row % 2 ? r * .88 : 0),
    y: runtime.topPad + row * r * 1.68
  };
}

function worldToCell(x, y) {
  const r = runtime.radius;
  const row = Math.max(0, Math.round((y - runtime.topPad) / (r * 1.68)));
  const col = Math.max(0, Math.min(9, Math.round((x - r * 1.4 - (row % 2 ? r * .88 : 0)) / (r * 1.78))));
  if (!boardAt(row, col)) {
    return { row, col };
  }

  let best = { row, col };
  let bestDistance = Infinity;
  for (let rr = Math.max(0, row - 2); rr <= row + 2; rr++) {
    for (let cc = 0; cc < 10; cc++) {
      if (boardAt(rr, cc)) continue;
      const p = cellToWorld(rr, cc);
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < bestDistance) {
        bestDistance = d;
        best = { row: rr, col: cc };
      }
    }
  }
  return best;
}

function allBubblePositions() {
  const bubbles = state.board.map(b => {
    const p = cellToWorld(b.row, b.col);
    return { ...p, color: b.color, row: b.row, col: b.col, grid: true };
  });
  (state.looseBubbles || []).forEach(b => bubbles.push({ ...b, grid: false }));
  return bubbles;
}

function makeShotVector(x, y, speed = 1) {
  let dx = x - runtime.shooter.x;
  let dy = y - runtime.shooter.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  dx /= length;
  dy /= length;
  if (dy > -0.12) {
    dy = -0.12;
    const sign = dx < 0 ? -1 : 1;
    dx = sign * Math.sqrt(Math.max(0.01, 1 - dy * dy));
  }
  return { vx: dx * speed, vy: dy * speed };
}

function traceAimPath(targetX, targetY, step = 9, maxSteps = 180) {
  const vector = makeShotVector(targetX, targetY, step);
  const points = [];
  let x = runtime.shooter.x;
  let y = runtime.shooter.y - runtime.radius * 1.1;
  let vx = vector.vx;
  const vy = vector.vy;
  points.push({ x, y });

  for (let i = 0; i < maxSteps; i++) {
    x += vx;
    y += vy;
    if (x < runtime.radius || x > runtime.width - runtime.radius) {
      x = Math.max(runtime.radius, Math.min(runtime.width - runtime.radius, x));
      vx *= -1;
    }

    const hitBubble = allBubblePositions().find(b => Math.hypot(b.x - x, b.y - y) <= runtime.radius * 1.72);
    if (hitBubble) {
      points.push({ x, y, hit: "bubble" });
      return { points, hit: "bubble", x, y, bubble: hitBubble };
    }

    if (y <= runtime.topPad + runtime.radius) {
      y = runtime.topPad + runtime.radius;
      points.push({ x, y, hit: "top" });
      return { points, hit: "top", x, y };
    }

    points.push({ x, y });
  }

  return { points, hit: "range", x, y };
}

function shoot(x, y) {
  if (state.screen !== "gameplay" || runtime.modal || runtime.shot || state.balls <= 0 || y > runtime.shooter.y - 38) return;
  ensureAudio();
  const vector = makeShotVector(x, y, 8.6);
  runtime.shot = {
    x: runtime.shooter.x,
    y: runtime.shooter.y,
    vx: vector.vx,
    vy: vector.vy,
    color: state.current,
    fire: runtime.useFire,
    bomb: runtime.useBomb,
    hit: null
  };
  runtime.aim = null;
  state.balls--;
  render();
}

function resolveShot() {
  const shot = runtime.shot;
  runtime.shot = null;
  if (shot.hit === "top") {
    state.looseBubbles = state.looseBubbles || [];
    state.looseBubbles.push({ x: shot.x, y: shot.y, color: shot.color });
    state.combo = 0;
    advanceAfterShot();
    return;
  }

  const slot = worldToCell(shot.x, shot.y);
  state.board.push({ row: slot.row, col: slot.col, color: shot.color });
  let blasted = 0;
  if (shot.bomb) {
    [{ row: slot.row, col: slot.col }, ...neighbors(slot.row, slot.col)].forEach(p => {
      if (boardAt(p.row, p.col)) blasted++;
      removeAt(p.row, p.col);
    });
    state.combo++;
  } else if (shot.fire) {
    [{ row: slot.row, col: slot.col }, ...neighbors(slot.row, slot.col)].forEach(p => {
      if (boardAt(p.row, p.col)) blasted++;
      removeAt(p.row, p.col);
    });
    state.combo = 0;
  } else {
    const group = findGroup(slot.row, slot.col, shot.color);
    if (group.length >= 3) {
      blasted += group.length;
      group.forEach(p => removeAt(p.row, p.col));
      state.combo++;
    } else {
      state.combo = 0;
    }
  }
  blasted += dropUnsupported();
  if (blasted > 0) playBlastSound(Math.min(1.4, 0.7 + blasted * 0.04));
  advanceAfterShot();
}

function advanceAfterShot() {
  state.current = state.next;
  state.next = hash(state.level * 11 + state.balls * 17) % colorCount();
  runtime.useFire = false;
  runtime.useBomb = false;
  render();
  checkEnd();
  persist();
}

function findGroup(row, col, color) {
  const found = [];
  const seen = new Set([`${row},${col}`]);
  const queue = [{ row, col }];
  while (queue.length) {
    const cur = queue.shift();
    const bubble = boardAt(cur.row, cur.col);
    if (!bubble || (bubble.color !== color && color !== 99)) continue;
    found.push(cur);
    neighbors(cur.row, cur.col).forEach(n => {
      const id = `${n.row},${n.col}`;
      if (boardAt(n.row, n.col) && !seen.has(id)) {
        seen.add(id);
        queue.push(n);
      }
    });
  }
  return found;
}

function dropUnsupported() {
  const supported = new Set();
  const queue = [];
  state.board.forEach(b => {
    if (b.row === 0) {
      const id = `${b.row},${b.col}`;
      supported.add(id);
      queue.push(b);
    }
  });
  while (queue.length) {
    const cur = queue.shift();
    neighbors(cur.row, cur.col).forEach(n => {
      const b = boardAt(n.row, n.col);
      const id = `${n.row},${n.col}`;
      if (b && !supported.has(id)) {
        supported.add(id);
        queue.push(b);
      }
    });
  }
  const before = state.board.length;
  state.board = state.board.filter(b => supported.has(`${b.row},${b.col}`));
  return before - state.board.length;
}

function ensureAudio() {
  if (runtime.audio) return runtime.audio;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  runtime.audio = new AudioContextClass();
  return runtime.audio;
}

function playBlastSound(intensity = 1) {
  const audio = ensureAudio();
  if (!audio || !state.sound) return;
  if (audio.state === "suspended") audio.resume();
  const now = audio.currentTime;
  const noiseLength = Math.floor(audio.sampleRate * 0.12);
  const buffer = audio.createBuffer(1, noiseLength, audio.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let i = 0; i < noiseLength; i++) {
    const fade = 1 - i / noiseLength;
    samples[i] = (Math.random() * 2 - 1) * fade * 0.42 * intensity;
  }
  const noise = audio.createBufferSource();
  noise.buffer = buffer;
  const noiseGain = audio.createGain();
  noiseGain.gain.setValueAtTime(0.0001, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.32 * intensity, now + 0.01);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
  noise.connect(noiseGain).connect(audio.destination);
  noise.start(now);
  noise.stop(now + 0.15);

  const pop = audio.createOscillator();
  const popGain = audio.createGain();
  pop.type = "triangle";
  pop.frequency.setValueAtTime(520, now);
  pop.frequency.exponentialRampToValueAtTime(180, now + 0.11);
  popGain.gain.setValueAtTime(0.0001, now);
  popGain.gain.exponentialRampToValueAtTime(0.18 * intensity, now + 0.01);
  popGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
  pop.connect(popGain).connect(audio.destination);
  pop.start(now);
  pop.stop(now + 0.14);
}

function checkEnd() {
  if (state.board.length === 0 && (!state.looseBubbles || state.looseBubbles.length === 0)) {
    const completedLevel = state.level;
    const unlockedLevel = Math.min(6000, completedLevel + 1);
    state.highest = Math.max(state.highest, unlockedLevel);
    state.level = unlockedLevel;
    state.stars += 3;
    showModal("win", "LEVEL CLEARED!", `You beat level ${completedLevel}. Level ${unlockedLevel} is now unlocked.`, [
      { id: "map", label: "MAP", run: () => setScreen("levelMap") },
      { id: "next", label: "NEXT", className: "green", run: () => { startLevel(state.level); setScreen("gameplay"); } }
    ]);
  } else if (state.balls <= 0) {
    showModal("lose", "OUT OF BALLS", "Choose 10 coins or a rewarded ad placeholder to get 5 more balls.", [
      { id: "retry", label: "RETRY", run: () => { closeModal(); startLevel(state.level); } },
      { id: "balls", label: "+5 BALLS", className: "green", run: addFiveBalls }
    ]);
  }
}

function addFiveBalls() {
  if (state.coins >= 10) state.coins -= 10;
  state.balls += 5;
  closeModal();
  render();
  persist();
}

function quitPopup() {
  showModal("quit", "QUIT GAME?", "You will lose the current attempt.", [
    { id: "restart", label: "↻", className: "green", run: () => { closeModal(); startLevel(state.level); } },
    { id: "exit", label: "EXIT", className: "red", run: () => setScreen("levelMap") }
  ]);
}

function rewardAd() {
  const roll = hash(Date.now()) % 5;
  if (roll === 4) state.balls += 5;
  else if (roll === 0) state.fireballs++;
  else if (roll === 1) state.bombs++;
  else if (roll === 2) state.rainbows++;
  else state.swaps++;
  showModal("reward", "REWARD!", roll === 4 ? "You received 5 balls." : "You received one power-up.", [{ id: "ok", label: "OK", className: "green", run: closeModal }]);
  persist();
}

function collectDaily() {
  const today = new Date().toDateString();
  if (state.lastDaily === today) {
    return showModal("daily", "ALREADY CLAIMED", "Come back tomorrow for the next daily bonus.", [{ id: "ok", label: "OK", className: "green", run: closeModal }]);
  }
  const rewards = [50, 75, 100, 150, 200, 250, 300, "bomb", "rainbow"];
  const reward = rewards[state.dailyDay - 1];
  if (typeof reward === "number") state.coins += reward;
  else if (reward === "bomb") state.bombs++;
  else state.rainbows++;
  state.dailyDay = state.dailyDay >= 9 ? 1 : state.dailyDay + 1;
  state.lastDaily = today;
  showModal("daily", "COLLECTED!", `Daily reward added: ${typeof reward === "number" ? reward + " coins" : reward}.`, [{ id: "ok", label: "OK", className: "green", run: () => setScreen("levelMap") }]);
  persist();
}

function canFreeSpin() {
  if (!state.lastSpin) return true;
  return Date.now() - new Date(state.lastSpin).getTime() >= 24 * 60 * 60 * 1000;
}

function doSpin() {
  if (runtime.spinning) return;
  if (!canFreeSpin() && state.coins < 5) {
    return showModal("spin", "NO SPINS", "Free spin is on cooldown and extra spin costs 5 coins.", [{ id: "ok", label: "OK", className: "green", run: closeModal }]);
  }
  if (!canFreeSpin()) state.coins -= 5;
  state.lastSpin = new Date().toISOString();
  runtime.spinning = true;
  state.wheelRotation = (state.wheelRotation || 0) + 900 + hash(Date.now()) % 360;
  render();
  setTimeout(() => {
    runtime.spinning = false;
    const roll = hash(Date.now()) % 100;
    let label = "";
    if (roll < 62) { const amount = 2 + roll % 3; state.coins += amount; label = `${amount} coins`; }
    else if (roll < 68) { state.coins += 10; label = "10 coins"; }
    else if (roll < 76) { state.bombs++; label = "1 bomb"; }
    else if (roll < 84) { state.fireballs++; label = "1 fireball"; }
    else if (roll < 92) { state.rainbows++; label = "1 rainbow"; }
    else { state.swaps++; label = "1 swap"; }
    showModal("spin", "YOU WON!", label, [{ id: "ok", label: "OK", className: "green", run: closeModal }]);
    persist();
  }, 2450);
}

function buyPack(index) {
  const grants = [100, 200, 400, 1600];
  state.coins += grants[index];
  if (index > 0) {
    state.bombs += index + 1;
    state.rainbows += index + 1;
    state.swaps += index + 1;
  }
  showModal("store", "PURCHASE STUB", `Added ${grants[index]} coins. Real purchases connect in Unity IAP.`, [{ id: "ok", label: "OK", className: "green", run: closeModal }]);
  persist();
}

function claimMission() {
  if (state.missionTab === "EASY") state.coins += 5;
  if (state.missionTab === "MEDIUM") { state.bombs++; state.coins += 4; }
  if (state.missionTab === "HARD") { state.bombs++; state.fireballs++; state.rainbows++; state.coins += 5; }
  showModal("mission", "REWARD CLAIMED", "Mission reward added to inventory.", [{ id: "ok", label: "OK", className: "green", run: closeModal }]);
  persist();
}

function confirmDelete() {
  showModal("delete", "DELETE SAVE?", "This resets browser preview progress only.", [
    { id: "cancel", label: "CANCEL", run: closeModal },
    { id: "delete", label: "DELETE", className: "red", run: () => { localStorage.removeItem(saveKey); Object.assign(state, { ...defaultState }); setScreen("levelMap"); } }
  ]);
}

function drawBubble(x, y, color, scale = 1) {
  const r = runtime.radius * scale;
  const gradient = ctx.createRadialGradient(x - r * .35, y - r * .45, r * .1, x, y, r);
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(.22, bubbleColors[color] || "#fff");
  gradient.addColorStop(.68, bubbleColors[color] || "#fff");
  gradient.addColorStop(1, "#4f126e");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255,255,255,.58)";
  ctx.stroke();
  ctx.globalAlpha = .35;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(x - r * .32, y - r * .34, r * .2, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawMenuBubbles() {
  const t = Date.now() / 900;
  for (let i = 0; i < 12; i++) {
    const x = (hash(i * 77) % runtime.width) + Math.sin(t + i) * 8;
    const y = (hash(i * 331) % runtime.height) + Math.cos(t * .8 + i) * 8;
    ctx.globalAlpha = .12;
    drawBubble(x, y, i % bubbleColors.length, .35 + (i % 3) * .12);
  }
  ctx.globalAlpha = 1;
}

function drawGame() {
  state.board.forEach(b => {
    const p = cellToWorld(b.row, b.col);
    drawBubble(p.x, p.y, b.color);
    if (b.color % 3 === 0) {
      ctx.fillStyle = "rgba(255,255,255,.45)";
      ctx.font = `${runtime.radius}px Arial`;
      ctx.textAlign = "center";
      ctx.fillText("✦", p.x, p.y + runtime.radius * .35);
    }
  });
  (state.looseBubbles || []).forEach(b => drawBubble(b.x, b.y, b.color));
  ctx.strokeStyle = "rgba(255,255,255,.48)";
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(runtime.shooter.x - 34, runtime.shooter.y + 28);
  ctx.lineTo(runtime.shooter.x, runtime.shooter.y - 14);
  ctx.lineTo(runtime.shooter.x + 34, runtime.shooter.y + 28);
  ctx.stroke();
  ctx.fillStyle = "white";
  ctx.font = "900 22px Arial";
  ctx.textAlign = "center";
  ctx.fillText(state.balls, runtime.shooter.x - 50, runtime.shooter.y + 7);
  drawAimGuide();
  drawBubble(runtime.shooter.x, runtime.shooter.y, state.current, 1.08);
  drawBubble(runtime.shooter.x + 54, runtime.shooter.y + 8, state.next, .72);
  if (runtime.shot) drawBubble(runtime.shot.x, runtime.shot.y, runtime.shot.color);
}

function drawAimGuide() {
  if (!runtime.aim || runtime.shot || runtime.modal) return;
  const path = traceAimPath(runtime.aim.x, runtime.aim.y, 9, 180);
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,.82)";
  ctx.strokeStyle = "rgba(35,68,168,.65)";
  path.points.forEach((p, index) => {
    if (index % 2 === 0) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(2.2, runtime.radius * .13), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  });
  ctx.restore();
}

function tick() {
  resize();
  ctx.clearRect(0, 0, runtime.width, runtime.height);
  if (state.screen !== "gameplay") drawMenuBubbles();
  if (state.screen === "gameplay") {
    if (runtime.shot) {
      runtime.shot.x += runtime.shot.vx;
      runtime.shot.y += runtime.shot.vy;
      if (runtime.shot.x < runtime.radius || runtime.shot.x > runtime.width - runtime.radius) {
        runtime.shot.x = Math.max(runtime.radius, Math.min(runtime.width - runtime.radius, runtime.shot.x));
        runtime.shot.vx *= -1;
      }
      let hit = false;
      if (runtime.shot.y <= runtime.topPad + runtime.radius) {
        runtime.shot.y = runtime.topPad + runtime.radius;
        runtime.shot.hit = "top";
        hit = true;
      }
      if (!hit) {
        for (const b of allBubblePositions()) {
          if (Math.hypot(b.x - runtime.shot.x, b.y - runtime.shot.y) < runtime.radius * 1.72) {
            runtime.shot.hit = "bubble";
            hit = true;
            break;
          }
        }
      }
      if (hit) resolveShot();
    }
    drawGame();
  }
  requestAnimationFrame(tick);
}

function pointerPoint(event) {
  const rect = phone.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

canvas.addEventListener("pointerdown", event => {
  const point = pointerPoint(event);
  if (state.screen === "gameplay" && !runtime.modal && point.y < runtime.shooter.y - 38) {
    runtime.aim = point;
  }
});
canvas.addEventListener("pointermove", event => {
  const point = pointerPoint(event);
  if (state.screen === "gameplay" && !runtime.modal && point.y < runtime.shooter.y - 20) {
    runtime.aim = point;
  }
});
canvas.addEventListener("pointerleave", () => {
  runtime.aim = null;
});
canvas.addEventListener("pointerup", event => {
  const point = pointerPoint(event);
  shoot(point.x, point.y);
});
window.addEventListener("resize", resize);
state.screen = "levelMap";
state.level = Math.min(state.level, state.highest);
if (!state.board.length) startLevel(state.level, false);
state.screen = "levelMap";
render();
tick();
