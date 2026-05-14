'use strict';
// ══════════════════════════════════════════
//  BUBBLE SHOOTER PREMIUM — game.js  v9
//  Robustness focus | Final fixes
// ══════════════════════════════════════════

// Canvas & Contexts
let canvas, ctx, wCanvas, wCtx;

// ──────── CONSTANTS ────────
const R       = 20;
const COLS    = 9;
const ROWS    = 22;
const SPEED   = 18;
const COLORS  = ['#FF3D71','#3366FF','#00D68F','#FFAA00','#A29BFE','#FF708D'];

const WHEEL_SEGS = [
    { label:'100🪙',  color:'#FF3D71', reward:{type:'coins', val:100}  },
    { label:'500🪙',  color:'#FFAA00', reward:{type:'coins', val:500}  },
    { label:'💣x2',   color:'#A29BFE', reward:{type:'BOMB',  val:2}   },
    { label:'20🪙',   color:'#00D68F', reward:{type:'coins', val:20}   },
    { label:'🌈x2',   color:'#3366FF', reward:{type:'RAINBOW',val:2}  },
    { label:'80🪙',   color:'#FF708D', reward:{type:'coins', val:80}   },
    { label:'200🪙',  color:'#FFAA00', reward:{type:'coins', val:200}  },
    { label:'50🪙',   color:'#00D68F', reward:{type:'coins', val:50}   },
];

// ──────── STATE ────────
let S = {
    coins: 200, highestLevel: 1, score: 0,
    powerups: { BOMB:2, FIREBALL:1, RAINBOW:3 },
    stats: { totalPops:0, totalShots:0, totalCoins:200 },
    spinDate: '', spinsLeft: 3, challengeDate: '', challengeProg: 0
};

let grid         = [];
let ballsLeft    = 60;
let activeBall   = null;
let shooting     = false;
let mx = 0, my = 0;
let activePU     = null;
let currentLevel = 1;
let goal         = { color: COLORS[4], need:6, done:0 };
let wheelAngle   = 0;
let wheelSpinning= false;
let combo        = 0;

let particles  = [];
let popups     = [];
let confetti   = [];
let shakeFrames= 0;
let audioCtx   = null;

// ══════════════════════════════════════════
//  INITIALIZATION
// ══════════════════════════════════════════
function init() {
    try {
        console.log("Game initializing...");
        canvas  = document.getElementById('gameCanvas');
        wCanvas = document.getElementById('wheelCanvas');
        
        if (canvas)  ctx  = canvas.getContext('2d');
        if (wCanvas) wCtx = wCanvas.getContext('2d');

        load();
        generateMap();
        generateLevels();
        if (wCtx) drawWheel();
        updateUI();

        if (canvas) {
            canvas.addEventListener('mousemove', e => { 
                const r = canvas.getBoundingClientRect(); 
                mx = e.clientX - r.left; 
                my = e.clientY - r.top; 
            });
            canvas.addEventListener('mouseup', () => { if(!shooting && ballsLeft>0 && !activeBall) shoot(); });
            canvas.addEventListener('touchstart', e => { 
                e.preventDefault(); 
                const r = canvas.getBoundingClientRect(); 
                mx = e.touches[0].clientX - r.left; 
                my = e.touches[0].clientY - r.top; 
            }, {passive:false});
            canvas.addEventListener('touchend', e => { 
                e.preventDefault(); 
                if(!shooting && ballsLeft>0 && !activeBall) shoot(); 
            }, {passive:false});
        }

        // Show main menu after a short splash
        setTimeout(() => {
            console.log("Transitioning to main menu...");
            showScreen('main-menu');
        }, 1500);

        requestAnimationFrame(loop);
    } catch (e) {
        console.error("Init Error:", e);
    }
}

// ══════════════════════════════════════════
//  PERSISTENCE
// ══════════════════════════════════════════
function save() { 
    try { localStorage.setItem('bsv7', JSON.stringify(S)); } catch(e){} 
}
function load() {
    try {
        const raw = localStorage.getItem('bsv7');
        if (raw) {
            const d = JSON.parse(raw);
            Object.assign(S, d);
        }
    } catch(e) {}
    
    const today = new Date().toDateString();
    if (S.spinDate !== today)      { S.spinsLeft = 3; S.spinDate = today; }
    if (S.challengeDate !== today) { S.challengeProg = 0; S.challengeDate = today; }
}

