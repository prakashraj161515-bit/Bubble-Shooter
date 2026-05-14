'use strict';
// ══════════════════════════════════════════
//  BUBBLE SHOOTER - REBUILT FROM SCRATCH
//  Physics | Collision | Snapping | BFS
// ══════════════════════════════════════════

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreText = document.getElementById('score');
const nextBubbleEl = document.getElementById('nextBubble');
const popup = document.getElementById('popup');

const R = 20, COLS = 9, ROWS = 20, SPEED = 16;
const COLORS = ['#ff5c73', '#ffd54f', '#3ddc84', '#42a5ff', '#c76bff'];

let score = 0, grid = [], shooting = false, activeBall = null, mouseX = 195, mouseY = 100;
let shooterColor = randomColor(), nextColor = randomColor();

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
        for (let x = 0; x < cols; x++) {
            grid[y][x] = { color: randomColor() };
        }
    }
}

// ──────── DRAWING ────────
function drawBubble(x, y, color, radius = R) {
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color; ctx.fill();
    // Glassy Highlight
    const grad = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, radius * 0.1, x, y, radius);
    grad.addColorStop(0, 'rgba(255,255,255,0.6)');
    grad.addColorStop(1, 'rgba(0,0,0,0.1)');
    ctx.fillStyle = grad; ctx.fill();
    ctx.restore();
}

