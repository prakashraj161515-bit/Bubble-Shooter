const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let width, height;
const BUBBLE_RADIUS = 20; 
const COLUMNS = 9;
const ROWS = 20;

// Vibrant Colors
const COLORS = [
    '#FF3D71', '#3366FF', '#00D68F', '#FFAA00', '#A29BFE', '#FF708D'
];

// GAME STATE
let state = {
    coins: 100,
    highestLevel: 1,
    currentLevel: 1,
    score: 0,
    powerups: { BOMB: 2, FIREBALL: 1, RAINBOW: 3 },
    stats: { totalPops: 0, totalShots: 0, totalCoins: 100 },
    settings: { sound: true, music: true, vibration: true },
    dailyChallenge: { id: new Date().toDateString(), target: 30, current: 0, completed: false },
    spinsLeft: 3,
    lastSpinDate: ''
};

// RUNTIME
let grid = [];
let ballsRemaining = 60;
let activeBall = null;
let isShooting = false;
let mouseX = 0, mouseY = 0;
let activePowerup = null;
let currentGoal = { color: COLORS[4], target: 6, current: 0 };

// =====================
//  INIT
// =====================
function init() {
    loadState();
    updateUI();
    generateMap();
    generateLevelsGrid();
    drawWheel();

    showScreen('splash-screen');
    setTimeout(() => showScreen('main-menu'), 2000);

    // Input
    canvas.addEventListener('mousemove', e => {
        const r = canvas.getBoundingClientRect();
        mouseX = e.clientX - r.left;
        mouseY = e.clientY - r.top;
    });
    canvas.addEventListener('mouseup', () => { if (!isShooting && ballsRemaining > 0 && !activeBall) shoot(); });
    canvas.addEventListener('touchstart', e => {
        const r = canvas.getBoundingClientRect();
        mouseX = e.touches[0].clientX - r.left;
        mouseY = e.touches[0].clientY - r.top;
    }, {passive: false});
    canvas.addEventListener('touchend', () => { if (!isShooting && ballsRemaining > 0 && !activeBall) shoot(); }, {passive: false});

    requestAnimationFrame(gameLoop);
}

// =====================
//  PERSISTENCE
// =====================
function loadState() {
    const saved = localStorage.getItem('bubble_shooter_state_v6');
    if (saved) state = Object.assign(state, JSON.parse(saved));
    if (state.lastSpinDate !== new Date().toDateString()) {
        state.spinsLeft = 3;
        state.lastSpinDate = new Date().toDateString();
    }
    if (state.dailyChallenge.id !== new Date().toDateString()) {
        state.dailyChallenge = { id: new Date().toDateString(), target: 30, current: 0, completed: false };
    }
}
function saveState() {
    localStorage.setItem('bubble_shooter_state_v6', JSON.stringify(state));
}

// =====================
//  SCREEN NAVIGATION
// =====================
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => {
        if (s.id !== id) {
            s.style.opacity = '0';
            s.style.transform = 'scale(0.95)';
            setTimeout(() => { if (s.style.opacity === '0') s.classList.add('hidden'); }, 350);
        }
    });
    const target = document.getElementById(id);
    target.classList.remove('hidden');
    setTimeout(() => { target.style.opacity = '1'; target.style.transform = 'scale(1)'; }, 10);

    if (id === 'home-screen') { generateMap(); setTimeout(drawMapPath, 100); }
    if (id === 'achievements-screen') updateAchievements();
    if (id === 'spin-screen') updateSpinUI();
}

function openPopup(id) { document.getElementById(id).classList.remove('hidden'); }
function closePopup(id) { document.getElementById(id).classList.add('hidden'); }

// =====================
//  UI UPDATES
// =====================
function updateUI() {
    document.querySelectorAll('#header-coins').forEach(el => el.innerText = state.coins);
    if (document.getElementById('bomb-count')) document.getElementById('bomb-count').innerText = state.powerups.BOMB;
    if (document.getElementById('rainbow-count')) document.getElementById('rainbow-count').innerText = state.powerups.RAINBOW;
    if (document.getElementById('balls-text')) document.getElementById('balls-text').innerText = ballsRemaining;
    if (document.getElementById('current-score')) document.getElementById('current-score').innerText = state.score.toLocaleString();
    if (document.getElementById('goal-text')) document.getElementById('goal-text').innerText = `${currentGoal.current}/${currentGoal.target}`;
}