// ══════════════════════════════════════════
//  NAVIGATION
// ══════════════════════════════════════════
function showScreen(id) {
    const target = document.getElementById(id);
    if (!target) return;

    // Hide others
    document.querySelectorAll('.screen').forEach(s => {
        if (s.id !== id && !s.classList.contains('hidden')) {
            s.style.opacity = '0';
            s.style.transform = 'scale(0.96)';
            setTimeout(() => s.classList.add('hidden'), 400);
        }
    });

    // Prepare target
    target.style.opacity = '0';
    target.style.transform = 'scale(1.04)';
    target.classList.remove('hidden');

    // Animate in
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            target.style.opacity = '1';
            target.style.transform = 'scale(1)';
        });
    });

    // Sub-init
    if (id === 'home-screen')         { generateMap(); setTimeout(drawMapPath, 200); }
    if (id === 'levels-screen')       { generateLevels(); }
    if (id === 'achievements-screen') { updateAchievements(); }
    if (id === 'spin-screen')         { updateSpinUI(); if(wCtx) drawWheel(); }
    if (id === 'gameplay-ui')         { resize(); }
}

function openPopup(id)  { const el = document.getElementById(id); if(el) el.classList.remove('hidden'); }
function closePopup(id) { const el = document.getElementById(id); if(el) el.classList.add('hidden'); }

// ══════════════════════════════════════════
//  UI HELPERS
// ══════════════════════════════════════════
function setText(id, val) { 
    const el = document.getElementById(id); 
    if (el) el.textContent = val; 
}
function setStyle(id, prop, val) { 
    const el = document.getElementById(id); 
    if (el) el.style[prop] = val; 
}

function updateUI() {
    setText('header-coins',    S.coins);
    setText('bomb-count',      S.powerups.BOMB || 0);
    setText('rainbow-count',   S.powerups.RAINBOW || 0);
    setText('current-score',   (S.score || 0).toLocaleString());
    setText('goal-text',       `${goal.done}/${goal.need}`);
    
    const gb = document.getElementById('goal-bubble');
    if (gb) gb.style.background = goal.color;

    const prog = Math.min((S.highestLevel - 1) / 90 * 100, 100);
    setStyle('world-bar', 'width', prog + '%');
    setText('world-prog-label', `${Math.max(0, S.highestLevel - 1)}/90`);
}

function updateAchievements() {
    const set = (fid, tid, val, max) => {
        setStyle(fid, 'width', Math.min((val||0)/max*100, 100) + '%');
        setText(tid, `${val||0}/${max}`);
    };
    set('ach-pop-fill',  'ach-pop-text',   S.stats.totalPops,   100);
    set('ach-shot-fill', 'ach-shot-text',  S.stats.totalShots,   10);
    set('ach-coin-fill', 'ach-coin-text',  S.stats.totalCoins, 1000);
    set('ach-level-fill','ach-level-text', Math.max(0, S.highestLevel-1), 10);
}

function updateSpinUI() {
    const btn = document.getElementById('spin-btn');
    if (btn) btn.disabled = S.spinsLeft <= 0;
    setText('spins-left-text', `You have ${S.spinsLeft} spin${S.spinsLeft!==1?'s':''} left today`);
}

