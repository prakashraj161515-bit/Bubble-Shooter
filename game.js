const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const fxLayer = document.getElementById('fx-layer');

let width, height;
const BUBBLE_RADIUS = 22;
const COLUMNS = 9;
const ROWS = 20;
const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7'];

let grid = [];
let ballsRemaining = 60;
let currentLevel = 1;
let coins = 100;
let combo = 0;
let fireballCharge = 0; // 0 to 6
let currentBallColor = COLORS[0];
let nextBallColor = COLORS[1];

let activeBall = null;
let isShooting = false;
let mouseX, mouseY;

// Mission State
let missionTarget = 1000;
let missionCurrent = 0;
let missionColor = COLORS[0];

function init() {
    resize();
    showScreen('level-map'); // Start at map as per user image
    generateMap();

    // Navigation
    document.getElementById('play-main-btn').onclick = () => startGame();
    document.getElementById('menu-trigger').onclick = () => showPopup('settings-popup');
    
    // Popup Close Logic
    document.querySelectorAll('.close-x').forEach(btn => {
        btn.onclick = (e) => e.target.closest('.popup-overlay').classList.add('hidden');
    });

    document.querySelectorAll('.back-btn-ui').forEach(btn => {
        btn.onclick = () => showScreen('level-map');
    });

    // Game Inputs
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
    });

    canvas.addEventListener('mouseup', () => {
        if (!isShooting && ballsRemaining > 0) shoot();
    });

    requestAnimationFrame(gameLoop);
}

function generateMap() {
    const container = document.getElementById('map-path-container');
    container.innerHTML = '';
    
    for (let i = 211; i <= 220; i++) {
        const node = document.createElement('div');
        node.className = 'level-node';
        if (i === 216) node.classList.add('current');
        
        // S-shape logic
        const row = Math.floor((i-211) / 3);
        const col = (i-211) % 3;
        const xOffset = (row % 2 === 0) ? (col - 1) * 80 : (1 - col) * 80;
        node.style.transform = `translateX(${xOffset}px)`;
        
        node.innerHTML = `${i} <div class="stars">⭐⭐</div>`;
        node.onclick = () => {
            currentLevel = i;
            document.getElementById('play-main-btn').innerText = `LEVEL ${i}`;
        };
        container.appendChild(node);
    }
}

function showPopup(id) {
    document.getElementById(id).classList.remove('hidden');
}

function resize() {
    width = canvas.parentElement.clientWidth;
    height = canvas.parentElement.clientHeight;
    canvas.width = width;
    canvas.height = height;
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

function startGame() {
    showScreen('gameplay-ui');
    ballsRemaining = 60;
    missionCurrent = 0;
    generateLevel();
    updateUI();
}

function generateLevel() {
    grid = [];
    for (let y = 0; y < 10; y++) {
        grid[y] = [];
        const cols = y % 2 === 0 ? COLUMNS : COLUMNS - 1;
        for (let x = 0; x < cols; x++) {
            grid[y][x] = {
                type: 'NORMAL',
                color: COLORS[Math.floor(Math.random() * COLORS.length)]
            };
        }
    }
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
    return {
        x: startX + x * BUBBLE_RADIUS * 2 + xOffset,
        y: y * BUBBLE_RADIUS * 1.75 + BUBBLE_RADIUS + 20
    };
}

function drawBubble(x, y, color, type) {
    // Glossy Bubble
    ctx.beginPath();
    ctx.arc(x, y, BUBBLE_RADIUS - 2, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    
    // Highlight
    ctx.beginPath();
    ctx.arc(x - 6, y - 6, 6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fill();

    if (type === 'ROCK') {
        ctx.strokeStyle = '#444'; ctx.lineWidth = 4; ctx.stroke();
    }
}

function drawTrajectory() {
    if (isShooting) return;
    const startX = width / 2;
    const startY = height - 40;
    
    ctx.setLineDash([5, 10]);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(mouseX, mouseY);
    ctx.stroke();
    ctx.setLineDash([]);
}

function shoot() {
    isShooting = true;
    ballsRemaining--;
    
    const startX = width / 2;
    const startY = height - 40;
    const angle = Math.atan2(mouseY - startY, mouseX - startX);
    
    activeBall = {
        x: startX,
        y: startY,
        vx: Math.cos(angle) * 15,
        vy: Math.sin(angle) * 15,
        color: currentBallColor
    };
    
    updateUI();
}

function updateBall() {
    activeBall.x += activeBall.vx;
    activeBall.y += activeBall.vy;

    // Wall bounce
    if (activeBall.x < BUBBLE_RADIUS || activeBall.x > width - BUBBLE_RADIUS) {
        activeBall.vx *= -1;
    }

    drawBubble(activeBall.x, activeBall.y, activeBall.color, 'NORMAL');

    // Simple Collision (Improved)
    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[y].length; x++) {
            if (grid[y][x]) {
                const pos = getPos(x, y);
                const d = Math.sqrt((activeBall.x - pos.x)**2 + (activeBall.y - pos.y)**2);
                if (d < BUBBLE_RADIUS * 1.8) {
                    snap();
                    return;
                }
            }
        }
    }
    
    if (activeBall.y < BUBBLE_RADIUS) snap();
}

function snap() {
    // Find nearest empty spot
    let minDist = Infinity;
    let tx = 0, ty = 0;
    
    for (let y = 0; y < ROWS; y++) {
        if (!grid[y]) grid[y] = [];
        const cols = y % 2 === 0 ? COLUMNS : COLUMNS - 1;
        for (let x = 0; x < cols; x++) {
            const pos = getPos(x, y);
            const d = Math.sqrt((activeBall.x - pos.x)**2 + (activeBall.y - pos.y)**2);
            if (d < minDist) {
                minDist = d; tx = x; ty = y;
            }
        }
    }

    grid[ty][tx] = { type: 'NORMAL', color: activeBall.color };
    processMatches(tx, ty);
    
    activeBall = null;
    isShooting = false;
    prepareNext();
}

function processMatches(x, y) {
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
        matches.forEach(([mx, my]) => {
            spawnPopEffect(getPos(mx, my));
            grid[my][mx] = null;
            if (color === missionColor) missionCurrent++;
        });
        
        fireballCharge++;
        if (fireballCharge >= 6) {
            showReadyAnim();
            fireballCharge = 6;
        }
        
        showCombo(matches.length);
        checkFloating();
    } else {
        fireballCharge = 0;
    }
    updateUI();
}

