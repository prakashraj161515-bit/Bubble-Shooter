'use strict';
// ══════════════════════════════════════════
//  BUBBLE SHOOTER - ROBUST ENGINE FIX
//  Safe Init | Error Guard | Auto-Transition
// ══════════════════════════════════════════

let canvas, ctx, scoreText, nextBubbleEl, popup, coinText;
const R = 20, rowHeight = 38, SPEED = 16;
const COLORS = ['#ff5c73', '#ffd54f', '#3ddc84', '#42a5ff', '#c76bff'];

// ──────── SAFE STATE LOAD ────────
let S = {
    score: 0, coins: 2500, currentLevel: 1, unlockedLevels: 1,
    powerups: { BOMB: 2, LIGHTNING: 1, RAINBOW: 3 },
    settings: { music: true, sound: true, vibration: true }
};

function loadData() {
    try {
        const c = localStorage.getItem('bs_coins'); if(c) S.coins = Number(c);
        const u = localStorage.getItem('bs_unlocked'); if(u) S.unlockedLevels = Number(u);
        const p = localStorage.getItem('bs_powers'); if(p) S.powerups = JSON.parse(p);
    } catch(e) { console.error("Data load failed", e); }
}

let bubbles = [], projectile = null, particles = [], floaters = [];
let mouseX = 195, mouseY = 100, shakeFrames = 0;
let shooterColor = COLORS[0], nextColor = COLORS[1];
let isGameActive = false;

// ──────── NAVIGATION ────────
function showScreen(id) {
    const screens = ['splashScreen', 'homeScreen', 'gameplay-ui', 'shopScreen'];
    screens.forEach(s => {
        const el = document.getElementById(s);
        if (el) el.style.display = (s === id) ? (s==='gameplay-ui'?'flex':'flex') : 'none';
        // Note: Using flex instead of block for better alignment
    });
    
    const h = document.getElementById('homeScreen');
    if(id === 'homeScreen') {
        h.style.display = 'flex';
        updateLevelMap();
    }
    
    isGameActive = (id === 'gameplay-ui');
    updateUI();
}

function updateUI() {
    if(coinText) coinText.innerText = S.coins;
    const bc = document.getElementById('bomb-count');
    if(bc) bc.innerText = S.powerups.BOMB;
    
    try {
        localStorage.setItem('bs_coins', S.coins);
        localStorage.setItem('bs_unlocked', S.unlockedLevels);
        localStorage.setItem('bs_powers', JSON.stringify(S.powerups));
    } catch(e){}
}

// ──────── INITIALIZATION ────────
function init() {
    canvas = document.getElementById('gameCanvas');
    if(!canvas) return;
    ctx = canvas.getContext('2d');
    scoreText = document.getElementById('score');
    nextBubbleEl = document.getElementById('nextBubble');
    popup = document.getElementById('popup');
    coinText = document.getElementById('coins');

    loadData();
    shooterColor = randomColor();
    nextColor = randomColor();
    if(nextBubbleEl) nextBubbleEl.style.background = nextColor;

    initFloaters();
    animate();
    
    // Auto-transition from Splash to Home after 2.2s
    setTimeout(() => {
        const splash = document.getElementById('splashScreen');
        if(splash) splash.style.opacity = '0';
        setTimeout(() => showScreen('homeScreen'), 500);
    }, 2200);

    // Listeners
    canvas.addEventListener('mousemove', e => { const r = canvas.getBoundingClientRect(); mouseX = e.clientX - r.left; mouseY = e.clientY - r.top; });
    canvas.addEventListener('click', shoot);
    canvas.addEventListener('touchstart', e => { e.preventDefault(); const r = canvas.getBoundingClientRect(); mouseX = e.touches[0].clientX - r.left; mouseY = e.touches[0].clientY - r.top; shoot(); }, {passive:false});
}

// ──────── GRID & PROGRESSION ────────
function updateLevelMap() {
    const levels = document.querySelectorAll('.level');
    levels.forEach((el, i) => {
        const lv = i + 1;
        if(lv < S.unlockedLevels) el.className = 'level level-done';
        else if(lv === S.unlockedLevels) el.className = 'level level-active';
        else el.className = 'level level-locked';
        
        el.onclick = () => { if (lv <= S.unlockedLevels) { S.currentLevel = lv; startGame(); } };
    });
}

function initLevel(level) {
    bubbles = []; S.score = 0; if(scoreText) scoreText.innerText = 0;
    const rows = 5 + Math.min(level, 10);
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < 8; col++) {
            const x = col * 44 + 40 + (row % 2 ? 22 : 0);
            const y = row * rowHeight + 40;
            bubbles.push({ x, y, color: randomColor(), alive: true, falling: false });
        }
    }
}

function startGame() { showScreen('gameplay-ui'); initLevel(S.currentLevel); }
function restartGame() { if(popup) popup.style.display = 'none'; startGame(); }
function toggleShop() { 
    const el = document.getElementById('shopScreen'); 
    if(el) el.style.display = (el.style.display === 'none' || el.style.display === '') ? 'flex' : 'none'; 
}

function randomColor() { return COLORS[Math.floor(Math.random() * COLORS.length)]; }

// ──────── CORE GAME ENGINE ────────
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