// ══════════════════════════════════════════
//  WHEEL
// ══════════════════════════════════════════
function drawWheel(extraAngle) {
    if (!wCtx) return;
    const ang = (extraAngle !== undefined ? extraAngle : wheelAngle);
    const cx=140, cy=140, r=130;
    const arc = Math.PI*2 / WHEEL_SEGS.length;
    wCtx.clearRect(0,0,280,280);
    WHEEL_SEGS.forEach((seg, i) => {
        const s = arc*i + ang, e = s + arc;
        wCtx.beginPath(); wCtx.moveTo(cx,cy); wCtx.arc(cx,cy,r,s,e); wCtx.closePath();
        wCtx.fillStyle = seg.color; wCtx.fill();
        wCtx.strokeStyle = '#fff'; wCtx.lineWidth = 2; wCtx.stroke();
        wCtx.save(); wCtx.translate(cx,cy); wCtx.rotate(s + arc/2);
        wCtx.textAlign = 'right'; wCtx.fillStyle = '#fff'; wCtx.font = 'bold 13px Inter,sans-serif';
        wCtx.fillText(seg.label, r-15, 5);
        wCtx.restore();
    });
    wCtx.beginPath(); wCtx.arc(cx,cy,25,0,Math.PI*2);
    wCtx.fillStyle = '#fff'; wCtx.fill();
    wCtx.textAlign = 'center'; wCtx.fillStyle = WHEEL_SEGS[0].color;
    wCtx.font = '20px Arial'; wCtx.fillText('🎡', cx, cy+7);
}

