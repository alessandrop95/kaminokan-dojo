/* Kami No Kan Dojo — comportamento del sito (nessuna dipendenza esterna) */
(() => {
  const root = document.querySelector('.knk');
  if (!root) return;
  const doc = document.documentElement;
  const $ = (sel, ctx = root) => ctx.querySelector(sel);
  const $$ = (sel, ctx = root) => Array.from(ctx.querySelectorAll(sel));

  /* ---------- scorrimento: comparse, parallasse, portale, barra, navigazione ---------- */
  const nav = $('.nav');
  const bar = $('.progress');
  const pxEls = $$('[data-px]');
  const pinEls = $$('[data-pin]');
  let pending = $$('[data-rv]');
  let lastY = window.scrollY;
  let raf = 0;
  let menuOpen = false;

  function frame() {
    raf = 0;
    const vh = window.innerHeight;
    const y = window.scrollY;
    const max = doc.scrollHeight - vh;
    const still = max < 8; // pagina che non scorre: tutto visibile, niente parallasse
    root.classList.toggle('is-static', still);

    if (pending.length) {
      pending = pending.filter((el) => {
        if (!still && el.getBoundingClientRect().top >= vh * 0.9) return true;
        el.classList.add('in');
        return false;
      });
    }
    for (const el of pxEls) {
      const r = el.parentElement.getBoundingClientRect();
      if (r.bottom < -300 || r.top > vh + 300) continue;
      const d = still ? 0 : (r.top + r.height / 2 - vh / 2) * parseFloat(el.dataset.px);
      el.style.setProperty('--py', d.toFixed(1) + 'px');
    }
    for (const el of pinEls) {
      const r = el.getBoundingClientRect();
      const p = still ? 1 : Math.max(0, Math.min(1, -r.top / Math.max(1, r.height - vh)));
      el.style.setProperty('--p', p.toFixed(4));
    }
    if (bar) bar.style.setProperty('--prog', still ? 0 : Math.min(1, y / max).toFixed(4));
    if (nav) {
      nav.classList.toggle('is-solid', y > 40);
      if (y !== lastY) nav.classList.toggle('is-hidden', !menuOpen && y > lastY && y > 600);
    }
    lastY = y;
  }
  const ask = () => { if (!raf) raf = requestAnimationFrame(frame); };
  window.addEventListener('scroll', ask, { passive: true });
  window.addEventListener('resize', ask);
  window.addEventListener('load', ask);
  root.classList.add('is-live');
  ask();

  /* ---------- menu mobile ---------- */
  const burger = $('.burger');
  const menu = $('.menu');
  function setMenu(open) {
    menuOpen = open;
    nav.classList.toggle('is-open', open);
    menu.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Chiudi il menu' : 'Apri il menu');
    doc.classList.toggle('no-scroll', open);
    if (open) nav.classList.remove('is-hidden');
  }
  if (burger && menu) {
    burger.addEventListener('click', () => setMenu(!menuOpen));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
    window.matchMedia('(min-width: 1281px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });
  }

  /* ---------- hero della home: il drago segue il puntatore ---------- */
  const hero = $('.hero');
  if (hero) {
    if (window.matchMedia('(pointer: fine)').matches) {
      hero.addEventListener('pointermove', (e) => {
        const r = hero.getBoundingClientRect();
        hero.style.setProperty('--mx', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
        hero.style.setProperty('--my', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
      });
    }
    // l'intro con le porte shoji si vede una sola volta per visita
    try { sessionStorage.setItem('knk-intro', '1'); } catch (e) { /* archiviazione non disponibile */ }
  }

  /* ---------- Bushido: le sette virtù si alternano e si scelgono con un clic ---------- */
  const stage = $('.stage');
  if (stage) {
    const glyphs = $$('.glyph', stage);
    const virtues = $$('.virtue');
    const prog = $('.stage__prog', stage);
    let current = 0;
    let beat = 0;
    let timer = 0;
    const show = (i) => {
      current = i;
      glyphs.forEach((g, n) => g.classList.toggle('is-active', n === i));
      virtues.forEach((v, n) => {
        v.classList.toggle('is-active', n === i);
        v.setAttribute('aria-expanded', String(n === i));
      });
      beat += 1; // alternare .a e .b fa ripartire l'anello di avanzamento
      prog.classList.toggle('a', beat % 2 === 0);
      prog.classList.toggle('b', beat % 2 === 1);
    };
    const start = () => {
      clearInterval(timer);
      timer = setInterval(() => show((current + 1) % glyphs.length), 5200);
    };
    virtues.forEach((v, n) => v.addEventListener('click', () => { show(n); start(); }));
    show(0);
    start();
  }

  /* ---------- testo che si apre (Katsugen Undo) ---------- */
  $$('[data-fold-toggle]').forEach((btn) => {
    const fold = btn.parentElement.querySelector('.fold');
    const label = btn.querySelector('span');
    const closed = label.textContent;
    btn.addEventListener('click', () => {
      const open = !fold.classList.contains('is-open');
      fold.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
      label.textContent = open ? 'Chiudi il testo' : closed;
    });
  });

  /* ---------- galleria: filtri e foto ingrandita ---------- */
  const grid = $('.masonry');
  const box = $('.lightbox');
  if (grid && box) {
    const shots = $$('.shot', grid);
    const chips = $$('.chip');
    const img = $('[data-lb="img"]', box);
    const cap = $('[data-lb="cap"]', box);
    let visible = shots;
    let index = -1;
    let opener = null;

    chips.forEach((chip) => chip.addEventListener('click', () => {
      const f = chip.dataset.filter;
      chips.forEach((c) => {
        c.classList.toggle('is-on', c === chip);
        c.setAttribute('aria-pressed', String(c === chip));
      });
      shots.forEach((s) => { s.hidden = f !== 'all' && s.dataset.cat !== f; });
      visible = shots.filter((s) => !s.hidden);
      grid.classList.toggle('a');
      grid.classList.toggle('b');
      ask();
    }));

    const paint = () => {
      const shot = visible[index];
      const pic = shot.querySelector('img');
      img.src = pic.currentSrc || pic.src;
      img.alt = pic.alt;
      cap.textContent = pic.alt + ' · ' + (index + 1) + ' / ' + visible.length;
    };
    const open = (i, from) => {
      index = i;
      opener = from;
      paint();
      box.classList.add('is-open');
      doc.classList.add('no-scroll');
      $('[data-lb="close"]', box).focus();
    };
    const close = () => {
      box.classList.remove('is-open');
      doc.classList.remove('no-scroll');
      index = -1;
      if (opener) opener.focus();
    };
    const step = (d) => { index = (index + d + visible.length) % visible.length; paint(); };

    shots.forEach((s) => s.addEventListener('click', () => open(visible.indexOf(s), s)));
    $('[data-lb="close"]', box).addEventListener('click', close);
    $('[data-lb="prev"]', box).addEventListener('click', () => step(-1));
    $('[data-lb="next"]', box).addEventListener('click', () => step(1));
    box.addEventListener('click', (e) => { if (e.target === box) close(); });
    window.addEventListener('keydown', (e) => {
      if (index < 0) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    });
  }

  /* ---------- tasto Esc: chiude il menu ---------- */
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menuOpen) { setMenu(false); burger.focus(); }
  });

  /* ---------- modulo contatti: apre il programma di posta con il messaggio già scritto ---------- */
  const form = $('form.form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const disciplina = data.get('disciplina');
      const subject = 'Richiesta informazioni dal sito' + (disciplina ? ' — ' + disciplina : '');
      const body = [data.get('messaggio') || '', '', data.get('nome'), data.get('email')].join('\n');
      window.location.href = form.getAttribute('action')
        + '?subject=' + encodeURIComponent(subject)
        + '&body=' + encodeURIComponent(body);
      const ok = $('.form__ok', form);
      if (ok) ok.hidden = false;
    });
  }
})();
