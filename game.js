'use strict';
// ══════════════════════════════════════════
//  BUBBLE SHOOTER PREMIUM — game.js v14
//  Light UI | Instant Play | Floating Shop
// ══════════════════════════════════════════

let canvas, ctx, scoreVal, currentBallEl, nextBallEl, goalText, heartText;
const R = 20, rowHeight = 38, SPEED = 16;
const COLORS = ['#ff5c73', '#ffd54f', '#3ddc84', '#42a5ff', '#c76bff'];

let S = {
    score: 0, coins: 1250, hearts: 5, lastHeartTime: Date.now(),
    currentLevel: 4, unlockedLevels: 4,
    powerups: { BOMB: 2, COLOR: 1, FIRE: 1 },
    settings: { sound: true, music: true, vibration: true }
};

let bubbles = [], projectile = null, particles = [], floaters = [];
let mouseX = 195, mouseY = 100, shakeFrames = 0;
let activeColor = COLORS[0], reserveColor = COLORS[1];
let isGameActive = false;

// ──────── NAVIGATION ────────
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    const target = document.getElementById(id);
    if (target) {
        target.classList.remove('hidden');
        isGameActive = (id === 'gameplayScreen');
        updateUI();
    }
}

function toggleShop() {
    const el = document.getElementById('shopScreen');
    if(el.classList.contains('hidden')) el.classList.remove('hidden');
    else el.classList.add('hidden');
}

// ──────── INITIALIZATION ────────
function init() {
    canvas = document.getElementById('gameCanvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    scoreVal = document.getElementById('score');
    currentBallEl = document.getElementById('currentBall');
    nextBallEl = document.getElementById('nextBall');
    goalText = document.getElementById('goal-val');
    heartText = document.getElementById('heart-status');

    loadState();
    initFloaters();
    animate();
    
    // Direct transition from Splash to Map
    setTimeout(() => {
        const splash = document.getElementById('splashScreen');
        if(splash) splash.style.opacity = '0';
        setTimeout(() => showScreen('mapScreen'), 500);
    }, 2000);

    // Event Listeners
    canvas.addEventListener('mousemove', e => { 
        const r = canvas.getBoundingClientRect(); mouseX = e.clientX - r.left; mouseY = e.clientY - r.top; 
    });
    canvas.addEventListener('click', shoot);
    canvas.addEventListener('touchstart', e => { 
        e.preventDefault(); const r = canvas.getBoundingClientRect(); 
        mouseX = e.touches[0].clientX - r.left; mouseY = e.touches[0].clientY - r.top; shoot(); 
    }, {passive:false});
}

// ──────── GAMEPLAY ────────
function startGame() {
    showScreen('gameplayScreen');
    bubbles = []; S.score = 0; updateUI();
    const rows = 10;
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < 8; col++) {
            const x = col * 44 + 40 + (row % 2 ? 22 : 0);
            const y = row * rowHeight + 40;
            bubbles.push({ x, y, color: COLORS[Math.floor(Math.random()*COLORS.length)], alive: true, falling: false });
        }
    }
    prepNext();
}

function updateUI() {
    if(scoreVal) scoreVal.innerText = S.score;
    if(heartText) heartText.innerText = S.hearts === 5 ? "FULL" : S.hearts;
    const mapCoins = document.getElementById('map-coins');
    if(mapCoins) mapCoins.innerText = S.coins;
    saveState();
}

function shoot() {
    if (projectile || !isGameActive) return;
    initAudio();
    const sx = canvas.width / 2, sy = canvas.height - 40;
    const ang = Math.atan2(mouseY - sy, mouseX - sx); if (ang > 0) return;
    projectile = { x: sx, y: sy, color: activeColor, vx: Math.cos(ang) * SPEED, vy: Math.sin(ang) * SPEED };
    prepNext();
    if(S.settings.sound) playSFX('shoot');
}

function snap() {
    const gridY = Math.round((projectile.y - 40) / rowHeight);
    const rowOff = (gridY % 2) ? 22 : 0;
    const gridX = Math.round((projectile.x - 40 - rowOff) / 44);
    const nx = gridX * 44 + 40 + rowOff, ny = gridY * rowHeight + 40;
    
    const newB = { x: nx, y: ny, color: projectile.color, alive: true, falling: false };
    bubbles.push(newB);
    
    const visited = new Set(), matches = [];
    function dfs(b) {
        if(!b || visited.has(b)) return;
        visited.add(b); matches.push(b);
        bubbles.filter(o => o.alive && !o.falling && Math.hypot(o.x-b.x, o.y-b.y) < 48).forEach(n => {
            if(n.color === newB.color) dfs(n);
        });
    }
    dfs(newB);
    
    if (matches.length >= 3) {
        matches.forEach(b => { b.alive = false; createParticles(b.x, b.y, b.color); S.score += 100; });
        shakeFrames = 15; if(S.settings.sound) playSFX('pop');
        // Gravity
        const con = new Set();
        function mark(b) { if(con.has(b)) return; con.add(b); bubbles.filter(o => o.alive && !o.falling && Math.hypot(o.x-b.x, o.y-b.y) < 48).forEach(mark); }
        bubbles.filter(b => b.y < 60 && b.alive).forEach(mark);
        bubbles.forEach(b => { if(b.alive && !con.has(b)) b.falling = true; });
    }
    updateUI(); projectile = null;
    if(bubbles.every(b => !b.alive)) showScreen('mapScreen');
}