function spinWheel() {
    if (wheelSpinning || S.spinsLeft <= 0) return;
    wheelSpinning = true; S.spinsLeft--; save(); updateSpinUI();
    const winIdx  = Math.floor(Math.random() * WHEEL_SEGS.length);
    const total   = Math.PI*2 * (5 + Math.random()*3);
    const startA  = wheelAngle;
    const dur     = 4000;
    const t0      = performance.now();
    function frame(now) {
        const p = Math.min((now - t0) / dur, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        wheelAngle = startA + total * ease;
        drawWheel(wheelAngle);
        if (p < 1) requestAnimationFrame(frame);
        else {
            wheelSpinning = false;
            applyReward(WHEEL_SEGS[winIdx].reward);
        }
    }
    requestAnimationFrame(frame);
}
function applyReward(r) {
    if (r.type === 'coins') { S.coins += r.val; S.stats.totalCoins += r.val; }
    else { S.powerups[r.type] = (S.powerups[r.type] || 0) + r.val; }
    save(); updateUI();
    alert(`Reward: ${r.label || r.val + ' ' + r.type}`);
}

// ══════════════════════════════════════════
//  MAP & LEVELS
// ══════════════════════════════════════════
function generateMap() {
    const cont = document.getElementById('map-nodes');
    if (!cont) return;
    cont.innerHTML = '';
    for (let i=20; i>=1; i--) {
        const node = document.createElement('button');
        node.className = 'level-node';
        const row = Math.floor((i-1)/3);
        const col = (i-1)%3;
        const xOff = (row % 2 === 0) ? (col-1)*85 : (1-col)*85;
        node.style.transform = `translateX(${xOff}px)`;
        if (i > S.highestLevel) {
            node.classList.add('locked');
            node.innerHTML = '🔒';
        } else {
            if (i === S.highestLevel) node.classList.add('active');
            node.innerHTML = `${i}<div class="stars">★★★</div>`;
            node.onclick = () => startGame(i);
        }
        cont.appendChild(node);
    }
}

function generateLevels() {
    const gridEl = document.getElementById('levels-grid');
    if (!gridEl) return;
    gridEl.innerHTML = '';
    for (let i=1; i<=20; i++) {
        const btn = document.createElement('button');
        btn.className = 'level-node';
        if (i > S.highestLevel) {
            btn.classList.add('locked');
            btn.innerHTML = '🔒';
        } else {
            btn.innerHTML = i;
            btn.onclick = () => startGame(i);
        }
        gridEl.appendChild(btn);
    }
}

function drawMapPath() {
    const mapC  = document.getElementById('mapCanvas');
    const scroll = document.getElementById('map-scroll');
    const nodes  = document.querySelectorAll('#map-nodes .level-node');
    if (!mapC || !scroll || !nodes.length) return;
    
    mapC.width  = scroll.offsetWidth;
    mapC.height = scroll.scrollHeight || scroll.offsetHeight;
    const mCtx  = mapC.getContext('2d');
    const pts   = [];
    const sr    = scroll.getBoundingClientRect();
    
    nodes.forEach(n => {
        const nr = n.getBoundingClientRect();
        pts.push({ 
            x: nr.left - sr.left + nr.width/2, 
            y: nr.top - sr.top + scroll.scrollTop + nr.height/2 
        });
    });
    
    if (pts.length < 2) return;
    mCtx.strokeStyle = 'rgba(139,90,43,0.3)';
    mCtx.lineWidth = 8;
    mCtx.setLineDash([10, 10]);
    mCtx.beginPath();
    mCtx.moveTo(pts[0].x, pts[0].y);
    for(let i=1; i<pts.length; i++) mCtx.lineTo(pts[i].x, pts[i].y);
    mCtx.stroke();
}

// ══════════════════════════════════════════
//  GAMEPLAY LOGIC
// ══════════════════════════════════════════
function startGame(level) {
    currentLevel = level;
    ballsLeft = Math.max(30, 60 - Math.floor(level/5)*3);
    goal.color = COLORS[Math.floor(Math.random() * COLORS.length)];
    goal.need  = 5 + Math.floor(level/2);
    goal.done  = 0;
    S.score    = 0;
    combo      = 0;
    generateLevel(level);
    prepNext();
    showScreen('gameplay-ui');
    updateUI();
}

function generateLevel(level) {
    grid = [];
    const rows = 8 + Math.floor(level/5);
    for (let y=0; y<rows; y++) {
        grid[y] = [];
        const indent = Math.floor(y/2);
        const cols = Math.max(2, (y%2===0 ? COLS : COLS-1) - indent);
        for (let x=0; x<cols; x++) {
            grid[y][x + Math.floor(indent/2)] = { 
                color: COLORS[Math.floor(Math.random() * COLORS.length)], 
                type: 'NORMAL' 
            };
        }
    }
}

function resize() {
    if (!canvas || !canvas.parentElement) return;
    canvas.width  = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
}

function loop() {
    if (ctx && canvas && canvas.width > 0) {
        ctx.save();
        if (shakeFrames > 0) {
            const s = (shakeFrames/14)*8;
            ctx.translate((Math.random()-0.5)*s, (Math.random()-0.5)*s);
            shakeFrames--;
        }
        ctx.clearRect(-20, -20, canvas.width+40, canvas.height+40);
        drawGrid();
        drawAim();
        if (activeBall) moveBall();
        tickParticles();
        tickPopups();
        tickConfetti();
        ctx.restore();
    }
    requestAnimationFrame(loop);
}

function getPos(x, y) {
    const off = (y % 2 !== 0) ? R : 0;
    const sx  = (canvas.width - COLS*R*2)/2 + R;
    return { x: sx + x*R*2 + off, y: y*R*1.75 + R + 18 };
}

function drawGrid() {
    grid.forEach((row, y) => {
        if (!row) return;
        row.forEach((b, x) => {
            if (b) {
                const p = getPos(x, y);
                drawBubble(ctx, p.x, p.y, b.color);
            }
        });
    });
}

function drawBubble(c, x, y, color) {
    c.beginPath(); c.arc(x, y+2, R-1, 0, Math.PI*2);
    c.fillStyle = 'rgba(0,0,0,0.08)'; c.fill();
    c.beginPath(); c.arc(x, y, R-1, 0, Math.PI*2);
    c.fillStyle = color; c.fill();
    const g = c.createRadialGradient(x-R*0.3, y-R*0.3, 1, x, y, R);
    g.addColorStop(0, 'rgba(255,255,255,0.4)');
    g.addColorStop(1, 'rgba(0,0,0,0.1)');
    c.fillStyle = g; c.fill();
}

function drawAim() {
    if (shooting || !mx || !my) return;
    const cen = ballCenter();
    const ang = Math.atan2(my - cen.y, mx - cen.x);
    if (ang > 0) return;
    let cx = cen.x, cy = cen.y, dx = Math.cos(ang)*12, dy = Math.sin(ang)*12;
    ctx.fillStyle = 'rgba(162,155,254,0.4)';
    for (let i=0; i<20; i++) {
        cx += dx; cy += dy;
        if (cx < R || cx > canvas.width-R) dx *= -1;
        if (i % 2 === 0) { ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI*2); ctx.fill(); }
    }
}