function shoot() {
    if (projectile || !isGameActive) return;
    initAudio();
    const sx = canvas.width / 2, sy = canvas.height - 40;
    const ang = Math.atan2(mouseY - sy, mouseX - sx); if (ang > 0) return;
    projectile = { x: sx, y: sy, color: shooterColor, vx: Math.cos(ang) * SPEED, vy: Math.sin(ang) * SPEED };
    shooterColor = nextColor; nextColor = randomColor(); if(nextBubbleEl) nextBubbleEl.style.background = nextColor;
    if (S.settings.sound) playSound('shoot');
}

function attachProjectile() {
    const gridY = Math.round((projectile.y - 40) / rowHeight);
    const rowOffset = (gridY % 2) ? 22 : 0;
    const gridX = Math.round((projectile.x - 40 - rowOffset) / 44);
    const nx = gridX * 44 + 40 + rowOffset, ny = gridY * rowHeight + 40;
    
    const newBubble = { x: nx, y: ny, color: projectile.color, alive: true, falling: false };
    bubbles.push(newBubble);
    
    // Match-3 Logic
    const visited = new Set(), matches = [];
    function dfs(b) {
        if (!b || visited.has(b)) return;
        visited.add(b); matches.push(b);
        bubbles.filter(o => o.alive && !o.falling && Math.hypot(o.x-b.x, o.y-b.y) < 48).forEach(n => {
            if(n.color === newBubble.color) dfs(n);
        });
    }
    dfs(newBubble);
    
    if (matches.length >= 3) {
        matches.forEach(b => { b.alive = false; createParticles(b.x, b.y, b.color); S.score += 100; });
        shakeFrames = 15; if (S.settings.sound) playPop(); 
        
        // Float Check
        const con = new Set();
        function mark(b) { if(con.has(b)) return; con.add(b); bubbles.filter(o => o.alive && !o.falling && Math.hypot(o.x-b.x, o.y-b.y) < 48).forEach(mark); }
        bubbles.filter(b => b.y < 60 && b.alive).forEach(mark);
        bubbles.forEach(b => { if(b.alive && !con.has(b)) b.falling = true; });
    }
    if(scoreText) scoreText.innerText = S.score; projectile = null; 
    if (bubbles.every(b => !b.alive)) { if (S.currentLevel === S.unlockedLevels) S.unlockedLevels++; S.coins += 500; updateUI(); if(popup) popup.style.display = 'flex'; }
}

function buyPowerup(type, price) {
    if (S.coins >= price) { S.coins -= price; S.powerups[type]++; updateUI(); playSound('shoot'); }
    else { alert("Not enough coins! 🪙"); }
}

// ──────── VFX & SFX ────────
function createParticles(x, y, color) { for (let i = 0; i < 10; i++) particles.push({ x, y, dx: (Math.random()-0.5)*8, dy: (Math.random()-0.5)*8, s: Math.random()*5+2, a: 1, c: color }); }
function drawVFX() {
    particles = particles.filter(p => p.a > 0);
    particles.forEach(p => { p.x += p.dx; p.y += p.dy; p.dy += 0.2; p.a -= 0.03; ctx.globalAlpha = p.a; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI*2); ctx.fillStyle = p.c; ctx.fill(); });
    ctx.globalAlpha = 1;
}
function initFloaters() { for (let i = 0; i < 15; i++) floaters.push({ x: Math.random() * 400, y: Math.random() * 800, r: Math.random() * 5 + 1, s: Math.random() * 0.5 + 0.2 }); }
function drawFloaters() { floaters.forEach(f => { f.y -= f.s; if (f.y < -20) f.y = 860; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fill(); }); }

let audioCtx = null;
function initAudio() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
function playPop() {
    if (!audioCtx || !S.settings.sound) return; const o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.connect(g); g.connect(audioCtx.destination);
    o.frequency.setValueAtTime(600, audioCtx.currentTime); o.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.1);
    g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1); o.start(); o.stop(audioCtx.currentTime + 0.1);
}
function playSound(type) {
    if (!audioCtx || !S.settings.sound) return; const o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.connect(g); g.connect(audioCtx.destination);
    o.frequency.setValueAtTime(300, audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05); o.start(); o.stop(audioCtx.currentTime + 0.05); }

function animate() {
    if(!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.save();
    if (shakeFrames > 0) { ctx.translate((Math.random()-0.5)*10, (Math.random()-0.5)*10); shakeFrames--; }
    drawFloaters();
    bubbles.forEach(b => { if (b.falling) { b.y += 8; if (b.y > canvas.height) b.alive = false; } if (b.alive) drawBubble(b.x, b.y, b.color); });
    drawAimLine();
    if (projectile) {
        projectile.x += projectile.vx; projectile.y += projectile.vy;
        if (projectile.x < R || projectile.x > canvas.width - R) projectile.vx *= -1;
        drawBubble(projectile.x, projectile.y, projectile.color, 22);
        let hit = false;
        if (projectile.y < R + 20) hit = true;
        else bubbles.forEach(b => { if (b.alive && !b.falling && Math.hypot(b.x - projectile.x, b.y - projectile.y) < 38) hit = true; });
        if (hit) attachProjectile();
        if (projectile && (projectile.y < 0 || projectile.y > canvas.height)) projectile = null;
    }
    drawVFX();
    if (isGameActive && !projectile) drawBubble(canvas.width / 2, canvas.height - 40, shooterColor, 24);
    ctx.restore(); requestAnimationFrame(animate);
}

// Start once DOM is ready
document.addEventListener('DOMContentLoaded', init);
