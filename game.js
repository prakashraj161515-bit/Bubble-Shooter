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
    ctx.fillStyle = color;
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
    // Logic to find nearest grid cell and place ball
    // For now, let's just reset shooting
    activeBall = null;
    isShooting = false;
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
