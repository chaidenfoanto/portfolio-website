/* ── CURSOR ── */
const cur = document.getElementById('cur'), ring = document.getElementById('cur-ring');
let mx = 0, my = 0, rx = 0, ry = 0;
document.addEventListener('mousemove', e => {
  mx = e.clientX; my = e.clientY;
  cur.style.left = mx + 'px'; cur.style.top = my + 'px';
});
(function animRing() {
  rx += (mx - rx) * 0.11; ry += (my - ry) * 0.11;
  ring.style.left = rx + 'px'; ring.style.top = ry + 'px';
  requestAnimationFrame(animRing);
})();
document.querySelectorAll('a,button,.glass-card').forEach(el => {
  el.addEventListener('mouseenter', () => { cur.style.width = '6px'; cur.style.height = '6px'; ring.style.width = '46px'; ring.style.height = '46px'; ring.style.background = 'rgba(255,255,255,0.06)' });
  el.addEventListener('mouseleave', () => { cur.style.width = '9px'; cur.style.height = '9px'; ring.style.width = '30px'; ring.style.height = '30px'; ring.style.background = 'transparent' });
});

/* ── THEME TOGGLE ── */
let isDark = true;
function toggleTheme() {
  isDark = !isDark;
  document.body.classList.toggle('light-mode', !isDark);
}

/* ── MOBILE MENU ── */
function toggleMobile() { document.getElementById('mobileMenu').classList.toggle('open') }
function closeMobile() { document.getElementById('mobileMenu').classList.remove('open') }

/* ── NAVBAR SCROLL + ACTIVE LINK ── */
const navbar = document.getElementById('navbar');
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 50);
  let curSec = '';
  sections.forEach(s => { if (window.scrollY >= s.offsetTop - 130) curSec = s.id });
  navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + curSec));
  const sy = window.scrollY;
  document.getElementById('glowRight').style.transform = `translateY(calc(-50% + ${sy * .22}px))`;
  document.getElementById('glowLeft').style.transform = `translateY(${sy * .16}px)`;
  const o1 = document.getElementById('orb1'), o2 = document.getElementById('orb2');
  if (o1) o1.style.transform = `translate(${sy * .03}px,${-sy * .05}px)`;
  if (o2) o2.style.transform = `translate(${-sy * .02}px,${sy * .04}px)`;
  const pf = document.querySelector('.photo-float');
  if (pf) pf.style.setProperty('--para-y', `${sy * .06}px`);
}, { passive: true });