function drawAimLine() {
    if (shooting) return;
    const startX = canvas.width / 2, startY = canvas.height - 40;
    const ang = Math.atan2(mouseY - startY, mouseX - startX);
    if (ang > 0) return; // Prevent shooting downwards

    ctx.beginPath(); ctx.setLineDash([5, 10]);
    ctx.moveTo(startX, startY);
    let curX = startX, curY = startY, dx = Math.cos(ang), dy = Math.sin(ang);
    for (let i = 0; i < 20; i++) {
        curX += dx * 20; curY += dy * 20;
        if (curX < R || curX > canvas.width - R) dx *= -1;
        ctx.lineTo(curX, curY);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 3; ctx.stroke();
    ctx.setLineDash([]);
}

// ──────── SHOOTING ────────
function shoot() {
    if (shooting) return;
    const startX = canvas.width / 2, startY = canvas.height - 40;
    const ang = Math.atan2(mouseY - startY, mouseX - startX);
    if (ang > 0) return;

    activeBall = { x: startX, y: startY, vx: Math.cos(ang) * SPEED, vy: Math.sin(ang) * SPEED, color: shooterColor };
    shooting = true;
}

function moveBall() {
    activeBall.x += activeBall.vx; activeBall.y += activeBall.vy;
    // Wall bounce
    if (activeBall.x < R || activeBall.x > canvas.width - R) activeBall.vx *= -1;

    let hit = false;
    // Collision with top
    if (activeBall.y < R + 20) hit = true;
    // Collision with grid
    else {
        outer: for (let y = 0; y < grid.length; y++) {
            if (!grid[y]) continue;
            for (let x = 0; x < grid[y].length; x++) {
                if (grid[y][x]) {
                    const p = getPos(x, y);
                    if (Math.hypot(activeBall.x - p.x, activeBall.y - p.y) < R * 1.8) { hit = true; break outer; }
                }
            }
        }
    }

    if (hit) snapAndCheck();
}

function snapAndCheck() {
    // Find nearest slot
    let bestDist = Infinity, tx = 0, ty = 0;
    for (let y = 0; y < ROWS; y++) {
        const cols = (y % 2 === 0) ? COLS : COLS - 1;
        for (let x = 0; x < cols; x++) {
            if (grid[y] && grid[y][x]) continue;
            const p = getPos(x, y);
            const d = Math.hypot(activeBall.x - p.x, activeBall.y - p.y);
            if (d < bestDist) { bestDist = d; tx = x; ty = y; }
        }
    }

    if (!grid[ty]) grid[ty] = [];
    grid[ty][tx] = { color: activeBall.color };
    
    // BFS Pop
    matchAndPop(tx, ty);

    // Reset shooter
    shooting = false; activeBall = null;
    shooterColor = nextColor; nextColor = randomColor();
    nextBubbleEl.style.background = nextColor;
}

function matchAndPop(x, y) {
    const targetColor = grid[y][x].color;
    const queue = [[x, y]], matched = [[x, y]], visited = new Set([`${x},${y}`]);

    while (queue.length > 0) {
        const [cx, cy] = queue.shift();
        const neighbors = getNeighbors(cx, cy);
        neighbors.forEach(([nx, ny]) => {
            if (grid[ny] && grid[ny][nx] && grid[ny][nx].color === targetColor && !visited.has(`${nx},${ny}`)) {
                visited.add(`${nx},${ny}`); matched.push([nx, ny]); queue.push([nx, ny]);
            }
        });
    }

    if (matched.length >= 3) {
        matched.forEach(([mx, my]) => { grid[my][mx] = null; score += 20; });
        floatCheck(); // Remove floating bubbles
        scoreText.innerText = score;
    }
    checkGameOver();
}

function getNeighbors(x, y) {
    const odd = y % 2 !== 0;
    const offsets = odd ? 
        [[1,0], [-1,0], [0,1], [0,-1], [1,1], [1,-1]] : 
        [[1,0], [-1,0], [0,1], [0,-1], [-1,1], [-1,-1]];
    return offsets.map(([ox, oy]) => [x + ox, y + oy]);
}

function floatCheck() {
    const connected = new Set();
    const queue = [];
    // Start from top row
    if (grid[0]) grid[0].forEach((b, x) => { if (b) { connected.add(`0,${x}`); queue.push([x, 0]); } });

    while (queue.length > 0) {
        const [cx, cy] = queue.shift();
        getNeighbors(cx, cy).forEach(([nx, ny]) => {
            if (grid[ny] && grid[ny][nx] && !connected.has(`${ny},${nx}`)) {
                connected.add(`${ny},${nx}`); queue.push([nx, ny]);
            }
        });
    }

    grid.forEach((row, y) => {
        if (!row) return;
        row.forEach((b, x) => {
            if (b && !connected.has(`${y},${x}`)) { grid[y][x] = null; score += 10; }
        });
    });
}

function checkGameOver() {
    const empty = grid.every(row => !row || row.every(b => !b));
    if (empty) {
        document.getElementById('popup-title').innerText = "Winner! 🎉";
        popup.style.display = 'flex';
    } else if (grid.length > 15) {
        document.getElementById('popup-title').innerText = "Game Over!";
        popup.style.display = 'flex';
    }
}

function restartGame() {
    popup.style.display = 'none'; score = 0; scoreText.innerText = 0;
    createGrid(); shooterColor = randomColor(); nextColor = randomColor();
    nextBubbleEl.style.background = nextColor;
}

// ──────── LOOP ────────
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Draw Grid
    grid.forEach((row, y) => {
        if (!row) return;
        row.forEach((b, x) => { if (b) { const p = getPos(x, y); drawBubble(p.x, p.y, b.color); } });
    });
    // Draw Shooter & Ball
    if (activeBall) { moveBall(); drawBubble(activeBall.x, activeBall.y, activeBall.color); }
    else { drawAimLine(); drawBubble(canvas.width / 2, canvas.height - 40, shooterColor, 24); }

    requestAnimationFrame(animate);
}

// ──────── LISTENERS ────────
canvas.addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect(); mouseX = e.clientX - r.left; mouseY = e.clientY - r.top;
});
canvas.addEventListener('click', shoot);
canvas.addEventListener('touchstart', e => {
    const r = canvas.getBoundingClientRect(); mouseX = e.touches[0].clientX - r.left; mouseY = e.touches[0].clientY - r.top; shoot();
});

// START
createGrid();
nextBubbleEl.style.background = nextColor;
animate();
