const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let width, height;
const BUBBLE_RADIUS = 20; 
const COLUMNS = 9;
const ROWS = 20;

// Vibrant Reference Colors
const COLORS = [
    '#FF3D71', // Pinkish Red
    '#3366FF', // Blue
    '#00D68F', // Green
    '#FFAA00', // Orange
    '#A29BFE', // Purple
    '#FF708D'  // Light Pink
];

// PERSISTENT DATA
let state = {
    coins: 100,
    highestLevel: 1,
    currentLevel: 1,
    score: 0,
    powerups: { BOMB: 2, FIREBALL: 1, RAINBOW: 3 },
    stats: { totalPops: 0, totalShots: 0, totalCoins: 100 },
    settings: { sound: true, music: true, vibration: true },
    dailyChallenge: { id: new Date().toDateString(), target: 30, current: 0, completed: false }
};

// RUNTIME STATE
let grid = [];
let ballsRemaining = 60;
let activeBall = null;
let isShooting = false;
let mouseX, mouseY;
let activePowerup = null;
let currentGoal = { color: COLORS[0], target: 6, current: 0 };

function init() {
    loadState();
    updateUI();
    generateMap(); 

    showScreen('splash-screen');
    setTimeout(() => { showScreen('main-menu'); }, 2500);

    canvas.addEventListener('mousemove', e => {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
    });
    canvas.addEventListener('mouseup', () => {
        if (!isShooting && ballsRemaining > 0 && !activeBall) shoot();
    });
    canvas.addEventListener('touchstart', e => {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.touches[0].clientX - rect.left;
        mouseY = e.touches[0].clientY - rect.top;
    }, {passive: false});
    canvas.addEventListener('touchend', e => {
        if (!isShooting && ballsRemaining > 0 && !activeBall) shoot();
    }, {passive: false});

    requestAnimationFrame(gameLoop);
}

function loadState() {
    const saved = localStorage.getItem('bubble_shooter_state_v5');
    if (saved) state = JSON.parse(saved);
}
function saveState() {
    localStorage.setItem('bubble_shooter_state_v5', JSON.stringify(state));
    updateUI();
}

function showScreen(id) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(s => {
        if (s.id !== id) {
            s.style.opacity = '0';
            s.style.transform = 'scale(0.9)';
            setTimeout(() => { if (s.style.opacity === '0') s.classList.add('hidden'); }, 400);
        }
    });
    const target = document.getElementById(id);
    target.classList.remove('hidden');
    setTimeout(() => { target.style.opacity = '1'; target.style.transform = 'scale(1)'; }, 10);
    if (id === 'home-screen') generateMap();
}

function openPopup(id) { document.getElementById(id).classList.remove('hidden'); }
function closePopup(id) { document.getElementById(id).classList.add('hidden'); }

function updateUI() {
    document.querySelectorAll('#header-coins').forEach(el => el.innerText = state.coins);
    document.getElementById('bomb-count').innerText = state.powerups.BOMB;
    document.getElementById('fireball-count').innerText = state.powerups.FIREBALL;
    document.getElementById('rainbow-count').innerText = state.powerups.RAINBOW;
    document.getElementById('balls-text').innerText = ballsRemaining;
    document.getElementById('current-score').innerText = state.score.toLocaleString();
    document.getElementById('goal-text').innerText = `${currentGoal.current}/${currentGoal.target}`;
}

function startGame(level) {
    state.currentLevel = level;
    ballsRemaining = 60 - Math.floor(level / 5) * 2;
    if (ballsRemaining < 30) ballsRemaining = 30;
    
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
    const maxRows = 10 + Math.floor(level / 5);
    for (let y = 0; y < maxRows; y++) {
        grid[y] = [];
        // Create Trapezoid Shape: wider at top, narrower at bottom
        const indent = Math.floor(y / 2);
        const cols = (y % 2 === 0 ? COLUMNS : COLUMNS - 1) - indent;
        
        if (cols <= 0) break;

        for (let x = 0; x < cols; x++) {
            grid[y][x + Math.floor(indent/2)] = { 
                type: 'NORMAL', 
                color: COLORS[Math.floor(Math.random() * COLORS.length)], 
                hits: 1 
            };
        }
    }
}

function generateMap() {
    const container = document.getElementById('map-path-container');
    if (!container) return;
    container.innerHTML = '';
    for (let i = 20; i >= 1; i--) {
        const node = document.createElement('div');
        node.className = 'level-node';
        const row = Math.floor((i-1) / 3);
        const col = (i-1) % 3;
        const xOffset = (row % 2 === 0) ? (col - 1) * 80 : (1 - col) * 80;
        node.style.transform = `translateX(${xOffset}px)`;
        if (i > state.highestLevel) { node.classList.add('locked'); node.innerHTML = `🔒`; }
        else {
            if (i === state.highestLevel) node.classList.add('active');
            node.innerHTML = `${i} <div style="font-size: 0.5rem; color: #f1c40f;">★★★</div>`;
            node.onclick = () => startGame(i);
        }
        container.appendChild(node);
    }
}