function getNeighbors(x, y) {
    const offsets = y % 2 === 0 
        ? [[1,0], [-1,0], [0,1], [0,-1], [-1,1], [-1,-1]]
        : [[1,0], [-1,0], [0,1], [0,-1], [1,1], [1,-1]];
    return offsets.map(([ox, oy]) => [x + ox, y + oy]);
}

function checkFloating() {
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
            if (grid[ny] && grid[ny][nx] && !connected.has(`${ny},${nx}`)) {
                connected.add(`${ny},${nx}`);
                queue.push([nx, ny]);
            }
        }
    }

    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[y].length; x++) {
            if (grid[y][x] && !connected.has(`${y},${x}`)) {
                grid[y][x] = null;
            }
        }
    }
}

function spawnPopEffect(pos) {
    const el = document.createElement('div');
    el.className = 'pop-effect';
    el.style.left = pos.x + 'px';
    el.style.top = pos.y + 'px';
    fxLayer.appendChild(el);
    setTimeout(() => el.remove(), 300);
}

function showCombo(count) {
    const el = document.createElement('div');
    el.className = 'combo-popup';
    el.innerText = `COMBO X${count}`;
    el.style.left = '50%';
    el.style.top = '40%';
    fxLayer.appendChild(el);
    setTimeout(() => el.remove(), 1000);
}

function showReadyAnim() {
    const el = document.createElement('div');
    el.id = 'fireball-ready-anim';
    el.innerText = 'READY!';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1000);
}

function updateUI() {
    document.getElementById('balls-text').innerText = ballsRemaining;
    document.getElementById('current-lvl-text').innerText = currentLevel;
    document.getElementById('game-coins').innerText = coins;
    
    // Exact UI has balls count inside a circle at the bottom
    const ballCircle = document.querySelector('.balls-count-circle');
    if (ballCircle) ballCircle.innerText = ballsRemaining;

    document.getElementById('mission-info').innerText = `Target Bubbles: ${missionCurrent} / ${missionTarget}`;
    document.getElementById('mission-color-box').style.background = missionColor;
    
    document.getElementById('active-preview').style.background = currentBallColor;
    document.getElementById('next-preview').style.background = nextBallColor;
    
    const progress = (fireballCharge / 6) * 100;
    document.getElementById('fireball-ring').style.setProperty('--progress', `${progress}%`);
}

function swapBalls() {
    let temp = currentBallColor;
    currentBallColor = nextBallColor;
    nextBallColor = temp;
    updateUI();
}

function prepareNext() {
    currentBallColor = nextBallColor;
    nextBallColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    updateUI();
}

window.onload = init;
window.onresize = resize;
