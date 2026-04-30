const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let width, height;
const BUBBLE_RADIUS = 18; // Smaller ball size
const COLUMNS = 9;
const ROWS = 20;
const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7'];

let grid = [];
let ballsRemaining = 60;
let currentLevel = 1;
let coins = 100;
let combo = 0;
let fireballCharge = 0; // 0 to 6
let currentBallColor = COLORS[0];
let nextBallColor = COLORS[1];

let activeBall = null;
let isShooting = false;
let mouseX, mouseY;

// Mission State
let missionTarget = 10; // Simple target for testing
let missionCurrent = 0;
let missionColor = COLORS[0];

let highestLevelUnlocked = parseInt(localStorage.getItem('bubble_highest_level')) || 1;

function init() {
    generateMap(); // initial map generation

    showScreen('splash-screen');
    setTimeout(() => { 
        showScreen('home-screen'); 
        generateMap(); // Ensure it renders correctly when shown
    }, 3000);

    // Navigation (Basic prototype links)
    document.getElementById('settings-trigger').onclick = () => alert("Settings opened");
    
    document.getElementById('back-to-home').onclick = () => {
        showScreen('home-screen');
        generateMap(); // Refresh on back
    };

    // Popup Close Logic
    document.querySelectorAll('.close-popup').forEach(btn => {
        btn.onclick = (e) => e.target.closest('.overlay-dark').classList.add('hidden');
    });

    // Game Inputs
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
    });

    canvas.addEventListener('mouseup', () => {
        if (!isShooting && ballsRemaining > 0) shoot();
    });

    requestAnimationFrame(gameLoop);
}