function ballCenter() {
    const el = document.getElementById('active-ball');
    if (!el || !canvas) return { x: 200, y: 800 };
    const r = el.getBoundingClientRect(), cr = canvas.getBoundingClientRect();
    return { x: r.left + r.width/2 - cr.left, y: r.top + r.height/2 - cr.top };
}

function shoot() {
    if (shooting || !canvas) return;
    initAudio();
    shooting = true; ballsLeft--; S.stats.totalShots++;
    const cen = ballCenter();
    const ang = Math.atan2(my - cen.y, mx - cen.x);
    const col = document.getElementById('active-ball').style.backgroundColor;
    activeBall = { 
        x: cen.x, y: cen.y, 
        vx: Math.cos(ang)*SPEED, vy: Math.sin(ang)*SPEED, 
        color: col, pu: activePU 
    };
    activePU = null;
    playSound('shoot');
    updateUI(); save();
}

function moveBall() {
    activeBall.x += activeBall.vx; activeBall.y += activeBall.vy;
    if (activeBall.x <= R || activeBall.x >= canvas.width-R) activeBall.vx *= -1;
    drawBubble(ctx, activeBall.x, activeBall.y, activeBall.color);
    let hit = false;
    outer: for (let y=0; y<grid.length; y++) {
        if (!grid[y]) continue;
        for (let x=0; x<grid[y].length; x++) {
            if (grid[y][x]) {
                const p = getPos(x, y);
                if (Math.hypot(activeBall.x-p.x, activeBall.y-p.y) <= R*1.75) { hit=true; break outer; }
            }
        }
    }
    if (hit || activeBall.y <= R+18) snap();
    if (activeBall.y > canvas.height) { activeBall=null; shooting=false; prepNext(); }
}

function snap() {
    if (activeBall.pu === 'FIREBALL') fireballBlast(activeBall.x);
    else {
        const {tx, ty} = findSlot();
        if (!grid[ty]) grid[ty] = [];
        grid[ty][tx] = { color: activeBall.color, type: 'NORMAL' };
        if (activeBall.pu === 'BOMB') bombBlast(tx, ty);
        else matchAndPop(tx, ty);
    }
    activeBall = null; shooting = false; prepNext();
}

function findSlot() {
    let best = Infinity, tx = 0, ty = 0;
    for (let y=0; y<ROWS; y++) {
        const cols = (y % 2 === 0) ? COLS : COLS-1;
        for (let x=0; x<cols; x++) {
            if (grid[y] && grid[y][x]) continue;
            const p = getPos(x, y);
            const d = Math.hypot(activeBall.x-p.x, activeBall.y-p.y);
            if (d < best) { best=d; tx=x; ty=y; }
        }
    }
    return {tx, ty};
}

function matchAndPop(x, y) {
    const col = grid[y] && grid[y][x] && grid[y][x].color;
    if (!col) return;
    let q = [[x, y]], matched = [[x, y]], vis = new Set([`${x},${y}`]);
    while (q.length) {
        const [cx, cy] = q.shift();
        const neighbors = (cx, cy) => {
            const off = (cy % 2 === 0) ? [[1,0],[-1,0],[0,1],[0,-1],[-1,1],[-1,-1]] : [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1]];
            return off.map(([ox, oy]) => [cx+ox, cy+oy]);
        };
        neighbors(cx, cy).forEach(([nx, ny]) => {
            if (grid[ny] && grid[ny][nx] && grid[ny][nx].color === col && !vis.has(`${nx},${ny}`)) {
                vis.add(`${nx},${ny}`); matched.push([nx, ny]); q.push([nx, ny]);
            }
        });
    }
    if (matched.length >= 3) {
        combo++;
        const mult = Math.min(combo, 5);
        matched.forEach(([bx, by]) => {
            const p = getPos(bx, by);
            if (grid[by][bx].color === goal.color) goal.done++;
            spawnParticles(p.x, p.y, grid[by][bx].color, 8);
            grid[by][bx] = null;
            const pts = 20 * mult; S.score += pts; S.stats.totalPops++;
            spawnScorePopup(p.x, p.y, `+${pts}`);
        });
        playSound('pop');
        floatCheck();
        if (goal.done >= goal.need || gridEmpty()) winLevel();
    } else { combo = 0; }
    updateUI(); save();
}

