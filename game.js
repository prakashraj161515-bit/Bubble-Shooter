'use strict';
// ══════════════════════════════════════════
//  BUBBLE SHOOTER PREMIUM — game.js  v8
// ══════════════════════════════════════════
// Canvas refs — assigned in init() after DOM is ready
let canvas, ctx, wCanvas, wCtx;


// ──────── CONSTANTS ────────
const R       = 20;        // bubble radius
const COLS    = 9;
const ROWS    = 22;
const SPEED   = 18;
const COLORS  = ['#FF3D71','#3366FF','#00D68F','#FFAA00','#A29BFE','#FF708D'];

// ──────── WHEEL CONFIG ────────
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

// ──────── PERSISTENT STATE ────────
let S = {
    coins: 200,
    highestLevel: 1,
    score: 0,
    powerups: { BOMB:2, FIREBALL:1, RAINBOW:3 },
    stats: { totalPops:0, totalShots:0, totalCoins:200 },
    spinsLeft: 3,
    spinDate: '',
    challengeDate: '',
    challengeProg: 18,
};

// ──────── RUNTIME STATE ────────
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

// ──────── VFX STATE ────────
let particles  = [];   // { x,y,vx,vy,r,color,life,maxLife }
let popups     = [];   // { x,y,text,life,maxLife }
let confetti   = [];   // { x,y,vx,vy,rot,rotV,w,h,color,life }
let shakeFrames= 0;

// ──────── AUDIO ────────
let audioCtx = null;
function initAudio() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
function playSound(type) {
    initAudio();
    const g = audioCtx.createGain();
    g.connect(audioCtx.destination);
    const o = audioCtx.createOscillator();
    o.connect(g);
    const t = audioCtx.currentTime;
    if (type === 'pop') {
        o.type = 'sine'; o.frequency.setValueAtTime(520, t); o.frequency.exponentialRampToValueAtTime(260, t+.12);
        g.gain.setValueAtTime(.25, t); g.gain.exponentialRampToValueAtTime(.001, t+.15);
        o.start(t); o.stop(t+.15);
    } else if (type === 'shoot') {
        o.type = 'triangle'; o.frequency.setValueAtTime(300, t); o.frequency.exponentialRampToValueAtTime(180, t+.08);
        g.gain.setValueAtTime(.18, t); g.gain.exponentialRampToValueAtTime(.001, t+.1);
        o.start(t); o.stop(t+.1);
    } else if (type === 'bomb') {
        o.type = 'sawtooth'; o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(60, t+.3);
        g.gain.setValueAtTime(.3, t); g.gain.exponentialRampToValueAtTime(.001, t+.35);
        o.start(t); o.stop(t+.35);
    } else if (type === 'win') {
        [523,659,784,1047].forEach((f,i) => {
            const oo=audioCtx.createOscillator(), gg=audioCtx.createGain();
            oo.connect(gg); gg.connect(audioCtx.destination);
            oo.type='sine'; oo.frequency.setValueAtTime(f,t+i*.18);
            gg.gain.setValueAtTime(.22,t+i*.18); gg.gain.exponentialRampToValueAtTime(.001,t+i*.18+.35);
            oo.start(t+i*.18); oo.stop(t+i*.18+.4);
        });
    }
}

// ══════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════
function init() {
    // Assign canvas refs now that DOM is ready
    canvas  = document.getElementById('gameCanvas');
    ctx     = canvas.getContext('2d');
    wCanvas = document.getElementById('wheelCanvas');
    wCtx    = wCanvas.getContext('2d');

    load();
    generateMap();
    generateLevels();
    drawWheel();
    updateUI();

    // input
    canvas.addEventListener('mousemove', e => { const r=canvas.getBoundingClientRect(); mx=e.clientX-r.left; my=e.clientY-r.top; });
    canvas.addEventListener('mouseup',   () => { if(!shooting && ballsLeft>0 && !activeBall) shoot(); });
    canvas.addEventListener('touchstart',e => { e.preventDefault(); const r=canvas.getBoundingClientRect(); mx=e.touches[0].clientX-r.left; my=e.touches[0].clientY-r.top; },{passive:false});
    canvas.addEventListener('touchend',  e => { e.preventDefault(); if(!shooting && ballsLeft>0 && !activeBall) shoot(); },{passive:false});

    showScreen('splash-screen');
    setTimeout(() => showScreen('main-menu'), 2000);
    requestAnimationFrame(loop);
}

