'use strict';
// ══════════════════════════════════════════
//  BUBBLE SHOOTER PREMIUM — game.js v24
//  EXACT PHOTO CLONE — Ultra Glossy Engine
// ══════════════════════════════════════════

let canvas, ctx, scoreVal, currentBallEl, nextBallEl, goalText;
const R = 18, rowHeight = 32, SPEED = 32;


const COLORS = ['#ff4d4d', '#ffcc00', '#33cc33', '#3399ff', '#cc33ff', '#ff8c1a'];

let S = {
    score: 2450, coins: 1250, ammo: 50,
    currentLevel: Number(localStorage.getItem('bs_level')) || 1,
    unlockedLevels: Number(localStorage.getItem('bs_unlocked')) || 4,
    objective: { count: 0, total: 6 },
    settings: { sound: true, music: true }
};

let bubbles = [], projectile = null, particles = [], floaters = [];
let clusterOffset = 0; // For dynamic vertical shift
let introAnimFrame = 0;
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

// ──────── MAP ENGINE (UNCHANGED) ────────
function renderMap() {
    const path = document.getElementById('levelPath');
    if (!path) return;
    path.innerHTML = '';
    const totalLevels = 100;
    const center = 155, amplitude = 100, frequency = 300;
    path.style.height = `${totalLevels * 150}px`;
    for (let i = 1; i <= totalLevels; i++) {
        const node = document.createElement('div');
        node.className = 'node-premium';
        const yPos = i * 140; 
        const xPos = center + Math.sin(yPos / frequency) * amplitude;
        node.style.top = `${yPos}px`; node.style.left = `${xPos}px`;
        if (i <= S.unlockedLevels) {
            node.classList.add('unlocked');
            node.innerHTML = `<span>${i}</span><div style="position:absolute;bottom:-22px;width:100%;text-align:center;font-size:14px;color:#ffcf3e;">⭐⭐⭐</div>`;
            node.onclick = () => { S.currentLevel = i; startGame(); };
        } else { node.innerHTML = `<span>${i}</span><div style="position:absolute;bottom:-20px;width:100%;text-align:center;color:#999;font-size:14px;">🔒🔒🔒</div>`; }
        path.appendChild(node);
    }
    setTimeout(() => {
        const activeNode = document.querySelectorAll('.node-premium.unlocked')[S.unlockedLevels-1];
        if (activeNode) activeNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
}

// ──────── INITIALIZATION ────────
function init() {
    canvas = document.getElementById('gameCanvas');
    if (!canvas) return;
    
    // Make canvas internal resolution match display size
    canvas.width = canvas.clientWidth || window.innerWidth || 390;
    canvas.height = canvas.clientHeight || window.innerHeight || 844;
    
    ctx = canvas.getContext('2d');
    scoreVal = document.getElementById('score');
    currentBallEl = document.getElementById('currentBall');
    nextBallEl = document.getElementById('nextBall');
    goalText = document.getElementById('goal-val');

    loadState();
    initFloaters();
    animate();
    
    // Initialize the map screen on load
    showScreen('mapScreen');
}



function startGame() {
    showScreen('gameplayScreen');
    
    // Ensure canvas dimensions are correct now that it's visible
    canvas.width = canvas.clientWidth || window.innerWidth;
    canvas.height = canvas.clientHeight || window.innerHeight;
    
    // Bind pointerdown for unified mouse/touch handling on canvas
    canvas.onpointerdown = (e) => {
        shoot(e);
    };
    canvas.onpointermove = (e) => {
        const cRect = canvas.getBoundingClientRect();
        mouseX = e.clientX - cRect.left;
        mouseY = e.clientY - cRect.top;
    };

    const width = canvas.width;
    const numCols = 10;
    const spacingX = width / numCols; 
    const dynamicR = (spacingX / 2) * 0.95;
    window.activeR = dynamicR; 
    
    S.ammo = 50; S.score = 2450; S.objective.count = 0;
    bubbles = [];
    let rows = 11; 
    const spacingY = spacingX * 0.866; // Perfect hexagonal touch
    introAnimFrame = 60; // Start animation counter
    
    for (let row = 0; row < rows; row++) {
        const isOffset = row % 2 !== 0;
        const rowWidth = isOffset ? numCols - 1 : numCols;
        const startX = isOffset ? spacingX / 2 : 0; 
        
        for (let col = 0; col < rowWidth; col++) {
            const x = startX + col * spacingX + (spacingX / 2);
            const targetY = row * spacingY + (spacingX / 2); 
            bubbles.push({ 
                x, 
                targetY, 
                y: canvas.height + 100, 
                color: COLORS[Math.floor(Math.random()*COLORS.length)], 
                alive: true, falling: false, r: dynamicR,
                row: row
            });
        }
    }
    prepNext();
    updateUI();
}







function getShooterPos() {
    const el = document.getElementById('currentBall');
    if (!el) return { x: canvas.width / 2, y: canvas.height - 150 };
    const rect = el.getBoundingClientRect();
    const cRect = canvas.getBoundingClientRect();
    return {
        x: rect.left - cRect.left + rect.width / 2,
        y: rect.top - cRect.top + rect.height / 2
    };
}

function shoot(e) {
    if (projectile || !isGameActive || introAnimFrame > 0) return;
    initAudio();
    
    const pos = getShooterPos();
    const cRect = canvas.getBoundingClientRect();
    
    // Get correct click coordinates
    let tx, ty;
    if (e && e.clientX !== undefined) {
        tx = e.clientX - cRect.left;
        ty = e.clientY - cRect.top;
    } else {
        tx = mouseX;
        ty = mouseY;
    }

    const ang = Math.atan2(ty - pos.y, tx - pos.x); 
    // Allow shooting in any upward direction
    if (ty > pos.y) return; 
    
    projectile = { 
        x: pos.x, 
        y: pos.y, 
        color: activeColor, 
        vx: Math.cos(ang) * SPEED, 
        vy: Math.sin(ang) * SPEED 
    };
    prepNext(); 
    updateUI();
}




function snap() {
    if (!projectile) return;
    const curR = window.activeR || 18;
    const spacingX = canvas.width / 10;
    const spacingY = spacingX * 0.866;
    
    let bestDist = Infinity;
    let bestCell = null;

    // Search rows around the projectile's estimated row to find closest empty slot
    const estRow = Math.round((projectile.y - clusterOffset - (spacingX / 2)) / spacingY);
    
    for (let r = Math.max(0, estRow - 2); r <= estRow + 2; r++) {
        const isOffset = r % 2 !== 0;
        const rowWidth = isOffset ? 9 : 10;
        const startX = isOffset ? spacingX / 2 : 0;
        
        for (let c = 0; c < rowWidth; c++) {
            const nx = startX + c * spacingX + (spacingX / 2);
            const ny = r * spacingY + (spacingX / 2);
            const absoluteNy = ny + clusterOffset;
            
            // Check if cell is occupied
            let occupied = false;
            for (let b of bubbles) {
                if (b.alive && !b.falling && Math.hypot(b.x - nx, b.targetY - ny) < 5) {
                    occupied = true; break;
                }
            }
            
            if (!occupied) {
                const dist = Math.hypot(projectile.x - nx, projectile.y - absoluteNy);
                if (dist < bestDist) {
                    bestDist = dist;
                    bestCell = { nx, ny, row: r };
                }
            }
        }
    }
    
    if (!bestCell) return;

    const newB = { x: bestCell.nx, targetY: bestCell.ny, y: projectile.y, color: projectile.color, alive: true, falling: false, r: curR, row: bestCell.row };
    bubbles.push(newB);

    const visited = new Set(), matches = [];
    function dfs(b) {
        if(!b || visited.has(b)) return; visited.add(b); matches.push(b);
        // Use targetY for matching, since y is still animating
        bubbles.filter(o => o.alive && !o.falling && Math.hypot(o.x - b.x, o.targetY - b.targetY) < spacingX * 1.2).forEach(n => { 
            if(n.color === newB.color) dfs(n); 
        });
    }
    dfs(newB);

    if (matches.length >= 3) {
        matches.forEach(b => { 
            b.alive = false; createParticles(b.x, b.y, b.color); S.score += 100;
        });
        shakeFrames = 15; if(S.settings.sound) playSFX('pop');
        
        // Orphan logic: Check what's connected to Row 0
        const con = new Set();
        function mark(b) { 
            if(con.has(b)) return; con.add(b); 
            bubbles.filter(o => o.alive && !o.falling && Math.hypot(o.x - b.x, o.targetY - b.targetY) < spacingX * 1.2).forEach(mark); 
        }
        bubbles.filter(b => b.row === 0 && b.alive).forEach(mark);
        bubbles.forEach(b => { if(b.alive && !con.has(b)) b.falling = true; });
    }
    projectile = null; checkEnd(); updateUI();
}



function checkEnd() {
    const remaining = bubbles.filter(b => b.alive);
    if (remaining.length === 0 || S.objective.count >= S.objective.total) {
        if (S.currentLevel === S.unlockedLevels) S.unlockedLevels++;
        alert("LEVEL CLEAR! 🎉"); showScreen('mapScreen');
    }
}

function updateUI() {
    if(scoreVal) scoreVal.innerText = S.score.toLocaleString();
    const ammoEl = document.getElementById('ammo-val');
    if(ammoEl) ammoEl.innerText = S.ammo;
    
    const curR = window.activeR || 20;
    if (currentBallEl) {
        currentBallEl.style.background = activeColor;
        currentBallEl.style.width = (curR * 2.2) + 'px';
        currentBallEl.style.height = (curR * 2.2) + 'px';
        currentBallEl.style.borderRadius = '50%';
    }
    if (nextBallEl) {
        nextBallEl.style.background = reserveColor;
        nextBallEl.style.width = (curR * 1.6) + 'px';
        nextBallEl.style.height = (curR * 1.6) + 'px';
        nextBallEl.style.borderRadius = '50%';
    }
    const mc = document.getElementById('map-coins');
    if(mc) mc.innerText = S.coins.toLocaleString();
    saveState();
}


function prepNext() {
    activeColor = reserveColor; reserveColor = COLORS[Math.floor(Math.random()*COLORS.length)];
    updateUI();
}

// ──────── ULTRA-GLOSSY 3D BUBBLES ────────
function drawBall(x, y, color, r) {
    const radius = r || window.activeR || 18;
    ctx.save();
    
    const finalY = y; // Removed floating animation

    // Shadow
    ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 5;
    
    // Core Gradient
    const grad = ctx.createRadialGradient(x - radius*0.35, finalY - radius*0.35, radius*0.05, x, finalY, radius);
    grad.addColorStop(0, '#fff'); grad.addColorStop(0.2, shadeColor(color, 30));
    grad.addColorStop(0.5, color); grad.addColorStop(1, shadeColor(color, -60));

    ctx.beginPath(); ctx.arc(x, finalY, radius, 0, Math.PI*2); ctx.fillStyle = grad; ctx.fill();
    
    // Star ✶ Design for All Balls
    ctx.save();
    ctx.font = `${radius * 1.2}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('✶', x, finalY + (radius * 0.08)); // Symmetrical centering
    ctx.restore();
    
    // Top-Left Ellipse Shine
    ctx.beginPath();
    ctx.ellipse(x - radius*0.4, finalY - radius*0.4, radius*0.4, radius*0.25, Math.PI/4, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fill();

    // Bottom Rim Glow
    ctx.beginPath();
    ctx.arc(x, finalY, radius * 0.85, 0.8, 2.5);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 2.5; ctx.stroke();

    ctx.restore();
}



function shadeColor(color, percent) {
    let f=parseInt(color.slice(1),16),t=percent<0?0:255,p=percent<0?percent*-1:percent,R=f>>16,G=f>>8&0x00FF,B=f&0x0000FF;
    return "#"+(0x1000000+(Math.round((t-R)*p/100)+R)*0x10000+(Math.round((t-G)*p/100)+G)*0x100+(Math.round((t-B)*p/100)+B)).toString(16).slice(1);
}

function updateClusterPosition() {
    if (introAnimFrame > 0) return; 
    const activeBubbles = bubbles.filter(b => b.alive && !b.falling);
    if (activeBubbles.length === 0) return;
    const maxRow = Math.max(...activeBubbles.map(b => b.row));
    const spacingX = canvas.width / 10;
    const spacingY = spacingX * 0.866;
    const clusterHeight = (maxRow + 1) * spacingY;
    const halfHeight = canvas.height / 2;
    
    // User wants it 3 balls above center
    const limit = halfHeight - (3 * spacingY); 
    const idealOffset = limit - clusterHeight;
    const targetOffset = Math.max(0, idealOffset);
    clusterOffset += (targetOffset - clusterOffset) * 0.03; // Smoother shift (from 0.05 to 0.03)
}


function swapBubbles() {
    const temp = activeColor;
    activeColor = reserveColor;
    reserveColor = temp;
    updateUI();
}

function animate() {
    if(!ctx) return; ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.save();
    const curR = window.activeR || 18;
    updateClusterPosition();
    if (shakeFrames > 0) { 
        ctx.translate((Math.random()-0.5)*3, (Math.random()-0.5)*3); // Reduced from 10 to 3
        shakeFrames--; 
    }
    drawFloaters();
    bubbles.forEach(b => { 
        if (b.alive) {
            if (introAnimFrame > 0) {
                b.y += (b.targetY - b.y) * 0.15;
            } else if (!b.falling) {
                const currentTarget = b.targetY + clusterOffset;
                b.y += (currentTarget - b.y) * 0.1;
            } else {
                b.y += 10;
                if (b.y > canvas.height) b.alive = false;
            }
            drawBall(b.x, b.y, b.color, b.r);
        }
    });
    if (introAnimFrame > 0) introAnimFrame--;
    if (projectile) {
        projectile.x += projectile.vx; projectile.y += projectile.vy;
        if (projectile.x < curR || projectile.x > canvas.width - curR) projectile.vx *= -1;
        drawBall(projectile.x, projectile.y, projectile.color, curR + 2);
        let hit = false; 
        if (projectile.y < curR + 20 + clusterOffset) hit = true; 
        else bubbles.forEach(b => { 
            if (b.alive && !b.falling && Math.hypot(b.x - projectile.x, b.y - projectile.y) < curR * 1.8) hit = true; 
        });
        if (hit) snap(); if (projectile && projectile.y > canvas.height) projectile = null;
    }
    drawVFX();
    if (isGameActive && !projectile && introAnimFrame <= 0) {
        const pos = getShooterPos();
        const ang = Math.atan2(mouseY - pos.y, mouseX - pos.x);
        if (ang < 0) {
            let dx = Math.cos(ang), dy = Math.sin(ang);
            for (let i = 0; i < 20; i++) {
                const dotX = pos.x + dx * (i * 25);
                const dotY = pos.y + dy * (i * 25);
                
                // Stop aim line if it hits a bubble
                let collision = false;
                bubbles.forEach(b => {
                    if (b.alive && !b.falling && Math.hypot(b.x - dotX, b.y - dotY) < curR * 1.5) collision = true;
                });
                if (collision || dotX < 0 || dotX > canvas.width || dotY < 0) break;

                ctx.beginPath(); ctx.arc(dotX, dotY, 2.5, 0, Math.PI * 2); 
                ctx.fillStyle = 'rgba(123, 108, 255, 0.7)'; ctx.fill();
            }
        }
    }

    ctx.restore(); requestAnimationFrame(animate);
}




function createParticles(x, y, color) { for (let i = 0; i < 8; i++) particles.push({ x, y, dx: (Math.random()-0.5)*6, dy: (Math.random()-0.5)*6, s: Math.random()*5+2, a: 1, c: color }); }
function drawVFX() { particles = particles.filter(p => p.a > 0); particles.forEach(p => { p.x += p.dx; p.y += p.dy; p.dy += 0.15; p.a -= 0.03; ctx.globalAlpha = p.a; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI*2); ctx.fillStyle = p.c; ctx.fill(); }); ctx.globalAlpha = 1; }
function initFloaters() { for (let i = 0; i < 15; i++) floaters.push({ x: Math.random()*390, y: Math.random()*844, r: Math.random()*5+1, s: Math.random()*0.5+0.2 }); }
function drawFloaters() { floaters.forEach(f => { f.y -= f.s; if (f.y < -20) f.y = 860; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI*2); ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fill(); }); }
let audioCtx = null;
function initAudio() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
function playSFX(type) { if (!audioCtx) return; const o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.connect(g); g.connect(audioCtx.destination); if(type === 'pop') { o.frequency.setValueAtTime(600, audioCtx.currentTime); o.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.1); g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1); o.start(); o.stop(audioCtx.currentTime + 0.1); } }
function saveState() { localStorage.setItem('bs_level', S.currentLevel); localStorage.setItem('bs_unlocked', S.unlockedLevels); }
function loadState() { const l = localStorage.getItem('bs_level'); if(l) S.currentLevel = Number(l); const u = localStorage.getItem('bs_unlocked'); if(u) S.unlockedLevels = Number(u); }
document.addEventListener('DOMContentLoaded', init);
