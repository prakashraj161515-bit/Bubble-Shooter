'use strict';
// ══════════════════════════════════════════
//  BUBBLE SHOOTER - FULL PROGRESSION ENGINE
//  Level Map | Shop Logic | Settings Sync
// ══════════════════════════════════════════

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreText = document.getElementById('score');
const nextBubbleEl = document.getElementById('nextBubble');
const popup = document.getElementById('popup');
const coinText = document.getElementById('coins');

const R = 20, rowHeight = 38, SPEED = 16;
const COLORS = ['#ff5c73', '#ffd54f', '#3ddc84', '#42a5ff', '#c76bff'];

// ──────── GAME STATE ────────
let S = {
    score: 0, 
    coins: Number(localStorage.getItem('bs_coins')) || 2500, 
    currentLevel: 1,
    unlockedLevels: Number(localStorage.getItem('bs_unlocked')) || 1, 
    powerups: JSON.parse(localStorage.getItem('bs_powers')) || { BOMB: 2, LIGHTNING: 1, RAINBOW: 3 },
    settings: { music: true, sound: true, vibration: true }
};

let bubbles = [], projectile = null, particles = [], floaters = [];
let mouseX = 195, mouseY = 100, shakeFrames = 0;
let shooterColor = randomColor(), nextColor = randomColor();
let isGameActive = false;

// ──────── NAVIGATION ────────
function showScreen(id) {
    const screens = ['splashScreen', 'homeScreen', 'gameplay-ui', 'shopScreen'];
    screens.forEach(s => {
        const el = document.getElementById(s);
        if (el) el.style.display = (s === id) ? 'flex' : 'none';
    });
    isGameActive = (id === 'gameplay-ui');
    if (id === 'homeScreen') updateLevelMap();
    updateUI();
}

function updateUI() {
    coinText.innerText = S.coins;
    document.getElementById('bomb-count').innerText = S.powerups.BOMB;
    localStorage.setItem('bs_coins', S.coins);
    localStorage.setItem('bs_unlocked', S.unlockedLevels);
    localStorage.setItem('bs_powers', JSON.stringify(S.powerups));
}

// ──────── LEVEL SYSTEM ────────
function updateLevelMap() {
    const levels = document.querySelectorAll('.level');
    levels.forEach((el, i) => {
        const lv = i + 1;
        el.className = 'level' + (lv === S.unlockedLevels ? ' level-active' : (lv > S.unlockedLevels ? ' level-locked' : ' level-done'));
        el.onclick = () => { if (lv <= S.unlockedLevels) { S.currentLevel = lv; startGame(); } };
    });
}

function initLevel(level) {
    bubbles = []; S.score = 0; scoreText.innerText = 0;
    const rows = 5 + level; // Level gets harder
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < 8; col++) {
            const x = col * 44 + 40 + (row % 2 ? 22 : 0);
            const y = row * rowHeight + 40;
            bubbles.push({ x, y, color: randomColor(), alive: true, falling: false });
        }
    }
}

function checkWin() {
    if (bubbles.every(b => !b.alive)) {
        if (S.currentLevel === S.unlockedLevels) S.unlockedLevels++;
        S.coins += 500; updateUI();
        popup.style.display = 'block';
        if (S.settings.vibration) vibrate(200);
    }
}

// ──────── SHOP LOGIC ────────
function buyPowerup(type, price) {
    if (S.coins >= price) {
        S.coins -= price; S.powerups[type]++;
        updateUI(); playSound('shoot');
    } else { alert("Not enough coins! 🪙"); }
}

// ──────── GAME ENGINE (Physics & Collision) ────────
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
    const gridY = Math.round((projectile.y - 40) / rowHeight);
    const rowOffset = (gridY % 2) ? 22 : 0;
    const gridX = Math.round((projectile.x - 40 - rowOffset) / 44);
    const nx = gridX * 44 + 40 + rowOffset, ny = gridY * rowHeight + 40;
    
    const newBubble = { x: nx, y: ny, color: projectile.color, alive: true, falling: false };
    bubbles.push(newBubble);
    const matches = getMatchingBubbles(newBubble);
    if (matches.length >= 3) {
        matches.forEach(b => { b.alive = false; createParticles(b.x, b.y, b.color); S.score += 100; });
        shakeFrames = 15; if (S.settings.sound) playPop(); dropFloatingBubbles();
    }
    scoreText.innerText = S.score; projectile = null; checkWin();
}