// ══════════════════════════════════════════
//  SAVE / LOAD
// ══════════════════════════════════════════
function save() { try { localStorage.setItem('bsv7', JSON.stringify(S)); } catch(_){} }
function load() {
    try {
        const d = JSON.parse(localStorage.getItem('bsv7') || '{}');
        Object.assign(S, d);
    } catch(_) {}
    const today = new Date().toDateString();
    if (S.spinDate !== today)      { S.spinsLeft = 3; S.spinDate = today; }
    if (S.challengeDate !== today) { S.challengeProg = 0; S.challengeDate = today; }
}

// ══════════════════════════════════════════
//  NAVIGATION
// ══════════════════════════════════════════
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => {
        if (s.id !== id) {
            s.style.opacity = '0'; s.style.transform = 'scale(.96)';
            setTimeout(() => { if (s.style.opacity==='0') s.classList.add('hidden'); }, 350);
        }
    });
    const t = document.getElementById(id);
    t.classList.remove('hidden');
    requestAnimationFrame(() => { t.style.opacity='1'; t.style.transform='scale(1)'; });

    if (id === 'home-screen')        { generateMap(); setTimeout(drawMapPath, 120); }
    if (id === 'achievements-screen') updateAchievements();
    if (id === 'spin-screen')        { updateSpinUI(); drawWheel(); }
}

function openPopup(id)  { document.getElementById(id).classList.remove('hidden'); }
function closePopup(id) { document.getElementById(id).classList.add('hidden'); }

// ══════════════════════════════════════════
//  UI UPDATES
// ══════════════════════════════════════════
function updateUI() {
    setText('header-coins',    S.coins);
    setText('bomb-count',      S.powerups.BOMB);
    setText('rainbow-count',   S.powerups.RAINBOW);
    setText('balls-text',      ballsLeft);
    setText('current-score',   S.score.toLocaleString());
    setText('goal-text',       `${goal.done}/${goal.need}`);
    const w = Math.min((S.highestLevel-1)/90*100, 100);
    setStyle('world-bar', 'width', w+'%');
    setText('world-prog-label', `${S.highestLevel-1}/90`);
}

function setText(id, v)            { const el=document.getElementById(id); if(el) el.textContent=v; }
function setStyle(id, prop, val)   { const el=document.getElementById(id); if(el) el.style[prop]=val; }

function updateAchievements() {
    const set = (fid,tid,val,max) => {
        setStyle(fid,'width', Math.min(val/max*100,100)+'%');
        setText(tid, `${val}/${max}`);
    };
    set('ach-pop-fill',  'ach-pop-text',   S.stats.totalPops,   100);
    set('ach-shot-fill', 'ach-shot-text',  S.stats.totalShots,   10);
    set('ach-coin-fill', 'ach-coin-text',  S.stats.totalCoins, 1000);
    set('ach-level-fill','ach-level-text', Math.max(0,S.highestLevel-1), 10);
}

function updateSpinUI() {
    const btn = document.getElementById('spin-btn');
    if (btn) btn.disabled = S.spinsLeft<=0;
    setText('spins-left-text', `You have ${S.spinsLeft} spin${S.spinsLeft!==1?'s':''} left today`);
}

