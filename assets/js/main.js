// Mobile menu
const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav');
if (toggle && nav) {
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open);
    document.body.classList.toggle('menu-open', open);
  });
}

// Fade-in on scroll
const io = 'IntersectionObserver' in window
  ? new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 })
  : null;
document.querySelectorAll('.reveal').forEach((el) => (io ? io.observe(el) : el.classList.add('in')));

// Footer year
document.querySelectorAll('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));

// Forms: if no Formspree ID is configured yet, fall back to opening an email draft.
const CONTACT_EMAIL = 'hello@hivibessupply.com';
document.querySelectorAll('form[data-fallback]').forEach((form) => {
  form.addEventListener('submit', (e) => {
    if (!form.action.includes('YOUR_FORM_ID')) return; // real endpoint configured
    e.preventDefault();
    const data = new FormData(form);
    const lines = [];
    data.forEach((v, k) => v && lines.push(`${k}: ${v}`));
    const subject = encodeURIComponent(form.dataset.fallback);
    const body = encodeURIComponent(lines.join('\n'));
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
  });
});