function bombBlast(tx, ty) {
    const targets = [[tx,ty]];
    const off = (ty % 2 === 0) ? [[1,0],[-1,0],[0,1],[0,-1],[-1,1],[-1,-1]] : [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1]];
    off.forEach(([ox, oy]) => targets.push([tx+ox, ty+oy]));
    targets.forEach(([nx, ny]) => {
        if (grid[ny] && grid[ny][nx]) {
            const p = getPos(nx, ny);
            spawnParticles(p.x, p.y, grid[ny][nx].color, 12);
            grid[ny][nx] = null; S.score += 10; S.stats.totalPops++;
        }
    });
    playSound('bomb'); shakeFrames = 15;
    floatCheck(); if (gridEmpty()) winLevel();
}

function fireballBlast(ax) {
    grid.forEach((row, y) => {
        if (!row) return;
        row.forEach((b, x) => {
            if (b) {
                const p = getPos(x, y);
                if (Math.abs(p.x - ax) < R*2.5) {
                    grid[y][x] = null; S.score += 10; S.stats.totalPops++;
                }
            }
        });
    });
    floatCheck(); if (gridEmpty()) winLevel();
}

function floatCheck() {
    const connected = new Set();
    const q = [];
    if (grid[0]) grid[0].forEach((b, x) => { if(b) { connected.add(`0,${x}`); q.push([x, 0]); } });
    while (q.length) {
        const [cx, cy] = q.shift();
        const off = (cy % 2 === 0) ? [[1,0],[-1,0],[0,1],[0,-1],[-1,1],[-1,-1]] : [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1]];
        off.forEach(([ox, oy]) => {
            const nx = cx+ox, ny = cy+oy;
            if (grid[ny] && grid[ny][nx] && !connected.has(`${ny},${nx}`)) {
                connected.add(`${ny},${nx}`); q.push([nx, ny]);
            }
        });
    }
    grid.forEach((row, y) => {
        if (!row) return;
        row.forEach((b, x) => {
            if (b && !connected.has(`${y},${x}`)) {
                grid[y][x] = null; S.score += 5; S.stats.totalPops++;
            }
        });
    });
}

function gridEmpty() { return grid.every(r => !r || r.every(b => !b)); }

function winLevel() {
    S.coins += 50; S.stats.totalCoins += 50;
    if (currentLevel >= S.highestLevel) S.highestLevel = currentLevel + 1;
    save(); generateLevels(); generateMap();
    playSound('win'); runConfetti();
    setTimeout(() => {
        openPopup('level-complete-popup');
        const btn = document.getElementById('next-level-btn');
        if (btn) btn.onclick = () => { closePopup('level-complete-popup'); startGame(currentLevel+1); };
    }, 1000);
}

function prepNext() {
    const a = document.getElementById('active-ball');
    const n = document.getElementById('next-ball');
    if (a && n) {
        a.style.backgroundColor = n.style.backgroundColor || randColor();
        n.style.backgroundColor = randColor();
    }
    updateUI();
}
function randColor() { return COLORS[Math.floor(Math.random() * COLORS.length)]; }

function usePowerup(type) {
    if (S.powerups[type] > 0) { S.powerups[type]--; activePU = type; save(); updateUI(); }
    else openPopup('shop-popup');
}
function buyItem(type, cost) {
    if (S.coins >= cost) { S.coins -= cost; S.powerups[type] = (S.powerups[type]||0) + 3; save(); updateUI(); }
    else alert('Not enough coins!');
}