// ══════════════════════════════════════════
//  SPIN WHEEL
// ══════════════════════════════════════════
function drawWheel(extraAngle) {
    const ang = (extraAngle !== undefined ? extraAngle : wheelAngle);
    const cx=140, cy=140, r=130;
    const arc = Math.PI*2 / WHEEL_SEGS.length;
    wCtx.clearRect(0,0,280,280);
    WHEEL_SEGS.forEach((seg,i) => {
        const s=arc*i+ang, e=s+arc;
        wCtx.beginPath(); wCtx.moveTo(cx,cy); wCtx.arc(cx,cy,r,s,e); wCtx.closePath();
        wCtx.fillStyle=seg.color; wCtx.fill();
        wCtx.strokeStyle='#fff'; wCtx.lineWidth=3; wCtx.stroke();
        // label
        wCtx.save(); wCtx.translate(cx,cy); wCtx.rotate(s+arc/2);
        wCtx.textAlign='right'; wCtx.fillStyle='#fff'; wCtx.font='bold 14px Inter,sans-serif';
        wCtx.fillText(seg.label, r-14, 5);
        wCtx.restore();
    });
    // center circle
    wCtx.beginPath(); wCtx.arc(cx,cy,28,0,Math.PI*2);
    wCtx.fillStyle='#fff'; wCtx.fill();
    wCtx.fillStyle=WHEEL_SEGS[0].color; wCtx.font='22px sans-serif';
    wCtx.textAlign='center'; wCtx.fillText('🎡',cx,cy+8);
}

function spinWheel() {
    if (wheelSpinning || S.spinsLeft<=0) return;
    wheelSpinning=true; S.spinsLeft--; save(); updateSpinUI();
    const winIdx   = Math.floor(Math.random()*WHEEL_SEGS.length);
    const total    = Math.PI*2*(6+Math.random()*4);
    const arc      = Math.PI*2/WHEEL_SEGS.length;
    const targetA  = wheelAngle + total;
    const dur      = 4200;
    const t0       = performance.now();
    const startA   = wheelAngle;
    function frame(now) {
        const p = Math.min((now-t0)/dur, 1);
        const ease = 1 - Math.pow(1-p, 4);
        wheelAngle = startA + total*ease;
        drawWheel(wheelAngle);
        if (p<1) { requestAnimationFrame(frame); }
        else {
            wheelSpinning=false;
            applyReward(WHEEL_SEGS[winIdx].reward);
        }
    }
    requestAnimationFrame(frame);
}

function applyReward(r) {
    if (r.type==='coins') { S.coins+=r.val; S.stats.totalCoins+=r.val; }
    else { S.powerups[r.type]=(S.powerups[r.type]||0)+r.val; }
    save(); updateUI();
    alert(r.type==='coins' ? `🪙 You won ${r.val} coins!` : `You won ${r.val}x ${r.type}!`);
}

// ══════════════════════════════════════════
//  MAP GENERATION
// ══════════════════════════════════════════
function generateMap() {
    const cont = document.getElementById('map-nodes');
    if (!cont) return;
    cont.innerHTML=''; mapNodePositions=[];
    for (let i=20; i>=1; i--) {
        const node = document.createElement('button');
        node.className='level-node';
        const row = Math.floor((i-1)/3);
        const col = (i-1)%3;
        const xOff= (row%2===0)?(col-1)*84:(1-col)*84;
        node.style.transform=`translateX(${xOff}px)`;
        if (i>S.highestLevel) {
            node.classList.add('locked');
            node.innerHTML='🔒';
        } else {
            if (i===S.highestLevel) node.classList.add('active');
            node.innerHTML=`${i}<div class="stars">★★★</div>`;
            node.onclick=()=>startGame(i);
        }
        cont.appendChild(node);
    }
}

function generateLevels() {
    const grid = document.getElementById('levels-grid');
    if (!grid) return; grid.innerHTML='';
    for (let i=1; i<=20; i++) {
        const btn=document.createElement('button');
        btn.className='level-node';
        btn.style.cssText='position:relative;border-radius:18px;';
        if (i>S.highestLevel) {
            btn.classList.add('locked');
            btn.innerHTML='<span>🔒</span>';
        } else {
            btn.innerHTML=`<span>${i}</span>`;
            btn.onclick=()=>startGame(i);
        }
        grid.appendChild(btn);
    }
}

