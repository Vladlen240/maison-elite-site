(() => {
  const root = document.documentElement;

  // Fade the "Scroll down" arrow out over the first 100px of scrolling.
  const FADE_PX = 100;
  const fade = () => {
    root.style.setProperty('--scroll-hint', Math.max(0, 1 - scrollY / FADE_PX).toFixed(3));
    root.toggleAttribute('data-top', scrollY < 50);
    benefits();
    portfolioTitle();
  };

  // Portfolio title: gold while approaching, dims to the background tone once the block is half in view.
  const portfolioTitle = () => {
    const el = document.querySelector('.framer-navutq');
    if (!el) return;
    const r = el.getBoundingClientRect();
    const visible = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0));
    root.toggleAttribute('data-portfolio-dim', r.height > 0 && visible / r.height >= 0.5);
  };

  // Benefits: when the block is half in view, (01) slides in, then (02); both reset once it leaves.
  const benefits = () => {
    const el = document.getElementById('benefits');
    if (!el) return;
    const r = el.getBoundingClientRect();
    const visible = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0));
    const ratio = r.height ? visible / r.height : 0;
    if (ratio >= 0.5) root.setAttribute('data-benefits', '');
    else if (visible === 0) root.removeAttribute('data-benefits');
  };
  addEventListener('scroll', fade, { passive: true });
  addEventListener('load', fade);
  fade();

  // Contact form: send requests to the inbox through FormSubmit.co instead of Framer's form API, which
  // a site hosted outside Framer can't rely on. Framer still drives the button states and the "Thank you" popup.
  const FORM_INBOX = 'vladlenbordugov@gmail.com';
  // Framer's hidden anti-spam fields: a bot fills them, a person never sees them
  const HONEYPOTS = ['website', 'company', 'message', 'subject', 'title', 'description', 'feedback', 'notes', 'details', 'remarks', 'comments'];
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input && input.url;
    if (!/api\.framer\.com\/forms\//.test(url || '') || !(init && init.body instanceof FormData)) return nativeFetch(input, init);
    const data = {};
    let spam = false;
    init.body.forEach((v, k) => {
      if (typeof v !== 'string' || !v.trim()) return;
      if (HONEYPOTS.includes(k)) spam = true;
      else data[k] = v.trim();
    });
    if (spam) return new Response('{}', { status: 200 });
    data._subject = 'New request from the MAISON ÉLITE website';
    data._template = 'table';
    data._captcha = 'false';
    if (data['E-MAIL']) data._replyto = data['E-MAIL'];
    try {
      const res = await nativeFetch(`https://formsubmit.co/ajax/${FORM_INBOX}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && String(json.success) === 'true') return new Response('{}', { status: 200 });
      // Framer shows its error state for a non-ok response with { error: { message } }
      return new Response(JSON.stringify({ error: { message: json.message || 'Form submission failed' } }), { status: 400 });
    } catch (err) {
      return new Response(JSON.stringify({ error: { message: String(err) } }), { status: 502 });
    }
  };

  // "Discuss the projects" button scrolls to the contact form section.
  // Native smooth scrolling is swallowed by Framer's Lenis, so the scroll is animated frame by frame.
  const smoothScrollTo = (top, duration = 1200) => {
    const from = scrollY, dist = top - from, t0 = performance.now();
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const step = (now) => {
      const t = Math.min(1, (now - t0) / duration);
      scrollTo(0, from + dist * ease(t));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.framer-GQaEC')) return;
    const form = document.querySelector('[data-framer-name="Форма"]');
    if (!form) return;
    e.preventDefault();
    smoothScrollTo(form.getBoundingClientRect().top + scrollY);
  });

  // Desktop sections are laid out at the 1440px Figma width and scaled to the window (see custom.css).
  // Tablets reuse the 375px phone layout scaled the same way (--t).
  const zoom = () => {
    root.style.setProperty('--z', (root.clientWidth / 1440).toFixed(5));
    root.style.setProperty('--t', (root.clientWidth / 375).toFixed(5));
    // the first screen has to fit the 375x700 phone frame into the viewport both ways
    root.style.setProperty('--tf', Math.min(root.clientWidth / 375, innerHeight / 700).toFixed(5));
  };
  addEventListener('resize', zoom);
  zoom();
})();
