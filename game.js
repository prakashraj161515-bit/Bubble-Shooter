'use strict';
// ══════════════════════════════════════════
//  BUBBLE SHOOTER PREMIUM — game.js v16
//  Dynamic Winding Path | 5000 Levels
// ══════════════════════════════════════════

let canvas, ctx, scoreVal, currentBallEl, nextBallEl, ammoText, levelDisplay;
const R = 20, rowHeight = 38, SPEED = 16;
const COLORS = ['#ffb3ba', '#ffdfba', '#ffffba', '#baffc9', '#bae1ff', '#e1baff'];

let S = {
    score: 0, coins: 1250, ammo: 50,
    currentLevel: Number(localStorage.getItem('bs_level')) || 1,
    unlockedLevels: Number(localStorage.getItem('bs_unlocked')) || 1,
    consecutiveFails: 0,
    settings: { sound: true, music: true }
};

let bubbles = [], projectile = null, particles = [], floaters = [];
let mouseX = 195, mouseY = 100, shakeFrames = 0;
let activeColor = COLORS[0], reserveColor = COLORS[1];
let isGameActive = false;

// ──────── NAVIGATION ────────
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    const target = document.getElementById(id);
    if (target) target.classList.remove('hidden');
    isGameActive = (id === 'gameplayScreen');
    if (id === 'mapScreen') renderMap();
    updateUI();
}

function toggleShop() {
    const el = document.getElementById('shopScreen');
    el.classList.toggle('hidden');
}

// ──────── RENDER MAP (5000 Levels) ────────
function renderMap() {
    const path = document.getElementById('levelPath');
    if (!path) return;
    path.innerHTML = '';
    
    // We render up to 20 levels ahead of the current unlocked level
    const maxToRender = Math.min(S.unlockedLevels + 20, 5000);
    
    for (let i = 1; i <= maxToRender; i++) {
        const node = document.createElement('div');
        node.className = 'node';
        if (i < S.unlockedLevels) node.classList.add('done');
        else if (i === S.unlockedLevels) node.classList.add('active');
        else node.classList.add('locked');
        
        node.innerHTML = `<span>${i}</span>`;
        if (i <= S.unlockedLevels) {
            node.onclick = () => { S.currentLevel = i; startGame(); };
        }
        path.appendChild(node);
    }
    
    // Auto-scroll to current level
    setTimeout(() => {
        const activeNode = document.querySelector('.node.active');
        if (activeNode) activeNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
}

// ──────── INITIALIZATION ────────
function init() {
    canvas = document.getElementById('gameCanvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    scoreVal = document.getElementById('score');
    currentBallEl = document.getElementById('currentBall');
    nextBallEl = document.getElementById('nextBall');
    ammoText = document.getElementById('ammo-val');
    levelDisplay = document.getElementById('level-display');

    loadState();
    initFloaters();
    animate();
    
    // Splash logic
    setTimeout(() => {
        const splash = document.getElementById('splashScreen');
        if(splash) splash.style.opacity = '0';
        setTimeout(() => {
            if(splash) splash.style.display = 'none';
            showScreen('mapScreen');
        }, 500);
    }, 2000);

    canvas.addEventListener('mousemove', e => { 
        const r = canvas.getBoundingClientRect(); mouseX = e.clientX - r.left; mouseY = e.clientY - r.top; 
    });
    canvas.addEventListener('click', shoot);
    canvas.addEventListener('touchstart', e => { 
        e.preventDefault(); const r = canvas.getBoundingClientRect(); 
        mouseX = e.touches[0].clientX - r.left; mouseY = e.touches[0].clientY - r.top; shoot(); 
    }, {passive:false});
}

function startGame() {
    showScreen('gameplayScreen');
    S.ammo = 50; S.score = 0;
    bubbles = [];
    if(levelDisplay) levelDisplay.innerText = S.currentLevel;
    
    // Level generation logic (Slightly harder as levels go up)
    let rows = Math.min(6 + Math.floor(S.currentLevel / 50), 12);
    let colorCount = Math.min(3 + Math.floor(S.currentLevel / 100), COLORS.length);
    if (S.consecutiveFails > 2) { rows--; colorCount--; }
    const activeColors = COLORS.slice(0, colorCount);

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < 8; col++) {
            const x = col * 44 + 40 + (row % 2 ? 22 : 0);
            const y = row * rowHeight + 40;
            bubbles.push({ x, y, color: activeColors[Math.floor(Math.random()*activeColors.length)], alive: true, falling: false });
        }
    }
    prepNext();
    updateUI();
}

function updateUI() {
    if(scoreVal) scoreVal.innerText = S.score;
    if(ammoText) ammoText.innerText = S.ammo;
    const mc = document.getElementById('map-coins');
    if(mc) mc.innerText = S.coins;
    saveState();
}

function shoot() {
    if (projectile || !isGameActive || S.ammo <= 0) return;
    initAudio();
    const sx = canvas.width / 2, sy = canvas.height - 40;
    const ang = Math.atan2(mouseY - sy, mouseX - sx); if (ang > 0) return;
    projectile = { x: sx, y: sy, color: activeColor, vx: Math.cos(ang) * SPEED, vy: Math.sin(ang) * SPEED };
    S.ammo--; updateUI(); prepNext();
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
        if(!b || visited.has(b)) return; visited.add(b); matches.push(b);
        bubbles.filter(o => o.alive && !o.falling && Math.hypot(o.x-b.x, o.y-b.y) < 48).forEach(n => { if(n.color === newB.color) dfs(n); });
    }
    dfs(newB);
    if (matches.length >= 3) {
        matches.forEach(b => { b.alive = false; createParticles(b.x, b.y, b.color); S.score += 100; });
        shakeFrames = 15; if(S.settings.sound) playSFX('pop');
        const con = new Set();
        function mark(b) { if(con.has(b)) return; con.add(b); bubbles.filter(o => o.alive && !o.falling && Math.hypot(o.x-b.x, o.y-b.y) < 48).forEach(mark); }
        bubbles.filter(b => b.y < 60 && b.alive).forEach(mark);
        bubbles.forEach(b => { if(b.alive && !con.has(b)) b.falling = true; });
    }
    projectile = null;
    checkEnd();
}

