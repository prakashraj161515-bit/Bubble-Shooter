const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let width, height;
const BUBBLE_RADIUS = 20; 
const COLUMNS = 9;
const ROWS = 20;

// iOS System Colors
const COLORS = [
    '#FF3B30', // Red
    '#007AFF', // Blue
    '#34C759', // Green
    '#FF9500', // Orange
    '#AF52DE', // Purple
    '#FF2D55'  // Pink
];

// PERSISTENT DATA
let state = {
    coins: 100,
    highestLevel: 1,
    currentLevel: 1,
    powerups: { BOMB: 2, FIREBALL: 1, RAINBOW: 3 },
    missions: { id: 1, target: 50, current: 0, type: 'POP_COLOR', color: COLORS[0] },
    lastSpin: 0
};

// RUNTIME STATE
let grid = [];
let ballsRemaining = 60;
let activeBall = null;
let isShooting = false;
let mouseX, mouseY;
let activePowerup = null;

function init() {
    loadState();
    updateUI();
    generateMap(); 

    showScreen('splash-screen');
    setTimeout(() => { 
        showScreen('home-screen'); 
        generateMap(); // Refresh map
    }, 2000);

    // Inputs
    canvas.addEventListener('mousemove', e => {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
    });
    canvas.addEventListener('mouseup', () => {
        if (!isShooting && ballsRemaining > 0 && !activeBall) shoot();
    });

    // Touch support
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
    const saved = localStorage.getItem('bubble_shooter_state_v3');
    if (saved) state = JSON.parse(saved);
}
function saveState() {
    localStorage.setItem('bubble_shooter_state_v3', JSON.stringify(state));
    updateUI();
}

function showScreen(id) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(s => {
        if (s.id !== id) {
            s.style.opacity = '0';
            s.style.transform = 'scale(1.05)';
            setTimeout(() => { if (s.style.opacity === '0') s.classList.add('hidden'); }, 400);
        }
    });
    const target = document.getElementById(id);
    target.classList.remove('hidden');
    setTimeout(() => {
        target.style.opacity = '1';
        target.style.transform = 'scale(1)';
    }, 10);
}

function openPopup(id) { document.getElementById(id).classList.remove('hidden'); }
function closePopup(id) { document.getElementById(id).classList.add('hidden'); }

function updateUI() {
    document.getElementById('header-coins').innerText = state.coins;
    document.getElementById('bomb-count').innerText = state.powerups.BOMB;
    document.getElementById('fireball-count').innerText = state.powerups.FIREBALL;
    document.getElementById('rainbow-count').innerText = state.powerups.RAINBOW;
    document.getElementById('balls-text').innerText = ballsRemaining;
    
    // Mission
    const fill = (state.missions.current / state.missions.target) * 100;
    document.getElementById('mission-fill').style.width = `${Math.min(fill, 100)}%`;
    document.getElementById('mission-text').innerText = `Pop ${state.missions.target} ${getColorName(state.missions.color)} Bubbles`;
}

function getColorName(hex) {
    const names = {'#FF3B30':'Red', '#007AFF':'Blue', '#34C759':'Green', '#FF9500':'Orange', '#AF52DE':'Purple', '#FF2D55':'Pink'};
    return names[hex] || 'Bubbles';
}

function startGame(level) {
    state.currentLevel = level;
    ballsRemaining = 60 - Math.floor(level / 5) * 2;
    if (ballsRemaining < 30) ballsRemaining = 30;
    
    generateLevel(level);
    prepareNext();
    showScreen('gameplay-ui');
    resize();
    updateUI();
    document.getElementById('current-level-display').innerText = level;
}

