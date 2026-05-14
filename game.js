'use strict';
// ══════════════════════════════════════════
//  BUBBLE SHOOTER PREMIUM — game.js v10
//  Advanced Navigation | Pro Engine | Shop
// ══════════════════════════════════════════

let canvas, ctx, scoreVal, currentB, nextB, goalVal;
const R = 20, rowHeight = 38, SPEED = 16;
const COLORS = ['#ff5c73', '#ffd54f', '#3ddc84', '#42a5ff', '#c76bff'];

// ──────── STATE ────────
let S = {
    score: 0, coins: 1250, currentLevel: 4, unlockedLevels: 4,
    powerups: { BOMB: 2, COLOR: 1 },
    settings: { sound: true, music: true, vibration: true }
};

let bubbles = [], projectile = null, particles = [], floaters = [];
let mouseX = 195, mouseY = 100, shakeFrames = 0;
let activeColor = COLORS[0], reserveColor = COLORS[1];
let isGameActive = false;

// ──────── NAVIGATION ────────
function showScreen(id) {
    const screens = ['splashScreen', 'mainMenu', 'mapScreen', 'gameplayScreen', 'shopScreen', 'spinScreen', 'achievementsScreen', 'settingsPanel'];
    screens.forEach(s => {
        const el = document.getElementById(s);
        if (el) el.classList.add('hidden');
    });
    
    const target = document.getElementById(id);
    if (target) {
        target.classList.remove('hidden');
        if (id === 'gameplayScreen') startGameplay();
        else isGameActive = false;
    }
}

// ──────── INITIALIZATION ────────
function init() {
    canvas = document.getElementById('gameCanvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    scoreVal = document.getElementById('score');
    currentB = document.getElementById('currentBubble');
    nextB = document.getElementById('nextBubble');
    goalVal = document.getElementById('goal-val');

    loadState();
    initFloaters();
    animate();
    
    // Auto Splash to Menu
    setTimeout(() => showScreen('mainMenu'), 2500);

    // Listeners
    canvas.addEventListener('mousemove', e => { 
        const r = canvas.getBoundingClientRect(); 
        mouseX = e.clientX - r.left; 
        mouseY = e.clientY - r.top; 
    });
    canvas.addEventListener('click', shoot);
    canvas.addEventListener('touchstart', e => { 
        e.preventDefault(); 
        const r = canvas.getBoundingClientRect(); 
        mouseX = e.touches[0].clientX - r.left; 
        mouseY = e.touches[0].clientY - r.top; 
        shoot(); 
    }, {passive:false});
}

// ──────── GAMEPLAY ────────
function startGameplay() {
    isGameActive = true;
    bubbles = [];
    S.score = 0;
    updateUI();
    
    // Generate Level
    const rows = 8;
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < 8; col++) {
            const x = col * 44 + 40 + (row % 2 ? 22 : 0);
            const y = row * rowHeight + 40;
            bubbles.push({ x, y, color: COLORS[Math.floor(Math.random()*COLORS.length)], alive: true, falling: false });
        }
    }
    prepNext();
}

function prepNext() {
    activeColor = reserveColor;
    reserveColor = COLORS[Math.floor(Math.random()*COLORS.length)];
    if(currentB) currentB.style.background = activeColor;
    if(nextB) nextB.style.background = reserveColor;
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

function moveProjectile() {
    if (!projectile) return;
    projectile.x += projectile.vx; projectile.y += projectile.vy;
    if (projectile.x < R || projectile.x > canvas.width - R) projectile.vx *= -1;
    
    drawBall(projectile.x, projectile.y, projectile.color, 22);

    let hit = false;
    if (projectile.y < R + 20) hit = true;
    else {
        bubbles.forEach(b => { 
            if (b.alive && !b.falling && Math.hypot(b.x - projectile.x, b.y - projectile.y) < 38) hit = true; 
        });
    }
    
    if (hit) snap();
    if (projectile && projectile.y > canvas.height) projectile = null;
}

function snap() {
    const gridY = Math.round((projectile.y - 40) / rowHeight);
    const rowOffset = (gridY % 2) ? 22 : 0;
    const gridX = Math.round((projectile.x - 40 - rowOffset) / 44);
    const nx = gridX * 44 + 40 + rowOffset, ny = gridY * rowHeight + 40;
    
    const newB = { x: nx, y: ny, color: projectile.color, alive: true, falling: false };
    bubbles.push(newB);
    
    // Match logic
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
        checkFloaters();
    }
    
    if(scoreVal) scoreVal.innerText = S.score.toLocaleString();
    projectile = null;
}

