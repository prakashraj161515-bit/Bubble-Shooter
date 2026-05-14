'use strict';
// ══════════════════════════════════════════
//  BUBBLE SHOOTER PREMIUM — game.js  v10
//  Unified Logic | Final Deployment
// ══════════════════════════════════════════

let canvas, ctx, wCanvas, wCtx;
const R = 20, COLS = 9, ROWS = 22, SPEED = 18;
const COLORS = ['#FF4B5C','#35A7FF','#3DDC84','#FFCA28','#CC59FF','#FF708D'];

// ──────── STATE ────────
let S = {
    coins: 200, highestLevel: 1, score: 0,
    powerups: { BOMB:2, FIREBALL:1, RAINBOW:3 },
    stats: { totalPops:0, totalShots:0, totalCoins:200 },
    spinDate: '', spinsLeft: 3
};

let grid=[], ballsLeft=60, activeBall=null, shooting=false, mx=0, my=0;
let activePU=null, currentLevel=1, goal={ color: COLORS[0], need:6, done:0 };
let combo=0, particles=[], popups=[], confetti=[], shakeFrames=0, audioCtx=null;

// ══════════════════════════════════════════
//  INITIALIZATION
// ══════════════════════════════════════════
function init() {
    try {
        canvas=document.getElementById('gameCanvas');
        if(canvas) ctx=canvas.getContext('2d');
        load(); updateUI();
        if(canvas){
            canvas.addEventListener('mousemove', e=>{ const r=canvas.getBoundingClientRect(); mx=e.clientX-r.left; my=e.clientY-r.top; });
            canvas.addEventListener('mouseup', ()=>{ if(!shooting && ballsLeft>0 && !activeBall) shoot(); });
            canvas.addEventListener('touchstart', e=>{ e.preventDefault(); const r=canvas.getBoundingClientRect(); mx=e.touches[0].clientX-r.left; my=e.touches[0].clientY-r.top; },{passive:false});
            canvas.addEventListener('touchend', e=>{ e.preventDefault(); if(!shooting && ballsLeft>0 && !activeBall) shoot(); },{passive:false});
        }
        setTimeout(()=>showScreen('main-menu'), 2000);
        requestAnimationFrame(loop);
    } catch(e){ console.error(e); }
}

// ══════════════════════════════════════════
//  STORAGE (Safe & Robust)
// ══════════════════════════════════════════
function save() { try { localStorage.setItem('bsv10', JSON.stringify(S)); } catch(e){} }
function load() {
    try {
        const d = JSON.parse(localStorage.getItem('bsv10') || '{}');
        Object.assign(S, d);
    } catch(e){}
}

// ══════════════════════════════════════════
//  NAVIGATION
// ══════════════════════════════════════════
function showScreen(id) {
    const t = document.getElementById(id); if(!t) return;
    document.querySelectorAll('.screen').forEach(s=>{
        if(s.id!==id && !s.classList.contains('hidden')){
            s.style.opacity='0'; s.style.transform='scale(0.96)';
            setTimeout(()=>s.classList.add('hidden'), 400);
        }
    });
    t.style.opacity='0'; t.style.transform='scale(1.04)'; t.classList.remove('hidden');
    requestAnimationFrame(()=>requestAnimationFrame(()=>{ t.style.opacity='1'; t.style.transform='scale(1)'; }));
    if(id==='gameplay-ui') resize();
}
function openPopup(id) { const el=document.getElementById(id); if(el) el.classList.remove('hidden'); }
function closePopup(id) { const el=document.getElementById(id); if(el) el.classList.add('hidden'); }

function updateUI() {
    setText('header-coins', S.coins);
    setText('current-score', S.score.toLocaleString());
    setText('goal-text', `${goal.done}/${goal.need}`);
    setText('bomb-count', S.powerups.BOMB);
    setText('rainbow-count', S.powerups.RAINBOW);
    const gb=document.getElementById('goal-bubble'); if(gb) gb.style.background=goal.color;
}
function setText(id, v) { const el=document.getElementById(id); if(el) el.textContent=v; }

// ══════════════════════════════════════════
//  GAMEPLAY
// ══════════════════════════════════════════
function startGame(level) {
    currentLevel=level; ballsLeft=60; goal.done=0; S.score=0; combo=0;
    goal.color=COLORS[Math.floor(Math.random()*COLORS.length)];
    generateLevel(level); prepNext(); showScreen('gameplay-ui'); updateUI();
}
function generateLevel(l) {
    grid=[]; const rs=8+Math.floor(l/5);
    for(let y=0; y<rs; y++){
        grid[y]=[]; const ind=Math.floor(y/2); const cs=Math.max(2,(y%2===0?COLS:COLS-1)-ind);
        for(let x=0; x<cs; x++) grid[y][x+Math.floor(ind/2)]={ color:COLORS[Math.floor(Math.random()*COLORS.length)] };
    }
}
function resize() { if(canvas && canvas.parentElement){ canvas.width=canvas.parentElement.clientWidth; canvas.height=canvas.parentElement.clientHeight; } }

