'use strict';
// ══════════════════════════════════════════
//  BUBBLE SHOOTER - ULTIMATE UNIFIED PRO
//  UI Navigation | BFS Matching | Shop | Gravity
// ══════════════════════════════════════════

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreText = document.getElementById('score');
const nextBubbleEl = document.getElementById('nextBubble');
const popup = document.getElementById('popup');
const coinText = document.getElementById('coins');

const R = 20, rowHeight = 38, SPEED = 16;
const COLORS = ['#ff5c73', '#ffd54f', '#3ddc84', '#42a5ff', '#c76bff'];

// ──────── STATE ────────
let S = {
    score: 0, coins: 2500, currentLevel: 1,
    unlockedLevels: 1, powerups: { BOMB: 2, LIGHTNING: 1, RAINBOW: 3 }
};

let bubbles = [], projectile = null, particles = [], floaters = [];
let mouseX = 195, mouseY = 100, shakeFrames = 0;
let shooterColor = randomColor(), nextColor = randomColor();
let isGameActive = false;

// ──────── UTILS ────────
function randomColor() { return COLORS[Math.floor(Math.random() * COLORS.length)]; }

function showScreen(id) {
    const screens = ['splashScreen', 'homeScreen', 'gameplay-ui', 'shopScreen'];
    screens.forEach(s => {
        const el = document.getElementById(s);
        if (el) el.style.display = (s === id) ? 'flex' : 'none';
    });
    if (id === 'gameplay-ui') isGameActive = true;
    else isGameActive = false;
}

// ──────── GRID & GAMEPLAY ────────
function initLevel(level) {
    bubbles = [];
    S.score = 0; scoreText.innerText = 0;
    const rows = 6 + Math.min(level, 5);
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < 8; col++) {
            const x = col * 44 + 40 + (row % 2 ? 22 : 0);
            const y = row * rowHeight + 40;
            bubbles.push({ x, y, color: randomColor(), alive: true, falling: false });
        }
    }
}

function drawBubble(x, y, color, r = R) {
    ctx.save();
    const grad = ctx.createRadialGradient(x - 8, y - 8, 5, x, y, r);
    grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.2, color); grad.addColorStop(1, '#000');
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = grad; ctx.fill();
    ctx.restore();
}