function drawMapPath() {
    const mapC = document.getElementById('mapCanvas');
    const scroll= document.getElementById('map-scroll');
    const nodes = document.querySelectorAll('#map-nodes .level-node');
    if (!mapC||!scroll||!nodes.length) return;
    mapC.width = scroll.offsetWidth;
    mapC.height= scroll.scrollHeight || scroll.offsetHeight;
    const pCtx = mapC.getContext('2d');
    const pts=[];
    nodes.forEach(n=>{
        const nr=n.getBoundingClientRect();
        const sr=scroll.getBoundingClientRect();
        pts.push({ x: nr.left-sr.left+nr.width/2, y: nr.top-sr.top+scroll.scrollTop+nr.height/2 });
    });
    if (pts.length<2) return;
    pCtx.strokeStyle='rgba(139,90,43,.45)'; pCtx.lineWidth=10;
    pCtx.lineCap='round'; pCtx.lineJoin='round';
    pCtx.setLineDash([14,10]);
    pCtx.beginPath(); pCtx.moveTo(pts[0].x,pts[0].y);
    pts.slice(1).forEach(p=>pCtx.lineTo(p.x,p.y));
    pCtx.stroke(); pCtx.setLineDash([]);
}

// ══════════════════════════════════════════
//  GAME START
// ══════════════════════════════════════════
function startGame(level) {
    currentLevel=level;
    ballsLeft=Math.max(30, 60-Math.floor(level/5)*2);
    goal.color=COLORS[Math.floor(Math.random()*COLORS.length)];
    goal.need =5+Math.floor(level/2);
    goal.done =0;
    S.score=0;
    // Set goal bubble color in HUD
    const gb = document.getElementById('goal-bubble');
    if (gb) gb.style.background = goal.color;
    generateLevel(level);
    prepNext();
    showScreen('gameplay-ui');
    resize();
    updateUI();
}

function generateLevel(level) {
    grid=[];
    const rows=8+Math.floor(level/5);
    for (let y=0;y<rows;y++) {
        grid[y]=[];
        const indent=Math.floor(y/2);
        const cols=Math.max(2,(y%2===0?COLS:COLS-1)-indent);
        for (let x=0;x<cols;x++) {
            grid[y][x+Math.floor(indent/2)]={ color:COLORS[Math.floor(Math.random()*COLORS.length)], type:'NORMAL' };
        }
    }
}

function resize() {
    if (!canvas.parentElement) return;
    canvas.width =canvas.parentElement.clientWidth;
    canvas.height=canvas.parentElement.clientHeight;
}

