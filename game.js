'use strict';
// ══════════════════════════════════════════
//  BUBBLE SHOOTER PREMIUM — game.js v24
//  EXACT PHOTO CLONE — Ultra Glossy Engine
// ══════════════════════════════════════════

let canvas, ctx, scoreVal, currentBallEl, nextBallEl, goalText;
const R = 18, rowHeight = 32, SPEED = 32;


const COLORS = ['#ff4d4d', '#ffcc00', '#33cc33', '#3399ff', '#cc33ff', '#ff8c1a'];

// Maps generator color names → hex used by renderer
const COLORS_MAP = {
    red:    '#ff4d4d',
    yellow: '#ffcc00',
    green:  '#33cc33',
    blue:   '#3399ff',
    purple: '#cc33ff'
};
const GEN_COLORS = ['red', 'blue', 'green', 'yellow', 'purple'];

// ──────── SMART LEVEL GENERATOR ────────
function getDifficulty(level) {
    if (level < 20)  return { rows: 5,  cols: 8,  colors: 3, hardChance: 0.0 };
    if (level < 80)  return { rows: 7,  cols: 9,  colors: 4, hardChance: 0.0 };
    if (level < 160) return { rows: 8,  cols: 10, colors: 5, hardChance: 0.1 };
    return               { rows: 10, cols: 11, colors: 5, hardChance: 0.2 };
}

// ──────── CUMULATIVE THEMES (new one added every 80 levels) ────────
const ALL_THEMES = ['stone', 'ice', 'fire', 'void', 'cosmic'];

function getAvailableThemes(level) {
    // Each 80 levels unlocks one more theme (cumulative)
    const count = Math.min(Math.floor(level / 80), ALL_THEMES.length);
    return count === 0 ? [] : ALL_THEMES.slice(0, count);
}

function pickRandomTheme(availableThemes) {
    return availableThemes[Math.floor(Math.random() * availableThemes.length)];
}

function createBubble(color, theme='normal')     { return { color, type: 'normal', hp: 1, theme }; }
function createHardBubble(color, theme='normal') { return { color, type: 'hard',   hp: 2, theme }; }

function generateLevel(level, playerFails = 0) {
    let { rows, cols, colors, hardChance } = getDifficulty(level);
    if (playerFails >= 3) { hardChance = 0; colors = Math.max(2, colors - 1); }
    const selectedColors = GEN_COLORS.slice(0, colors);
    const availableThemes = getAvailableThemes(level);
    // Max 15% hard balls to avoid frustration
    const hardRate = Math.min(hardChance, 0.15);
    const grid = [];
    for (let row = 0; row < rows; row++) {
        const currentRow = [];
        for (let col = 0; col < cols; col++) {
            if (level > 30 && Math.random() < 0.08) { currentRow.push(null); continue; }
            const color = selectedColors[Math.floor(Math.random() * selectedColors.length)];
            const isHard = availableThemes.length > 0 && Math.random() < hardRate;
            currentRow.push(isHard
                ? createHardBubble(color, pickRandomTheme(availableThemes))
                : createBubble(color, 'normal'));
        }
        grid.push(currentRow);
    }
    return grid;
}