function drawAimLine() {
    if (projectile || !isGameActive) return;
    const sx = canvas.width / 2, sy = canvas.height - 40;
    const ang = Math.atan2(mouseY - sy, mouseX - sx); if (ang > 0) return;
    ctx.beginPath(); ctx.setLineDash([6, 6]); ctx.moveTo(sx, sy);
    let cx = sx, cy = sy, dx = Math.cos(ang), dy = Math.sin(ang);
    for (let i = 0; i < 20; i++) {
        cx += dx * 20; cy += dy * 20; if (cx < R || cx > canvas.width - R) dx *= -1;
        ctx.lineTo(cx, cy);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 3; ctx.stroke(); ctx.setLineDash([]);
}

// ──────── PRO ENGINE (DFS & Physics) ────────
function getNeighbors(bubble) {
    return bubbles.filter(other => {
        if (other === bubble || !other.alive || other.falling) return false;
        const dist = Math.hypot(other.x - bubble.x, other.y - bubble.y);
        return dist < 48;
    });
}

function getMatchingBubbles(startBubble) {
    const visited = new Set(), matches = [];
    function dfs(bubble) {
        if (!bubble || visited.has(bubble)) return;
        visited.add(bubble); matches.push(bubble);
        getNeighbors(bubble).forEach(neighbor => { if (neighbor.color === startBubble.color) dfs(neighbor); });
    }
    dfs(startBubble);
    return matches;
}

function attachProjectile() {
    const nearest = findNearestSlot(projectile.x, projectile.y);
    const newBubble = { x: nearest.x, y: nearest.y, color: projectile.color, alive: true, falling: false };
    bubbles.push(newBubble);
    const matches = getMatchingBubbles(newBubble);
    if (matches.length >= 3) {
        matches.forEach(b => { b.alive = false; createParticles(b.x, b.y, b.color); S.score += 100; });
        shakeFrames = 15; playPop(); dropFloatingBubbles();
    }
    scoreText.innerText = S.score;
    projectile = null;
    checkWin();
}

function findNearestSlot(x, y) {
    const gridY = Math.round((y - 40) / rowHeight);
    const rowOffset = (gridY % 2) ? 22 : 0;
    const gridX = Math.round((x - 40 - rowOffset) / 44);
    return { x: gridX * 44 + 40 + rowOffset, y: gridY * rowHeight + 40 };
}

function dropFloatingBubbles() {
    const connected = new Set();
    function markConnected(bubble) {
        if (connected.has(bubble)) return;
        connected.add(bubble);
        getNeighbors(bubble).forEach(markConnected);
    }
    bubbles.forEach(bubble => { if (bubble.y < 60 && bubble.alive) markConnected(bubble); });
    bubbles.forEach(bubble => { if (bubble.alive && !connected.has(bubble)) bubble.falling = true; });
}

// ──────── SHOOTING ────────
function shoot() {
    if (projectile || !isGameActive) return;
    initAudio();
    const sx = canvas.width / 2, sy = canvas.height - 40;
    const ang = Math.atan2(mouseY - sy, mouseX - sx); if (ang > 0) return;
    projectile = { x: sx, y: sy, color: shooterColor, vx: Math.cos(ang) * SPEED, vy: Math.sin(ang) * SPEED };
    shooterColor = nextColor; nextColor = randomColor(); nextBubbleEl.style.background = nextColor;
}

function updateProjectile() {
    if (!projectile) return;
    projectile.x += projectile.vx; projectile.y += projectile.vy;
    if (projectile.x < R || projectile.x > canvas.width - R) projectile.vx *= -1;
    drawBubble(projectile.x, projectile.y, projectile.color, 22);

    let hit = false;
    if (projectile.y < R + 20) hit = true;
    else {
        bubbles.forEach(b => { if (b.alive && !b.falling && Math.hypot(b.x - projectile.x, b.y - projectile.y) < 38) hit = true; });
    }
    if (hit) attachProjectile();
    if (projectile && (projectile.y < 0 || projectile.y > canvas.height)) projectile = null;
}

// ──────── VFX ────────
function createParticles(x, y, color) {
    for (let i = 0; i < 10; i++) particles.push({ x, y, dx: (Math.random()-0.5)*8, dy: (Math.random()-0.5)*8, s: Math.random()*5+2, a: 1, c: color });
}
function drawVFX() {
    particles = particles.filter(p => p.a > 0);
    particles.forEach(p => { p.x += p.dx; p.y += p.dy; p.dy += 0.2; p.a -= 0.03; ctx.globalAlpha = p.a; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI*2); ctx.fillStyle = p.c; ctx.fill(); });
    ctx.globalAlpha = 1;
}

// ──────── AUDIO ────────
let audioCtx = null;
function initAudio() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
function playPop() {
    if (!audioCtx) return; const o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.connect(g); g.connect(audioCtx.destination);
    o.frequency.setValueAtTime(600, audioCtx.currentTime); o.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.1);
    g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1); o.start(); o.stop(audioCtx.currentTime + 0.1);
}

// ──────── MAIN LOOP ────────
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    if (shakeFrames > 0) { ctx.translate((Math.random()-0.5)*10, (Math.random()-0.5)*10); shakeFrames--; }
    bubbles.forEach(b => {
        if (b.falling) { b.y += 8; if (b.y > canvas.height) b.alive = false; }
        if (b.alive) drawBubble(b.x, b.y, b.color);
    });
    drawAimLine();
    updateProjectile();
    drawVFX();
    if (isGameActive && !projectile) drawBubble(canvas.width / 2, canvas.height - 40, shooterColor, 24);
    ctx.restore();
    requestAnimationFrame(animate);
}

// ──────── LISTENERS ────────
function startGame() { showScreen('gameplay-ui'); initLevel(S.currentLevel); }
function toggleShop() { const el = document.getElementById('shopScreen'); el.style.display = (el.style.display === 'none') ? 'block' : 'none'; }
function checkWin() { if (bubbles.every(b => !b.alive)) popup.style.display = 'block'; }
function restartGame() { popup.style.display = 'none'; startGame(); }

canvas.addEventListener('mousemove', e => { const r = canvas.getBoundingClientRect(); mouseX = e.clientX - r.left; mouseY = e.clientY - r.top; });
canvas.addEventListener('click', shoot);
canvas.addEventListener('touchstart', e => { e.preventDefault(); shoot(); }, {passive:false});

// Initialize
setTimeout(() => showScreen('homeScreen'), 2200);
nextBubbleEl.style.background = nextColor;
animate();