function loop() {
    if(ctx && canvas && canvas.width>0){
        ctx.save();
        if(shakeFrames>0){ const s=(shakeFrames/15)*10; ctx.translate((Math.random()-0.5)*s,(Math.random()-0.5)*s); shakeFrames--; }
        ctx.clearRect(-20,-20,canvas.width+40,canvas.height+40);
        drawGrid(); drawAim();
        if(activeBall) moveBall();
        tickVFX();
        ctx.restore();
    }
    requestAnimationFrame(loop);
}

function getPos(x,y) { const off=(y%2!==0?R:0); const sx=(canvas.width-COLS*R*2)/2+R; return {x:sx+x*R*2+off, y:y*R*1.75+R+18}; }
function drawGrid() { grid.forEach((r,y)=>{ if(r) r.forEach((b,x)=>{ if(b){ const p=getPos(x,y); drawBubble(p.x,p.y,b.color); }}); }); }
function drawBubble(x,y,c) {
    ctx.beginPath(); ctx.arc(x,y,R-1,0,Math.PI*2); ctx.fillStyle=c; ctx.fill();
    const g=ctx.createRadialGradient(x-R*0.3,y-R*0.3,1,x,y,R); g.addColorStop(0,'rgba(255,255,255,0.4)'); g.addColorStop(1,'rgba(0,0,0,0.1)');
    ctx.fillStyle=g; ctx.fill();
}
function drawAim() {
    if(shooting||!mx||!my) return;
    const cen=ballCenter(); const ang=Math.atan2(my-cen.y,mx-cen.x); if(ang>0) return;
    let cx=cen.x, cy=cen.y, dx=Math.cos(ang)*12, dy=Math.sin(ang)*12;
    ctx.fillStyle='rgba(123,108,255,0.4)';
    for(let i=0; i<20; i++){ cx+=dx; cy+=dy; if(cx<R||cx>canvas.width-R) dx*=-1; if(i%2===0){ ctx.beginPath(); ctx.arc(cx,cy,3,0,Math.PI*2); ctx.fill(); } }
}
function ballCenter() {
    const el=document.getElementById('active-ball'); if(!el) return {x:200,y:800};
    const r=el.getBoundingClientRect(), cr=canvas.getBoundingClientRect(); return {x:r.left+r.width/2-cr.left, y:r.top+r.height/2-cr.top};
}

function shoot() {
    if(shooting) return; initAudio(); shooting=true; ballsLeft--; S.stats.totalShots++;
    const cen=ballCenter(); const ang=Math.atan2(my-cen.y,mx-cen.x);
    const col=document.getElementById('active-ball').style.backgroundColor;
    activeBall={x:cen.x, y:cen.y, vx:Math.cos(ang)*SPEED, vy:Math.sin(ang)*SPEED, color:col, pu:activePU};
    activePU=null; playSound('shoot'); updateUI(); save();
}

function moveBall() {
    activeBall.x+=activeBall.vx; activeBall.y+=activeBall.vy;
    if(activeBall.x<=R||activeBall.x>=canvas.width-R) activeBall.vx*=-1;
    drawBubble(activeBall.x,activeBall.y,activeBall.color);
    let hit=false;
    outer: for(let y=0; y<grid.length; y++) if(grid[y]) for(let x=0; x<grid[y].length; x++) if(grid[y][x]){
        const p=getPos(x,y); if(Math.hypot(activeBall.x-p.x, activeBall.y-p.y)<=R*1.75){ hit=true; break outer; }
    }
    if(hit||activeBall.y<=R+18) snap();
    if(activeBall.y>canvas.height){ activeBall=null; shooting=false; prepNext(); }
}

function snap() {
    const {tx,ty}=findSlot(); if(!grid[ty]) grid[ty]=[]; grid[ty][tx]={color:activeBall.color};
    if(activeBall.pu==='BOMB') bombBlast(tx,ty); else matchAndPop(tx,ty);
    activeBall=null; shooting=false; prepNext();
}
function findSlot() {
    let best=Infinity, tx=0, ty=0;
    for(let y=0; y<ROWS; y++) {
        const cs=(y%2===0?COLS:COLS-1);
        for(let x=0; x<cs; x++){ if(grid[y]&&grid[y][x]) continue; const p=getPos(x,y); const d=Math.hypot(activeBall.x-p.x,activeBall.y-p.y); if(d<best){best=d;tx=x;ty=y;}}
    }
    return {tx,ty};
}