function updateAchievements() {
    const setProg = (fillId, textId, val, max) => {
        const pct = Math.min((val / max) * 100, 100);
        if (document.getElementById(fillId)) document.getElementById(fillId).style.width = pct + '%';
        if (document.getElementById(textId)) document.getElementById(textId).innerText = `${val}/${max}`;
    };
    setProg('ach-pop-fill', 'ach-pop-text', state.stats.totalPops, 100);
    setProg('ach-shot-fill', 'ach-shot-text', state.stats.totalShots, 50);
    setProg('ach-coin-fill', 'ach-coin-text', state.stats.totalCoins, 1000);
    setProg('ach-level-fill', 'ach-level-text', Math.max(0, state.highestLevel - 1), 10);
}

function updateSpinUI() {
    const btn = document.getElementById('spin-btn');
    const txt = document.getElementById('spins-left-text');
    if (btn) btn.disabled = state.spinsLeft <= 0;
    if (txt) txt.innerText = `You have ${state.spinsLeft} spin${state.spinsLeft !== 1 ? 's' : ''} left today`;
}

// =====================
//  SPIN WHEEL
// =====================
const WHEEL_SEGMENTS = [
    { label: '100', color: '#FF3D71', reward: { type: 'coins', val: 100 } },
    { label: '500', color: '#FFAA00', reward: { type: 'coins', val: 500 } },
    { label: '💣', color: '#A29BFE', reward: { type: 'BOMB', val: 2 } },
    { label: '20',  color: '#00D68F', reward: { type: 'coins', val: 20 } },
    { label: '🌈',  color: '#3366FF', reward: { type: 'RAINBOW', val: 2 } },
    { label: '80',  color: '#FF708D', reward: { type: 'coins', val: 80 } },
    { label: '200', color: '#FFAA00', reward: { type: 'coins', val: 200 } },
    { label: '50',  color: '#00D68F', reward: { type: 'coins', val: 50 } },
];

let wheelAngle = 0;
let isSpinning = false;

function drawWheel() {
    const wCanvas = document.getElementById('wheelCanvas');
    if (!wCanvas) return;
    const wCtx = wCanvas.getContext('2d');
    const cx = 150, cy = 150, r = 140;
    const arc = (Math.PI * 2) / WHEEL_SEGMENTS.length;

    wCtx.clearRect(0, 0, 300, 300);
    WHEEL_SEGMENTS.forEach((seg, i) => {
        const start = arc * i + wheelAngle;
        const end = start + arc;
        wCtx.beginPath();
        wCtx.moveTo(cx, cy);
        wCtx.arc(cx, cy, r, start, end);
        wCtx.closePath();
        wCtx.fillStyle = seg.color;
        wCtx.fill();
        wCtx.strokeStyle = 'white';
        wCtx.lineWidth = 3;
        wCtx.stroke();

        // Label
        wCtx.save();
        wCtx.translate(cx, cy);
        wCtx.rotate(start + arc / 2);
        wCtx.textAlign = 'right';
        wCtx.fillStyle = 'white';
        wCtx.font = 'bold 18px Inter, sans-serif';
        wCtx.fillText(seg.label, r - 20, 6);
        wCtx.restore();
    });
    // Center circle
    wCtx.beginPath();
    wCtx.arc(cx, cy, 30, 0, Math.PI * 2);
    wCtx.fillStyle = 'white';
    wCtx.fill();
    wCtx.fillStyle = '#6c5ce7';
    wCtx.font = 'bold 20px sans-serif';
    wCtx.textAlign = 'center';
    wCtx.fillText('🎡', cx, cy + 7);
}

function spinWheel() {
    if (isSpinning || state.spinsLeft <= 0) return;
    isSpinning = true;
    state.spinsLeft--;
    saveState(); updateSpinUI();

    const totalRotation = Math.PI * 2 * (5 + Math.random() * 5);
    const duration = 4000;
    const start = performance.now();
    const startAngle = wheelAngle;
    const winSegmentIdx = Math.floor(Math.random() * WHEEL_SEGMENTS.length);

    function animate(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 4);
        wheelAngle = startAngle + totalRotation * ease;
        drawWheel();
        if (progress < 1) { requestAnimationFrame(animate); }
        else {
            isSpinning = false;
            const reward = WHEEL_SEGMENTS[winSegmentIdx].reward;
            applyWheelReward(reward);
        }
    }
    requestAnimationFrame(animate);
}

function applyWheelReward(reward) {
    if (reward.type === 'coins') {
        state.coins += reward.val;
        state.stats.totalCoins += reward.val;
        alert(`🪙 You won ${reward.val} coins!`);
    } else {
        state.powerups[reward.type] = (state.powerups[reward.type] || 0) + reward.val;
        alert(`You won ${reward.val}x ${reward.type}!`);
    }
    saveState(); updateUI();
}