let S = {
    score: 0, coins: 1250, ammo: 50,
    currentLevel: Number(localStorage.getItem('bs_level')) || 1,
    unlockedLevels: 5000,
    playerFails: 0,          // Tracks consecutive fails for Adaptive Easy Mode
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
    const totalLevels = 5000;
    const center = 155, amplitude = 100, frequency = 300;
    const totalHeight = totalLevels * 140 + 150;
    path.style.height = `${totalHeight}px`;
    
    const fragment = document.createDocumentFragment();
    for (let i = 1; i <= totalLevels; i++) {
        const node = document.createElement('div');
        node.className = 'node-premium';
        // Invert Y coordinate so Level 1 is at the bottom
        const yPos = totalHeight - (i * 140); 
        const xPos = center + Math.sin(yPos / frequency) * amplitude;
        node.style.top = `${yPos}px`; node.style.left = `${xPos}px`;
        if (i <= S.unlockedLevels) {
            node.classList.add('unlocked');
            node.innerHTML = `<span>${i}</span><div style="position:absolute;bottom:-22px;width:100%;text-align:center;font-size:14px;color:#ffcf3e;">⭐⭐⭐</div>`;
            node.onclick = () => { S.currentLevel = i; startGame(); };
        } else { node.innerHTML = `<span>${i}</span><div style="position:absolute;bottom:-20px;width:100%;text-align:center;color:#999;font-size:14px;">🔒🔒🔒</div>`; }
        fragment.appendChild(node);
    }
    path.appendChild(fragment);
    
    setTimeout(() => {
        const targetLevel = S.currentLevel || 1;
        const nodes = document.querySelectorAll('.node-premium.unlocked');
        if (nodes.length > 0) {
            const activeNode = nodes[targetLevel - 1];
            if (activeNode) activeNode.scrollIntoView({ behavior: 'auto', block: 'center' });
        }
    }, 100);
    
    // Add scroll listener for the FAB
    const scroller = document.getElementById('mapScrollArea');
    const focusBtn = document.getElementById('focusCurrentBtn');
    if (scroller && focusBtn) {
        scroller.addEventListener('scroll', () => {
            const targetLevel = S.currentLevel || 1;
            const nodes = document.querySelectorAll('.node-premium.unlocked');
            if (nodes.length > 0) {
                const activeNode = nodes[targetLevel - 1];
                if (activeNode) {
                    const rect = activeNode.getBoundingClientRect();
                    // mapScrollArea takes up most of the screen. We check if node is in viewport.
                    const isVisible = (rect.top >= 0 && rect.bottom <= window.innerHeight);
                    if (!isVisible) {
                        focusBtn.classList.remove('hidden');
                        const svgArrow = focusBtn.querySelector('svg');
                        if (svgArrow) {
                            // If node is above viewport (rect.top < 0), point UP. Otherwise DOWN.
                            if (rect.top < 0) svgArrow.style.transform = 'rotate(180deg)';
                            else svgArrow.style.transform = 'rotate(0deg)';
                        }
                    } else {
                        focusBtn.classList.add('hidden');
                    }
                }
            }
        });
    }
}

