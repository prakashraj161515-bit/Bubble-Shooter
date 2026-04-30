const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let width, height;
const BUBBLE_RADIUS = 20;
const COLUMNS = 10;
const ROWS = 20;
const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#ec4899'];

let grid = [];
let ballsRemaining = 60;
let currentLevel = 1;
let coins = 100;
let currentBallColor = COLORS[0];
let nextBallColor = COLORS[1];

let bubbles = [];
let particles = [];
let isShooting = false;
let activeBall = null;

function init() {
    resize();
    showScreen('splash-screen');
    
    // Simulate loading
    setTimeout(() => {
        showScreen('main-menu');
        populateMap();
    }, 3000);

    // Navigation
    document.getElementById('play-btn').onclick = () => startGame();
    document.getElementById('map-btn').onclick = () => showScreen('level-map');
    document.getElementById('shop-btn').onclick = () => showScreen('store-screen');
    document.getElementById('spin-btn').onclick = () => showScreen('spin-screen');
    document.getElementById('daily-btn').onclick = () => alert("Daily Reward: +50 Coins!");
    document.getElementById('swap-trigger').onclick = swapBalls;

    // Powerups
    document.getElementById('p-fire').onclick = () => activatePowerup('fire');
    document.getElementById('p-bomb').onclick = () => activatePowerup('bomb');
    document.getElementById('p-rainbow').onclick = () => activatePowerup('rainbow');

    document.querySelectorAll('.back-btn-ui').forEach(btn => {
        btn.onclick = () => showScreen('main-menu');
    });

    // Game Inputs
    canvas.addEventListener('mousedown', startShoot);
    canvas.addEventListener('mousemove', aim);
    canvas.addEventListener('mouseup', releaseShoot);
    canvas.addEventListener('touchstart', (e) => startShoot(e.touches[0]));
    canvas.addEventListener('touchmove', (e) => aim(e.touches[0]));
    canvas.addEventListener('touchend', (e) => releaseShoot(e.touches[0]));
}

function populateMap() {
    const mapContent = document.getElementById('map-content');
    mapContent.innerHTML = '';
    for (let i = 1; i <= 50; i++) {
        const level = document.createElement('div');
        level.className = 'map-level';
        if (i % 15 === 0) level.classList.add('gift');
        if (i % 50 === 0) level.classList.add('boss');
        level.innerText = i;
        level.onclick = () => { currentLevel = i; startGame(); };
        mapContent.appendChild(level);
    }
}

function resize() {
    width = window.innerWidth;
    height = window.innerHeight * 0.7; // 70% height for canvas
    canvas.width = width;
    canvas.height = height;
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

function startGame() {
    showScreen('gameplay-ui');
    currentLevel = 1;
    updateBallCountForLevel(currentLevel);
    updateUI();
    generateLevel(currentLevel);
    requestAnimationFrame(gameLoop);
}

function updateBallCountForLevel(level) {
    if (level <= 50) ballsRemaining = 60;
    else if (level <= 200) ballsRemaining = Math.round(55 - ((level - 51) / 149) * 5);
    else if (level <= 400) ballsRemaining = Math.round(50 - ((level - 201) / 199) * 5);
    else if (level <= 800) ballsRemaining = Math.round(45 - ((level - 401) / 399) * 5);
    else ballsRemaining = 40;
}

function generateLevel(level) {
    grid = [];
    const rowsToFill = Math.min(8 + Math.floor(level / 15), 15);
    for (let y = 0; y < rowsToFill; y++) {
        grid[y] = [];
        const cols = y % 2 === 0 ? COLUMNS : COLUMNS - 1;
        for (let x = 0; x < cols; x++) {
            let rand = Math.random();
            if (rand > 0.1) {
                // Add Special Bubbles every 100 levels logic
                if (level >= 100 && Math.random() < 0.05) {
                    grid[y][x] = { type: 'ROCK', color: '#666' };
                } else if (level >= 200 && Math.random() < 0.05) {
                    grid[y][x] = { type: 'CHAIN', color: '#aaa', locked: true };
                } else {
                    grid[y][x] = { type: 'NORMAL', color: COLORS[Math.floor(Math.random() * Math.min(3 + (level/100), COLORS.length))] };
                }
            } else {
                grid[y][x] = null;
            }
        }
    }
}

function gameLoop() {
    ctx.clearRect(0, 0, width, height);
    drawGrid();
    if (activeBall) updateActiveBall();
    drawTrajectory();
    requestAnimationFrame(gameLoop);
}

function drawGrid() {
    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[y].length; x++) {
            if (grid[y][x]) {
                const pos = getBubblePosition(x, y);
                drawBubble(pos.x, pos.y, grid[y][x].color, grid[y][x].type);
            }
        }
    }
}