// =====================
//  MAP GENERATION
// =====================
function generateMap() {
    const container = document.getElementById('map-path-container');
    if (!container) return;
    container.innerHTML = '';
    for (let i = 20; i >= 1; i--) {
        const node = document.createElement('div');
        node.className = 'level-node';
        const row = Math.floor((i - 1) / 3);
        const col = (i - 1) % 3;
        const xOffset = (row % 2 === 0) ? (col - 1) * 80 : (1 - col) * 80;
        node.style.transform = `translateX(${xOffset}px)`;
        if (i > state.highestLevel) {
            node.classList.add('locked');
            node.innerHTML = `🔒`;
        } else {
            if (i === state.highestLevel) node.classList.add('active');
            node.innerHTML = `<span style="font-size:1.1rem">${i}</span><span style="font-size:0.55rem;color:#f1c40f;">★★★</span>`;
            node.onclick = () => startGame(i);
        }
        container.appendChild(node);
    }
}

function generateLevelsGrid() {
    const grid = document.getElementById('levels-grid');
    if (!grid) return;
    grid.innerHTML = '';
    for (let i = 1; i <= 20; i++) {
        const btn = document.createElement('button');
        btn.className = 'level-node';
        btn.style.fontSize = '1rem';
        if (i > state.highestLevel) { btn.classList.add('locked'); btn.innerText = '🔒'; }
        else { btn.innerText = i; btn.onclick = () => startGame(i); }
        grid.appendChild(btn);
    }
}

function drawMapPath() {
    const pathCanvas = document.getElementById('mapPathCanvas');
    const scrollView = document.getElementById('map-scroll-view');
    if (!pathCanvas || !scrollView) return;
    const nodes = document.querySelectorAll('#map-path-container .level-node');
    if (!nodes.length) return;
    
    pathCanvas.width = scrollView.offsetWidth;
    pathCanvas.height = scrollView.scrollHeight;
    const pCtx = pathCanvas.getContext('2d');
    const positions = [];

    nodes.forEach(n => {
        const rect = n.getBoundingClientRect();
        const containerRect = scrollView.getBoundingClientRect();
        positions.push({
            x: rect.left - containerRect.left + rect.width / 2,
            y: rect.top - containerRect.top + scrollView.scrollTop + rect.height / 2
        });
    });

    pCtx.strokeStyle = 'rgba(139, 90, 43, 0.5)';
    pCtx.lineWidth = 10;
    pCtx.lineCap = 'round';
    pCtx.lineJoin = 'round';
    pCtx.setLineDash([15, 10]);
    pCtx.beginPath();
    if (positions[0]) pCtx.moveTo(positions[0].x, positions[0].y);
    positions.forEach((p, i) => { if (i > 0) pCtx.lineTo(p.x, p.y); });
    pCtx.stroke();
}

// =====================
//  GAMEPLAY
// =====================
function startGame(level) {
    state.currentLevel = level;
    ballsRemaining = Math.max(30, 60 - Math.floor(level / 5) * 2);
    currentGoal.color = COLORS[Math.floor(Math.random() * COLORS.length)];
    currentGoal.target = 5 + Math.floor(level / 2);
    currentGoal.current = 0;
    generateLevel(level);
    prepareNext();
    showScreen('gameplay-ui');
    resize();
    updateUI();
}

function generateLevel(level) {
    grid = [];
    const maxRows = 8 + Math.floor(level / 5);
    for (let y = 0; y < maxRows; y++) {
        grid[y] = [];
        const indent = Math.floor(y / 2);
        const cols = Math.max(2, (y % 2 === 0 ? COLUMNS : COLUMNS - 1) - indent);
        for (let x = 0; x < cols; x++) {
            grid[y][x + Math.floor(indent / 2)] = {
                type: 'NORMAL',
                color: COLORS[Math.floor(Math.random() * COLORS.length)],
                hits: 1
            };
        }
    }
}

function resize() {
    if (!canvas.parentElement) return;
    width = canvas.parentElement.clientWidth;
    height = canvas.parentElement.clientHeight;
    canvas.width = width;
    canvas.height = height;
}

function gameLoop() {
    if (canvas.width > 0) {
        ctx.clearRect(0, 0, width, height);
        drawGrid();
        drawTrajectory();
        if (activeBall) updateBall();
    }
    requestAnimationFrame(gameLoop);
}

function getPos(x, y) {
    const xOffset = y % 2 !== 0 ? BUBBLE_RADIUS : 0;
    const startX = (width - COLUMNS * BUBBLE_RADIUS * 2) / 2 + BUBBLE_RADIUS;
    return { x: startX + x * BUBBLE_RADIUS * 2 + xOffset, y: y * BUBBLE_RADIUS * 1.75 + BUBBLE_RADIUS + 20 };
}

