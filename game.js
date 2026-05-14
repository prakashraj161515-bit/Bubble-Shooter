'use strict';
// ══════════════════════════════════════════
//  BUBBLE SHOOTER PREMIUM — game.js v17
//  Pixel-Perfect Gameplay | 3D Shiny Bubbles
// ══════════════════════════════════════════

let canvas, ctx, scoreVal, currentBallEl, nextBallEl, goalText, ammoText;
const R = 20, rowHeight = 38, SPEED = 16;
// Vibrant Colors matching the screenshot
const COLORS = ['#ff4d4d', '#ffcc00', '#33cc33', '#3399ff', '#cc33ff', '#ff8c1a'];

let S = {
    score: 2450, coins: 1250, ammo: 50,
    currentLevel: Number(localStorage.getItem('bs_level')) || 1,
    unlockedLevels: Number(localStorage.getItem('bs_unlocked')) || 1,
    consecutiveFails: 0,
    objective: { count: 0, total: 6 },
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

function renderMap() {
    const path = document.getElementById('levelPath');
    if (!path) return; path.innerHTML = '';
    const maxToRender = Math.min(S.unlockedLevels + 20, 5000);
    for (let i = 1; i <= maxToRender; i++) {
        const node = document.createElement('div');
        node.className = 'node';
        if (i < S.unlockedLevels) node.classList.add('done');
        else if (i === S.unlockedLevels) node.classList.add('active');
        else node.classList.add('locked');
        node.innerHTML = `<span>${i}</span>`;
        if (i <= S.unlockedLevels) { node.onclick = () => { S.currentLevel = i; startGame(); }; }
        path.appendChild(node);
    }
    setTimeout(() => {
        const activeNode = document.querySelector('.node.active');
        if (activeNode) activeNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
}

function init() {
    canvas = document.getElementById('gameCanvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    scoreVal = document.getElementById('score');
    currentBallEl = document.getElementById('currentBall');
    nextBallEl = document.getElementById('nextBall');
    goalText = document.getElementById('goal-val');

    loadState();
    initFloaters();
    animate();
    
    setTimeout(() => {
        const splash = document.getElementById('splashScreen');
        if(splash) {
            splash.style.transition = 'opacity 0.5s';
            splash.style.opacity = '0';
            setTimeout(() => { splash.style.display = 'none'; showScreen('mapScreen'); }, 500);
        }
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
    S.ammo = 50; S.score = 2450; S.objective.count = 0;
    bubbles = [];
    
    // Generate Level in Inverted Trapezoid pattern (like screenshot)
    let rows = 9;
    for (let row = 0; row < rows; row++) {
        const width = 8 - (row < 5 ? 0 : (row - 4));
        const startX = 40 + (row % 2 ? 22 : 0) + (row < 5 ? 0 : (row - 4) * 22);
        for (let col = 0; col < width; col++) {
            const x = startX + col * 44;
            const y = row * rowHeight + 40;
            bubbles.push({ x, y, color: COLORS[Math.floor(Math.random()*COLORS.length)], alive: true, falling: false });
        }
    }
    prepNext();
    updateUI();
}

function swapBubbles() {
    const temp = activeColor;
    activeColor = reserveColor;
    reserveColor = temp;
    updateUI();
}

function shoot() {
    if (projectile || !isGameActive || S.ammo <= 0) return;
    initAudio();
    const sx = canvas.width / 2, sy = canvas.height - 40;
    const ang = Math.atan2(mouseY - sy, mouseX - sx); if (ang > 0) return;
    projectile = { x: sx, y: sy, color: activeColor, vx: Math.cos(ang) * SPEED, vy: Math.sin(ang) * SPEED };
    S.ammo--; prepNext(); updateUI();
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
        matches.forEach(b => { 
            b.alive = false; createParticles(b.x, b.y, b.color); S.score += 100;
            if (b.color === '#cc33ff') S.objective.count++;
        });
        shakeFrames = 15; if(S.settings.sound) playSFX('pop');
        const con = new Set();
        function mark(b) { if(con.has(b)) return; con.add(b); bubbles.filter(o => o.alive && !o.falling && Math.hypot(o.x-b.x, o.y-b.y) < 48).forEach(mark); }
        bubbles.filter(b => b.y < 60 && b.alive).forEach(mark);
        bubbles.forEach(b => { if(b.alive && !con.has(b)) b.falling = true; });
    }
    projectile = null; checkEnd(); updateUI();
}

function checkEnd() {
    const remaining = bubbles.filter(b => b.alive);
    if (remaining.length === 0 || S.objective.count >= S.objective.total) {
        S.consecutiveFails = 0; S.coins += 100; if (S.currentLevel === S.unlockedLevels) S.unlockedLevels++;
        alert("LEVEL CLEAR! 🎉"); showScreen('mapScreen');
    } else if (S.ammo <= 0 && !projectile) { S.consecutiveFails++; alert("OUT OF BALLS! ❌"); showScreen('mapScreen'); }
}

function updateUI() {
    if(scoreVal) scoreVal.innerText = S.score.toLocaleString();
    if(goalText) goalText.innerText = `${S.objective.count}/${S.objective.total}`;
    if(currentBallEl) currentBallEl.style.background = activeColor;
    if(nextBallEl) nextBallEl.style.background = reserveColor;
    saveState();
}

function prepNext() {
    activeColor = reserveColor; reserveColor = COLORS[Math.floor(Math.random()*COLORS.length)];
    updateUI();
}

// ──────── PIXEL-PERFECT 3D BUBBLES ────────
function drawBall(x, y, color, r = R) {
    ctx.save();
    // Shadow
    ctx.shadowColor = 'rgba(0,0,0,0.2)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 5;
    
    // Main Sphere Gradient
    const grad = ctx.createRadialGradient(x - r*0.3, y - r*0.3, r*0.1, x, y, r);
    grad.addColorStop(0, '#fff'); // Main Highlight
    grad.addColorStop(0.2, color);
    grad.addColorStop(0.8, shadeColor(color, -30));
    grad.addColorStop(1, shadeColor(color, -50)); // Dark edge

    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = grad; ctx.fill();
    
    // Inner Glow/Highlight
    ctx.beginPath();
    ctx.ellipse(x - r*0.35, y - r*0.35, r*0.3, r*0.2, Math.PI/4, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fill();
    
    ctx.restore();
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
        if (ang < 0) {
            for(let i=0; i<15; i++) {
                const dotX = sx + Math.cos(ang) * (i * 25);
                const dotY = sy + Math.sin(ang) * (i * 25);
                ctx.beginPath(); ctx.arc(dotX, dotY, 2, 0, Math.PI*2); ctx.fillStyle = 'rgba(123, 108, 255, 0.5)'; ctx.fill();
            }
        }
    }
    ctx.restore(); requestAnimationFrame(animate);
}

function createParticles(x, y, color) { for (let i = 0; i < 8; i++) particles.push({ x, y, dx: (Math.random()-0.5)*6, dy: (Math.random()-0.5)*6, s: Math.random()*4+2, a: 1, c: color }); }
function drawVFX() { particles = particles.filter(p => p.a > 0); particles.forEach(p => { p.x += p.dx; p.y += p.dy; p.dy += 0.15; p.a -= 0.03; ctx.globalAlpha = p.a; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI*2); ctx.fillStyle = p.c; ctx.fill(); }); ctx.globalAlpha = 1; }
function initFloaters() { for (let i = 0; i < 15; i++) floaters.push({ x: Math.random()*390, y: Math.random()*844, r: Math.random()*5+1, s: Math.random()*0.5+0.2 }); }
function drawFloaters() { floaters.forEach(f => { f.y -= f.s; if (f.y < -20) f.y = 860; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI*2); ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fill(); }); }

let audioCtx = null;
function initAudio() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
function playSFX(type) { if (!audioCtx) return; const o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.connect(g); g.connect(audioCtx.destination); if(type === 'pop') { o.frequency.setValueAtTime(600, audioCtx.currentTime); o.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.1); g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1); o.start(); o.stop(audioCtx.currentTime + 0.1); } }
function saveState() { localStorage.setItem('bs_level', S.currentLevel); localStorage.setItem('bs_unlocked', S.unlockedLevels); }
function loadState() { const l = localStorage.getItem('bs_level'); if(l) S.currentLevel = Number(l); const u = localStorage.getItem('bs_unlocked'); if(u) S.unlockedLevels = Number(u); }
document.addEventListener('DOMContentLoaded', init);
