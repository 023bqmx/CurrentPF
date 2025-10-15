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

/* ===== Image Carousel (แทนหุ่นยนต์) ===== */
(function(){
  const root = document.querySelector('.carousel-card');
  if(!root) return;

  const track = root.querySelector('.carousel-track');
  const viewport = root.querySelector('.carousel-viewport');
  const prevBtn = root.querySelector('.prev');
  const nextBtn = root.querySelector('.next');
  const dotsWrap = root.querySelector('.carousel-dots');

  // สไลด์จริง (อย่านับ clone)
  let slidesReal = [...root.querySelectorAll('.carousel-slide')];
  const N = slidesReal.length;
  if(N < 3){ console.warn('ต้องมีรูปอย่างน้อย 3 รูปใน .carousel-track'); }

  // ทำให้วนลูป: clone หัว-ท้าย
  const firstClone = slidesReal[0].cloneNode(true);
  const lastClone = slidesReal[N-1].cloneNode(true);
  firstClone.setAttribute('aria-hidden','true');
  lastClone.setAttribute('aria-hidden','true');
  track.insertBefore(lastClone, slidesReal[0]);
  track.appendChild(firstClone);

  // อัปเดตรวม (จริง + clone)
  let slidesAll = [...track.querySelectorAll('.carousel-slide')];

  // สร้างจุดสถานะ
  const dots = [];
  for(let i=0;i<N;i++){
    const b = document.createElement('button');
    b.type = 'button';
    b.addEventListener('click', ()=>goTo(i));
    dotsWrap.appendChild(b);
    dots.push(b);
  }

  // state
  let idx = 0;              // index ของสไลด์ "จริง"
  let locked = false;       // กันสแปมตอนกำลัง transition
  let auto = null;          // interval autoplay
  const AUTO_MS = 3600;     // เปลี่ยนรูปทุกกี่ ms
  const TRANSITION = '.48s ease';

  function setActiveDot(i){
    dots.forEach((d,k)=> d.setAttribute('aria-current', String(k===i)));
  }

  function setTransform(iReal, withTransition=true){
    const w = viewport.clientWidth;
    track.style.transition = withTransition ? `transform ${TRANSITION}` : 'none';
    // +1 เพราะมี lastClone นำหน้า
    const offset = (iReal + 1) * -w;
    track.style.transform = `translateX(${offset}px)`;
  }

  // เริ่มต้นวางที่สไลด์ 0 จริง
  requestAnimationFrame(()=> setTransform(0, false));
  setActiveDot(0);

  // Resize แล้วล็อกตำแหน่งใหม่
  addEventListener('resize', ()=> setTransform(idx, false), { passive:true });

  // หลังจบ transition ให้แก้ edge (ไป clone แล้วกระโดดกลับแบบไร้ transition)
  track.addEventListener('transitionend', ()=>{
    locked = false;
    if(idx === -1){ idx = N-1; setTransform(idx, false); }
    if(idx === N){ idx = 0; setTransform(idx, false); }
    setActiveDot(idx);
  });

  function next(){
    if(locked) return;
    locked = true;
    idx++;
    setTransform(idx);
  }
  function prev(){
    if(locked) return;
    locked = true;
    idx--;
    setTransform(idx);
  }
  function goTo(i){
    if(locked || i===idx) return;
    locked = true;
    idx = i;
    setTransform(idx);
  }

  nextBtn.addEventListener('click', next);
  prevBtn.addEventListener('click', prev);

  // คีย์บอร์ด
  viewport.addEventListener('keydown', (e)=>{
    if(e.key === 'ArrowRight') next();
    else if(e.key === 'ArrowLeft') prev();
  });

  // Gesture: drag / swipe
  let startX = 0, dx = 0, dragging = false, pid = null;
  viewport.addEventListener('pointerdown', (e)=>{
    dragging = true; pid = e.pointerId; startX = e.clientX; dx = 0;
    viewport.setPointerCapture(pid);
    track.style.transition = 'none';
  });
  viewport.addEventListener('pointermove', (e)=>{
    if(!dragging) return;
    dx = e.clientX - startX;
    const w = viewport.clientWidth;
    const base = (idx + 1) * -w;
    track.style.transform = `translateX(${base + dx}px)`;
  });
  function endDrag(e){
    if(!dragging) return;
    dragging = false;
    try{ viewport.releasePointerCapture?.(pid); }catch{}
    const w = viewport.clientWidth;
    if(Math.abs(dx) > w*0.18){
      dx < 0 ? next() : prev();
    }else{
      locked = true;
      setTransform(idx);
    }
  }
  viewport.addEventListener('pointerup', endDrag);
  viewport.addEventListener('pointercancel', endDrag);
  viewport.addEventListener('pointerleave', endDrag);

  // Auto-play (หยุดเมื่อ hover/โฟกัส)
  function startAuto(){ stopAuto(); auto = setInterval(next, AUTO_MS); }
  function stopAuto(){ if(auto){ clearInterval(auto); auto=null; } }
  root.addEventListener('mouseenter', stopAuto);
  root.addEventListener('mouseleave', startAuto);
  viewport.addEventListener('focusin', stopAuto);
  viewport.addEventListener('focusout', startAuto);

  startAuto();
})();

