const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let width, height;
const BUBBLE_RADIUS = 20; 
const COLUMNS = 9;
const ROWS = 20;

// iOS System Colors
const COLORS = [
    '#FF3B30', // System Red
    '#007AFF', // System Blue
    '#34C759', // System Green
    '#FF9500', // System Orange
    '#AF52DE', // System Purple
    '#FF2D55'  // System Pink
];

let grid = [];
let ballsRemaining = 60;
let currentLevel = 1;
let coins = 1250;
let combo = 0;
let fireballCharge = 0; 
let currentBallColor = COLORS[1];
let nextBallColor = COLORS[0];

let activeBall = null;
let isShooting = false;
let mouseX, mouseY;

let highestLevelUnlocked = parseInt(localStorage.getItem('bubble_highest_level')) || 1;

function init() {
    generateMap(); 

    showScreen('splash-screen');
    setTimeout(() => { 
        showScreen('home-screen'); 
        generateMap(); 
    }, 2000); // Reduced splash time for better UX

    // Navigation
    document.getElementById('settings-trigger').onclick = () => {
        // Haptic feel
        document.getElementById('settings-trigger').style.transform = 'scale(0.9)';
        setTimeout(() => document.getElementById('settings-trigger').style.transform = '', 100);
        alert("Settings opened");
    };
    
    document.getElementById('back-to-home').onclick = () => {
        showScreen('home-screen');
        generateMap();
    };

    // Popup Close Logic
    document.querySelectorAll('.close-popup').forEach(btn => {
        btn.onclick = (e) => e.target.closest('.overlay-dark').classList.add('hidden');
    });

    // Desktop Inputs
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
    });

    canvas.addEventListener('mouseup', () => {
        if (!isShooting && ballsRemaining > 0) shoot();
    });

    // iOS Touch Inputs
    canvas.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        mouseX = touch.clientX - rect.left;
        mouseY = touch.clientY - rect.top;
        e.preventDefault();
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        mouseX = touch.clientX - rect.left;
        mouseY = touch.clientY - rect.top;
        e.preventDefault();
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
        if (!isShooting && ballsRemaining > 0) shoot();
        e.preventDefault();
    }, { passive: false });

    requestAnimationFrame(gameLoop);
}

function resize() {
    width = canvas.parentElement.clientWidth;
    height = canvas.parentElement.clientHeight || 400;
    canvas.width = width;
    canvas.height = height;
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => {
        s.style.opacity = '0';
        setTimeout(() => s.classList.add('hidden'), 300);
    });
    
    const target = document.getElementById(id);
    target.classList.remove('hidden');
    setTimeout(() => target.style.opacity = '1', 10);
}

function startGame() {
    showScreen('gameplay-ui');
    resize();
    ballsRemaining = 60;
    
    currentBallColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    nextBallColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    document.getElementById('active-ball').style.backgroundColor = currentBallColor;
    
    generateLevel();
    updateUI();
}

function generateMap() {
    const container = document.getElementById('map-path-container');
    if (!container) return;
    container.innerHTML = '';
    
    for (let i = 20; i >= 1; i--) {
        const node = document.createElement('div');
        node.className = 'level-node-blue';
        
        const row = Math.floor((i-1) / 3);
        const col = (i-1) % 3;
        const xOffset = (row % 2 === 0) ? (col - 1) * 70 : (1 - col) * 70;
        node.style.transform = `translateX(${xOffset}px)`;
        
        if (i > highestLevelUnlocked) {
            node.style.background = 'rgba(0,0,0,0.05)';
            node.style.color = '#ccc';
            node.innerHTML = `🔒`;
        } else {
            node.innerHTML = `${i} <div class="stars-under">● ● ●</div>`;
            if (i === highestLevelUnlocked) {
                node.style.borderColor = 'var(--system-blue)';
                node.style.boxShadow = '0 0 20px rgba(0,122,255,0.3)';
            }
            
            node.onclick = () => {
                currentLevel = i;
                startGame();
            };
        }
        
        container.appendChild(node);
    }
}

function generateLevel() {
    grid = [];
    for (let y = 0; y < 10; y++) {
        grid[y] = [];
        const cols = y % 2 === 0 ? COLUMNS : COLUMNS - 1;
        for (let x = 0; x < cols; x++) {
            grid[y][x] = {
                type: 'NORMAL',
                color: COLORS[Math.floor(Math.random() * COLORS.length)]
            };
        }
    }
}

function gameLoop() {
    ctx.clearRect(0, 0, width, height);
    drawGrid();
    drawTrajectory();
    if (activeBall) updateBall();
    requestAnimationFrame(gameLoop);
}

function drawGrid() {
    for (let y = 0; y < grid.length; y++) {
        if (!grid[y]) continue;
        for (let x = 0; x < grid[y].length; x++) {
            if (grid[y][x]) {
                const pos = getPos(x, y);
                drawBubble(pos.x, pos.y, grid[y][x].color, grid[y][x].type);
            }
        }
    }
}