function prepNext() {
    activeColor = reserveColor; reserveColor = COLORS[Math.floor(Math.random()*COLORS.length)];
    if(currentBallEl) currentBallEl.style.background = activeColor;
    if(nextBallEl) nextBallEl.style.background = reserveColor;
}

// ──────── ENGINE ────────
function drawBall(x, y, color, r = R) {
    ctx.save();
    const grad = ctx.createRadialGradient(x-8, y-8, 5, x, y, r);
    grad.addColorStop(0, '#fff'); grad.addColorStop(0.2, color); grad.addColorStop(1, '#000');
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fillStyle = grad; ctx.fill(); ctx.restore();
}

function animate() {
    if(!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.save();
    if (shakeFrames > 0) { ctx.translate((Math.random()-0.5)*10, (Math.random()-0.5)*10); shakeFrames--; }
    drawFloaters();
    bubbles.forEach(b => { if (b.falling) { b.y += 10; if (b.y > canvas.height) b.alive = false; } if (b.alive) drawBall(b.x, b.y, b.color); });
    if (projectile) {
        projectile.x += projectile.vx; projectile.y += projectile.vy;
        if (projectile.x < R || projectile.x > canvas.width - R) projectile.vx *= -1;
        drawBall(projectile.x, projectile.y, projectile.color, 22);
        let hit = false; if (projectile.y < R + 20) hit = true; else bubbles.forEach(b => { if (b.alive && !b.falling && Math.hypot(b.x - projectile.x, b.y - projectile.y) < 38) hit = true; });
        if (hit) snap(); if (projectile && projectile.y > canvas.height) projectile = null;
    }
    drawVFX();
    if (isGameActive && !projectile) {
        const sx = canvas.width/2, sy = canvas.height-40, ang = Math.atan2(mouseY-sy, mouseX-sx);
        if (ang < 0) { ctx.beginPath(); ctx.setLineDash([5, 10]); ctx.moveTo(sx, sy); ctx.lineTo(sx+Math.cos(ang)*200, sy+Math.sin(ang)*200); ctx.strokeStyle='rgba(255,255,255,0.4)'; ctx.stroke(); ctx.setLineDash([]); }
    }
    ctx.restore(); requestAnimationFrame(animate);
}

// ──────── UTILS ────────
function createParticles(x, y, color) { for (let i = 0; i < 8; i++) particles.push({ x, y, dx: (Math.random()-0.5)*6, dy: (Math.random()-0.5)*6, s: Math.random()*5+2, a: 1, c: color }); }
function drawVFX() { particles = particles.filter(p => p.a > 0); particles.forEach(p => { p.x += p.dx; p.y += p.dy; p.dy += 0.15; p.a -= 0.03; ctx.globalAlpha = p.a; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI*2); ctx.fillStyle = p.c; ctx.fill(); }); ctx.globalAlpha = 1; }
function initFloaters() { for (let i = 0; i < 15; i++) floaters.push({ x: Math.random()*390, y: Math.random()*844, r: Math.random()*5+1, s: Math.random()*0.5+0.2 }); }
function drawFloaters() { floaters.forEach(f => { f.y -= f.s; if (f.y < -20) f.y = 860; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI*2); ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fill(); }); }

let audioCtx = null;
function initAudio() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
function playSFX(type) {
    if (!audioCtx || !S.settings.sound) return; const o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.connect(g); g.connect(audioCtx.destination);
    if(type === 'pop') { o.frequency.setValueAtTime(600, audioCtx.currentTime); o.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.1); g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1); o.start(); o.stop(audioCtx.currentTime + 0.1); }
    else { o.frequency.setValueAtTime(300, audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05); o.start(); o.stop(audioCtx.currentTime + 0.05); }
}

function saveState() { localStorage.setItem('bs_premium_v14', JSON.stringify(S)); }
function loadState() { const s = localStorage.getItem('bs_premium_v14'); if(s) S = JSON.parse(s); }

document.addEventListener('DOMContentLoaded', init);