function drawGrid() {
    for (let y = 0; y < grid.length; y++) {
        if (!grid[y]) continue;
        for (let x = 0; x < grid[y].length; x++) {
            if (grid[y][x]) {
                const pos = getPos(x, y);
                drawBubble(pos.x, pos.y, grid[y][x].color, grid[y][x].type);
            }
        }
    }
}

function drawBubble(x, y, color, type) {
    const r = BUBBLE_RADIUS - 1;
    // Shadow
    ctx.beginPath();
    ctx.arc(x, y + 2, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fill();
    // Base
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = type === 'ROCK' ? '#8E8E93' : color;
    ctx.fill();
    // Gloss gradient
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.05, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.55)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.1)');
    g.addColorStop(1, 'rgba(0,0,0,0.15)');
    ctx.fillStyle = g;
    ctx.fill();
    // Shine spot
    ctx.beginPath();
    ctx.ellipse(x - r * 0.3, y - r * 0.3, r * 0.22, r * 0.13, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fill();
}

function drawTrajectory() {
    if (isShooting || !mouseX || !mouseY) return;
    const c = getBallCenter();
    const angle = Math.atan2(mouseY - c.y, mouseX - c.x);
    if (angle > 0) return;

    let cx = c.x, cy = c.y;
    let dx = Math.cos(angle) * 12, dy = Math.sin(angle) * 12;
    ctx.fillStyle = 'rgba(162, 155, 254, 0.5)';
    for (let i = 0; i < 22; i++) {
        cx += dx; cy += dy;
        if (cx < BUBBLE_RADIUS || cx > width - BUBBLE_RADIUS) dx *= -1;
        if (i % 2 === 0) { ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fill(); }
    }
}

function getBallCenter() {
    const el = document.getElementById('active-ball');
    if (!el) return { x: width / 2, y: height - 80 };
    const r = el.getBoundingClientRect();
    const cr = canvas.getBoundingClientRect();
    return { x: r.left + r.width / 2 - cr.left, y: r.top + r.height / 2 - cr.top };
}

function shoot() {
    if (isShooting) return;
    isShooting = true; ballsRemaining--;
    state.stats.totalShots++;
    const c = getBallCenter();
    const angle = Math.atan2(mouseY - c.y, mouseX - c.x);
    const ballColor = document.getElementById('active-ball').style.backgroundColor;
    activeBall = {
        x: c.x, y: c.y,
        vx: Math.cos(angle) * 18, vy: Math.sin(angle) * 18,
        color: activePowerup === 'RAINBOW' ? '#ffffff' : ballColor,
        powerup: activePowerup
    };
    activePowerup = null;
    updateUI();
    saveState();
}

function updateBall() {
    activeBall.x += activeBall.vx;
    activeBall.y += activeBall.vy;
    if (activeBall.x <= BUBBLE_RADIUS || activeBall.x >= width - BUBBLE_RADIUS) activeBall.vx *= -1;
    drawBubble(activeBall.x, activeBall.y, activeBall.color, 'NORMAL');

    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < (grid[y] ? grid[y].length : 0); x++) {
            if (grid[y][x]) {
                const p = getPos(x, y);
                if (Math.hypot(activeBall.x - p.x, activeBall.y - p.y) <= BUBBLE_RADIUS * 1.8) { snap(); return; }
            }
        }
    }
    if (activeBall.y <= BUBBLE_RADIUS + 20) { snap(); return; }
    if (activeBall.y < 0 || activeBall.y > height) { activeBall = null; isShooting = false; prepareNext(); }
}

function snap() {
    if (activeBall.powerup === 'FIREBALL') { processFireball(activeBall.x, activeBall.y); }
    else {
        let minDist = Infinity, tx = 0, ty = 0;
        for (let y = 0; y < ROWS; y++) {
            if (!grid[y]) grid[y] = [];
            const cols = y % 2 === 0 ? COLUMNS : COLUMNS - 1;
            for (let x = 0; x < cols; x++) {
                if (grid[y][x]) continue;
                const p = getPos(x, y);
                const d = Math.hypot(activeBall.x - p.x, activeBall.y - p.y);
                if (d < minDist) { minDist = d; tx = x; ty = y; }
            }
        }
        if (!grid[ty]) grid[ty] = [];
        grid[ty][tx] = { type: 'NORMAL', color: activeBall.color, hits: 1 };
        if (activeBall.powerup === 'BOMB') processBomb(tx, ty);
        else processMatches(tx, ty);
    }
    activeBall = null; isShooting = false; prepareNext();
}