function getPos(x, y) {
    const xOffset = y % 2 !== 0 ? BUBBLE_RADIUS : 0;
    const startX = (width - (COLUMNS * BUBBLE_RADIUS * 2)) / 2 + BUBBLE_RADIUS;
    return {
        x: startX + x * BUBBLE_RADIUS * 2 + xOffset,
        y: y * BUBBLE_RADIUS * 1.75 + BUBBLE_RADIUS + 20 
    };
}

function drawBubble(x, y, color, type) {
    // Premium Minimalist Bubble
    ctx.beginPath();
    ctx.arc(x, y, BUBBLE_RADIUS - 1, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    
    // Soft inner glow/highlight
    const grad = ctx.createRadialGradient(x - 5, y - 5, 2, x, y, BUBBLE_RADIUS);
    grad.addColorStop(0, 'rgba(255,255,255,0.3)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fill();

    if (type === 'ROCK') {
        ctx.strokeStyle = '#8E8E93'; ctx.lineWidth = 3; ctx.stroke();
    }
}

function getBallCenter() {
    const ballEl = document.getElementById('active-ball');
    if (!ballEl) return { x: width / 2, y: height - 120 };
    
    const rect = ballEl.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    return {
        x: rect.left + rect.width / 2 - canvasRect.left,
        y: rect.top + rect.height / 2 - canvasRect.top,
        radius: rect.width / 2
    };
}

function drawTrajectory() {
    if (isShooting || !mouseX || !mouseY) return;
    
    const center = getBallCenter();
    const startX = center.x;
    const startY = center.y;
    
    let angle = Math.atan2(mouseY - startY, mouseX - startX);
    if (angle > 0) return;
    
    ctx.setLineDash([4, 8]);
    ctx.strokeStyle = 'rgba(0,0,0,0.2)'; 
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    let currentX = startX + Math.cos(angle) * center.radius;
    let currentY = startY + Math.sin(angle) * center.radius;
    ctx.moveTo(currentX, currentY);
    
    let remainingLength = 800; 
    let bounces = 0;
    
    while (remainingLength > 0 && bounces < 3) {
        bounces++;
        let hitDist = Infinity;
        let hitX = currentX + Math.cos(angle) * remainingLength;
        let hitY = currentY + Math.sin(angle) * remainingLength;
        let didBounce = false;
        
        if (Math.cos(angle) < 0) {
            let dx = BUBBLE_RADIUS - currentX;
            let d = dx / Math.cos(angle);
            if (d > 0 && d < remainingLength) {
                hitDist = d; hitX = BUBBLE_RADIUS; hitY = currentY + Math.sin(angle) * d; didBounce = true;
            }
        }
        else if (Math.cos(angle) > 0) {
            let dx = (width - BUBBLE_RADIUS) - currentX;
            let d = dx / Math.cos(angle);
            if (d > 0 && d < remainingLength) {
                hitDist = d; hitX = width - BUBBLE_RADIUS; hitY = currentY + Math.sin(angle) * d; didBounce = true;
            }
        }
        
        ctx.lineTo(hitX, hitY);
        
        if (didBounce) {
            remainingLength -= hitDist;
            currentX = hitX;
            currentY = hitY;
            angle = Math.PI - angle;
        } else { break; }
    }
    ctx.stroke();
    ctx.setLineDash([]);
}

function shoot() {
    isShooting = true;
    ballsRemaining--;
    
    const center = getBallCenter();
    const startX = center.x;
    const startY = center.y;
    const angle = Math.atan2(mouseY - startY, mouseX - startX);
    
    activeBall = {
        x: startX,
        y: startY,
        vx: Math.cos(angle) * 18,
        vy: Math.sin(angle) * 18,
        color: currentBallColor
    };
    
    updateUI();
}

function updateBall() {
    activeBall.x += activeBall.vx;
    activeBall.y += activeBall.vy;

    if (activeBall.x <= BUBBLE_RADIUS) {
        activeBall.x = BUBBLE_RADIUS;
        activeBall.vx *= -1;
    } else if (activeBall.x >= width - BUBBLE_RADIUS) {
        activeBall.x = width - BUBBLE_RADIUS;
        activeBall.vx *= -1;
    }

    drawBubble(activeBall.x, activeBall.y, activeBall.color, 'NORMAL');

    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[y].length; x++) {
            if (grid[y][x]) {
                const pos = getPos(x, y);
                const d = Math.sqrt((activeBall.x - pos.x)**2 + (activeBall.y - pos.y)**2);
                if (d <= BUBBLE_RADIUS * 1.8) {
                    snap();
                    return;
                }
            }
        }
    }
    
    if (activeBall.y <= BUBBLE_RADIUS + 20) snap();
}