/* ══════════════════════════════════════
 CAROUSEL — TRUE INFINITE (DOM reorder)

 Key insight: track always translates exactly 1 slot.
 The slide that goes off-screen is instantly moved to
 the opposite end of the DOM (no visible jump).
 Active slide = always domOrder[center].
══════════════════════════════════════ */
(function () {
  const viewport = document.getElementById('carouselViewport');
  const track = document.getElementById('carouselTrack');
  const dotsWrap = document.getElementById('carouselDots');
  if (!track) return;

  const origSlides = Array.from(track.querySelectorAll('.carousel-slide'));
  const N = origSlides.length;
  const GAP = 20;
  const center = Math.floor(N / 2); // center dom slot = active slot

  let transitioning = false;
  let isHovered = false;
  let autoTimer = null;

  /*
   * domOrder[i] = logical index of the slide currently at DOM position i.
   * Active slide is always domOrder[center].
   * Initial: logical slide 0 sits at center, others arranged around it.
   * e.g. N=4, center=2: domOrder = [2, 3, 0, 1]
   */
  let domOrder = Array.from({ length: N }, (_, i) => ((i - center + N) % N));

  function applyDomOrder() {
    domOrder.forEach(logIdx => track.appendChild(origSlides[logIdx]));
  }
  applyDomOrder();

  /* ── Geometry ── */
  function slideW() { return origSlides[0]?.offsetWidth || 820; }
  function itemW() { return slideW() + GAP; }
  function centerOffset() { return (viewport.offsetWidth - slideW()) / 2; }
  function baseX() { return -(center * itemW()) + centerOffset(); }

  /* ── Set track X ── */
  function setX(x, animate) {
    track.classList.toggle('is-animating', !!animate);
    track.style.transform = `translateX(${x}px)`;
  }

  /* ── Active = whatever is at domOrder[center] ── */
  function markActive() {
    const activLogIdx = domOrder[center];
    origSlides.forEach((s, i) => s.classList.toggle('is-active', i === activLogIdx));
  }

  /* ── Dots — driven by domOrder[center] ── */
  for (let i = 0; i < N; i++) {
    const d = document.createElement('div');
    d.className = 'carousel-dot' + (i === 0 ? ' active' : '');
    d.addEventListener('click', () => { jumpTo(i); resetAuto(); });
    dotsWrap.appendChild(d);
  }
  function updateDots() {
    const activLogIdx = domOrder[center];
    dotsWrap.querySelectorAll('.carousel-dot')
      .forEach((d, i) => d.classList.toggle('active', i === activLogIdx));
  }

  /* ── goBy(delta) ──
   *
   * delta = -1 → next (slide in from right, track moves left)
   * delta = +1 → prev (slide in from left,  track moves right)
   *
   * Step 1: Instantly pre-position track by +delta slots.
   *         This makes the track look like it already moved,
   *         but since we haven't animated yet, user sees nothing.
   * Step 2: Rotate domOrder. Move the DOM node that is now
   *         logically "off screen" to the opposite end.
   *         After this, domOrder[center] is still the OLD active —
   *         we haven't changed center yet.
   * Step 3: void reflow to commit step 1+2 in same frame.
   *         Re-apply same transform (no visual change).
   * Step 4: Rotate domOrder by delta so the NEW slide lands at center.
   *         Update markActive + dots.
   * Step 5: Animate track back to baseX() — exactly 1 slot, always.
   */
  function goBy(delta) {
    if (transitioning) return;
    transitioning = true;

    const iw = itemW();

    /* Step 1 */
    setX(baseX() + delta * iw, false);

    /* Step 2: move off-screen node to opposite end */
    if (delta < 0) {
      // track gerak kiri → rightmost off → pindah ke kiri
      const logIdx = domOrder.pop();
      domOrder.unshift(logIdx);
      track.insertBefore(origSlides[logIdx], track.firstElementChild);
    } else {
      // track gerak kanan → leftmost off → pindah ke kanan
      const logIdx = domOrder.shift();
      domOrder.push(logIdx);
      track.appendChild(origSlides[logIdx]);
    }

    /* Step 3: flush */
    void track.offsetWidth;
    setX(baseX() + delta * iw, false);

    /* Step 4: update active */
    markActive();
    updateDots();

    /* Step 5: animate to center */
    void track.offsetWidth;
    setX(baseX(), true);

    setTimeout(() => { transitioning = false; }, 680);
  }

  function jumpTo(logicalIdx) {
    if (transitioning) return;
    const cur = domOrder[center];
    let delta = cur - logicalIdx;
    // pick shortest path
    if (delta > N / 2) delta -= N;
    if (delta < -N / 2) delta += N;
    if (delta === 0) return;
    // For multi-step jumps, just do one step at a time
    goBy(delta > 0 ? 1 : -1);
    if (Math.abs(delta) > 1) {
      const remaining = Math.abs(delta) - 1;
      const dir = delta > 0 ? 1 : -1;
      let i = 0;
      const interval = setInterval(() => {
        goBy(dir);
        if (++i >= remaining) clearInterval(interval);
      }, 690);
    }
  }

  /* ── Buttons ── */
  document.getElementById('btnNext').addEventListener('click', () => { goBy(+1); resetAuto(); });
  document.getElementById('btnPrev').addEventListener('click', () => { goBy(-1); resetAuto(); });

  /* ── Autoplay ── */
  function startAuto() { autoTimer = setInterval(() => { if (!isHovered) goBy(+1); }, 4200); }
  function resetAuto() { clearInterval(autoTimer); startAuto(); }
  viewport.addEventListener('mouseenter', () => { isHovered = true; });
  viewport.addEventListener('mouseleave', () => { isHovered = false; });

  /* ── Drag / swipe ── */
  let dragStartX = 0, dragging = false;
  track.addEventListener('mousedown', e => {
    if (transitioning) return;
    dragging = true; dragStartX = e.clientX;
    track.classList.add('dragging');
    track.classList.remove('is-animating');
  });
  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    track.style.transform = `translateX(${baseX() + (e.clientX - dragStartX)}px)`;
  });
  document.addEventListener('mouseup', e => {
    if (!dragging) return;
    dragging = false;
    track.classList.remove('dragging');
    const dx = e.clientX - dragStartX;
    if (dx < -60) { goBy(+1); resetAuto(); }
    else if (dx > 60) { goBy(-1); resetAuto(); }
    else setX(baseX(), true);
  });
  let touchX = 0;
  track.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchX;
    if (dx < -50) { goBy(+1); resetAuto(); }
    else if (dx > 50) { goBy(-1); resetAuto(); }
    resetAuto();
  }, { passive: true });

  /* ── Mouse glow ── */
  track.addEventListener('mousemove', e => {
    origSlides.forEach(s => {
      const r = s.getBoundingClientRect();
      if (e.clientX >= r.left && e.clientX <= r.right &&
        e.clientY >= r.top && e.clientY <= r.bottom) {
        s.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
        s.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
      }
    });
  });

  /* ── Init ── */
  setX(baseX(), false);
  markActive();
  updateDots();
  startAuto();
  window.addEventListener('resize', () => { setX(baseX(), false); });

  /* ── Small projects scroll ── */
  const smallScroll = document.getElementById('smallScroll');
  if (smallScroll) {
    const sc = smallScroll.querySelector('.small-card');
    const cw = sc ? sc.offsetWidth + 14 : 234;
    document.getElementById('smallPrev')?.addEventListener('click', () =>
      smallScroll.scrollBy({ left: -cw * 2, behavior: 'smooth' }));
    document.getElementById('smallNext')?.addEventListener('click', () =>
      smallScroll.scrollBy({ left: cw * 2, behavior: 'smooth' }));
  }
})();