function dropFloatingBubbles() {
    const connected = new Set();
    function markConnected(bubble) {
        if (connected.has(bubble)) return;
        connected.add(bubble); getNeighbors(bubble).forEach(markConnected);
    }
    bubbles.forEach(bubble => { if (bubble.y < 60 && bubble.alive) markConnected(bubble); });
    bubbles.forEach(bubble => { if (bubble.alive && !connected.has(bubble)) bubble.falling = true; });
}

function shoot() {
    if (projectile || !isGameActive) return;
    initAudio();
    const sx = canvas.width / 2, sy = canvas.height - 40;
    const ang = Math.atan2(mouseY - sy, mouseX - sx); if (ang > 0) return;
    projectile = { x: sx, y: sy, color: shooterColor, vx: Math.cos(ang) * SPEED, vy: Math.sin(ang) * SPEED };
    shooterColor = nextColor; nextColor = randomColor(); nextBubbleEl.style.background = nextColor;
    if (S.settings.sound) playSound('shoot');
}

// ──────── VFX & SFX ────────
function createParticles(x, y, color) {
    for (let i = 0; i < 10; i++) particles.push({ x, y, dx: (Math.random()-0.5)*8, dy: (Math.random()-0.5)*8, s: Math.random()*5+2, a: 1, c: color });
}
function drawVFX() {
    particles = particles.filter(p => p.a > 0);
    particles.forEach(p => { p.x += p.dx; p.y += p.dy; p.dy += 0.2; p.a -= 0.03; ctx.globalAlpha = p.a; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI*2); ctx.fillStyle = p.c; ctx.fill(); });
    ctx.globalAlpha = 1;
}

let audioCtx = null;
function initAudio() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
function playPop() {
    if (!audioCtx || !S.settings.sound) return; const o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.connect(g); g.connect(audioCtx.destination);
    o.frequency.setValueAtTime(600, audioCtx.currentTime); o.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.1);
    g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1); o.start(); o.stop(audioCtx.currentTime + 0.1);
}
function playSound(type) {
    if (!audioCtx || !S.settings.sound) return; const o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.connect(g); g.connect(audioCtx.destination);
    o.frequency.setValueAtTime(300, audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05); o.start(); o.stop(audioCtx.currentTime + 0.05);
}
function vibrate(ms) { if (S.settings.vibration && navigator.vibrate) navigator.vibrate(ms); }

// ──────── CORE LOOP ────────
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.save();
    if (shakeFrames > 0) { ctx.translate((Math.random()-0.5)*10, (Math.random()-0.5)*10); shakeFrames--; }
    bubbles.forEach(b => { if (b.falling) { b.y += 8; if (b.y > canvas.height) b.alive = false; } if (b.alive) drawBubble(b.x, b.y, b.color); });
    drawAimLine(); if (projectile) { projectile.x += projectile.vx; projectile.y += projectile.vy; if (projectile.x < R || projectile.x > canvas.width - R) projectile.vx *= -1; drawBubble(projectile.x, projectile.y, projectile.color, 22); let hit = false; if (projectile.y < R + 20) hit = true; else bubbles.forEach(b => { if (b.alive && !b.falling && Math.hypot(b.x - projectile.x, b.y - projectile.y) < 38) hit = true; }); if (hit) attachProjectile(); if (projectile && (projectile.y < 0 || projectile.y > canvas.height)) projectile = null; }
    drawVFX(); if (isGameActive && !projectile) drawBubble(canvas.width / 2, canvas.height - 40, shooterColor, 24);
    ctx.restore(); requestAnimationFrame(animate);
}

// ──────── INTERFACE ────────
function startGame() { showScreen('gameplay-ui'); initLevel(S.currentLevel); }
function toggleShop() { const el = document.getElementById('shopScreen'); el.style.display = (el.style.display === 'none') ? 'block' : 'none'; }
function restartGame() { popup.style.display = 'none'; startGame(); }

canvas.addEventListener('mousemove', e => { const r = canvas.getBoundingClientRect(); mouseX = e.clientX - r.left; mouseY = e.clientY - r.top; });
canvas.addEventListener('click', shoot);
canvas.addEventListener('touchstart', e => { e.preventDefault(); shoot(); }, {passive:false});

// Settings Handlers
document.querySelectorAll('input[type="checkbox"]').forEach((cb, i) => {
    cb.onchange = () => { const keys = ['music', 'sound', 'vibration']; S.settings[keys[i]] = cb.checked; };
});

setTimeout(() => showScreen('homeScreen'), 2200);
nextBubbleEl.style.background = nextColor;
animate(); updateUI();