function generateLevel(level) {
    grid = [];
    const rows = 8 + Math.floor(level / 10);
    for (let y = 0; y < rows; y++) {
        grid[y] = [];
        const cols = y % 2 === 0 ? COLUMNS : COLUMNS - 1;
        for (let x = 0; x < cols; x++) {
            let type = 'NORMAL';
            if (level > 5 && Math.random() < 0.05) type = 'ROCK';
            if (level > 10 && Math.random() < 0.05) type = 'CHAIN';
            grid[y][x] = { type, color: COLORS[Math.floor(Math.random() * COLORS.length)], hits: type === 'CHAIN' ? 2 : 1 };
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
        const xOffset = (row % 2 === 0) ? (col - 1) * 85 : (1 - col) * 85;
        node.style.transform = `translateX(${xOffset}px)`;
        
        if (i > state.highestLevel) {
            node.classList.add('locked');
            node.innerHTML = `🔒`;
        } else {
            if (i === state.highestLevel) node.classList.add('active');
            node.innerHTML = `${i} <div class="stars-row"><span>★</span><span>★</span><span>★</span></div>`;
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
    return { x: startX + x * BUBBLE_RADIUS * 2 + xOffset, y: y * BUBBLE_RADIUS * 1.75 + BUBBLE_RADIUS + 40 };
}

function drawBubble(x, y, color, type) {
    ctx.beginPath();
    ctx.arc(x, y, BUBBLE_RADIUS - 1, 0, Math.PI * 2);
    ctx.fillStyle = (type === 'ROCK') ? '#8E8E93' : color;
    ctx.fill();
    
    // Gloss effect
    const grad = ctx.createRadialGradient(x - 5, y - 5, 2, x, y, BUBBLE_RADIUS);
    grad.addColorStop(0, 'rgba(255,255,255,0.3)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fill();

    if (type === 'CHAIN') {
        ctx.strokeStyle = 'white'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = 'white'; ctx.font = '10px Arial'; ctx.textAlign='center'; ctx.fillText('⛓', x, y+4);
    }
}

function drawTrajectory() {
    if (isShooting || !mouseX || !mouseY) return;
    const center = getBallCenter();
    let angle = Math.atan2(mouseY - center.y, mouseX - center.x);
    if (angle > 0) return;

    ctx.setLineDash([4, 6]);
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    let curX = center.x, curY = center.y;
    let dx = Math.cos(angle) * 10, dy = Math.sin(angle) * 10;
    for(let i=0; i<30; i++) {
        curX += dx; curY += dy;
        if (curX < BUBBLE_RADIUS || curX > width - BUBBLE_RADIUS) dx *= -1;
        if (i % 2 === 0) ctx.lineTo(curX, curY);
        else ctx.moveTo(curX, curY);
    }
    ctx.stroke();
    ctx.setLineDash([]);
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
    
    const center = getBallCenter();
    const angle = Math.atan2(mouseY - center.y, mouseX - center.x);
    
    activeBall = {
        x: center.x,
        y: center.y,
        vx: Math.cos(angle) * 18,
        vy: Math.sin(angle) * 18,
        color: activePowerup === 'RAINBOW' ? 'RAINBOW' : document.getElementById('active-ball').style.backgroundColor,
        powerup: activePowerup
    };
    activePowerup = null;
    updateUI();
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
    if (activeBall.powerup === 'FIREBALL') {
        processFireball(activeBall.x, activeBall.y);
    } else {
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
    activeBall = null;
    isShooting = false;
    prepareNext();
}

function processBomb(tx, ty) {
    const neighbors = getNeighbors(tx, ty);
    neighbors.push([tx, ty]);
    neighbors.forEach(([nx, ny]) => { if (grid[ny] && grid[ny][nx]) { grid[ny][nx] = null; } });
    checkFloating();
    if (isGridEmpty()) winLevel();
}

function processFireball(ax, ay) {
    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[y].length; x++) {
            if (grid[y][x]) {
                const pos = getPos(x, y);
                if (Math.abs(pos.x - ax) < BUBBLE_RADIUS * 2.5) { grid[y][x] = null; }
            }
        }
    }
    checkFloating();
    if (isGridEmpty()) winLevel();
}

function usePowerup(type) {
    if (state.powerups[type] > 0) { state.powerups[type]--; activePowerup = type; saveState(); }
    else { openPopup('shop-popup'); }
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
            if (grid[my][mx].color === state.missions.color) { state.missions.current++; if (state.missions.current >= state.missions.target) completeMission(); }
            grid[my][mx] = null;
        });
        checkFloating();
        if (isGridEmpty()) winLevel();
    }
    updateUI();
}

function getNeighbors(x, y) {
    const offsets = y % 2 === 0 ? [[1,0], [-1,0], [0,1], [0,-1], [-1,1], [-1,-1]] : [[1,0], [-1,0], [0,1], [0,-1], [1,1], [1,-1]];
    return offsets.map(([ox, oy]) => [x + ox, y + oy]);
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
            if (grid[y][x] && grid[y][x].type !== 'ROCK' && !connected.has(`${x},${y}`)) { grid[y][x] = null; }
        }
    }
}

function isGridEmpty() {
    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[y].length; x++) { if (grid[y][x] && grid[y][x].type !== 'ROCK') return false; }
    }
    return true;
}

function completeMission() {
    state.coins += 100;
    state.missions.id++;
    state.missions.current = 0;
    state.missions.color = COLORS[Math.floor(Math.random() * COLORS.length)];
    saveState();
}

function winLevel() {
    state.coins += 50;
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

function buyItem(type, cost) {
    if (state.coins >= cost) { state.coins -= cost; state.powerups[type] += 3; saveState(); }
    else { alert("Not enough coins!"); }
}

window.onload = init;
window.onresize = resize;