// ══════════════════════════════════════════
//  GAME LOOP
// ══════════════════════════════════════════
function loop() {
    if (canvas.width>0 && canvas.height>0) {
        // screen shake
        ctx.save();
        if (shakeFrames>0) {
            const s=(shakeFrames/14)*7;
            ctx.translate((Math.random()-.5)*s,(Math.random()-.5)*s);
            shakeFrames--;
        }
        ctx.clearRect(-20,-20,canvas.width+40,canvas.height+40);
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

function getPos(x,y) {
    const off = y%2!==0 ? R : 0;
    const sx  = (canvas.width - COLS*R*2)/2 + R;
    return { x: sx+x*R*2+off, y: y*R*1.76+R+18 };
}

// ══════════════════════════════════════════
//  DRAWING
// ══════════════════════════════════════════
function drawGrid() {
    grid.forEach((row,y)=>{ if(!row) return; row.forEach((b,x)=>{ if(b){ const p=getPos(x,y); drawBubble(ctx,p.x,p.y,b.color); }}); });
}

function drawBubble(c,x,y,color) {
    // shadow
    c.beginPath(); c.arc(x,y+2,R-1,0,Math.PI*2);
    c.fillStyle='rgba(0,0,0,.08)'; c.fill();
    // base
    c.beginPath(); c.arc(x,y,R-1,0,Math.PI*2);
    c.fillStyle=color; c.fill();
    // gloss
    const g=c.createRadialGradient(x-R*.35,y-R*.35,R*.05,x,y,R);
    g.addColorStop(0,'rgba(255,255,255,.55)');
    g.addColorStop(.35,'rgba(255,255,255,.12)');
    g.addColorStop(1,'rgba(0,0,0,.12)');
    c.fillStyle=g; c.fill();
    // specular
    c.beginPath(); c.ellipse(x-R*.3,y-R*.3,R*.22,R*.13,-Math.PI/4,0,Math.PI*2);
    c.fillStyle='rgba(255,255,255,.5)'; c.fill();
}

function drawAim() {
    if (shooting||!mx||!my) return;
    const cen=ballCenter();
    const ang=Math.atan2(my-cen.y,mx-cen.x);
    if (ang>0) return;
    let cx=cen.x,cy=cen.y,dx=Math.cos(ang)*12,dy=Math.sin(ang)*12;
    ctx.fillStyle='rgba(162,155,254,.5)';
    for(let i=0;i<24;i++){
        cx+=dx; cy+=dy;
        if(cx<R||cx>canvas.width-R) dx*=-1;
        if(i%2===0){ ctx.beginPath(); ctx.arc(cx,cy,3,0,Math.PI*2); ctx.fill(); }
    }
}

function ballCenter() {
    const el=document.getElementById('active-ball');
    if (!el) return {x:canvas.width/2, y:canvas.height-80};
    const r=el.getBoundingClientRect(), cr=canvas.getBoundingClientRect();
    return { x:r.left+r.width/2-cr.left, y:r.top+r.height/2-cr.top };
}

// ══════════════════════════════════════════
//  SHOOTING
// ══════════════════════════════════════════
function shoot() {
    if (shooting) return;
    initAudio();
    shooting=true; ballsLeft--; S.stats.totalShots++;
    const cen=ballCenter();
    const ang=Math.atan2(my-cen.y,mx-cen.x);
    const col=document.getElementById('active-ball').style.backgroundColor;
    activeBall={ x:cen.x,y:cen.y, vx:Math.cos(ang)*SPEED,vy:Math.sin(ang)*SPEED, color:col, pu:activePU };
    activePU=null;
    playSound('shoot');
    updateUI(); save();
}

function moveBall() {
    activeBall.x+=activeBall.vx; activeBall.y+=activeBall.vy;
    if(activeBall.x<=R||activeBall.x>=canvas.width-R) activeBall.vx*=-1;
    drawBubble(ctx,activeBall.x,activeBall.y,activeBall.color);
    // collision check
    let hit=false;
    outer: for(let y=0;y<grid.length;y++){
        if(!grid[y]) continue;
        for(let x=0;x<grid[y].length;x++){
            if(grid[y][x]){
                const p=getPos(x,y);
                if(Math.hypot(activeBall.x-p.x,activeBall.y-p.y)<=R*1.8){ hit=true; break outer; }
            }
        }
    }
    if(hit||(activeBall.y<=R+18)) snap();
    if(activeBall.y>canvas.height){ activeBall=null; shooting=false; prepNext(); }
}

function snap() {
    if (activeBall.pu==='FIREBALL') { fireballBlast(activeBall.x); }
    else {
        const {tx,ty}=findSlot();
        if (!grid[ty]) grid[ty]=[];
        grid[ty][tx]={ color:activeBall.color, type:'NORMAL' };
        if(activeBall.pu==='BOMB') bombBlast(tx,ty);
        else matchAndPop(tx,ty);
    }
    activeBall=null; shooting=false; prepNext();
}

function findSlot() {
    let best=Infinity,tx=0,ty=0;
    for(let y=0;y<ROWS;y++){
        if(!grid[y]) grid[y]=[];
        const cols=y%2===0?COLS:COLS-1;
        for(let x=0;x<cols;x++){
            if(grid[y][x]) continue;
            const p=getPos(x,y);
            const d=Math.hypot(activeBall.x-p.x,activeBall.y-p.y);
            if(d<best){best=d;tx=x;ty=y;}
        }
    }
    return {tx,ty};
}

// ══════════════════════════════════════════
//  MATCH LOGIC
// ══════════════════════════════════════════
function neighbors(x,y) {
    const off=y%2===0?[[1,0],[-1,0],[0,1],[0,-1],[-1,1],[-1,-1]]:[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1]];
    return off.map(([ox,oy])=>[x+ox,y+oy]);
}

function matchAndPop(x,y) {
    const col=grid[y]&&grid[y][x]&&grid[y][x].color;
    if(!col) return;
    let q=[[x,y]],matched=[[x,y]],vis=new Set([`${x},${y}`]);
    while(q.length){
        const [cx,cy]=q.shift();
        neighbors(cx,cy).forEach(([nx,ny])=>{
            if(grid[ny]&&grid[ny][nx]&&grid[ny][nx].color===col&&!vis.has(`${nx},${ny}`)){
                vis.add(`${nx},${ny}`); matched.push([nx,ny]); q.push([nx,ny]);
            }
        });
    }
    if(matched.length>=3){
        combo++;
        const mult = Math.min(combo, 5);
        matched.forEach(([bx,by])=>{
            if(grid[by]&&grid[by][bx]){
                const p=getPos(bx,by);
                if(grid[by][bx].color===goal.color) goal.done++;
                spawnParticles(p.x, p.y, grid[by][bx].color, 10);
                grid[by][bx]=null;
                const pts=20*mult; S.score+=pts; S.stats.totalPops++;
                spawnScorePopup(p.x, p.y, '+'+pts);
            }
        });
        playSound('pop');
        floatCheck();
        if(goal.done>=goal.need||gridEmpty()) winLevel();
    } else { combo=0; }
    updateUI(); save();
}

function bombBlast(tx,ty) {
    [...neighbors(tx,ty),[tx,ty]].forEach(([nx,ny])=>{
        if(grid[ny]&&grid[ny][nx]){
            const p=getPos(nx,ny);
            spawnParticles(p.x,p.y,grid[ny][nx].color,14);
            grid[ny][nx]=null; S.score+=10; S.stats.totalPops++;
        }
    });
    playSound('bomb'); shakeFrames=14;
    floatCheck(); if(gridEmpty()) winLevel();
}

function fireballBlast(ax) {
    grid.forEach((row,y)=>{ if(!row) return; row.forEach((_,x)=>{ if(grid[y][x]){const p=getPos(x,y);if(Math.abs(p.x-ax)<R*2.5){grid[y][x]=null;S.score+=10;S.stats.totalPops++;}} }); });
    floatCheck(); if(gridEmpty()) winLevel();
}

function floatCheck() {
    const con=new Set(); const q=[];
    if(grid[0]) grid[0].forEach((b,x)=>{ if(b){con.add(`0,${x}`);q.push([x,0]);} });
    while(q.length){
        const [cx,cy]=q.shift();
        neighbors(cx,cy).forEach(([nx,ny])=>{ if(grid[ny]&&grid[ny][nx]&&!con.has(`${nx},${ny}`)){con.add(`${nx},${ny}`);q.push([nx,ny]);} });
    }
    grid.forEach((row,y)=>{ if(!row) return; row.forEach((b,x)=>{ if(b&&!con.has(`${x},${y}`)){grid[y][x]=null;S.score+=5;S.stats.totalPops++;} }); });
}

function gridEmpty() { return grid.every(r=>!r||r.every(b=>!b)); }

function winLevel() {
    S.coins+=50; S.stats.totalCoins+=50;
    if(currentLevel>=S.highestLevel) S.highestLevel=currentLevel+1;
    save(); generateLevels(); generateMap();
    playSound('win');
    runConfetti();
    setTimeout(()=>{
        openPopup('level-complete-popup');
        document.getElementById('next-level-btn').onclick=()=>{ closePopup('level-complete-popup'); startGame(currentLevel+1); };
    }, 800);
}

// ══════════════════════════════════════════
//  BALL MANAGEMENT
// ══════════════════════════════════════════
function prepNext() {
    const a=document.getElementById('active-ball');
    const n=document.getElementById('next-ball');
    if(!a||!n) return;
    a.style.backgroundColor=n.style.backgroundColor||randColor();
    n.style.backgroundColor=randColor();
    updateUI();
}
function randColor() { return COLORS[Math.floor(Math.random()*COLORS.length)]; }

function swapBalls() {
    const a=document.getElementById('active-ball');
    const n=document.getElementById('next-ball');
    if(!a||!n) return;
    [a.style.backgroundColor,n.style.backgroundColor]=[n.style.backgroundColor,a.style.backgroundColor];
}

function usePowerup(type) {
    if(S.powerups[type]>0){ S.powerups[type]--; activePU=type; save(); updateUI(); }
    else openPopup('shop-popup');
}

function buyItem(type,cost) {
    if(S.coins>=cost){ S.coins-=cost; S.powerups[type]=(S.powerups[type]||0)+3; save(); updateUI(); }
    else alert('Not enough coins!');
}

// ══════════════════════════════════════════
//  VFX HELPERS
// ══════════════════════════════════════════
function spawnParticles(x, y, color, count) {
    for (let i=0; i<count; i++) {
        const ang = Math.random()*Math.PI*2;
        const spd = 2 + Math.random()*4;
        particles.push({
            x, y,
            vx: Math.cos(ang)*spd,
            vy: Math.sin(ang)*spd,
            r: 3+Math.random()*4,
            color,
            life: 1, decay: .03+Math.random()*.04
        });
    }
}

function tickParticles() {
    particles = particles.filter(p=>p.life>0);
    particles.forEach(p=>{
        p.x+=p.vx; p.y+=p.vy;
        p.vy+=0.18;             // gravity
        p.vx*=.95; p.vy*=.95;
        p.life-=p.decay;
        ctx.globalAlpha=Math.max(0,p.life);
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle=p.color; ctx.fill();
    });
    ctx.globalAlpha=1;
}

function spawnScorePopup(x, y, text) {
    popups.push({ x, y:y-10, vy:-1.5, text, life:1, decay:.02 });
}

function tickPopups() {
    popups = popups.filter(p=>p.life>0);
    popups.forEach(p=>{
        p.y+=p.vy; p.life-=p.decay;
        ctx.globalAlpha=Math.max(0,p.life);
        ctx.fillStyle='#fff';
        ctx.font='bold 16px Inter,sans-serif';
        ctx.textAlign='center';
        ctx.strokeStyle='rgba(0,0,0,.3)'; ctx.lineWidth=3;
        ctx.strokeText(p.text, p.x, p.y);
        ctx.fillText(p.text, p.x, p.y);
    });
    ctx.globalAlpha=1; ctx.textAlign='left';
}

function runConfetti() {
    const cols=['#FF3D71','#FFAA00','#00D68F','#3366FF','#A29BFE','#FF708D','#f1c40f'];
    for (let i=0;i<120;i++) {
        confetti.push({
            x: Math.random()*canvas.width,
            y: -20-Math.random()*canvas.height*.5,
            vx: (Math.random()-.5)*3,
            vy: 3+Math.random()*5,
            rot: Math.random()*Math.PI*2,
            rotV: (Math.random()-.5)*.2,
            w: 6+Math.random()*8,
            h: 4+Math.random()*6,
            color: cols[Math.floor(Math.random()*cols.length)],
            life: 1, decay: .005+Math.random()*.008
        });
    }
}

function tickConfetti() {
    confetti = confetti.filter(c=>c.life>0);
    confetti.forEach(c=>{
        c.x+=c.vx; c.y+=c.vy; c.rot+=c.rotV;
        c.vy+=.12; c.vx*=.99; c.life-=c.decay;
        ctx.save();
        ctx.globalAlpha=Math.max(0,c.life);
        ctx.translate(c.x,c.y); ctx.rotate(c.rot);
        ctx.fillStyle=c.color;
        ctx.fillRect(-c.w/2,-c.h/2,c.w,c.h);
        ctx.restore();
    });
    ctx.globalAlpha=1;
}

// ══════════════════════════════════════════
//  BOOTSTRAP
// ══════════════════════════════════════════
window.onload   = init;
window.onresize = resize;