/* ── REVEAL on scroll ──── REVEAL on scroll ──── REVEAL on scroll ──── REVEAL on scroll ── */
const io = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target) } });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));
setTimeout(() => document.querySelectorAll('#hero .reveal').forEach(el => el.classList.add('visible')), 80);

/* OVERFLOW DIAGNOSTIC */
setTimeout(() => {
  const docW = document.documentElement.scrollWidth;
  const vpW  = window.innerWidth;
  if (docW <= vpW) { console.log('No overflow detected'); return; }
  const offenders = [];
  document.querySelectorAll('*').forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.right > vpW + 1) {
      offenders.push({ tag: el.tagName, id: el.id||'', cls:[...el.classList].join(' ').slice(0,40), right:Math.round(r.right), width:Math.round(r.width) });
    }
  });
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;bottom:0;left:0;right:0;max-height:50vh;overflow-y:auto;background:rgba(0,0,0,0.95);color:#0f0;font:11px monospace;padding:10px;z-index:99999;border-top:2px solid red';
  box.innerHTML = `<b style="color:red">OVERFLOW doc=${docW}px vp=${vpW}px (+${docW-vpW}px)</b><br><br>` +
    offenders.map(o=>`<span style="color:#ff0">${o.tag}${o.id?'#'+o.id:''} .${o.cls}</span> right:${o.right} w:${o.width}<br>`).join('');
  document.body.appendChild(box);
}, 500);
