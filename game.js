'use strict';
// ══════════════════════════════════════════
//  BUBBLE SHOOTER - PRO LOGIC (From Scratch)
//  BFS | Gravity | Snapping | Shake
// ══════════════════════════════════════════

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreText = document.getElementById('score');
const nextBubbleEl = document.getElementById('nextBubble');
const popup = document.getElementById('popup');

const R = 20, COLS = 9, ROWS = 20, SPEED = 16;
const COLORS = ['#ff5c73', '#ffd54f', '#3ddc84', '#42a5ff', '#c76bff'];

let score = 0, grid = [], shooting = false, projectile = null;
let mouseX = 195, mouseY = 100, shakeFrames = 0;
let shooterColor = randomColor(), nextColor = randomColor();
let particles = [], floaters = [];

// ──────── UTILS ────────
function randomColor() { return COLORS[Math.floor(Math.random() * COLORS.length)]; }
function getPos(x, y) {
    const off = (y % 2 !== 0) ? R : 0;
    const sx = (canvas.width - COLS * R * 2) / 2 + R;
    return { x: sx + x * R * 2 + off, y: y * R * 1.75 + R + 20 };
}

// ──────── GRID ────────
function createGrid() {
    grid = [];
    for (let y = 0; y < 8; y++) {
        grid[y] = [];
        const cols = (y % 2 === 0) ? COLS : COLS - 1;
        for (let x = 0; x < cols; x++) grid[y][x] = { color: randomColor() };
    }
}

// ──────── DRAWING ────────
function drawBubble(x, y, color, r = R) {
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = color; ctx.fill();
    const grad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    grad.addColorStop(0, 'rgba(255,255,255,0.6)'); grad.addColorStop(1, 'rgba(0,0,0,0.1)');
    ctx.fillStyle = grad; ctx.fill();
    ctx.restore();
}

function drawAimLine() {
    if (projectile) return;
    const sx = canvas.width / 2, sy = canvas.height - 40;
    const ang = Math.atan2(mouseY - sy, mouseX - sx); if (ang > 0) return;
    ctx.beginPath(); ctx.setLineDash([5, 10]); ctx.moveTo(sx, sy);
    let cx = sx, cy = sy, dx = Math.cos(ang), dy = Math.sin(ang);
    for (let i = 0; i < 18; i++) {
        cx += dx * 20; cy += dy * 20; if (cx < R || cx > canvas.width - R) dx *= -1;
        ctx.lineTo(cx, cy);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 3; ctx.stroke(); ctx.setLineDash([]);
}

// ──────── SHOOTING ────────
function shoot() {
    if (projectile) return;
    initAudio();
    const sx = canvas.width / 2, sy = canvas.height - 40;
    const ang = Math.atan2(mouseY - sy, mouseX - sx); if (ang > 0) return;
    projectile = { x: sx, y: sy, vx: Math.cos(ang) * SPEED, vy: Math.sin(ang) * SPEED, color: shooterColor };
    shooterColor = nextColor; nextColor = randomColor(); nextBubbleEl.style.background = nextColor;
    playSound('shoot');
}

function updateProjectile() {
    if (!projectile) return;
    projectile.x += projectile.vx; projectile.y += projectile.vy;
    if (projectile.x < R || projectile.x > canvas.width - R) projectile.vx *= -1;
    drawBubble(projectile.x, projectile.y, projectile.color);

    let hit = false;
    if (projectile.y < R + 20) hit = true;
    else {
        outer: for (let y = 0; y < grid.length; y++) if (grid[y]) for (let x = 0; x < grid[y].length; x++) if (grid[y][x]) {
            const p = getPos(x, y); if (Math.hypot(projectile.x - p.x, projectile.y - p.y) < R * 1.7) { hit = true; break outer; }
        }
    }
    if (hit) snap();
    if (projectile && projectile.y > canvas.height) projectile = null;
}

function snap() {
    let bestDist = Infinity, tx = 0, ty = 0;
    for (let y = 0; y < ROWS; y++) {
        const cols = (y % 2 === 0) ? COLS : COLS - 1;
        for (let x = 0; x < cols; x++) {
            if (grid[y] && grid[y][x]) continue;
            const p = getPos(x, y); const d = Math.hypot(projectile.x - p.x, projectile.y - p.y);
            if (d < bestDist) { bestDist = d; tx = x; ty = y; }
        }
    }
    if (!grid[ty]) grid[ty] = [];
    grid[ty][tx] = { color: projectile.color };
    matchAndPop(tx, ty);
    projectile = null;
}

function matchAndPop(x, y) {
    const col = grid[y][x].color;
    const q = [[x, y]], matched = [[x, y]], visited = new Set([`${x},${y}`]);
    while (q.length > 0) {
        const [cx, cy] = q.shift();
        const neighbors = (cy % 2 === 0) ? [[1,0],[-1,0],[0,1],[0,-1],[-1,1],[-1,-1]] : [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1]];
        neighbors.forEach(([ox, oy]) => {
            const nx = cx + ox, ny = cy + oy;
            if (grid[ny] && grid[ny][nx] && grid[ny][nx].color === col && !visited.has(`${nx},${ny}`)) {
                visited.add(`${nx},${ny}`); matched.push([nx, ny]); q.push([nx, ny]);
            }
        });
    }
    if (matched.length >= 3) {
        matched.forEach(([mx, my]) => {
            const p = getPos(mx, my); createParticles(p.x, p.y, grid[my][mx].color);
            grid[my][mx] = null; score += 20;
        });
        playSound('pop'); shakeFrames = 10; floatCheck();
        scoreText.innerText = score;
    }
    checkWin();
}