function resize() {
    width = canvas.parentElement.clientWidth;
    height = canvas.parentElement.clientHeight;
    canvas.width = width;
    canvas.height = height;
}

function gameLoop() {
    ctx.clearRect(0, 0, width, height);
    drawGrid();
    drawTrajectory();
    if (activeBall) updateBall();
    requestAnimationFrame(gameLoop);
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

function getPos(x, y) {
    const xOffset = y % 2 !== 0 ? BUBBLE_RADIUS : 0;
    const startX = (width - (COLUMNS * BUBBLE_RADIUS * 2)) / 2 + BUBBLE_RADIUS;
    return { x: startX + x * BUBBLE_RADIUS * 2 + xOffset, y: y * BUBBLE_RADIUS * 1.75 + BUBBLE_RADIUS + 20 };
}

function drawBubble(x, y, color, type) {
    // 1. Base Bubble
    ctx.beginPath();
    ctx.arc(x, y, BUBBLE_RADIUS - 1, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // 2. Glossy Radial Gradient (3D Effect)
    const grad = ctx.createRadialGradient(x - BUBBLE_RADIUS/3, y - BUBBLE_RADIUS/3, BUBBLE_RADIUS/10, x, y, BUBBLE_RADIUS);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
    grad.addColorStop(0.2, 'rgba(255, 255, 255, 0.2)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
    ctx.fillStyle = grad;
    ctx.fill();

    // 3. Strong Top Highlight (The "Shine")
    ctx.beginPath();
    ctx.ellipse(x - BUBBLE_RADIUS/3, y - BUBBLE_RADIUS/3, BUBBLE_RADIUS/4, BUBBLE_RADIUS/6, -Math.PI/4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fill();
}

function drawTrajectory() {
    if (isShooting || !mouseX || !mouseY) return;
    const center = getBallCenter();
    let angle = Math.atan2(mouseY - center.y, mouseX - center.x);
    if (angle > 0) return;

    ctx.fillStyle = 'rgba(162, 155, 254, 0.5)'; // Light purple dots
    let curX = center.x, curY = center.y;
    let dx = Math.cos(angle) * 12, dy = Math.sin(angle) * 12;
    for(let i=0; i<25; i++) {
        curX += dx; curY += dy;
        if (curX < BUBBLE_RADIUS || curX > width - BUBBLE_RADIUS) dx *= -1;
        if (i % 2 === 0) {
            ctx.beginPath();
            ctx.arc(curX, curY, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

function getBallCenter() {
    const ballEl = document.getElementById('active-ball');
    if (!ballEl) return { x: width / 2, y: height - 120, radius: BUBBLE_RADIUS };
    const rect = ballEl.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    return { x: rect.left + rect.width / 2 - canvasRect.left, y: rect.top + rect.height / 2 - canvasRect.top, radius: BUBBLE_RADIUS };
}

function shoot() {
    if (isShooting) return;
    isShooting = true;
    ballsRemaining--;
    state.stats.totalShots++;
    const center = getBallCenter();
    const angle = Math.atan2(mouseY - center.y, mouseX - center.x);
    activeBall = {
        x: center.x, y: center.y,
        vx: Math.cos(angle) * 18, vy: Math.sin(angle) * 18,
        color: activePowerup === 'RAINBOW' ? 'RAINBOW' : document.getElementById('active-ball').style.backgroundColor,
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
    drawBubble(activeBall.x, activeBall.y, activeBall.color === 'RAINBOW' ? '#ffffff' : activeBall.color, 'NORMAL');

    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[y].length; x++) {
            if (grid[y][x]) {
                const pos = getPos(x, y);
                const d = Math.sqrt((activeBall.x - pos.x)**2 + (activeBall.y - pos.y)**2);
                if (d <= BUBBLE_RADIUS * 1.8) { snap(); return; }
            }
        }
    }
    if (activeBall.y <= BUBBLE_RADIUS + 40) snap();
    if (activeBall.y < 0 || activeBall.y > height) { activeBall = null; isShooting = false; prepareNext(); }
}

function snap() {
    if (activeBall.powerup === 'FIREBALL') processFireball(activeBall.x, activeBall.y);
    else {
        let minDist = Infinity;
        let tx = 0, ty = 0;
        for (let y = 0; y < ROWS; y++) {
            if (!grid[y]) grid[y] = [];
            const cols = y % 2 === 0 ? COLUMNS : COLUMNS - 1;
            for (let x = 0; x < cols; x++) {
                if (grid[y][x]) continue;
                const pos = getPos(x, y);
                const d = Math.sqrt((activeBall.x - pos.x)**2 + (activeBall.y - pos.y)**2);
                if (d < minDist) { minDist = d; tx = x; ty = y; }
            }
        }
        grid[ty][tx] = { type: 'NORMAL', color: activeBall.color, hits: 1 };
        if (activeBall.powerup === 'BOMB') processBomb(tx, ty);
        else processMatches(tx, ty);
    }
    activeBall = null; isShooting = false; prepareNext();
}

function processBomb(tx, ty) {
    const neighbors = getNeighbors(tx, ty);
    neighbors.push([tx, ty]);
    neighbors.forEach(([nx, ny]) => { if (grid[ny] && grid[ny][nx]) { grid[ny][nx] = null; state.score += 10; state.stats.totalPops++; } });
    checkFloating();
    if (isGoalMet() || isGridEmpty()) winLevel();
}

function processFireball(ax, ay) {
    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[y].length; x++) {
            if (grid[y][x]) {
                const pos = getPos(x, y);
                if (Math.abs(pos.x - ax) < BUBBLE_RADIUS * 2.5) { grid[y][x] = null; state.score += 10; state.stats.totalPops++; }
            }
        }
    }
    checkFloating();
    if (isGoalMet() || isGridEmpty()) winLevel();
}

function processMatches(x, y) {
    const bubble = grid[y][x];
    let matches = [[x, y]];
    let queue = [[x, y]];
    let visited = new Set([`${x},${y}`]);
    while (queue.length > 0) {
        let [cx, cy] = queue.shift();
        let neighbors = getNeighbors(cx, cy);
        for (let [nx, ny] of neighbors) {
            if (grid[ny] && grid[ny][nx] && grid[ny][nx].color === bubble.color && !visited.has(`${nx},${ny}`)) {
                visited.add(`${nx},${ny}`); matches.push([nx, ny]); queue.push([nx, ny]);
            }
        }
    }
    if (matches.length >= 3) {
        matches.forEach(([mx, my]) => {
            if (grid[my][mx].color === currentGoal.color) currentGoal.current++;
            grid[my][mx] = null;
            state.score += 20;
            state.stats.totalPops++;
        });
        checkFloating();
        if (isGoalMet() || isGridEmpty()) winLevel();
    }
    updateUI(); saveState();
}

function checkFloating() {
    let connected = new Set();
    let queue = [];
    for (let x = 0; x < COLUMNS; x++) { if (grid[0] && grid[0][x]) { connected.add(`0,${x}`); queue.push([x, 0]); } }
    while (queue.length > 0) {
        let [cx, cy] = queue.shift();
        let neighbors = getNeighbors(cx, cy);
        for (let [nx, ny] of neighbors) {
            if (grid[ny] && grid[ny][nx] && !connected.has(`${nx},${ny}`)) { connected.add(`${nx},${ny}`); queue.push([nx, ny]); }
        }
    }
    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[y].length; x++) {
            if (grid[y][x] && grid[y][x].type !== 'ROCK' && !connected.has(`${x},${y}`)) { grid[y][x] = null; state.score += 5; state.stats.totalPops++; }
        }
    }
}

function usePowerup(type) {
    if (state.powerups[type] > 0) { state.powerups[type]--; activePowerup = type; saveState(); }
    else { openPopup('shop-popup'); }
}

function isGoalMet() { return currentGoal.current >= currentGoal.target; }
function isGridEmpty() {
    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[y].length; x++) { if (grid[y][x] && grid[y][x].type !== 'ROCK') return false; }
    }
    return true;
}

function winLevel() {
    state.coins += 50; state.stats.totalCoins += 50;
    if (state.currentLevel === state.highestLevel) state.highestLevel++;
    saveState();
    openPopup('level-complete-popup');
    document.getElementById('next-level-btn').onclick = () => { closePopup('level-complete-popup'); startGame(state.currentLevel + 1); };
}

function prepareNext() {
    const active = document.getElementById('active-ball');
    const next = document.getElementById('next-ball');
    if (next.style.backgroundColor) active.style.backgroundColor = next.style.backgroundColor;
    else active.style.backgroundColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    next.style.backgroundColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    updateUI();
}

function swapBalls() {
    const active = document.getElementById('active-ball');
    const next = document.getElementById('next-ball');
    const temp = active.style.backgroundColor;
    active.style.backgroundColor = next.style.backgroundColor;
    next.style.backgroundColor = temp;
}

function getNeighbors(x, y) {
    const offsets = y % 2 === 0 ? [[1,0], [-1,0], [0,1], [0,-1], [-1,1], [-1,-1]] : [[1,0], [-1,0], [0,1], [0,-1], [1,1], [1,-1]];
    return offsets.map(([ox, oy]) => [x + ox, y + oy]);
}

function buyItem(type, cost) {
    if (state.coins >= cost) { state.coins -= cost; state.powerups[type] += 3; saveState(); }
    else { alert("Not enough coins!"); }
}

window.onload = init;
window.onresize = resize;