function matchAndPop(x,y) {
    const col=grid[y][x].color; let q=[[x,y]], matched=[[x,y]], vis=new Set([`${x},${y}`]);
    while(q.length){
        const [cx,cy]=q.shift(); const off=(cy%2===0?[[1,0],[-1,0],[0,1],[0,-1],[-1,1],[-1,-1]]:[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1]]);
        off.forEach(([ox,oy])=>{ const nx=cx+ox, ny=cy+oy; if(grid[ny]&&grid[ny][nx]&&grid[ny][nx].color===col&&!vis.has(`${nx},${ny}`)){vis.add(`${nx},${ny}`);matched.push([nx,ny]);q.push([nx,ny]);}});
    }
    if(matched.length>=3){
        combo++; const mult=Math.min(combo,5);
        matched.forEach(([bx,by])=>{
            const p=getPos(bx,by); if(grid[by][bx].color===goal.color) goal.done++;
            spawnParticles(p.x,p.y,grid[by][bx].color); grid[by][bx]=null;
            const pts=20*mult; S.score+=pts; spawnScorePopup(p.x,p.y,`+${pts}`);
        });
        playSound('pop'); floatCheck(); if(goal.done>=goal.need) winLevel();
    } else combo=0;
    updateUI(); save();
}

function bombBlast(tx,ty) {
    const off=(ty%2===0?[[0,0],[1,0],[-1,0],[0,1],[0,-1],[-1,1],[-1,-1]]:[[0,0],[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1]]);
    off.forEach(([ox,oy])=>{
        const nx=tx+ox, ny=ty+oy; if(grid[ny]&&grid[ny][nx]){ const p=getPos(nx,ny); spawnParticles(p.x,p.y,grid[ny][nx].color); grid[ny][nx]=null; S.score+=10; }
    });
    playSound('bomb'); shakeFrames=15; floatCheck(); updateUI();
}

function floatCheck() {
    const con=new Set(); let q=[]; if(grid[0]) grid[0].forEach((b,x)=>{if(b){con.add(`0,${x}`); q.push([x,0]);}});
    while(q.length){
        const [cx,cy]=q.shift(); const off=(cy%2===0?[[1,0],[-1,0],[0,1],[0,-1],[-1,1],[-1,-1]]:[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1]]);
        off.forEach(([ox,oy])=>{ const nx=cx+ox, ny=cy+oy; if(grid[ny]&&grid[ny][nx]&&!con.has(`${ny},${nx}`)){con.add(`${ny},${nx}`);q.push([nx,ny]);}});
    }
    grid.forEach((r,y)=>{ if(r) r.forEach((b,x)=>{ if(b&&!con.has(`${y},${x}`)){grid[y][x]=null; S.score+=5;}});});
}

function winLevel() { S.coins+=50; playSound('win'); runConfetti(); setTimeout(()=>showScreen('main-menu'), 2000); }
function prepNext() {
    const a=document.getElementById('active-ball'), n=document.getElementById('next-ball');
    if(a&&n){ a.style.backgroundColor=n.style.backgroundColor||COLORS[0]; n.style.backgroundColor=COLORS[Math.floor(Math.random()*COLORS.length)]; }
}

// ══════════════════════════════════════════
//  VFX & AUDIO
// ══════════════════════════════════════════
function spawnParticles(x,y,c) { for(let i=0;i<8;i++){ const a=Math.random()*Math.PI*2, s=2+Math.random()*4; particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,r:3,c,life:1,d:0.04});}}
function tickVFX() {
    particles=particles.filter(p=>p.life>0); particles.forEach(p=>{ p.x+=p.vx; p.y+=p.vy; p.vy+=0.2; p.life-=p.d; ctx.globalAlpha=p.life; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fillStyle=p.c; ctx.fill(); });
    popups=popups.filter(p=>p.life>0); popups.forEach(p=>{ p.y-=1.5; p.life-=0.02; ctx.globalAlpha=p.life; ctx.fillStyle='#fff'; ctx.font='bold 16px Poppins'; ctx.textAlign='center'; ctx.fillText(p.t,p.x,p.y); });
    ctx.globalAlpha=1;
}
function spawnScorePopup(x,y,t) { popups.push({x,y,t,life:1}); }
function runConfetti() { for(let i=0;i<50;i++) particles.push({x:Math.random()*canvas.width, y:-20, vx:(Math.random()-0.5)*4, vy:2+Math.random()*4, r:5, c:COLORS[Math.floor(Math.random()*COLORS.length)], life:1, d:0.005}); }

function initAudio() { if(!audioCtx) audioCtx=new (window.AudioContext||window.webkitAudioContext)(); }
function playSound(type) {
    if(!audioCtx) return; const g=audioCtx.createGain(), o=audioCtx.createOscillator(); g.connect(audioCtx.destination); o.connect(g); const t=audioCtx.currentTime;
    if(type==='pop'){ o.frequency.setValueAtTime(500,t); o.frequency.exponentialRampToValueAtTime(200,t+0.1); g.gain.exponentialRampToValueAtTime(0.01,t+0.1); o.start(t); o.stop(t+0.1); }
    else if(type==='shoot'){ o.type='triangle'; o.frequency.setValueAtTime(300,t); g.gain.exponentialRampToValueAtTime(0.01,t+0.05); o.start(t); o.stop(t+0.05); }
    else if(type==='bomb'){ o.type='sawtooth'; o.frequency.setValueAtTime(100,t); g.gain.exponentialRampToValueAtTime(0.01,t+0.3); o.start(t); o.stop(t+0.3); }
}

document.addEventListener('DOMContentLoaded', init);
window.onresize=resize;