function snap() {
    let minDist = Infinity;
    let tx = 0, ty = 0;
    
    for (let y = 0; y < ROWS; y++) {
        if (!grid[y]) grid[y] = [];
        const cols = y % 2 === 0 ? COLUMNS : COLUMNS - 1;
        for (let x = 0; x < cols; x++) {
            if (grid[y][x]) continue;
            const pos = getPos(x, y);
            const d = Math.sqrt((activeBall.x - pos.x)**2 + (activeBall.y - pos.y)**2);
            if (d < minDist) {
                minDist = d; tx = x; ty = y;
            }
        }
    }

    grid[ty][tx] = { type: 'NORMAL', color: activeBall.color };
    processMatches(tx, ty);
    
    activeBall = null;
    isShooting = false;
    prepareNext();
}

function processMatches(x, y) {
    const color = grid[y][x].color;
    let matches = [[x, y]];
    let queue = [[x, y]];
    let visited = new Set([`${x},${y}`]);

    while (queue.length > 0) {
        let [cx, cy] = queue.shift();
        let neighbors = getNeighbors(cx, cy);
        for (let [nx, ny] of neighbors) {
            if (grid[ny] && grid[ny][nx] && grid[ny][nx].color === color && !visited.has(`${nx},${ny}`)) {
                visited.add(`${nx},${ny}`);
                matches.push([nx, ny]);
                queue.push([nx, ny]);
            }
        }
    }

    if (matches.length >= 3) {
        matches.forEach(([mx, my]) => {
            spawnPopEffect(getPos(mx, my));
            grid[my][mx] = null;
        });
        
        checkFloating();
        if (isGridEmpty()) winLevel();
    }
    updateUI();
}

function getNeighbors(x, y) {
    const offsets = y % 2 === 0 
        ? [[1,0], [-1,0], [0,1], [0,-1], [-1,1], [-1,-1]]
        : [[1,0], [-1,0], [0,1], [0,-1], [1,1], [1,-1]];
    return offsets.map(([ox, oy]) => [x + ox, y + oy]);
}

function isGridEmpty() {
    for (let y = 0; y < grid.length; y++) {
        if (!grid[y]) continue;
        for (let x = 0; x < grid[y].length; x++) {
            if (grid[y][x] !== null) return false;
        }
    }
    return true;
}

function checkFloating() {
    let connected = new Set();
    let queue = [];
    for (let x = 0; x < COLUMNS; x++) {
        if (grid[0] && grid[0][x]) {
            connected.add(`0,${x}`);
            queue.push([x, 0]);
        }
    }

    while (queue.length > 0) {
        let [cx, cy] = queue.shift();
        let neighbors = getNeighbors(cx, cy);
        for (let [nx, ny] of neighbors) {
            if (grid[ny] && grid[ny][nx] && !connected.has(`${ny},${nx}`)) {
                connected.add(`${ny},${nx}`);
                queue.push([nx, ny]);
            }
        }
    }

    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[y].length; x++) {
            if (grid[y][x] && !connected.has(`${y},${x}`)) {
                grid[y][x] = null;
            }
        }
    }
}

function spawnPopEffect(pos) {
    const el = document.createElement('div');
    el.className = 'pop-effect';
    el.style.left = pos.x + 'px';
    el.style.top = pos.y + 'px';
    document.getElementById('gameplay-ui').appendChild(el);
    setTimeout(() => el.remove(), 300);
}

function updateUI() {
    document.getElementById('balls-text').innerText = ballsRemaining;
    
    let total = 0, current = 0;
    for (let y = 0; y < grid.length; y++) {
        if (!grid[y]) continue;
        for (let x = 0; x < grid[y].length; x++) {
            total++;
            if (grid[y][x] !== null) current++;
        }
    }
    
    const progressFill = document.querySelector('.score-fill');
    if (progressFill && total > 0) {
        let cleared = total - current;
        progressFill.style.width = `${(cleared / total) * 100}%`;
    }
    
    if (ballsRemaining <= 0 && isShooting === false && activeBall === null && current > 0) {
        document.getElementById('out-of-balls-popup').classList.remove('hidden');
    }
}

function winLevel() {
    if (currentLevel === highestLevelUnlocked) {
        highestLevelUnlocked++;
        localStorage.setItem('bubble_highest_level', highestLevelUnlocked);
    }
    
    const winPopup = document.getElementById('level-complete-popup');
    winPopup.querySelector('h2').innerText = `Level ${currentLevel} Completed`;
    winPopup.classList.remove('hidden');
    
    winPopup.querySelector('.btn-primary').onclick = () => {
        winPopup.classList.add('hidden');
        currentLevel++;
        startGame();
    };
    
    winPopup.querySelector('.btn-secondary').onclick = () => {
        winPopup.classList.add('hidden');
        showScreen('home-screen');
        generateMap();
    };
}

function prepareNext() {
    currentBallColor = nextBallColor;
    nextBallColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    document.getElementById('active-ball').style.backgroundColor = currentBallColor;
    updateUI();
}

window.onload = init;
window.onresize = resize;