// ══════════════════════════════════════════
//  VFX
// ══════════════════════════════════════════
function spawnParticles(x, y, color, count) {
    for (let i=0; i<count; i++) {
        const ang = Math.random()*Math.PI*2, spd = 2 + Math.random()*4;
        particles.push({ x, y, vx: Math.cos(ang)*spd, vy: Math.sin(ang)*spd, r: 3+Math.random()*3, color, life: 1, decay: 0.03+Math.random()*0.03 });
    }
}
function tickParticles() {
    particles = particles.filter(p => p.life > 0);
    particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.2; p.vx *= 0.96; p.vy *= 0.96; p.life -= p.decay;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
        ctx.fillStyle = p.color; ctx.fill();
    });
    ctx.globalAlpha = 1;
}
function spawnScorePopup(x, y, text) { popups.push({ x, y: y-10, vy: -1.5, text, life: 1, decay: 0.02 }); }
function tickPopups() {
    popups = popups.filter(p => p.life > 0);
    popups.forEach(p => {
        p.y += p.vy; p.life -= p.decay;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 16px Inter'; ctx.textAlign = 'center';
        ctx.strokeText(p.text, p.x, p.y); ctx.fillText(p.text, p.x, p.y);
    });
    ctx.globalAlpha = 1;
}
function runConfetti() {
    const cols = ['#FF3D71','#FFAA00','#00D68F','#3366FF','#A29BFE','#f1c40f'];
    for (let i=0; i<100; i++) {
        confetti.push({ x: Math.random()*canvas.width, y: -20, vx: (Math.random()-0.5)*4, vy: 2+Math.random()*4, rot: Math.random()*Math.PI*2, rotV: (Math.random()-0.5)*0.2, w: 8, h: 5, color: cols[Math.floor(Math.random()*cols.length)], life: 1, decay: 0.005 });
    }
}
function tickConfetti() {
    confetti = confetti.filter(c => c.life > 0);
    confetti.forEach(c => {
        c.x += c.vx; c.y += c.vy; c.rot += c.rotV; c.vy += 0.1; c.life -= c.decay;
        ctx.save(); ctx.globalAlpha = Math.max(0, c.life); ctx.translate(c.x, c.y); ctx.rotate(c.rot);
        ctx.fillStyle = c.color; ctx.fillRect(-c.w/2, -c.h/2, c.w, c.h); ctx.restore();
    });
    ctx.globalAlpha = 1;
}

// ══════════════════════════════════════════
//  AUDIO (Synthesized)
// ══════════════════════════════════════════
function initAudio() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
function playSound(type) {
    if (!audioCtx) return;
    const g = audioCtx.createGain(), o = audioCtx.createOscillator();
    g.connect(audioCtx.destination); o.connect(g);
    const t = audioCtx.currentTime;
    if (type === 'pop') {
        o.type = 'sine'; o.frequency.setValueAtTime(500, t); o.frequency.exponentialRampToValueAtTime(200, t+0.1);
        g.gain.setValueAtTime(0.2, t); g.gain.exponentialRampToValueAtTime(0.01, t+0.1);
        o.start(t); o.stop(t+0.12);
    } else if (type === 'shoot') {
        o.type = 'triangle'; o.frequency.setValueAtTime(300, t); o.frequency.exponentialRampToValueAtTime(150, t+0.05);
        g.gain.setValueAtTime(0.1, t); g.gain.exponentialRampToValueAtTime(0.01, t+0.06);
        o.start(t); o.stop(t+0.07);
    } else if (type === 'bomb') {
        o.type = 'sawtooth'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t+0.3);
        g.gain.setValueAtTime(0.3, t); g.gain.exponentialRampToValueAtTime(0.01, t+0.3);
        o.start(t); o.stop(t+0.32);
    } else if (type === 'win') {
        [523, 659, 784].forEach((f, i) => {
            const oo = audioCtx.createOscillator(), gg = audioCtx.createGain();
            oo.connect(gg); gg.connect(audioCtx.destination);
            oo.frequency.setValueAtTime(f, t + i*0.15); gg.gain.setValueAtTime(0.2, t + i*0.15);
            gg.gain.exponentialRampToValueAtTime(0.01, t + i*0.15 + 0.3);
            oo.start(t + i*0.15); oo.stop(t + i*0.15 + 0.4);
        });
    }
}

// ══════════════════════════════════════════
//  BOOTSTRAP
// ══════════════════════════════════════════
document.addEventListener('DOMContentLoaded', init);
// Fallback if DOMContentLoaded already fired or fails
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    if (!canvas) init(); 
}
window.onresize = resize;