/* ===== Mouse Trail (smooth + faster fade) ===== */
const trailCanvas = document.getElementById('mouse-trail');
const tctx = trailCanvas?.getContext?.('2d', { alpha: true });

function sizeCanvas(c = trailCanvas, ctx = tctx){
  if(!c || !ctx) return;
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
  if(!tctx || !trailCanvas) return;
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
    const alpha = Math.min(a.t, b.t) * 0.75;
    const speed = Math.hypot(b.x - a.x, b.y - a.y);
    const width = Math.max(1, 2.6 - speed * 0.02);

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
const rctx = rainCanvas?.getContext?.('2d', { alpha:true });
function sizeRain(){
  if(!rainCanvas || !rctx) return;
  const dpr = Math.max(1, devicePixelRatio || 1);
  rainCanvas.width = Math.floor(innerWidth * dpr);
  rainCanvas.height = Math.floor(innerHeight * dpr);
  rainCanvas.style.width = innerWidth + 'px';
  rainCanvas.style.height = innerHeight + 'px';
  rctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
sizeRain();
addEventListener('resize', sizeRain, { passive:true });

const drops = [];
const MAX_DROPS = 280;
function spawnDrop(){
  const speed = Math.random()*400 + 300;      // px/sec
  const len = Math.random()*10 + 8;
  const wind = Math.random()*80 + 40;
  drops.push({
    x: Math.random()*innerWidth,
    y: -20,
    vx: wind,
    vy: speed,
    len
  });
  if(drops.length>MAX_DROPS) drops.shift();
}
let rLast = performance.now();
let spawnAcc = 0;

function renderRain(now){
  if(!rctx || !rainCanvas) return;
  const dt = Math.min(32, now - rLast)/1000; rLast = now;

  // ~120 หยด/วินาที
  spawnAcc += dt*120;
  while(spawnAcc>1){ spawnDrop(); spawnAcc -= 1; }

  rctx.clearRect(0,0,rainCanvas.width, rainCanvas.height);
  rctx.lineCap = 'round';

  for(const d of drops){
    d.x += d.vx*dt;
    d.y += d.vy*dt;

    rctx.globalAlpha = 0.32;
    rctx.strokeStyle = '#9fb8ff';
    rctx.lineWidth = 1;
    rctx.beginPath();
    rctx.moveTo(d.x, d.y);
    rctx.lineTo(d.x - d.vx*0.02, d.y - d.len);
    rctx.stroke();

    if(d.y - d.len > innerHeight + 30 || d.x < -30 || d.x > innerWidth + 30){
      d.y = -20; d.x = Math.random()*innerWidth;
    }
  }

  requestAnimationFrame(renderRain);
}
requestAnimationFrame(renderRain);