function floatCheck() {
    const connected = new Set(); const q = [];
    if (grid[0]) grid[0].forEach((b, x) => { if (b) { connected.add(`0,${x}`); q.push([x, 0]); } });
    while (q.length > 0) {
        const [cx, cy] = q.shift();
        const neighbors = (cy % 2 === 0) ? [[1,0],[-1,0],[0,1],[0,-1],[-1,1],[-1,-1]] : [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1]];
        neighbors.forEach(([ox, oy]) => {
            const nx = cx + ox, ny = cy + oy;
            if (grid[ny] && grid[ny][nx] && !connected.has(`${ny},${nx}`)) {
                connected.add(`${ny},${nx}`); q.push([nx, ny]);
            }
        });
    }
    grid.forEach((row, y) => { if (row) row.forEach((b, x) => { if (b && !connected.has(`${y},${x}`)) {
        const p = getPos(x, y); createParticles(p.x, p.y, b.color); grid[y][x] = null; score += 10;
    }})});
}

// ──────── VFX ────────
function createParticles(x, y, color) {
    for (let i = 0; i < 10; i++) particles.push({ x, y, vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8, s: Math.random() * 5 + 2, a: 1, c: color });
}
function drawVFX() {
    particles = particles.filter(p => p.a > 0);
    particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.2; p.a -= 0.03;
        ctx.globalAlpha = p.a; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2); ctx.fillStyle = p.c; ctx.fill();
    });
    ctx.globalAlpha = 1;
}
function initFloaters() { for (let i = 0; i < 15; i++) floaters.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, r: Math.random() * 5 + 2, s: Math.random() * 0.5 + 0.2 }); }
function drawFloaters() { floaters.forEach(f => { f.y -= f.s; if (f.y < -20) f.y = canvas.height + 20; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fill(); }); }

// ──────── AUDIO (Synthesized) ────────
let audioCtx = null;
function initAudio() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
function playSound(type) {
    if (!audioCtx) return; const o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.connect(g); g.connect(audioCtx.destination);
    if (type === 'pop') { o.frequency.setValueAtTime(600, audioCtx.currentTime); o.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.1); g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1); o.start(); o.stop(audioCtx.currentTime + 0.1); }
    else { o.frequency.setValueAtTime(300, audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05); o.start(); o.stop(audioCtx.currentTime + 0.05); }
}

// ──────── LOOP ────────
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    if (shakeFrames > 0) { ctx.translate((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10); shakeFrames--; }
    drawFloaters();
    grid.forEach((row, y) => { if (row) row.forEach((b, x) => { if (b) { const p = getPos(x, y); drawBubble(p.x, p.y, b.color); } }); });
    if (!projectile) { drawAimLine(); drawBubble(canvas.width / 2, canvas.height - 40, shooterColor, 24); }
    updateProjectile(); drawVFX();
    ctx.restore();
    requestAnimationFrame(animate);
}

// ──────── LISTENERS ────────
canvas.addEventListener('mousemove', e => { const r = canvas.getBoundingClientRect(); mouseX = e.clientX - r.left; mouseY = e.clientY - r.top; });
canvas.addEventListener('click', shoot);
canvas.addEventListener('touchstart', e => { e.preventDefault(); const r = canvas.getBoundingClientRect(); mouseX = e.touches[0].clientX - r.left; mouseY = e.touches[0].clientY - r.top; shoot(); }, {passive:false});
canvas.addEventListener('touchmove', e => { e.preventDefault(); const r = canvas.getBoundingClientRect(); mouseX = e.touches[0].clientX - r.left; mouseY = e.touches[0].clientY - r.top; }, {passive:false});

function checkWin() { if (grid.every(row => !row || row.every(b => !b))) popup.style.display = 'flex'; }
function restartGame() { popup.style.display = 'none'; score = 0; scoreText.innerText = 0; createGrid(); shooterColor = randomColor(); nextColor = randomColor(); nextBubbleEl.style.background = nextColor; }

createGrid(); initFloaters(); nextBubbleEl.style.background = nextColor; animate();
setInterval(() => { localStorage.setItem('bubble_score_pro', score); }, 2000);
const saved = localStorage.getItem('bubble_score_pro'); if (saved) { score = Number(saved); scoreText.innerText = score; }