function getNeighbors(x, y) {
    const off = y % 2 === 0 ? [[1,0],[-1,0],[0,1],[0,-1],[-1,1],[-1,-1]] : [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1]];
    return off.map(([ox, oy]) => [x + ox, y + oy]);
}

function processMatches(x, y) {
    const bubble = grid[y] && grid[y][x];
    if (!bubble) return;
    let matches = [[x, y]], queue = [[x, y]], visited = new Set([`${x},${y}`]);
    while (queue.length) {
        const [cx, cy] = queue.shift();
        for (const [nx, ny] of getNeighbors(cx, cy)) {
            if (grid[ny] && grid[ny][nx] && grid[ny][nx].color === bubble.color && !visited.has(`${nx},${ny}`)) {
                visited.add(`${nx},${ny}`); matches.push([nx, ny]); queue.push([nx, ny]);
            }
        }
    }
    if (matches.length >= 3) {
        matches.forEach(([mx, my]) => {
            if (grid[my] && grid[my][mx]) {
                if (grid[my][mx].color === currentGoal.color) currentGoal.current++;
                grid[my][mx] = null; state.score += 20; state.stats.totalPops++;
            }
        });
        checkFloating();
        if (isGoalMet() || isGridEmpty()) winLevel();
    }
    updateUI(); saveState();
}

function processBomb(tx, ty) {
    [...getNeighbors(tx, ty), [tx, ty]].forEach(([nx, ny]) => {
        if (grid[ny] && grid[ny][nx]) { grid[ny][nx] = null; state.score += 10; state.stats.totalPops++; }
    });
    checkFloating(); if (isGridEmpty()) winLevel();
}

function processFireball(ax, ay) {
    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < (grid[y] ? grid[y].length : 0); x++) {
            if (grid[y][x]) {
                const p = getPos(x, y);
                if (Math.abs(p.x - ax) < BUBBLE_RADIUS * 2.5) { grid[y][x] = null; state.score += 10; state.stats.totalPops++; }
            }
        }
    }
    checkFloating(); if (isGridEmpty()) winLevel();
}

function checkFloating() {
    const connected = new Set();
    const q = [];
    if (grid[0]) grid[0].forEach((b, x) => { if (b) { connected.add(`0,${x}`); q.push([x, 0]); } });
    while (q.length) {
        const [cx, cy] = q.shift();
        for (const [nx, ny] of getNeighbors(cx, cy)) {
            if (grid[ny] && grid[ny][nx] && !connected.has(`${nx},${ny}`)) { connected.add(`${nx},${ny}`); q.push([nx, ny]); }
        }
    }
    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < (grid[y] ? grid[y].length : 0); x++) {
            if (grid[y][x] && grid[y][x].type !== 'ROCK' && !connected.has(`${x},${y}`)) { grid[y][x] = null; state.score += 5; state.stats.totalPops++; }
        }
    }
}

function isGoalMet() { return currentGoal.current >= currentGoal.target; }
function isGridEmpty() {
    return grid.every(row => !row || row.every(b => !b || b.type === 'ROCK'));
}

function winLevel() {
    state.coins += 50; state.stats.totalCoins += 50;
    if (state.currentLevel >= state.highestLevel) state.highestLevel = state.currentLevel + 1;
    saveState(); generateLevelsGrid();
    const pop = document.getElementById('level-complete-popup');
    if (pop) {
        pop.classList.remove('hidden');
        document.getElementById('next-level-btn').onclick = () => { pop.classList.add('hidden'); startGame(state.currentLevel + 1); };
    }
}

function prepareNext() {
    const active = document.getElementById('active-ball');
    const next = document.getElementById('next-ball');
    if (!active || !next) return;
    active.style.backgroundColor = next.style.backgroundColor || COLORS[Math.floor(Math.random() * COLORS.length)];
    next.style.backgroundColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    updateUI();
}

function swapBalls() {
    const active = document.getElementById('active-ball');
    const next = document.getElementById('next-ball');
    if (!active || !next) return;
    [active.style.backgroundColor, next.style.backgroundColor] = [next.style.backgroundColor, active.style.backgroundColor];
}

function usePowerup(type) {
    if (state.powerups[type] > 0) { state.powerups[type]--; activePowerup = type; saveState(); }
    else { openPopup('shop-popup'); }
}

function buyItem(type, cost) {
    if (state.coins >= cost) { state.coins -= cost; state.powerups[type] = (state.powerups[type] || 0) + 3; saveState(); }
    else { alert('Not enough coins!'); }
}

window.onload = init;
window.onresize = resize;
