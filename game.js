(() => {
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const GAME_W = 320, GAME_H = 480;
const PLAYER_SPEED = 180, BULLET_SPEED = 500, ENEMY_BULLET_SPEED = 160;
const BULLET_COOLDOWN = 0.25, ENERGY_DRAIN_RATE = 1.8, ENERGY_MAX = 100;
const ENEMIES_PER_ROW = 6, ENEMY_ROWS = 3;
const ENEMY_BASE_SPEED = 40, ENEMY_SPEED_INCREMENT = 6;
const ENEMY_ZIGZAG_AMP = 70, ENEMY_DESCENT_SPEED = 6;
const ENEMY_SHOOT_MIN = 2.0, ENEMY_SHOOT_MAX = 5.0;
const MAX_LIVES = 3, EXPLOSION_DUR = 0.35;
const LEVEL_INTRO_DUR = 2.5, STAR_COUNT = 60;
const EXTRA_LIFE_THRESHOLD = 50000;
const BONUS_TICK_RATE = 0.03;

// Caps de dificuldade (limites máximos para manter jogável)
const ZIGZAG_SPEED_CAP = 120;      // velocidade máxima do zigue-zague
const DESCENT_SPEED_CAP = 18;      // descida máxima (px/s)
const SHOOT_INTERVAL_FLOOR = 0.6;  // intervalo mínimo entre tiros (s)
const DIFFICULTY_RAMP_LEVELS = 24;  // níveis até atingir dificuldade máxima

const BG_COLORS = ['#000000','#0A0A3C','#2A0A2A','#0A2A1A','#2A1A0A','#1A0A2A'];

let state = 'title';
let score = 0, highScore = parseInt(localStorage.getItem('megamania_hi')||'0',10);
let lives = MAX_LIVES, level = 1, energy = ENERGY_MAX;
let nextLifeAt = EXTRA_LIFE_THRESHOLD;
let player = {x:GAME_W/2, y:GAME_H-50, w:22, h:18};
let bullets=[], enemyBullets=[], enemies=[], explosions=[], stars=[];
let bulletCD=0, enemyShootTimer=0, levelTimer=0, playerInvincible=0;
let scaleX=1, scaleY=1, offsetX=0, offsetY=0, blinkTimer=0;
let bonusEnergy=0, bonusScore=0, bonusTickTimer=0;
const keys = {};
let touchLeft=false, touchRight=false, touchFire=false;

function getCycle() { return Math.floor((level-1)/8)+1; }
function getBgColor() { return BG_COLORS[Math.min(getCycle()-1, BG_COLORS.length-1)]; }

// Retorna fator de 0.0 (nível 1) a 1.0 (nível DIFFICULTY_RAMP_LEVELS+)
function getDifficultyScale() {
    return Math.min(1, (level - 1) / DIFFICULTY_RAMP_LEVELS);
}

function initStars() {
    stars=[];
    for(let i=0;i<STAR_COUNT;i++) stars.push({
        x:Math.random()*GAME_W, y:Math.random()*GAME_H,
        speed:10+Math.random()*30, brightness:0.3+Math.random()*0.7,
        size:Math.random()>0.8?2:1
    });
}

function getEnemyMovement(type) {
    const m = {
        hamburger:{zigSpeed:1, zigAmp:1, descent:1, erratic:0},
        cookie:{zigSpeed:1.3, zigAmp:0.9, descent:1.1, erratic:0},
        bug:{zigSpeed:1.5, zigAmp:0.8, descent:1.2, erratic:0.4},
        tire:{zigSpeed:0.8, zigAmp:1.3, descent:1.4, erratic:0.15},
        diamond:{zigSpeed:1.1, zigAmp:1.5, descent:0.9, erratic:0},
        iron:{zigSpeed:1.8, zigAmp:0.6, descent:1.1, erratic:0},
        bowtie:{zigSpeed:1.4, zigAmp:1.1, descent:1.0, erratic:0.1},
        dice:{zigSpeed:1.6, zigAmp:1.0, descent:1.3, erratic:0.5}
    };
    return m[type]||m.hamburger;
}

function spawnEnemies() {
    enemies=[];
    const type = SpriteFactory.getEnemyType(level);
    const sprite = SpriteFactory.getSprite(type);
    const ew=sprite.width, eh=sprite.height;
    const spacingX = (GAME_W-40)/ENEMIES_PER_ROW;
    for(let row=0;row<ENEMY_ROWS;row++){
        for(let col=0;col<ENEMIES_PER_ROW;col++){
            const bx = 30+col*spacingX+spacingX/2;
            const by = 50+row*(eh+12);
            enemies.push({
                x:bx, y:by, w:ew, h:eh, baseX:bx, baseY:by,
                type, alive:true, phase:col*0.5+row*0.3,
                erraticOffset:Math.random()*Math.PI*2
            });
        }
    }
    enemyShootTimer = ENEMY_SHOOT_MIN+Math.random()*(ENEMY_SHOOT_MAX-ENEMY_SHOOT_MIN);
}

function resetPlayer() { player.x=GAME_W/2; playerInvincible=2.0; }

function checkExtraLife(oldScore, newScore) {
    if(newScore >= nextLifeAt) {
        lives++;
        nextLifeAt += EXTRA_LIFE_THRESHOLD;
        AudioManager.playExtraLife();
    }
}

function startGame() {
    AudioManager.init();
    score=0; lives=MAX_LIVES; level=1; energy=ENERGY_MAX;
    nextLifeAt=EXTRA_LIFE_THRESHOLD;
    bullets=[]; enemyBullets=[]; explosions=[];
    bonusEnergy=0; bonusScore=0;
    resetPlayer(); spawnEnemies();
    state='levelIntro'; levelTimer=LEVEL_INTRO_DUR;
    AudioManager.stopEnergyWarning();
}

function startBonusPhase() {
    const type = SpriteFactory.getEnemyType(level);
    const pts = SpriteFactory.getEnemyScore(type, getCycle());
    bonusEnergy = Math.floor(energy);
    bonusScore = bonusEnergy * pts;
    bonusTickTimer = 0;
    state = 'energyBonus';
    AudioManager.stopEnergyWarning();
}

function nextLevel() {
    level++;
    energy=ENERGY_MAX; bullets=[]; enemyBullets=[];
    spawnEnemies();
    state='levelIntro'; levelTimer=LEVEL_INTRO_DUR;
    AudioManager.playLevelUp();
    AudioManager.stopEnergyWarning();
}

function loseLife() {
    lives--;
    AudioManager.playDeath();
    AudioManager.stopEnergyWarning();
    if(lives<=0){
        state='gameOver';
        if(score>highScore){highScore=score;localStorage.setItem('megamania_hi',highScore.toString());}
        AudioManager.playGameOver();
        return;
    }
    energy=ENERGY_MAX; enemyBullets=[]; resetPlayer();
}

function spawnBullet(x,y){bullets.push({x,y,active:true});}
function spawnEnemyBullet(x,y){enemyBullets.push({x,y,active:true});}
function spawnExplosion(x,y){explosions.push({x,y,timer:EXPLOSION_DUR});}

function rectsOverlap(ax,ay,aw,ah,bx,by,bw,bh){
    return ax<bx+bw&&ax+aw>bx&&ay<by+bh&&ay+ah>by;
}

function togglePause(){
    if(state==='playing')state='paused';
    else if(state==='paused')state='playing';
}

function update(dt) {
    blinkTimer+=dt;
    updateStars(dt);
    if(state==='title'||state==='gameOver'||state==='paused') return;
    if(state==='levelIntro'){levelTimer-=dt;if(levelTimer<=0)state='playing';return;}
    if(state==='energyBonus'){updateBonus(dt);return;}

    updatePlayer(dt);
    updateBullets(dt);
    updateEnemies(dt);
    updateEnemyBullets(dt);
    updateExplosions(dt);
    updateEnergy(dt);
    checkCollisions();
    if(playerInvincible>0)playerInvincible-=dt;
    if(enemies.every(e=>!e.alive)) startBonusPhase();
}

function updateBonus(dt) {
    bonusTickTimer+=dt;
    if(bonusTickTimer>=BONUS_TICK_RATE && bonusEnergy>0){
        bonusTickTimer=0;
        const type=SpriteFactory.getEnemyType(level);
        const pts=SpriteFactory.getEnemyScore(type,getCycle());
        const chunk=Math.min(bonusEnergy,3);
        bonusEnergy-=chunk;
        energy-=chunk;
        const old=score;
        score+=chunk*pts;
        checkExtraLife(old,score);
        AudioManager.playBonusTick();
    }
    if(bonusEnergy<=0) nextLevel();
}

function updateStars(dt){stars.forEach(s=>{s.y+=s.speed*dt;if(s.y>GAME_H){s.y=0;s.x=Math.random()*GAME_W;}});}

function updatePlayer(dt){
    const ml=keys['ArrowLeft']||keys['KeyA']||touchLeft;
    const mr=keys['ArrowRight']||keys['KeyD']||touchRight;
    const fire=keys['Space']||keys['ArrowUp']||keys['KeyW']||touchFire;
    if(ml)player.x-=PLAYER_SPEED*dt;
    if(mr)player.x+=PLAYER_SPEED*dt;
    player.x=Math.max(player.w/2,Math.min(GAME_W-player.w/2,player.x));
    bulletCD-=dt;
    if(fire&&bulletCD<=0){spawnBullet(player.x,player.y-player.h/2);bulletCD=BULLET_COOLDOWN;AudioManager.playLaser();}
}

function updateBullets(dt){
    bullets.forEach(b=>{
        b.x=player.x; // míssil guiado
        b.y-=BULLET_SPEED*dt;
        if(b.y<-10)b.active=false;
    });
    bullets=bullets.filter(b=>b.active);
}

function updateEnemies(dt){
    const diff = getDifficultyScale();
    const time = performance.now()/1000;
    const type = enemies.length>0?enemies[0].type:'hamburger';
    const mv = getEnemyMovement(type);

    // Zigue-zague: escala de BASE até CAP com o nível
    const zigSpeed = Math.min(ZIGZAG_SPEED_CAP, ENEMY_BASE_SPEED + (level-1) * ENEMY_SPEED_INCREMENT);

    // Descida: escala de 6 até CAP (ex: 6 → 18 ao longo de 24 níveis)
    const descentSpeed = ENEMY_DESCENT_SPEED + diff * (DESCENT_SPEED_CAP - ENEMY_DESCENT_SPEED);

    enemies.forEach(e=>{
        if(!e.alive)return;
        const zigFreq = zigSpeed/30 * mv.zigSpeed;
        const zigAmp = ENEMY_ZIGZAG_AMP * mv.zigAmp;
        let xOff = Math.sin(time*zigFreq+e.phase) * zigAmp;
        if(mv.erratic>0) xOff += Math.sin(time*3.7+e.erraticOffset) * 20 * mv.erratic * (1 + diff*0.5);
        e.x = e.baseX + xOff;
        e.baseY += descentSpeed * mv.descent * dt;
        e.y = e.baseY;
        if(e.y>GAME_H-60){e.baseY=-20;e.y=e.baseY;}
    });

    // Dice não atiram
    if(type==='dice') return;

    // Agressividade de tiro: intervalo diminui com o nível, mas nunca abaixo do FLOOR
    enemyShootTimer -= dt;
    if(enemyShootTimer<=0){
        const alive = enemies.filter(e=>e.alive);
        if(alive.length>0){
            const shooter = alive[Math.floor(Math.random()*alive.length)];
            spawnEnemyBullet(shooter.x, shooter.y+shooter.h/2);
        }
        const minInterval = Math.max(SHOOT_INTERVAL_FLOOR, ENEMY_SHOOT_MIN - diff * 1.2);
        const maxInterval = Math.max(SHOOT_INTERVAL_FLOOR + 0.4, ENEMY_SHOOT_MAX - diff * 3.5);
        enemyShootTimer = minInterval + Math.random() * (maxInterval - minInterval);
    }
}

function updateEnemyBullets(dt){
    enemyBullets.forEach(b=>{b.y+=ENEMY_BULLET_SPEED*dt;if(b.y>GAME_H+10)b.active=false;});
    enemyBullets=enemyBullets.filter(b=>b.active);
}

function updateExplosions(dt){explosions.forEach(e=>{e.timer-=dt;});explosions=explosions.filter(e=>e.timer>0);}

function updateEnergy(dt){
    energy-=ENERGY_DRAIN_RATE*dt;
    const ratio=energy/ENERGY_MAX;
    if(ratio<=0.25&&ratio>0) AudioManager.startEnergyWarning(ratio);
    else AudioManager.stopEnergyWarning();
    if(energy<=0){energy=0;loseLife();}
}

function checkCollisions(){
    const bs=SpriteFactory.getSprite('bullet');
    const bw=bs.width, bh=bs.height;
    const type=enemies.length>0?enemies[0].type:'hamburger';
    const pts=SpriteFactory.getEnemyScore(type,getCycle());

    bullets.forEach(b=>{
        if(!b.active)return;
        enemies.forEach(e=>{
            if(!e.alive)return;
            if(rectsOverlap(b.x-bw/2,b.y-bh/2,bw,bh,e.x-e.w/2,e.y-e.h/2,e.w,e.h)){
                b.active=false; e.alive=false;
                const old=score; score+=pts; checkExtraLife(old,score);
                spawnExplosion(e.x,e.y); AudioManager.playExplosion();
            }
        });
    });

    if(playerInvincible<=0){
        const ebs=SpriteFactory.getSprite('enemyBullet');
        const ebw=ebs.width, ebh=ebs.height;
        enemyBullets.forEach(b=>{
            if(!b.active)return;
            if(rectsOverlap(b.x-ebw/2,b.y-ebh/2,ebw,ebh,player.x-player.w/2,player.y-player.h/2,player.w,player.h)){
                b.active=false;spawnExplosion(player.x,player.y);loseLife();
            }
        });
        enemies.forEach(e=>{
            if(!e.alive)return;
            if(rectsOverlap(e.x-e.w/2,e.y-e.h/2,e.w,e.h,player.x-player.w/2,player.y-player.h/2,player.w,player.h)){
                e.alive=false;spawnExplosion(player.x,player.y);loseLife();
            }
        });
    }
}

// --- RENDER ---
function render(){
    ctx.save();
    ctx.setTransform(1,0,0,1,0,0);
    ctx.fillStyle=getBgColor();
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.restore();
    ctx.save();
    ctx.translate(offsetX,offsetY);
    ctx.scale(scaleX,scaleY);
    renderStars();
    if(state==='title') renderTitle();
    else if(state==='gameOver') renderGameOver();
    else {
        renderGame();
        if(state==='levelIntro') renderLevelIntro();
        if(state==='paused') renderPause();
        if(state==='energyBonus') renderBonus();
    }
    ctx.restore();
}

function renderStars(){
    stars.forEach(s=>{
        const a=s.brightness*(0.5+0.5*Math.sin(blinkTimer*2+s.x));
        ctx.fillStyle=`rgba(255,255,255,${a.toFixed(2)})`;
        ctx.fillRect(Math.floor(s.x),Math.floor(s.y),s.size,s.size);
    });
}

function renderGame(){
    if(playerInvincible<=0||Math.floor(blinkTimer*10)%2===0){
        const ps=SpriteFactory.getSprite('player');
        ctx.drawImage(ps,Math.floor(player.x-ps.width/2),Math.floor(player.y-ps.height/2));
    }
    const bs=SpriteFactory.getSprite('bullet');
    bullets.forEach(b=>{ctx.drawImage(bs,Math.floor(b.x-bs.width/2),Math.floor(b.y-bs.height/2));});
    const ebs=SpriteFactory.getSprite('enemyBullet');
    enemyBullets.forEach(b=>{ctx.drawImage(ebs,Math.floor(b.x-ebs.width/2),Math.floor(b.y-ebs.height/2));});
    enemies.forEach(e=>{
        if(!e.alive)return;
        const sp=SpriteFactory.getSprite(e.type);
        ctx.drawImage(sp,Math.floor(e.x-sp.width/2),Math.floor(e.y-sp.height/2));
    });
    const expSp=SpriteFactory.getSprite('explosion');
    explosions.forEach(e=>{
        const p=1-e.timer/EXPLOSION_DUR;
        ctx.globalAlpha=1-p;
        ctx.save();ctx.translate(Math.floor(e.x),Math.floor(e.y));ctx.scale(1+p*0.8,1+p*0.8);
        ctx.drawImage(expSp,-expSp.width/2,-expSp.height/2);
        ctx.restore();ctx.globalAlpha=1;
    });
    renderHUD();
}

function renderHUD(){
    ctx.font='10px "Press Start 2P",monospace';
    ctx.textAlign='left';ctx.fillStyle='#FFF';ctx.fillText('SCORE',8,16);
    ctx.fillStyle='#FFFF44';ctx.fillText(score.toString().padStart(7,'0'),8,30);
    ctx.textAlign='center';ctx.fillStyle='#FFF';ctx.fillText('HI',GAME_W/2,16);
    ctx.fillStyle='#FF8844';ctx.fillText(highScore.toString().padStart(7,'0'),GAME_W/2,30);
    ctx.textAlign='right';ctx.fillStyle='#FFF';ctx.fillText('LV '+level,GAME_W-8,16);
    ctx.fillStyle='#FF4444';ctx.fillText('\u2665'.repeat(Math.max(0,lives)),GAME_W-8,30);
    // Cycle indicator
    const cycle=getCycle();
    if(cycle>1){ctx.font='7px "Press Start 2P",monospace';ctx.fillStyle='#66BBFF';ctx.fillText('C'+cycle,GAME_W-8,40);}

    const barX=30,barY=GAME_H-22,barW=GAME_W-60,barH=10;
    ctx.fillStyle='#333';ctx.fillRect(barX,barY,barW,barH);
    const ratio=energy/ENERGY_MAX;
    ctx.fillStyle=ratio>0.5?'#44FF44':ratio>0.25?'#FFAA00':'#FF2222';
    ctx.fillRect(barX,barY,barW*Math.max(0,ratio),barH);
    ctx.strokeStyle='#888';ctx.lineWidth=1;ctx.strokeRect(barX,barY,barW,barH);
    ctx.font='8px "Press Start 2P",monospace';ctx.textAlign='center';
    ctx.fillStyle='#FFF';ctx.fillText('ENERGIA',GAME_W/2,barY-4);
}

function renderTitle(){
    ctx.font='20px "Press Start 2P",monospace';ctx.textAlign='center';
    const glow=0.7+0.3*Math.sin(blinkTimer*3);
    ctx.fillStyle=`rgba(255,255,68,${glow})`;ctx.fillText('MEGAMANIA',GAME_W/2,GAME_H/2-80);
    ctx.font='10px "Press Start 2P",monospace';ctx.fillStyle='#66BBFF';ctx.fillText('REMAKE',GAME_W/2,GAME_H/2-55);

    const types=SpriteFactory.ENEMY_TYPES;
    types.forEach((type,i)=>{
        const sp=SpriteFactory.getSprite(type);
        const x=GAME_W/2-(types.length*24)/2+i*24+12;
        const y=GAME_H/2-15+Math.sin(blinkTimer*2+i)*5;
        ctx.drawImage(sp,x-sp.width/2,y-sp.height/2);
    });

    ctx.font='8px "Press Start 2P",monospace';
    const sa=0.4+0.6*Math.abs(Math.sin(blinkTimer*2.5));
    ctx.fillStyle=`rgba(255,255,255,${sa})`;
    ctx.fillText('PRESSIONE ESPACO',GAME_W/2,GAME_H/2+40);
    ctx.fillText('OU TOQUE NA TELA',GAME_W/2,GAME_H/2+56);
    ctx.fillStyle='#888';ctx.fillText('<- -> MOVER   ESPACO ATIRAR',GAME_W/2,GAME_H/2+90);
    ctx.fillStyle='#FF8844';ctx.fillText('HI-SCORE: '+highScore.toString().padStart(7,'0'),GAME_W/2,GAME_H/2+120);
}

function renderGameOver(){
    renderGame();
    ctx.fillStyle='rgba(0,0,0,0.65)';ctx.fillRect(0,0,GAME_W,GAME_H);
    ctx.font='18px "Press Start 2P",monospace';ctx.textAlign='center';
    ctx.fillStyle='#FF4444';ctx.fillText('GAME OVER',GAME_W/2,GAME_H/2-30);
    ctx.font='10px "Press Start 2P",monospace';ctx.fillStyle='#FFFF44';
    ctx.fillText('SCORE: '+score.toString().padStart(7,'0'),GAME_W/2,GAME_H/2+10);
    if(score>=highScore){ctx.fillStyle='#44FF44';ctx.fillText('NOVO RECORDE!',GAME_W/2,GAME_H/2+30);}
    ctx.font='8px "Press Start 2P",monospace';
    const a=0.4+0.6*Math.abs(Math.sin(blinkTimer*2.5));
    ctx.fillStyle=`rgba(255,255,255,${a})`;ctx.fillText('PRESSIONE ESPACO',GAME_W/2,GAME_H/2+60);
}

function renderPause(){
    ctx.fillStyle='rgba(0,0,0,0.55)';ctx.fillRect(0,0,GAME_W,GAME_H);
    ctx.font='16px "Press Start 2P",monospace';ctx.textAlign='center';
    ctx.fillStyle='#FFFF44';ctx.fillText('PAUSADO',GAME_W/2,GAME_H/2-20);
    ctx.font='8px "Press Start 2P",monospace';
    const a=0.4+0.6*Math.abs(Math.sin(blinkTimer*2.5));
    ctx.fillStyle=`rgba(255,255,255,${a})`;ctx.fillText('P OU ESC PARA CONTINUAR',GAME_W/2,GAME_H/2+15);
}

function renderLevelIntro(){
    const p=1-levelTimer/LEVEL_INTRO_DUR;
    ctx.globalAlpha=p<0.2?p/0.2:p>0.8?(1-p)/0.2:1;
    ctx.font='14px "Press Start 2P",monospace';ctx.textAlign='center';
    ctx.fillStyle='#FFFF44';ctx.fillText('NIVEL '+level,GAME_W/2,GAME_H/2-20);
    ctx.font='9px "Press Start 2P",monospace';ctx.fillStyle='#66BBFF';
    const et=SpriteFactory.getEnemyType(level);
    ctx.fillText(SpriteFactory.getEnemyName(et),GAME_W/2,GAME_H/2+5);
    const sp=SpriteFactory.getSprite(et);
    ctx.drawImage(sp,GAME_W/2-sp.width/2,GAME_H/2+15);
    const cycle=getCycle();
    if(cycle>1){ctx.font='7px "Press Start 2P",monospace';ctx.fillStyle='#FF8844';ctx.fillText('CICLO '+cycle,GAME_W/2,GAME_H/2+45);}
    ctx.globalAlpha=1;
}

function renderBonus(){
    ctx.font='10px "Press Start 2P",monospace';ctx.textAlign='center';
    ctx.fillStyle='#FFFF44';ctx.fillText('BONUS DE ENERGIA!',GAME_W/2,GAME_H/2-10);
    ctx.font='12px "Press Start 2P",monospace';ctx.fillStyle='#44FF44';
    ctx.fillText('+'+bonusScore.toString(),GAME_W/2,GAME_H/2+15);
}

function resize(){
    canvas.width=window.innerWidth*devicePixelRatio;
    canvas.height=window.innerHeight*devicePixelRatio;
    const asp=GAME_W/GAME_H, wasp=canvas.width/canvas.height;
    if(wasp>asp){scaleY=canvas.height/GAME_H;scaleX=scaleY;offsetX=(canvas.width-GAME_W*scaleX)/2;offsetY=0;}
    else{scaleX=canvas.width/GAME_W;scaleY=scaleX;offsetX=0;offsetY=(canvas.height-GAME_H*scaleY)/2;}
}

window.addEventListener('keydown',e=>{
    keys[e.code]=true;
    if((e.code==='Space'||e.code==='Enter')&&(state==='title'||state==='gameOver'))startGame();
    if((e.code==='KeyP'||e.code==='Escape')&&(state==='playing'||state==='paused'))togglePause();
    if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
});
window.addEventListener('keyup',e=>{keys[e.code]=false;});

// --- Multi-touch system (robusto) ---
const mobileUI=document.getElementById('mobileUI');
const btnLeft=document.getElementById('btnLeft');
const btnRight=document.getElementById('btnRight');
const btnFire=document.getElementById('btnFire');
const btnPause=document.getElementById('btnPause');

// Mapa de touchId → {key, el}
const activeTouches = new Map();
const btnMap = new Map();
btnMap.set(btnLeft, 'left');
btnMap.set(btnRight, 'right');
btnMap.set(btnFire, 'fire');

function setTouchState(key, active, el) {
    if(key==='left') touchLeft=active;
    if(key==='right') touchRight=active;
    if(key==='fire') touchFire=active;
    if(el) el.classList.toggle('active', active);
}

function releaseTouch(id) {
    const info = activeTouches.get(id);
    if(info) {
        setTouchState(info.key, false, info.el);
        activeTouches.delete(id);
    }
}

// Touchstart nos botões
[btnLeft, btnRight, btnFire].forEach(el => {
    el.addEventListener('touchstart', e => {
        e.preventDefault(); e.stopPropagation();
        AudioManager.init();
        for(let i=0;i<e.changedTouches.length;i++){
            const t = e.changedTouches[i];
            const key = btnMap.get(el);
            activeTouches.set(t.identifier, {key, el});
            setTouchState(key, true, el);
        }
    }, {passive:false});
});

// Global touchend/cancel no document (captura dedos que deslizam para fora)
function handleTouchRelease(e) {
    for(let i=0;i<e.changedTouches.length;i++){
        releaseTouch(e.changedTouches[i].identifier);
    }
}
document.addEventListener('touchend', handleTouchRelease, {passive:false});
document.addEventListener('touchcancel', handleTouchRelease, {passive:false});

// Pause
btnPause.addEventListener('touchstart',e=>{e.preventDefault();e.stopPropagation();togglePause();},{passive:false});
btnPause.addEventListener('click',e=>{e.preventDefault();togglePause();});

// Canvas touch: só para iniciar na tela título/gameover
canvas.addEventListener('touchstart',e=>{
    e.preventDefault();
    if(state==='title'||state==='gameOver'){AudioManager.init();startGame();}
},{passive:false});

// Detecção JS de touch como fallback para notebooks híbridos
function enableMobileUI(){mobileUI.style.display='block';}
window.addEventListener('touchstart', enableMobileUI, {once:true, passive:true});

let lastTime=0;
function gameLoop(ts){
    const dt=Math.min((ts-lastTime)/1000,0.05);
    lastTime=ts;update(dt);render();requestAnimationFrame(gameLoop);
}
initStars();resize();
window.addEventListener('resize',resize);
window.addEventListener('orientationchange',()=>{setTimeout(resize,100);});
requestAnimationFrame(ts=>{lastTime=ts;gameLoop(ts);});
})();
