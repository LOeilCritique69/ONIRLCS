/* ==========================================================================
   data.js — Sections 3 à 10 : Store, Helpers, Lightbox, Renderers,
             View, Controller, Events, Bootstrap
   Dépend de id.js (CONFIG, STATUS_LABELS, TYPE_LABELS, TOURNAMENTS).
   ========================================================================== */

'use strict';


/* --------------------------------------------------------------------------
   3. STORE — source unique de vérité pour l'état mutable
   -------------------------------------------------------------------------- */

/**
 * Centralise l'état mutable : scores, catégorie active, tournoi actif.
 * Toute modification passe par les méthodes du Store, jamais directement.
 */
const Store = (() => {
  const _scores = _loadScores();

  // Hydrate les scores persistés dans les objets tournoi au démarrage
  TOURNAMENTS.forEach(t => {
    if (_scores[t.id]) t.score = _scores[t.id];
  });

  // Index O(1) par id
  const _index = new Map(TOURNAMENTS.map(t => [t.id, t]));

  let _category  = sessionStorage.getItem(CONFIG.SESSION_KEYS.CATEGORY)  ?? CONFIG.DEFAULT_YEAR;
  let _activeTid = sessionStorage.getItem(CONFIG.SESSION_KEYS.TOURNAMENT) ?? null;

  function _loadScores() {
    try {
      const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  function _persistScores() {
    try {
      localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(_scores));
    } catch (err) {
      console.warn('[Store] localStorage write failed:', err);
    }
  }

  return {
    /** @returns {Tournament|undefined} */
    get(id) { return _index.get(id); },

    /** @returns {Tournament[]} */
    byYear(year) { return TOURNAMENTS.filter(t => String(t.year) === String(year)); },

    getCategory()  { return _category; },
    getActiveTid() { return _activeTid; },

    setCategory(year) {
      _category = String(year);
      sessionStorage.setItem(CONFIG.SESSION_KEYS.CATEGORY, _category);
    },

    setActiveTid(id) {
      _activeTid = id;
      sessionStorage.setItem(CONFIG.SESSION_KEYS.TOURNAMENT, id);
    },

    /**
     * Valide et persiste un score pour un tournoi.
     * @param {string} id
     * @param {number} correct
     * @param {number} total
     * @returns {boolean}
     */
    setScore(id, correct, total) {
      const t = _index.get(id);
      if (!t) return false;

      const c   = Math.max(0, Math.floor(Number(correct)));
      const tot = Math.max(0, Math.floor(Number(total)));

      if (!Number.isFinite(c) || !Number.isFinite(tot)) return false;

      if (tot > 0) {
        const score = { correct: Math.min(c, tot), total: tot };
        t.score     = score;
        _scores[id] = score;
      } else {
        t.score = null;
        delete _scores[id];
      }

      _persistScores();
      return true;
    },

    /**
     * Calcule le taux global sur tous les tournois scorés.
     * @returns {{ correct: number, total: number, pct: number }|null}
     */
    globalStats() {
      let correct = 0, total = 0;
      TOURNAMENTS.forEach(t => {
        if (t.score?.total > 0) {
          correct += t.score.correct;
          total   += t.score.total;
        }
      });
      if (!total) return null;
      return { correct, total, pct: Math.round((correct / total) * 100) };
    },
  };
})();


/* --------------------------------------------------------------------------
   4. HELPERS — fonctions utilitaires pures
   -------------------------------------------------------------------------- */

/**
 * Pourcentage entier à partir d'un score.
 * @param {Score|null|undefined} score
 * @returns {number|null}
 */
function scorePercent(score) {
  if (!score?.total) return null;
  return Math.round((score.correct / score.total) * 100);
}

/**
 * Variable CSS de couleur selon le pourcentage.
 * @param {number} pct
 * @returns {string}
 */
function pctColorVar(pct) {
  if (pct >= CONFIG.SCORE_THRESHOLDS.GOOD) return 'var(--ok)';
  if (pct >= CONFIG.SCORE_THRESHOLDS.OK)   return 'var(--flash)';
  return 'var(--ko)';
}

/**
 * Échappe une chaîne pour insertion sûre dans un ATTRIBUT HTML.
 * Usage : src="${escAttr(url)}", data-foo="${escAttr(val)}"
 * @param {string} str
 * @returns {string}
 */
function escAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Échappe une chaîne pour insertion sûre en tant que CONTENU HTML.
 * Usage : <div>${escHTML(texte)}</div>
 * Contrairement à escAttr, préserve les apostrophes et guillemets lisibles.
 * @param {string} str
 * @returns {string}
 */
function escHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** @returns {string} libellé lisible du type de tournoi */
function typeLabel(type) {
  return TYPE_LABELS[type] ?? 'Autre';
}

/**
 * Résout le logo d'une équipe depuis le registre TEAMS.
 * Recherche insensible à la casse en fallback.
 * @param {string|null|undefined} name
 * @returns {string|null}
 */
function getTeamLogo(name) {
  if (!name) return null;
  if (TEAMS[name]) return TEAMS[name];
  const lower = name.toLowerCase();
  const key = Object.keys(TEAMS).find(k => k.toLowerCase() === lower);
  return key ? TEAMS[key] : null;
}


/* --------------------------------------------------------------------------
   5. LIGHTBOX
   -------------------------------------------------------------------------- */

const Lightbox = (() => {
  let _images = [];
  let _index  = 0;

  // Références DOM — lazy via getter, résolues une seule fois par l'engine
  const el = {
    get box()   { return document.getElementById('lightbox'); },
    get img()   { return document.getElementById('lightbox-img'); },
    get label() { return document.getElementById('lightbox-label'); },
    get ctr()   { return document.getElementById('lb-counter'); },
    get prev()  { return document.getElementById('lb-prev'); },
    get next()  { return document.getElementById('lb-next'); },
    get close() { return document.getElementById('lightbox-close'); },
  };

  function _render() {
    const item = _images[_index];
    if (!item || !el.img) return;

    el.img.src = item.src;   // src est une URL, escAttr non requis
    el.img.alt = item.label ?? '';
    if (el.label) el.label.textContent = item.label ?? '';
    if (el.ctr)   el.ctr.textContent   = `${_index + 1} / ${_images.length}`;

    if (el.prev) el.prev.style.opacity = _index === 0                   ? '0.3' : '1';
    if (el.next) el.next.style.opacity = _index === _images.length - 1  ? '0.3' : '1';
  }

  function open(images, index = 0) {
    if (!Array.isArray(images) || !images.length) return;
    _images = images;
    _index  = Math.max(0, Math.min(index, images.length - 1));
    _render();
    el.box?.classList.add('open');
    el.box?.removeAttribute('aria-hidden');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    el.box?.classList.remove('open');
    el.box?.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function prev() { if (_index > 0)                  { _index--; _render(); } }
  function next() { if (_index < _images.length - 1) { _index++; _render(); } }

  function init() {
    el.close?.addEventListener('click', close);
    el.prev?.addEventListener('click',  prev);
    el.next?.addEventListener('click',  next);

    el.box?.addEventListener('click', e => { if (e.target === el.box) close(); });

    document.addEventListener('keydown', e => {
      if (!el.box?.classList.contains('open')) return;
      switch (e.key) {
        case 'Escape':     close(); break;
        case 'ArrowLeft':  prev();  break;
        case 'ArrowRight': next();  break;
      }
    });
  }

  return { open, close, init };
})();


/* --------------------------------------------------------------------------
   6. RENDERERS — fonctions pures retournant des chaînes HTML
   -------------------------------------------------------------------------- */

// Registre images par clé de phase — évite JSON.parse à chaque clic
const _galleryRegistry = new Map();

const Renderers = {

  /**
   * Widget de score (lecture ou édition).
   * @param {Tournament} t
   * @param {boolean} editing
   * @returns {string}
   */
  scoreWidget(t, editing = false) {
    const { id, score, status } = t;

    if (editing) {
      const c   = score?.correct ?? 0;
      const tot = score?.total   ?? 0;
      return `
        <div class="score-widget" data-tid="${escAttr(id)}">
          <div class="sw-input-row">
            <input type="number" class="si-c" value="${c}"   min="0" max="999" inputmode="numeric" aria-label="Prédictions correctes">
            <span class="slash" aria-hidden="true">/</span>
            <input type="number" class="si-t" value="${tot}" min="0" max="999" inputmode="numeric" aria-label="Total prédictions">
            <button class="sw-ok"     data-action="save-score"   aria-label="Enregistrer">OK</button>
            <button class="sw-cancel" data-action="cancel-score" aria-label="Annuler">✕</button>
          </div>
        </div>`;
    }

    if (!score) {
      if (status === 'upcoming') {
        return `<div class="score-widget" data-tid="${escAttr(id)}"><div class="sw-empty">À venir</div></div>`;
      }
      const label = status === 'ongoing' ? 'En cours' : 'Score non saisi';
      return `
        <div class="score-widget" data-tid="${escAttr(id)}">
          <div class="sw-empty">${label}</div>
          <button class="sw-edit" data-action="edit-score">saisir mon score</button>
        </div>`;
    }

    const pct   = scorePercent(score);
    const color = pctColorVar(pct);

    return `
      <div class="score-widget" data-tid="${escAttr(id)}">
        <div class="sw-fraction" style="color:${color}">
          ${score.correct}<span class="sw-denom">/${score.total}</span>
        </div>
        <div class="sw-pct" style="color:${color}">${pct}%</div>
        <div class="sw-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
          <div class="sw-bar-fill" style="width:${pct}%;background:${color}"></div>
        </div>
      </div>`;
  },

  /**
   * Ligne de champion prédit / réel.
   * @param {Champion} ch
   * @returns {string}
   */
  champion(ch) {
    if (!ch?.pred) return '';

    const status = !ch.result
      ? 'unknown'
      : ch.pred === ch.result ? 'correct' : 'wrong';

    const predLogoSrc   = getTeamLogo(ch.pred);
    const resultLogoSrc = getTeamLogo(ch.result);
    const predLogo   = predLogoSrc   ? `<img src="${escAttr(predLogoSrc)}"   class="champ-team-logo" alt="" loading="lazy">` : '';
    const resultLogo = resultLogoSrc ? `<img src="${escAttr(resultLogoSrc)}" class="champ-team-logo" alt="" loading="lazy">` : '';

    const resultHTML = ch.result ? `
      <div class="champ-real">
        → réel :
        <span class="champ-identity">${resultLogo}${ch.result}</span>
      </div>` : '';

    return `
      <div class="champion-row">
        <div class="champ-dot ${status}" aria-label="Prédiction ${status}"></div>
        <div class="champ-team-wrap">
          <div class="champ-label">Champion prédit</div>
          <div class="champ-identity">${predLogo}<span class="champ-name">${ch.pred}</span></div>
        </div>
        ${resultHTML}
      </div>`;
  },

  /**
   * Note éditoriale sur une image de galerie.
   * @param {string|undefined} note
   * @returns {string}
   */
  imageNote(note) {
    if (!note) return '';
    return `
      <div class="gc-note" role="note">
        <span class="gc-note-icon" aria-hidden="true">📌</span>
        ${escHTML(note)}
      </div>`;
  },

  /**
   * Galerie d'images pour une phase donnée.
   * @param {Phase} phase
   * @param {Tournament} t
   * @returns {string}
   */
  gallery(phase, t) {
    const imgs = phase.imgs ?? [];
    let html = '';

    if (phase.desc) {
      html += `<div class="phase-description">${escHTML(phase.desc)}</div>`;
    }

    if (!imgs.length) {
      return html + `
        <div class="gallery-grid">
          <div class="gallery-card no-img" role="presentation">
            <div class="no-img-icon" aria-hidden="true">📷</div>
            <div class="no-img-label">Aucune image disponible</div>
          </div>
        </div>`;
    }

    const registryKey = `${t.id}::${phase.id}`;
    _galleryRegistry.set(registryKey, imgs);

    const badge = t.status === 'ongoing'
      ? `<div class="results-badge rb-ongoing">En cours</div>`
      : `<div class="results-badge rb-correct">Terminé</div>`;

    const cards = imgs.map((img, i) => `
      <button type="button" class="gallery-card${img.note ? ' has-note' : ''}"
              data-gallery-key="${escAttr(registryKey)}"
              data-index="${i}"
              aria-label="Agrandir : ${escAttr(img.label ?? '')}">
        <img src="${escAttr(img.src)}" alt="${escAttr(img.label ?? '')}" loading="lazy">
        <div class="gc-label">${escHTML(img.label ?? '')}</div>
        ${this.imageNote(img.note)}
        ${badge}
        <div class="gc-overlay" aria-hidden="true"><div class="gc-zoom-icon">⤢</div></div>
      </button>`).join('');

    return html + `<div class="gallery-grid">${cards}</div>`;
  },

  /**
   * Page complète d'un tournoi.
   * @param {Tournament} t
   * @returns {string}
   */
  tournament(t) {
    const isUpcoming = t.status === 'upcoming';

    const tabs = t.phases.map((ph, i) => `
      <button class="phase-tab${i === 0 ? ' active' : ''}"
              data-tid="${escAttr(t.id)}"
              data-phid="${escAttr(ph.id)}"
              role="tab"
              aria-selected="${i === 0}"
              aria-controls="panel-${escAttr(t.id)}-${escAttr(ph.id)}">
        ${ph.label}
      </button>`).join('');

    const panels = t.phases.map((ph, i) => `
      <div class="phase-panel${i === 0 ? ' active' : ''}"
           id="panel-${escAttr(t.id)}-${escAttr(ph.id)}"
           role="tabpanel">
        <div class="gallery-section">
          <div class="gallery-section-title">Détails &amp; Prédictions</div>
          ${this.gallery(ph, t)}
        </div>
      </div>`).join('');

    return `
      <div class="tournament-page" id="page-${escAttr(t.id)}" data-year="${t.year}" data-type="${escAttr(t.type)}">

        <div class="t-top">
          <div class="t-banner">
            <img src="${escAttr(t.logo)}" class="t-header-logo" alt="Logo ${escAttr(t.name)}">
          </div>

          <div class="t-info-bar">
            <div class="t-title-wrap">
              <div class="t-title">${escHTML(t.name)}</div>
              <div class="t-meta-row">
                <div class="t-meta">${escHTML(t.date)}</div>
                <div class="tournament-type">${typeLabel(t.type)}</div>
                <div class="status-pill ${escAttr(t.status)}" aria-label="Statut : ${escAttr(STATUS_LABELS[t.status] ?? t.status)}">
                  <div class="dot" aria-hidden="true"></div>${STATUS_LABELS[t.status] ?? t.status}
                </div>
              </div>
              ${!isUpcoming ? this.champion(t.champion) : ''}
            </div>
            ${!isUpcoming ? `<div id="sw-${escAttr(t.id)}">${this.scoreWidget(t)}</div>` : ''}
          </div>
        </div>

        ${t.description ?? ''}

        <div class="phase-tabs" role="tablist">${tabs}</div>
        ${panels}
      </div>`;
  },
};

// Alias de compatibilité — permet à View.refreshScoreWidget d'appeler
// renderScoreWidget(t) sans avoir à être modifié.
const renderScoreWidget = (t, editing) => Renderers.scoreWidget(t, editing);


/* --------------------------------------------------------------------------
   7. VIEW — couche de manipulation DOM
   -------------------------------------------------------------------------- */

const View = (() => {
  const $ = id => document.getElementById(id);

  return {

    buildNav() {
      const nav = $('main-nav');
      if (!nav) return;

      const fragment = document.createDocumentFragment();
      Store.byYear(Store.getCategory()).forEach(t => {
        const pct    = scorePercent(t.score);
        const active = t.id === Store.getActiveTid();

        const btn       = document.createElement('button');
        btn.className   = `nav-btn${active ? ' active' : ''}`;
        btn.dataset.tid = t.id;

        const logoEl     = document.createElement('img');
        logoEl.src       = t.logo;
        logoEl.className = 'nav-logo';
        logoEl.alt       = '';

        const textEl           = document.createElement('span');
        textEl.className       = 'nav-btn-text';
        textEl.textContent     = t.name;

        btn.append(logoEl, textEl);

        if (pct !== null) {
          const pctEl           = document.createElement('span');
          pctEl.className       = 'nav-pct';
          pctEl.textContent     = `${pct}%`;
          btn.appendChild(pctEl);
        }

        if (t.status === 'ongoing') {
          const dot = document.createElement('span');
          dot.className = 'nav-live';
          dot.setAttribute('aria-label', 'En cours');
          btn.appendChild(dot);
        }

        fragment.appendChild(btn);
      });

      nav.replaceChildren(fragment);
    },

    buildGlobalStats() {
      const el = $('global-stats');
      if (!el) return;

      const stats = Store.globalStats();
      if (!stats) { el.replaceChildren(); return; }

      const color = pctColorVar(stats.pct);
      el.innerHTML = `
        <div class="hstat">
          <div class="val" style="color:${color}">${stats.pct}%</div>
          <div class="lbl">Global</div>
        </div>
        <div class="hstat">
          <div class="val">
            ${stats.correct}<span style="font-size:1.2rem;color:rgba(242,239,232,0.35)">/${stats.total}</span>
          </div>
          <div class="lbl">Prédictions</div>
        </div>`;
    },

    refreshScoreWidget(tid) {
      const t  = Store.get(tid);
      const el = $(`sw-${tid}`);
      if (!t || !el) return;
      el.innerHTML = renderScoreWidget(t);
    },

    switchTournament(id) {
      document.querySelector('.tournament-page.active')?.classList.remove('active');
      document.getElementById(`page-${id}`)?.classList.add('active');
      document.querySelector('.nav-btn.active')?.classList.remove('active');
      document.querySelector(`.nav-btn[data-tid="${CSS.escape(id)}"]`)?.classList.add('active');
    },

    switchCategory(year) {
      const yearStr = String(year);
      document.querySelectorAll('.category-btn').forEach(b => {
        const isActive = b.dataset.category === yearStr;
        b.classList.toggle('active', isActive);
        b.setAttribute('aria-pressed', String(isActive));
      });
      document.querySelectorAll('.category-section').forEach(s =>
        s.classList.toggle('active', s.id === `category-${yearStr}`));
    },

    switchPhase(tid, phid) {
      const root = document.getElementById(`page-${tid}`);
      if (!root) return;

      root.querySelectorAll('.phase-tab').forEach(b => {
        const isTarget = b.dataset.phid === phid;
        b.classList.toggle('active', isTarget);
        b.setAttribute('aria-selected', String(isTarget));
      });
      root.querySelectorAll('.phase-panel').forEach(p =>
        p.classList.toggle('active', p.id === `panel-${tid}-${phid}`));
    },

    mount() {
      const main = document.getElementById('main-content');
      if (!main) return;

      const years = [...new Set(TOURNAMENTS.map(t => String(t.year)))];
      const cat   = Store.getCategory();

      main.innerHTML = years.map(year => `
        <section class="category-section${year === cat ? ' active' : ''}" id="category-${year}">
          <h2 class="category-title">${year}</h2>
          <div class="category-content">
            ${Store.byYear(year).map(t => Renderers.tournament(t)).join('')}
          </div>
        </section>`).join('');

      document.querySelectorAll('.category-btn').forEach(b => {
        const isActive = b.dataset.category === cat;
        b.classList.toggle('active', isActive);
        b.setAttribute('aria-pressed', String(isActive));
      });
    },
  };
})();


/* --------------------------------------------------------------------------
   8. CONTROLLER — orchestre Store ↔ View
   -------------------------------------------------------------------------- */

const Controller = {

  selectTournament(id) {
    if (!Store.get(id)) return;
    Store.setActiveTid(id);
    View.switchTournament(id);
  },

  selectCategory(year) {
    Store.setCategory(year);
    View.switchCategory(year);
    View.buildNav();

    const saved     = Store.getActiveTid();
    const inYear    = Store.byYear(year);
    const candidate = inYear.find(t => t.id === saved) ?? inYear[0];
    if (candidate) this.selectTournament(candidate.id);
  },

  editScore(tid) {
    const t  = Store.get(tid);
    const el = document.getElementById(`sw-${tid}`);
    if (!t || !el) return;
    el.innerHTML = Renderers.scoreWidget(t, true);
    el.querySelector('.si-c')?.focus();
  },

  cancelScore(tid) {
    View.refreshScoreWidget(tid);
  },

  saveScore(tid) {
    const widget = document.getElementById(`sw-${tid}`)?.querySelector('.score-widget');
    if (!widget) return;

    const c   = Number(widget.querySelector('.si-c')?.value);
    const tot = Number(widget.querySelector('.si-t')?.value);
    if (!Number.isFinite(c) || !Number.isFinite(tot)) return;

    Store.setScore(tid, c, tot);
    View.refreshScoreWidget(tid);
    View.buildNav();
    View.buildGlobalStats();
  },
};


/* --------------------------------------------------------------------------
   9. DÉLÉGATION D'ÉVÉNEMENTS
   -------------------------------------------------------------------------- */

function initEventDelegation() {
  document.addEventListener('click', e => {

    const categoryBtn = e.target.closest('.category-btn');
    if (categoryBtn) { Controller.selectCategory(categoryBtn.dataset.category); return; }

    const navBtn = e.target.closest('.nav-btn');
    if (navBtn?.dataset.tid) { Controller.selectTournament(navBtn.dataset.tid); return; }

    const phaseTab = e.target.closest('.phase-tab');
    if (phaseTab) { View.switchPhase(phaseTab.dataset.tid, phaseTab.dataset.phid); return; }

    // Gallery card — résolution depuis le registre, pas de JSON decode
    const card = e.target.closest('.gallery-card:not(.no-img)');
    if (card) {
      const images = _galleryRegistry.get(card.dataset.galleryKey);
      if (images?.length) Lightbox.open(images, parseInt(card.dataset.index, 10) || 0);
      return;
    }

    const actionBtn = e.target.closest('[data-action]');
    if (actionBtn) {
      const tid = e.target.closest('.score-widget')?.dataset.tid
               ?? actionBtn.closest('[id^="sw-"]')?.id.replace(/^sw-/, '');
      if (!tid) return;

      switch (actionBtn.dataset.action) {
        case 'edit-score':   Controller.editScore(tid);   break;
        case 'cancel-score': Controller.cancelScore(tid); break;
        case 'save-score':   Controller.saveScore(tid);   break;
      }
    }
  });
}


/* --------------------------------------------------------------------------
   10. BOOTSTRAP
   -------------------------------------------------------------------------- */

function initApp() {
  View.mount();
  View.buildNav();
  View.buildGlobalStats();
  Lightbox.init();
  initEventDelegation();

  const saved  = Store.getActiveTid();
  const cat    = Store.getCategory();
  const inYear = Store.byYear(cat);
  const target = (saved && inYear.find(t => t.id === saved)) ? saved : inYear[0]?.id;
  if (target) Controller.selectTournament(target);
}

initApp();