function checkEnd() {
    const remaining = bubbles.filter(b => b.alive);
    if (remaining.length === 0) {
        S.consecutiveFails = 0; S.coins += 100;
        if (S.currentLevel === S.unlockedLevels) S.unlockedLevels++;
        alert("LEVEL CLEAR! 🎉"); showScreen('mapScreen');
    } else if (S.ammo <= 0 && !projectile) {
        S.consecutiveFails++; alert("OUT OF BALLS! ❌ Try Again."); showScreen('mapScreen');
    }
}

function prepNext() {
    activeColor = reserveColor; reserveColor = COLORS[Math.floor(Math.random()*COLORS.length)];
    if(currentBallEl) currentBallEl.style.background = activeColor;
    if(nextBallEl) nextBallEl.style.background = reserveColor;
}

// ──────── ENGINE ────────
function drawBall(x, y, color, r = R) {
    ctx.save();
    const grad = ctx.createRadialGradient(x-5, y-5, 2, x, y, r);
    grad.addColorStop(0, '#fff'); grad.addColorStop(0.3, color); grad.addColorStop(1, shadeColor(color, -20));
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fillStyle = grad; ctx.fill(); ctx.restore();
}
function shadeColor(color, percent) {
    let f=parseInt(color.slice(1),16),t=percent<0?0:255,p=percent<0?percent*-1:percent,R=f>>16,G=f>>8&0x00FF,B=f&0x0000FF;
    return "#"+(0x1000000+(Math.round((t-R)*p/100)+R)*0x10000+(Math.round((t-G)*p/100)+G)*0x100+(Math.round((t-B)*p/100)+B)).toString(16).slice(1);
}
function animate() {
    if(!ctx) return; ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.save();
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
        if (ang < 0) { ctx.beginPath(); ctx.setLineDash([5, 10]); ctx.moveTo(sx, sy); ctx.lineTo(sx+Math.cos(ang)*200, sy+Math.sin(ang)*200); ctx.strokeStyle='rgba(0,0,0,0.1)'; ctx.stroke(); ctx.setLineDash([]); }
    }
    ctx.restore(); requestAnimationFrame(animate);
}
function createParticles(x, y, color) { for (let i = 0; i < 8; i++) particles.push({ x, y, dx: (Math.random()-0.5)*6, dy: (Math.random()-0.5)*6, s: Math.random()*5+2, a: 1, c: color }); }
function drawVFX() { particles = particles.filter(p => p.a > 0); particles.forEach(p => { p.x += p.dx; p.y += p.dy; p.dy += 0.15; p.a -= 0.03; ctx.globalAlpha = p.a; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI*2); ctx.fillStyle = p.c; ctx.fill(); }); ctx.globalAlpha = 1; }
function initFloaters() { for (let i = 0; i < 15; i++) floaters.push({ x: Math.random()*390, y: Math.random()*844, r: Math.random()*5+1, s: Math.random()*0.5+0.2 }); }
function drawFloaters() { floaters.forEach(f => { f.y -= f.s; if (f.y < -20) f.y = 860; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI*2); ctx.fillStyle = 'rgba(0,0,0,0.02)'; ctx.fill(); }); }
let audioCtx = null;
function initAudio() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
function playSFX(type) { if (!audioCtx) return; const o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.connect(g); g.connect(audioCtx.destination); if(type === 'pop') { o.frequency.setValueAtTime(600, audioCtx.currentTime); o.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime+0.1); g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime+0.1); o.start(); o.stop(audioCtx.currentTime+0.1); } }
function saveState() { localStorage.setItem('bs_level', S.currentLevel); localStorage.setItem('bs_unlocked', S.unlockedLevels); localStorage.setItem('bs_coins', S.coins); }
function loadState() { const l = localStorage.getItem('bs_level'); if(l) S.currentLevel = Number(l); const u = localStorage.getItem('bs_unlocked'); if(u) S.unlockedLevels = Number(u); const c = localStorage.getItem('bs_coins'); if(c) S.coins = Number(c); }
document.addEventListener('DOMContentLoaded', init);
