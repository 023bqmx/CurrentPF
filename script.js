/* ===== Smooth scroll + active link ===== */
const navLinks = [...document.querySelectorAll('.nav-link')];
const sections = navLinks.map(a => document.querySelector(a.getAttribute('href')));

const revealObs = new IntersectionObserver((entries)=>{
  entries.forEach(e=>{ if(e.isIntersecting) e.target.classList.add('visible'); });
},{ threshold: .15 });
document.querySelectorAll('.section').forEach(s => revealObs.observe(s));

const activeObs = new IntersectionObserver((entries)=>{
  entries.forEach(entry=>{
    if(entry.isIntersecting){
      const id = '#' + entry.target.id;
      navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === id));
      history.replaceState(null, '', id);
    }
  });
},{ rootMargin: "-45% 0px -45% 0px", threshold: 0 });
sections.forEach(sec => activeObs.observe(sec));

navLinks.forEach(a=>{
  a.addEventListener('click', (e)=>{
    e.preventDefault();
    const target = document.querySelector(a.getAttribute('href'));
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

/* ===== Tilt effect ===== */
document.querySelectorAll('[data-tilt]').forEach(card=>{
  const maxTilt = 6;
  let raf = null;
  card.addEventListener('mousemove', e=>{
    const r = card.getBoundingClientRect();
    const cx = r.left + r.width/2, cy = r.top + r.height/2;
    const dx = (e.clientX - cx) / (r.width/2);
    const dy = (e.clientY - cy) / (r.height/2);
    if(raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(()=>{
      card.style.transform = `rotateX(${(-dy*maxTilt).toFixed(2)}deg) rotateY(${(dx*maxTilt).toFixed(2)}deg) translateY(-4px)`;
    });
  });
  card.addEventListener('mouseleave', ()=>{
    if(raf) cancelAnimationFrame(raf);
    card.style.transform = '';
  });
});

/* ===== Robot click -> smile (auto revert) ===== */
const robot = document.getElementById('robot');
robot.addEventListener('click', ()=>{
  robot.classList.add('smile');
  setTimeout(()=>robot.classList.remove('smile'), 1400);
});

/* ===== Mouse Trail (smooth + faster fade) ===== */
const trailCanvas = document.getElementById('mouse-trail');
const tctx = trailCanvas.getContext('2d', { alpha: true });

function sizeCanvas(c = trailCanvas, ctx = tctx){
  const dpr = Math.max(1, devicePixelRatio || 1);
  c.width = Math.floor(innerWidth * dpr);
  c.height = Math.floor(innerHeight * dpr);
  c.style.width = innerWidth + 'px';
  c.style.height = innerHeight + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
sizeCanvas();
addEventListener('resize', () => sizeCanvas(), { passive: true });

// เก็บตำแหน่งเมาส์แบบ target แล้ว "ลู่ออก" ให้สมูธ
let target = { x: innerWidth/2, y: innerHeight/2 };
let smooth = { x: target.x, y: target.y };
addEventListener('mousemove', (e)=>{
  target.x = e.clientX;
  target.y = e.clientY;
}, { passive: true });

let pts = [];                // {x,y,t}
let last = performance.now();
const MAX_PTS = 140;         // น้อยลง = หายไวขึ้น
const SMOOTH = 0.18;         // 0..1 (สูง=ตามเร็วขึ้น)

function render(now){
  const dt = Math.min(32, now - last) / 1000; last = now;

  // เฟรมเรตเป็นอิสระ: เร่งอัตรา lerp ตาม dt
  const k = Math.min(1, SMOOTH * (60 * dt));
  smooth.x += (target.x - smooth.x) * k;
  smooth.y += (target.y - smooth.y) * k;

  // เก็บจุดทุกเฟรม (เนียนกว่า event)
  pts.push({ x: smooth.x, y: smooth.y, t: 1 });
  if(pts.length > MAX_PTS) pts.shift();

  // หายไวขึ้น (เดิม ~0.9)
  for(const p of pts) p.t -= dt * 1.8;
  pts = pts.filter(p => p.t > 0);

  tctx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
  tctx.lineCap = 'round';
  tctx.lineJoin = 'round';

  for(let i=1;i<pts.length;i++){
    const a = pts[i-1], b = pts[i];
    const alpha = Math.min(a.t, b.t) * 0.75;          // โปร่งขึ้นเล็กน้อย
    const speed = Math.hypot(b.x - a.x, b.y - a.y);
    const width = Math.max(1, 2.6 - speed * 0.02);    // เส้นเรียวตอนเร็ว

    // ชั้นนอก (ฟ้า)
    tctx.strokeStyle = `rgba(88,166,255,${alpha})`;
    tctx.lineWidth = width;
    tctx.beginPath();
    tctx.moveTo(a.x, a.y);
    tctx.lineTo(b.x, b.y);
    tctx.stroke();

    // ชั้นใน (เขียว)
    tctx.strokeStyle = `rgba(63,185,80,${alpha * 0.45})`;
    tctx.lineWidth = Math.max(0.5, width * 0.5);
    tctx.beginPath();
    tctx.moveTo(a.x, a.y);
    tctx.lineTo(b.x, b.y);
    tctx.stroke();
  }

  requestAnimationFrame(render);
}
requestAnimationFrame(render);

/* ===== Gentle Rain (พรำๆ ทั่วเว็บ) ===== */
const rainCanvas = document.getElementById('rain');
const rctx = rainCanvas.getContext('2d', { alpha:true });
sizeCanvas(rainCanvas, rctx);
addEventListener('resize', ()=>sizeCanvas(rainCanvas, rctx), { passive:true });

const drops = [];
const MAX_DROPS = 280;    // ปริมาณฝน (พรำๆ)
function spawnDrop(){
  const speed = Math.random()*400 + 300;           // px/sec
  const len = Math.random()*10 + 8;                // ความยาวเส้น
  const wind = Math.random()*80 + 40;              // แรงลมขวา
  drops.push({
    x: Math.random()*innerWidth,
    y: -20,
    vx: wind,         // ลมพัดเฉียงลงขวา
    vy: speed,
    len,
    life: 1
  });
  if(drops.length>MAX_DROPS) drops.shift();
}
let rLast = performance.now();
let spawnAcc = 0;

function renderRain(now){
  const dt = Math.min(32, now - rLast)/1000; rLast = now;

  // อัตราการเกิดหยด ~ 120 หยด/วินาที
  spawnAcc += dt*120;
  while(spawnAcc>1){ spawnDrop(); spawnAcc -= 1; }

  rctx.clearRect(0,0,rainCanvas.width, rainCanvas.height);
  rctx.lineCap = 'round';

  for(const d of drops){
    d.x += d.vx*dt;
    d.y += d.vy*dt;

    // วาดเส้นฝน (เอียงตามลม)
    rctx.globalAlpha = 0.32;
    rctx.strokeStyle = '#9fb8ff';
    rctx.lineWidth = 1;
    rctx.beginPath();
    rctx.moveTo(d.x, d.y);
    rctx.lineTo(d.x - d.vx*0.02, d.y - d.len); // เลื่อนย้อนขึ้นเล็กน้อยให้เป็นเส้นยาว
    rctx.stroke();

    // รีไซเคิลออกนอกจอ
    if(d.y - d.len > innerHeight + 30 || d.x < -30 || d.x > innerWidth + 30){
      d.y = -20; d.x = Math.random()*innerWidth;
    }
  }

  requestAnimationFrame(renderRain);
}
requestAnimationFrame(renderRain);