function scrollToCurrentLevel() {
    const targetLevel = S.currentLevel || 1;
    const nodes = document.querySelectorAll('.node-premium.unlocked');
    if (nodes.length > 0) {
        const activeNode = nodes[targetLevel - 1];
        if (activeNode) activeNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
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
    // ── Smart Level Generator ──────────────────────────────
    const diff = getDifficulty(S.currentLevel);
    let { rows, cols, colors, hardChance } = diff;

    // Adaptive Easy Mode: if player failed 3+ times, reduce difficulty
    if (S.playerFails >= 3) {
        hardChance = 0;
        colors = Math.max(2, colors - 1);
        console.log(`[EasyMode] Level ${S.currentLevel} | Colors: ${colors}`);
    }

    const levelGrid = generateLevel(S.currentLevel, S.playerFails);
    const numCols = cols;
    const spacingX = width / numCols;
    const dynamicR = (spacingX / 2) * 0.95;
    window.activeR = dynamicR;
    window.numCols = numCols;

    S.ammo = 50; S.score = 0; S.objective.count = 0;
    bubbles = [];
    const spacingY = spacingX * 0.866;
    introAnimFrame = 60;

    levelGrid.forEach((rowData, row) => {
        const isOffset = row % 2 !== 0;
        const startX = isOffset ? spacingX / 2 : 0;
        rowData.forEach((cell, col) => {
            if (!cell) return; // null = gap
            const x = startX + col * spacingX + (spacingX / 2);
            const targetY = row * spacingY + (spacingX / 2);
            bubbles.push({
                x, targetY,
                y: canvas.height + 100,
                color: COLORS_MAP[cell.color] || COLORS[0],
                type: cell.type,
                hp: cell.hp,
                theme: cell.theme,   // ← THIS was missing — fix for visual themes
                alive: true, falling: false, r: dynamicR, row
            });
        });
    });
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
    // Use the actual numCols set by the level generator — this was the root bug
    const numCols = window.numCols || 10;
    const spacingX = canvas.width / numCols;
    const spacingY = spacingX * 0.866;
    
    let bestDist = Infinity;
    let bestCell = null;

    const estRow = Math.round((projectile.y - clusterOffset - (spacingX / 2)) / spacingY);
    
    for (let r = Math.max(0, estRow - 2); r <= estRow + 2; r++) {
        const isOffset = r % 2 !== 0;
        const rowWidth = isOffset ? numCols - 1 : numCols;
        const startX = isOffset ? spacingX / 2 : 0;
        
        for (let c = 0; c < rowWidth; c++) {
            const nx = startX + c * spacingX + (spacingX / 2);
            const ny = r * spacingY + (spacingX / 2);
            const absoluteNy = ny + clusterOffset;
            
            let occupied = false;
            for (let b of bubbles) {
                if (b.alive && !b.falling && Math.hypot(b.x - nx, b.targetY - ny) < curR * 0.8) {
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

    const finalVisualY = bestCell.ny + clusterOffset;
    const newB = { 
        x: bestCell.nx, targetY: bestCell.ny, y: finalVisualY, 
        color: projectile.color, alive: true, falling: false, 
        r: curR, row: bestCell.row, hp: 1, type: 'normal'
    };
    bubbles.push(newB);

    const visited = new Set(), matches = [];
    function dfs(b) {
        if(!b || visited.has(b)) return; visited.add(b); matches.push(b);
        bubbles.filter(o => o.alive && !o.falling && Math.hypot(o.x - b.x, o.targetY - b.targetY) < spacingX * 1.2).forEach(n => { 
            if(n.color === newB.color) dfs(n); 
        });
    }
    dfs(newB);

    if (matches.length >= 3) {
        const poppedPositions = [];
        matches.forEach(b => {
            if (b.theme !== 'normal' && b.hp >= 2) {
                // Themed blocker: first hit cracks it, second pops it
                b.hp--;
                createParticles(b.x, b.y, '#aaaaaa');
                S.score += 50;
            } else {
                b.alive = false;
                poppedPositions.push({ x: b.x, targetY: b.targetY });
                createParticles(b.x, b.y, b.color);
                S.score += 100;
            }
        });
        shakeFrames = 15; if(S.settings.sound) playSFX('pop');

        // Adjacent difficulty balls take 1 damage when normal balls pop next to them
        if (poppedPositions.length > 0) {
            bubbles.forEach(b => {
                if (!b.alive || b.falling || b.theme === 'normal') return;
                const isAdjacentToPop = poppedPositions.some(p =>
                    Math.hypot(b.x - p.x, b.targetY - p.targetY) < spacingX * 1.3
                );
                if (isAdjacentToPop) {
                    b.hp--;
                    createParticles(b.x, b.y, '#ccccff');
                    if (b.hp <= 0) {
                        b.alive = false;
                        S.score += 150; // Bonus for clearing a blocker
                    }
                }
            });
        }

        // Orphan detection: start from ALL bubbles in the very top row (smallest targetY)
        const minY = Math.min(...bubbles.filter(b => b.alive && !b.falling).map(b => b.targetY));
        const con = new Set();
        function mark(b) { 
            if(con.has(b)) return; con.add(b); 
            bubbles.filter(o => o.alive && !o.falling && Math.hypot(o.x - b.x, o.targetY - b.targetY) < spacingX * 1.2).forEach(mark); 
        }
        bubbles.filter(b => b.alive && !b.falling && b.targetY <= minY + spacingY * 0.5).forEach(mark);
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
    
    // Update progress bar and stars
    const maxScore = 5000; // Example target for 3 stars
    const progress = Math.min((S.score / maxScore) * 100, 100);
    const fillEl = document.querySelector('.star-progress-fill');
    if (fillEl) fillEl.style.width = progress + '%';
    
    const stars = document.querySelectorAll('.p-star');
    if (stars.length === 3) {
        if (progress >= 33) stars[0].classList.add('active'); else stars[0].classList.remove('active');
        if (progress >= 66) stars[1].classList.add('active'); else stars[1].classList.remove('active');
        if (progress >= 100) stars[2].classList.add('active'); else stars[2].classList.remove('active');
    }
    
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
function drawBall(x, y, color, r, hp, theme) {
    const radius = r || window.activeR || 18;
    const isDamaged = (theme !== 'normal' && hp === 1);
    ctx.save();
    const finalY = y;

    // ── STEP 1: Always draw the color base first ──────────────
    ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
    const grad = ctx.createRadialGradient(x-radius*0.35,finalY-radius*0.35,radius*0.05,x,finalY,radius);
    grad.addColorStop(0,'#fff'); grad.addColorStop(0.2,shadeColor(color,30));
    grad.addColorStop(0.5,color); grad.addColorStop(1,shadeColor(color,-60));
    ctx.beginPath(); ctx.arc(x,finalY,radius,0,Math.PI*2); ctx.fillStyle=grad; ctx.fill();

    // ── STEP 2: Theme overlay (semi-transparent so color shows) ─
    ctx.shadowColor='transparent'; ctx.shadowBlur=0;

    if (theme === 'stone') {
        // Grey cracked overlay
        ctx.beginPath(); ctx.arc(x,finalY,radius,0,Math.PI*2);
        ctx.fillStyle='rgba(60,60,60,0.45)'; ctx.fill();
        ctx.strokeStyle='rgba(255,255,255,0.6)'; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.moveTo(x-radius*0.3,finalY-radius*0.6); ctx.lineTo(x+radius*0.1,finalY+radius*0.1); ctx.lineTo(x+radius*0.5,finalY+radius*0.5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x+radius*0.2,finalY-radius*0.4); ctx.lineTo(x-radius*0.3,finalY+radius*0.3); ctx.stroke();
        ctx.beginPath(); ctx.arc(x,finalY,radius-1,0,Math.PI*2); ctx.strokeStyle='rgba(150,150,150,0.8)'; ctx.lineWidth=2.5; ctx.stroke();

    } else if (theme === 'ice') {
        // Frosty crystal overlay — cyan glow
        ctx.shadowColor='rgba(100,220,255,0.7)'; ctx.shadowBlur=14;
        ctx.beginPath(); ctx.arc(x,finalY,radius,0,Math.PI*2);
        ctx.fillStyle='rgba(180,240,255,0.3)'; ctx.fill();
        ctx.strokeStyle='rgba(255,255,255,0.85)'; ctx.lineWidth=1.4;
        for(let a=0;a<6;a++){
            ctx.save(); ctx.translate(x,finalY); ctx.rotate(a*Math.PI/3);
            ctx.beginPath(); ctx.moveTo(0,-radius*0.72); ctx.lineTo(0,radius*0.72); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-radius*0.25,-radius*0.42); ctx.lineTo(0,-radius*0.58); ctx.lineTo(radius*0.25,-radius*0.42); ctx.stroke();
            ctx.restore();
        }
        ctx.beginPath(); ctx.arc(x,finalY,radius-1,0,Math.PI*2); ctx.strokeStyle='rgba(150,230,255,0.85)'; ctx.lineWidth=2.5; ctx.stroke();

    } else if (theme === 'fire') {
        // Flame glow overlay — orange
        ctx.shadowColor='rgba(255,120,0,0.8)'; ctx.shadowBlur=18;
        ctx.beginPath(); ctx.arc(x,finalY,radius,0,Math.PI*2);
        ctx.fillStyle='rgba(255,100,0,0.28)'; ctx.fill();
        ctx.strokeStyle='rgba(255,200,50,0.75)'; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.moveTo(x,finalY-radius*0.7); ctx.bezierCurveTo(x+radius*0.5,finalY-radius*0.2,x-radius*0.4,finalY+radius*0.2,x,finalY+radius*0.65); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x-radius*0.3,finalY-radius*0.5); ctx.bezierCurveTo(x+radius*0.3,finalY,x-radius*0.2,finalY+radius*0.3,x+radius*0.1,finalY+radius*0.65); ctx.stroke();
        ctx.beginPath(); ctx.arc(x,finalY,radius-1,0,Math.PI*2); ctx.strokeStyle='rgba(255,100,0,0.9)'; ctx.lineWidth=2.5; ctx.stroke();

    } else if (theme === 'void') {
        // Dark purple energy overlay
        ctx.shadowColor='rgba(180,0,255,0.8)'; ctx.shadowBlur=18;
        ctx.beginPath(); ctx.arc(x,finalY,radius,0,Math.PI*2);
        ctx.fillStyle='rgba(20,0,50,0.45)'; ctx.fill();
        ctx.beginPath(); ctx.arc(x,finalY,radius-1,0,Math.PI*2); ctx.strokeStyle='rgba(200,0,255,0.9)'; ctx.lineWidth=2.5; ctx.stroke();
        ctx.beginPath(); ctx.arc(x,finalY,radius*0.55,0,Math.PI*2); ctx.strokeStyle='rgba(220,100,255,0.5)'; ctx.lineWidth=1.5; ctx.stroke();
        ctx.strokeStyle='rgba(200,80,255,0.4)'; ctx.lineWidth=1.2;
        ctx.beginPath(); ctx.moveTo(x-radius*0.55,finalY); ctx.lineTo(x+radius*0.55,finalY); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x,finalY-radius*0.55); ctx.lineTo(x,finalY+radius*0.55); ctx.stroke();

    } else if (theme === 'cosmic') {
        // Rainbow shimmer overlay
        const t = Date.now()/800;
        ctx.shadowColor=`hsl(${(t*60)%360},100%,60%)`; ctx.shadowBlur=18;
        const cg = ctx.createLinearGradient(x-radius,finalY-radius,x+radius,finalY+radius);
        cg.addColorStop(0,`hsla(${(t*80)%360},100%,70%,0.5)`);
        cg.addColorStop(0.5,`hsla(${(t*80+120)%360},100%,70%,0.5)`);
        cg.addColorStop(1,`hsla(${(t*80+240)%360},100%,70%,0.5)`);
        ctx.beginPath(); ctx.arc(x,finalY,radius,0,Math.PI*2); ctx.fillStyle=cg; ctx.fill();
        ctx.beginPath(); ctx.arc(x,finalY,radius-1,0,Math.PI*2);
        ctx.strokeStyle=`hsl(${(t*90)%360},100%,75%)`; ctx.lineWidth=2.5; ctx.stroke();

    } else {
        // Normal: just add star ✶
        ctx.save(); ctx.font=`${radius*1.2}px Arial`; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillStyle='rgba(255,255,255,0.7)'; ctx.fillText('✶',x,finalY+(radius*0.08)); ctx.restore();
    }

    // ── STEP 3: Damaged crack (red) ───────────────────────────
    if (isDamaged) {
        ctx.strokeStyle='rgba(255,60,60,0.9)'; ctx.lineWidth=2.5;
        ctx.beginPath(); ctx.moveTo(x-radius*0.4,finalY-radius*0.7); ctx.lineTo(x+radius*0.1,finalY); ctx.lineTo(x-radius*0.1,finalY+radius*0.7); ctx.stroke();
    }

    // ── STEP 4: Universal top-left shine ─────────────────────
    ctx.shadowColor='transparent'; ctx.shadowBlur=0;
    ctx.beginPath();
    ctx.ellipse(x-radius*0.4,finalY-radius*0.4,radius*0.4,radius*0.25,Math.PI/4,0,Math.PI*2);
    ctx.fillStyle='rgba(255,255,255,0.38)'; ctx.fill();

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
    // Pin cluster to the top — never scroll down regardless of how few balls are left
    const topPadding = 100; // pixels from canvas top
    clusterOffset = topPadding;
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
            drawBall(b.x, b.y, b.color, b.r, b.hp, b.theme);
        }
    });
    if (introAnimFrame > 0) introAnimFrame--;
    if (projectile) {
        let hit = false;
        let steps = 4; // Sub-stepping for precise collision
        let stepVx = projectile.vx / steps;
        let stepVy = projectile.vy / steps;
        
        for (let i = 0; i < steps; i++) {
            projectile.x += stepVx; 
            projectile.y += stepVy;
            
            if (projectile.x < curR || projectile.x > canvas.width - curR) {
                projectile.vx *= -1;
                stepVx *= -1; // Reflect current step
            }
            
            if (projectile.y < curR + 20 + clusterOffset) hit = true; 
            else {
                for (let b of bubbles) {
                    if (b.alive && !b.falling && Math.hypot(b.x - projectile.x, (b.targetY + clusterOffset) - projectile.y) < curR * 1.8) {
                        hit = true; break;
                    }
                }
            }
            if (hit) break; // Stop moving exactly at the collision point
        }
        
        drawBall(projectile.x, projectile.y, projectile.color, curR + 2);
        if (hit) snap(); 
        if (projectile && projectile.y > canvas.height) projectile = null;
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
function loadState() { 
    const l = localStorage.getItem('bs_level'); 
    if(l) S.currentLevel = Number(l); 
    // Force all 5000 levels unlocked — override any old saved value
    S.unlockedLevels = 5000;
    localStorage.setItem('bs_unlocked', '5000');
}
document.addEventListener('DOMContentLoaded', init);