function getBubblePosition(x, y) {
    const xOffset = y % 2 === 0 ? 0 : BUBBLE_RADIUS;
    return {
        x: (width - (COLUMNS * BUBBLE_RADIUS * 2)) / 2 + x * BUBBLE_RADIUS * 2 + BUBBLE_RADIUS + xOffset,
        y: y * BUBBLE_RADIUS * 1.75 + BUBBLE_RADIUS + 20
    };
}

function drawBubble(x, y, color, type = 'NORMAL') {
    ctx.beginPath();
    ctx.arc(x, y, BUBBLE_RADIUS - 2, 0, Math.PI * 2);
    
    if (color.includes('gradient')) {
        let grad = ctx.createLinearGradient(x - BUBBLE_RADIUS, y, x + BUBBLE_RADIUS, y);
        grad.addColorStop(0, 'red');
        grad.addColorStop(0.2, 'orange');
        grad.addColorStop(0.4, 'yellow');
        grad.addColorStop(0.6, 'green');
        grad.addColorStop(0.8, 'blue');
        grad.addColorStop(1, 'violet');
        ctx.fillStyle = grad;
    } else {
        ctx.fillStyle = color;
    }
    
    ctx.fill();
    
    if (type === 'ROCK') {
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 3;
        ctx.stroke();
    } else if (type === 'CHAIN') {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = '10px Arial';
        ctx.fillText('🔗', x - 5, y + 5);
    }

    // Highlight
    ctx.beginPath();
    ctx.arc(x - 5, y - 5, 5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fill();
    ctx.closePath();
}

let mouseX, mouseY;
function aim(e) {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
}

function startShoot(e) { if (!isShooting) aim(e); }

function releaseShoot(e) {
    if (isShooting || ballsRemaining <= 0) return;
    
    const shootX = width / 2;
    const shootY = height - 50;
    const dx = mouseX - shootX;
    const dy = mouseY - shootY;
    const dist = Math.sqrt(dx*dx + dy*dy);
    
    activeBall = {
        x: shootX,
        y: shootY,
        vx: (dx / dist) * 12,
        vy: (dy / dist) * 12,
        color: currentBallColor
    };
    
    isShooting = true;
    ballsRemaining--;
    updateUI();
    prepareNextBall();
    
    // Check if Fireball was active
    if (isFireballReady) {
        // Fireball logic (clear path)
        isFireballReady = false;
        comboCount = 0;
    }
}

function updateActiveBall() {
    activeBall.x += activeBall.vx;
    activeBall.y += activeBall.vy;
    
    // Wall bounce
    if (activeBall.x < BUBBLE_RADIUS || activeBall.x > width - BUBBLE_RADIUS) {
        activeBall.vx *= -1;
    }
    
    drawBubble(activeBall.x, activeBall.y, activeBall.color);
    
    // Check collision with grid or ceiling
    if (activeBall.y < BUBBLE_RADIUS) {
        snapToGrid();
    } else {
        // Simple collision check (pseudocode for speed)
        // In real app, check proximity to all grid bubbles
        for (let y = 0; y < grid.length; y++) {
            for (let x = 0; x < grid[y].length; x++) {
                if (grid[y][x]) {
                    const pos = getBubblePosition(x, y);
                    const d = Math.sqrt((activeBall.x - pos.x)**2 + (activeBall.y - pos.y)**2);
                    if (d < BUBBLE_RADIUS * 1.8) {
                        snapToGrid();
                        return;
                    }
                }
            }
        }
    }
}

function snapToGrid() {
    if (!activeBall) return;

    // Find nearest grid cell
    let minDist = Infinity;
    let targetX = 0, targetY = 0;

    for (let y = 0; y < ROWS; y++) {
        if (!grid[y]) grid[y] = [];
        const cols = y % 2 === 0 ? COLUMNS : COLUMNS - 1;
        for (let x = 0; x < cols; x++) {
            const pos = getBubblePosition(x, y);
            const d = Math.sqrt((activeBall.x - pos.x)**2 + (activeBall.y - pos.y)**2);
            if (d < minDist) {
                minDist = d;
                targetX = x;
                targetY = y;
            }
        }
    }

    // Snap if space is empty
    if (!grid[targetY][targetX]) {
        grid[targetY][targetX] = { type: 'NORMAL', color: activeBall.color };
        checkMatches(targetX, targetY);
    }

    activeBall = null;
    isShooting = false;
}

function checkMatches(x, y) {
    const color = grid[y][x].color;
    let matches = [[x, y]];
    let queue = [[x, y]];
    let visited = new Set([`${x},${y}`]);

    while (queue.length > 0) {
        let [cx, cy] = queue.shift();
        let neighbors = getNeighbors(cx, cy);
        for (let [nx, ny] of neighbors) {
            if (grid[ny] && grid[ny][nx] && grid[ny][nx].color === color && !visited.has(`${nx},${ny}`)) {
                visited.add(`${nx},${ny}`);
                matches.push([nx, ny]);
                queue.push([nx, ny]);
            }
        }
    }

    if (matches.length >= 3) {
        matches.forEach(([mx, my]) => grid[my][mx] = null);
        coins += 10;
        updateUI();
        checkFloating();
    }
}

function getNeighbors(x, y) {
    const offsets = y % 2 === 0 
        ? [[1,0], [-1,0], [0,1], [0,-1], [-1,1], [-1,-1]]
        : [[1,0], [-1,0], [0,1], [0,-1], [1,1], [1,-1]];
    return offsets.map(([ox, oy]) => [x + ox, y + oy]);
}

function checkFloating() {
    // Basic drop logic: mark all connected to row 0
    let connected = new Set();
    let queue = [];
    for (let x = 0; x < COLUMNS; x++) {
        if (grid[0] && grid[0][x]) {
            connected.add(`0,${x}`);
            queue.push([x, 0]);
        }
    }

    while (queue.length > 0) {
        let [cx, cy] = queue.shift();
        let neighbors = getNeighbors(cx, cy);
        for (let [nx, ny] of neighbors) {
            if (grid[ny] && grid[ny][nx] && !connected.has(`${nx},${ny}`)) {
                connected.add(`${nx},${ny}`);
                queue.push([nx, ny]);
            }
        }
    }

    // Drop any that aren't connected
    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < (grid[y] ? grid[y].length : 0); x++) {
            if (grid[y][x] && !connected.has(`${y},${x}`)) {
                grid[y][x] = null; // Drop
            }
        }
    }
}

function swapBalls() {
    let temp = currentBallColor;
    currentBallColor = nextBallColor;
    nextBallColor = temp;
    updateUI();
}

function activatePowerup(type) {
    if (coins < 10) return;
    coins -= 10;
    if (type === 'fire') currentBallColor = '#ff4500'; // Orange-Red
    if (type === 'rainbow') currentBallColor = 'linear-gradient(to right, red, orange, yellow, green, blue, indigo, violet)'; 
    updateUI();
}

function prepareNextBall() {
    currentBallColor = nextBallColor;
    nextBallColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    updateUI();
}

function updateUI() {
    document.getElementById('balls-text').innerText = ballsRemaining;
    document.getElementById('current-lvl-text').innerText = currentLevel;
    document.getElementById('game-coins').innerText = coins;
    
    document.getElementById('active-ball-circle').style.backgroundColor = currentBallColor;
    document.getElementById('next-ball-circle').style.backgroundColor = nextBallColor;
}

function drawTrajectory() {
    if (isShooting) return;
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.moveTo(width / 2, height - 50);
    ctx.lineTo(mouseX, mouseY);
    ctx.stroke();
    ctx.setLineDash([]);
}

window.onload = init;
window.onresize = resize;