function checkFloaters() {
    const connected = new Set();
    function mark(b) {
        if(connected.has(b)) return;
        connected.add(b);
        bubbles.filter(o => o.alive && !o.falling && Math.hypot(o.x-b.x, o.y-b.y) < 48).forEach(mark);
    }
    bubbles.filter(b => b.y < 60 && b.alive).forEach(mark);
    bubbles.forEach(b => { if(b.alive && !connected.has(b)) b.falling = true; });
}

// ──────── DRAWING ────────
function drawBall(x, y, color, r = R) {
    ctx.save();
    const grad = ctx.createRadialGradient(x - 8, y - 8, 5, x, y, r);
    grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.2, color); grad.addColorStop(1, '#000');
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = grad; ctx.fill();
    ctx.restore();
}

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    if (shakeFrames > 0) { ctx.translate((Math.random()-0.5)*10, (Math.random()-0.5)*10); shakeFrames--; }
    
    drawFloaters();
    
    bubbles.forEach(b => {
        if (b.falling) { b.y += 10; if (b.y > canvas.height) b.alive = false; }
        if (b.alive) drawBall(b.x, b.y, b.color);
    });
    
    moveProjectile();
    drawVFX();
    
    if (isGameActive && !projectile) {
        // Aim line logic...
        const sx = canvas.width / 2, sy = canvas.height - 40;
        const ang = Math.atan2(mouseY - sy, mouseX - sx);
        if (ang < 0) {
            ctx.beginPath(); ctx.setLineDash([5, 10]); ctx.moveTo(sx, sy);
            ctx.lineTo(sx + Math.cos(ang) * 200, sy + Math.sin(ang) * 200);
            ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.stroke(); ctx.setLineDash([]);
        }
    }
    
    ctx.restore();
    requestAnimationFrame(animate);
}

// ──────── UTILS ────────
function createParticles(x, y, color) { for (let i = 0; i < 8; i++) particles.push({ x, y, dx: (Math.random()-0.5)*6, dy: (Math.random()-0.5)*6, s: Math.random()*5+2, a: 1, c: color }); }
function drawVFX() {
    particles = particles.filter(p => p.a > 0);
    particles.forEach(p => { p.x += p.dx; p.y += p.dy; p.dy += 0.15; p.a -= 0.03; ctx.globalAlpha = p.a; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI*2); ctx.fillStyle = p.c; ctx.fill(); });
    ctx.globalAlpha = 1;
}
function initFloaters() { for (let i = 0; i < 15; i++) floaters.push({ x: Math.random()*390, y: Math.random()*844, r: Math.random()*5+1, s: Math.random()*0.5+0.2 }); }
function drawFloaters() { floaters.forEach(f => { f.y -= f.s; if (f.y < -20) f.y = 860; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI*2); ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fill(); }); }

let audioCtx = null;
function initAudio() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
function playSFX(type) {
    if (!audioCtx) return; const o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.connect(g); g.connect(audioCtx.destination);
    if(type === 'pop') { o.frequency.setValueAtTime(600, 0); o.frequency.exponentialRampToValueAtTime(200, 0.1); g.gain.exponentialRampToValueAtTime(0.01, 0.1); o.start(); o.stop(0.1); }
    else { o.frequency.setValueAtTime(300, 0); g.gain.exponentialRampToValueAtTime(0.01, 0.05); o.start(); o.stop(0.05); }
}

function updateUI() {
    const c = document.getElementById('map-coins'); if(c) c.innerText = S.coins.toLocaleString();
}

function loadState() {
    const s = localStorage.getItem('bs_premium_state');
    if(s) S = JSON.parse(s);
}

function spinWheel() {
    const wheel = document.getElementById('mainWheel');
    if(!wheel) return;
    const deg = 1800 + Math.random() * 360;
    wheel.style.transition = 'transform 4s cubic-bezier(0.1, 0, 0.1, 1)';
    wheel.style.transform = `rotate(${deg}deg)`;
    setTimeout(() => {
        S.coins += 100;
        updateUI();
        alert("You won 100 Coins! 🪙");
        wheel.style.transition = 'none';
        wheel.style.transform = 'rotate(0deg)';
    }, 4500);
}

document.addEventListener('DOMContentLoaded', init);