function resize() {
    width = canvas.parentElement.clientWidth;
    height = canvas.parentElement.clientHeight || 400; // Fallback height
    canvas.width = width;
    canvas.height = height;
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

function startGame() {
    showScreen('gameplay-ui');
    resize(); // Fixes canvas coordinate bug!
    ballsRemaining = 60;
    missionCurrent = 0;
    missionTarget = 10 + (currentLevel * 5); // Simple scale
    
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
    
    // Generate 20 levels
    for (let i = 20; i >= 1; i--) {
        const node = document.createElement('div');
        node.className = 'level-node-blue';
        
        // S-shape logic
        const row = Math.floor((i-1) / 3);
        const col = (i-1) % 3;
        const xOffset = (row % 2 === 0) ? (col - 1) * 60 : (1 - col) * 60;
        node.style.transform = `translateX(${xOffset}px)`;
        
        if (i > highestLevelUnlocked) {
            // Locked style
            node.style.background = '#95a5a6';
            node.style.borderColor = '#7f8c8d';
            node.innerHTML = `🔒`;
        } else {
            // Unlocked style
            node.innerHTML = `${i} <div class="stars-under">⭐⭐⭐</div>`;
            if (i === highestLevelUnlocked) node.style.borderColor = '#55efc4'; // Highlight current
            
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
        y: y * BUBBLE_RADIUS * 1.75 + BUBBLE_RADIUS + 5 // Reduced top margin so grid is higher
    };
}

function drawBubble(x, y, color, type) {
    // Glossy Bubble
    ctx.beginPath();
    ctx.arc(x, y, BUBBLE_RADIUS - 2, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    
    // Highlight
    ctx.beginPath();
    ctx.arc(x - 6, y - 6, 6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fill();

    if (type === 'ROCK') {
        ctx.strokeStyle = '#444'; ctx.lineWidth = 4; ctx.stroke();
    }
}

function getBallCenter() {
    const ballEl = document.getElementById('active-ball');
    if (!ballEl) return { x: width / 2, y: height - 50 };
    
    const rect = ballEl.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    return {
        x: rect.left + rect.width / 2 - canvasRect.left,
        y: rect.top + rect.height / 2 - canvasRect.top,
        radius: rect.width / 2
    };
}

function drawTrajectory() {
    if (isShooting) return;
    
    const center = getBallCenter();
    const startX = center.x;
    const startY = center.y;
    
    let angle = Math.atan2(mouseY - startY, mouseX - startX);
    
    // Prevent shooting strictly downwards
    if (angle > 0) return;
    
    ctx.setLineDash([5, 10]);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; 
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    // Start drawing from the edge of the ball
    let currentX = startX + Math.cos(angle) * center.radius;
    let currentY = startY + Math.sin(angle) * center.radius;
    ctx.moveTo(currentX, currentY);
    
    let remainingLength = 600; // max length of trajectory
    let bounces = 0;
    
    while (remainingLength > 0 && bounces < 3) {
        bounces++;
        let hitDist = Infinity;
        let hitX = currentX + Math.cos(angle) * remainingLength;
        let hitY = currentY + Math.sin(angle) * remainingLength;
        let didBounce = false;
        
        // Check Left Wall collision
        if (Math.cos(angle) < 0) {
            let dx = BUBBLE_RADIUS - currentX;
            let d = dx / Math.cos(angle);
            if (d > 0 && d < remainingLength) {
                hitDist = d;
                hitX = BUBBLE_RADIUS;
                hitY = currentY + Math.sin(angle) * d;
                didBounce = true;
            }
        }
        // Check Right Wall collision
        else if (Math.cos(angle) > 0) {
            let dx = (width - BUBBLE_RADIUS) - currentX;
            let d = dx / Math.cos(angle);
            if (d > 0 && d < remainingLength) {
                hitDist = d;
                hitX = width - BUBBLE_RADIUS;
                hitY = currentY + Math.sin(angle) * d;
                didBounce = true;
            }
        }
        
        ctx.lineTo(hitX, hitY);
        
        if (didBounce) {
            remainingLength -= hitDist;
            currentX = hitX;
            currentY = hitY;
            angle = Math.PI - angle; // Reflect angle horizontally
        } else {
            break; // Reached end of line or ceiling
        }
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
        vx: Math.cos(angle) * 15,
        vy: Math.sin(angle) * 15,
        color: currentBallColor
    };
    
    updateUI();
}

function updateBall() {
    activeBall.x += activeBall.vx;
    activeBall.y += activeBall.vy;

    // Wall bounce
    if (activeBall.x < BUBBLE_RADIUS || activeBall.x > width - BUBBLE_RADIUS) {
        activeBall.vx *= -1;
    }

    drawBubble(activeBall.x, activeBall.y, activeBall.color, 'NORMAL');

    // Simple Collision (Improved)
    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[y].length; x++) {
            if (grid[y][x]) {
                const pos = getPos(x, y);
                const d = Math.sqrt((activeBall.x - pos.x)**2 + (activeBall.y - pos.y)**2);
                if (d < BUBBLE_RADIUS * 1.8) {
                    snap();
                    return;
                }
            }
        }
    }
    
    if (activeBall.y < BUBBLE_RADIUS) snap();
}

function snap() {
    // Find nearest empty spot
    let minDist = Infinity;
    let tx = 0, ty = 0;
    
    for (let y = 0; y < ROWS; y++) {
        if (!grid[y]) grid[y] = [];
        const cols = y % 2 === 0 ? COLUMNS : COLUMNS - 1;
        for (let x = 0; x < cols; x++) {
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
            // Simple logic: any pop adds to progress for now
            missionCurrent++;
        });
        
        fireballCharge++;
        if (fireballCharge >= 6) {
            showReadyAnim();
            fireballCharge = 6;
        }
        
        showCombo(matches.length);
        checkFloating();
        
        // Win condition: All bubbles cleared
        if (isGridEmpty()) {
            winLevel();
        }
    } else {
        fireballCharge = 0;
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

function showCombo(count) {
    const el = document.createElement('div');
    el.className = 'combo-popup';
    el.innerText = `COMBO X${count}`;
    el.style.left = '50%';
    el.style.top = '40%';
    document.getElementById('gameplay-ui').appendChild(el);
    setTimeout(() => el.remove(), 1000);
}

function showReadyAnim() {
    const el = document.createElement('div');
    el.id = 'fireball-ready-anim';
    el.innerText = 'READY!';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1000);
}

function updateUI() {
    document.getElementById('balls-text').innerText = ballsRemaining;
    
    const targetBadge = document.querySelector('.target-badge');
    if (targetBadge) targetBadge.innerText = `🎯 CLEAR ALL`;
    
    // Fill progress bar (based on remaining bubbles)
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
    
    // Show win popup
    const winPopup = document.getElementById('level-complete-popup');
    winPopup.querySelector('h2').innerHTML = `LEVEL ${currentLevel}<br>COMPLETED!`;
    winPopup.classList.remove('hidden');
    
    // Wire up buttons
    winPopup.querySelector('.btn-green-large').onclick = () => {
        winPopup.classList.add('hidden');
        currentLevel++;
        startGame();
    };
    
    winPopup.querySelector('.btn-blue-large').onclick = () => {
        winPopup.classList.add('hidden');
        showScreen('home-screen');
        generateMap(); // Refresh map to show new unlocked level
    };
}

function swapBalls() {
    // Basic swap implementation
}

function prepareNext() {
    currentBallColor = nextBallColor;
    nextBallColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    document.getElementById('active-ball').style.backgroundColor = currentBallColor;
    updateUI();
}

window.onload = init;
window.onresize = resize;
