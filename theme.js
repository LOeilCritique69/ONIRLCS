/* theme.js — réglages d'affichage d'OniRLCS
   Thème clair / sombre / auto, encre d'accent, taille du texte, grain,
   animations, raccourcis clavier. Indépendant de data.js : il ne touche
   qu'aux attributs de <html> et au panneau #prefs. */
(() => {
  'use strict';

  const KEY = 'onirlcs:prefs';
  const DEFAULTS = { theme: 'auto', accent: 'ocean', size: 'm', grain: false, motion: true };
  const RAIL = {            // couleur du bandeau, pour la barre du navigateur mobile
    ocean: { light: '#1d3b4f', dark: '#1f4257' },
    plum:  { light: '#3e2447', dark: '#4a2b55' },
    moss:  { light: '#233d2b', dark: '#2c4a34' },
  };

  const root = document.documentElement;
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  let prefs = load();

  function load() {
    try {
      const p = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
      p.accent = ({ blue: 'ocean', violet: 'plum', teal: 'moss' })[p.accent] || p.accent;
      if (!RAIL[p.accent]) p.accent = 'ocean';
      return p;
    } catch { return { ...DEFAULTS }; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* stockage indisponible */ }
  }
  const resolvedTheme = () => (prefs.theme === 'auto' ? (mq.matches ? 'dark' : 'light') : prefs.theme);

  /* ---- Application des réglages ---- */
  function apply() {
    const theme = resolvedTheme();
    root.dataset.theme = theme;
    root.dataset.accent = prefs.accent;
    root.dataset.size = prefs.size;
    root.dataset.grain = prefs.grain ? 'on' : 'off';
    root.dataset.motion = prefs.motion ? 'on' : 'off';

    const meta = $('meta[name="theme-color"]');
    if (meta) meta.content = (RAIL[prefs.accent] || RAIL.ocean)[theme];

    $$('[data-theme-quick]').forEach(b =>
      b.setAttribute('aria-label', theme === 'dark' ? 'Passer en thème clair' : 'Passer en thème sombre'));

    // synchroniser les contrôles du panneau
    ['theme', 'accent', 'size'].forEach(name => {
      const input = $(`input[name="${name}"][value="${prefs[name]}"]`);
      if (input) input.checked = true;
    });
    const grain = $('input[name="grain"]');  if (grain)  grain.checked  = prefs.grain;
    const motion = $('input[name="motion"]'); if (motion) motion.checked = prefs.motion;
  }

  function set(patch) {
    prefs = { ...prefs, ...patch };
    save();
    apply();
  }

  const quickToggle = () => set({ theme: resolvedTheme() === 'dark' ? 'light' : 'dark' });

  /* ---- Panneau ---- */
  const panel = $('#prefs');
  const triggers = $$('[data-prefs-open]');
  let lastTrigger = null;

  const isOpen = () => panel && !panel.hidden;

  function openPanel(trigger) {
    if (!panel) return;
    lastTrigger = trigger || lastTrigger;
    panel.hidden = false;
    triggers.forEach(t => t.setAttribute('aria-expanded', 'true'));
    const first = $('input[name="theme"]:checked', panel) || $('input', panel);
    if (first) first.focus();
  }
  function closePanel(returnFocus = true) {
    if (!isOpen()) return;
    panel.hidden = true;
    triggers.forEach(t => t.setAttribute('aria-expanded', 'false'));
    if (returnFocus && lastTrigger && lastTrigger.offsetParent !== null) lastTrigger.focus();
  }

  triggers.forEach(t => t.addEventListener('click', () => (isOpen() ? closePanel() : openPanel(t))));
  $$('[data-theme-quick]').forEach(b => b.addEventListener('click', quickToggle));

  if (panel) {
    $('#prefs-close').addEventListener('click', () => closePanel());
    $('#prefs-reset').addEventListener('click', () => set({ ...DEFAULTS }));

    panel.addEventListener('change', e => {
      const { name, value, checked, type } = e.target;
      if (!name) return;
      if (type === 'checkbox') set({ [name]: checked });
      else set({ [name]: value });
    });

    // clic en dehors → fermeture
    document.addEventListener('pointerdown', e => {
      if (!isOpen()) return;
      if (panel.contains(e.target) || e.target.closest('[data-prefs-open]')) return;
      closePanel(false);
    });
  }

  /* ---- Raccourcis clavier ---- */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && isOpen()) { closePanel(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    const t = e.target;
    const typing = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) && t.type !== 'radio' && t.type !== 'checkbox';
    if (typing) return;
    if ($('#viewer.is-open') || $('.modal.is-open')) return;

    if (e.key === '/') {
      const search = $('#event-search');
      if (!search) return;
      e.preventDefault();
      const bar = $('.mobile-bar'), rail = $('#rail');
      if (bar && getComputedStyle(bar).display !== 'none' && rail && !rail.classList.contains('is-open')) {
        $('#mobile-toggle')?.click();   // ouvre le tiroir sur mobile
      }
      closePanel(false);
      search.focus();
    } else if (e.key === 't' || e.key === 'T') {
      quickToggle();
    } else if (e.key === ',') {
      e.preventDefault();
      isOpen() ? closePanel() : openPanel($('[data-prefs-open]'));
    }
  });

  // En mode auto, suivre le système en direct
  mq.addEventListener('change', () => { if (prefs.theme === 'auto') apply(); });

  apply();
})();