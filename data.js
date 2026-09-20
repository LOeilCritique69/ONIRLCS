/* ==========================================================================
   app.js (data.js) — Moteur de l'application OniRLCS.
   Dépend de id.js (APP, STATUS_TEXT, KIND_TEXT, TEAM_LOGOS, EVENTS).

   Sommaire :
     1. State    — source de vérité (tallies, saison/événement actifs)
     2. Utils    — fonctions pures
     3. Viewer   — visionneuse plein écran (ex-lightbox)
     4. Blocks   — gabarits HTML (fonctions pures → chaînes)
     5. Screen   — écriture DOM
     6. Actions  — orchestration State ↔ Screen
     7. wireEvents — délégation d'événements
     8. boot     — démarrage
   ========================================================================== */

'use strict';


/* --------------------------------------------------------------------------
   1. STATE
   -------------------------------------------------------------------------- */

const State = (() => {
  const byId = new Map(EVENTS.map(e => [e.id, e]));
  const saved = readTallies();

  EVENTS.forEach(e => { if (saved[e.id]) e.tally = saved[e.id]; });

  let season  = sessionStorage.getItem(APP.SESSION.SEASON) ?? APP.START_SEASON;
  let current = sessionStorage.getItem(APP.SESSION.EVENT)  ?? null;

  function readTallies() {
    try {
      const raw = localStorage.getItem(APP.DB_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  function writeTallies(all) {
    try {
      localStorage.setItem(APP.DB_KEY, JSON.stringify(all));
    } catch (err) {
      console.warn('[State] écriture localStorage impossible :', err);
    }
  }

  return {
    find(id) { return byId.get(id); },

    inSeason(season) { return EVENTS.filter(e => String(e.season) === String(season)); },

    seasons() { return [...new Set(EVENTS.map(e => String(e.season)))]; },

    season()        { return season; },
    current()        { return current; },

    setSeason(value) {
      season = String(value);
      sessionStorage.setItem(APP.SESSION.SEASON, season);
    },

    setCurrent(id) {
      current = id;
      sessionStorage.setItem(APP.SESSION.EVENT, id);
      try { localStorage.setItem(APP.LOCAL.LAST_EVENT, id); } catch {}
    },

    /** Dernier événement consulté, y compris hors de la session en cours (onglet fermé, cache vidé…). */
    lastKnownEvent() {
      try { return localStorage.getItem(APP.LOCAL.LAST_EVENT); } catch { return null; }
    },

    recordTally(id, hit, of) {
      const ev = byId.get(id);
      if (!ev) return false;

      const h = Math.max(0, Math.floor(Number(hit)));
      const o = Math.max(0, Math.floor(Number(of)));
      if (!Number.isFinite(h) || !Number.isFinite(o)) return false;

      const all = readTallies();

      if (o > 0) {
        const tally = { hit: Math.min(h, o), of: o };
        ev.tally  = tally;
        all[id]   = tally;
      } else {
        ev.tally = null;
        delete all[id];
      }

      writeTallies(all);
      return true;
    },

    /**
     * Total général. N'agrège que les événements du circuit RLCS officiel
     * (canon !== false) : un tournoi hors-circuit (EWC, FIFAe…) n'entre
     * pas dans le calcul du pourcentage global.
     */
    grandTotal() {
      let hit = 0, of = 0;
      EVENTS.forEach(e => {
        if (e.canon === false) return;
        if (e.tally?.of > 0) { hit += e.tally.hit; of += e.tally.of; }
      });
      if (!of) return null;
      return { hit, of, pct: Math.round((hit / of) * 100) };
    },
  };
})();


/* --------------------------------------------------------------------------
   1bis. ROUTER — routes en #/..., pour des liens partageables et un vrai
         retour arrière navigateur. Source de vérité : location.hash.
   -------------------------------------------------------------------------- */

const Router = (() => {

  function parseHash() {
    const raw = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
    const parts = raw.split('/').filter(Boolean);

    if (parts[0] === 'event' && parts[1]) {
      return { view: 'event', id: parts[1], stage: parts[2] ?? null };
    }
    if (parts[0] === 'season' && parts[1]) {
      return { view: 'season', season: parts[1] };
    }
    return { view: 'home' };
  }

  function eventRoute(id, stage) {
    return `#/event/${encodeURIComponent(id)}${stage ? '/' + encodeURIComponent(stage) : ''}`;
  }
  function seasonRoute(season) { return `#/season/${encodeURIComponent(season)}`; }
  const homeRoute = '#/';

  /** Navigation "normale" : pousse une entrée dans l'historique. */
  function go(route) {
    if (location.hash === route) { handle(); return; }
    location.hash = route;
  }

  /** Résolution silencieuse : remplace l'entrée courante, sans polluer l'historique. */
  function replace(route) {
    history.replaceState(null, '', location.pathname + location.search + route);
    handle();
  }

  function handle() {
    const r = parseHash();

    if (r.view === 'event' && State.find(r.id)) {
      applyEvent(r.id, r.stage);
      return;
    }

    if (r.view === 'season' && State.seasons().includes(r.season)) {
      const pool  = State.inSeason(r.season);
      const saved = State.current();
      const pick  = pool.find(e => e.id === saved) ?? pool[0];
      if (pick) { replace(eventRoute(pick.id)); return; }
    }

    applyHome();
  }

  function applyEvent(id, stage) {
    const ev = State.find(id);
    if (!ev) { applyHome(); return; }
    State.setSeason(ev.season);
    State.setCurrent(id);
    Screen.buildRail();
    Screen.goEvent(id);
    if (stage) Screen.openStage(id, stage);
  }

  function applyHome() {
    Screen.goHome();
    Screen.buildRail();
  }

  function bind() {
    window.addEventListener('hashchange', handle);
  }

  return { parseHash, eventRoute, seasonRoute, homeRoute, go, replace, handle, bind };
})();


/* --------------------------------------------------------------------------
   2. UTILS
   -------------------------------------------------------------------------- */

function pctOf(tally) {
  if (!tally?.of) return null;
  return Math.round((tally.hit / tally.of) * 100);
}

function gradeColor(pct) {
  if (pct >= APP.GRADE.GOOD) return 'var(--go)';
  if (pct >= APP.GRADE.MID)  return 'var(--warn)';
  return 'var(--miss)';
}

function escAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escText(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function kindLabel(kind) {
  return KIND_TEXT[kind] ?? 'Autre';
}

/** Un événement compte-t-il dans le circuit RLCS officiel ? (défaut : oui) */
function isCanon(ev) {
  return ev.canon !== false;
}

function logoFor(name) {
  if (!name) return null;
  if (TEAM_LOGOS[name]) return TEAM_LOGOS[name];
  const lower = name.toLowerCase();
  const key = Object.keys(TEAM_LOGOS).find(k => k.toLowerCase() === lower);
  return key ? TEAM_LOGOS[key] : null;
}

/**
 * Un titre d'étape "3v3 — Play-In" se découpe en { group: '3v3', label: 'Play-In' }
 * pour permettre un regroupement visuel (format) dans l'accordéon.
 * Sans séparateur ' — ', le titre reste tel quel et group est null.
 */
function parseStageTitle(title) {
  const parts = String(title).split(' — ');
  return parts.length === 2 ? { group: parts[0], label: parts[1] } : { group: null, label: title };
}

/**
 * L'étape "ALL" est une vue de synthèse : elle agrège automatiquement
 * toutes les images des autres étapes de l'événement (+ ses propres
 * images éventuelles, en tête), sans doublon. Rien à maintenir à la main
 * quand une nouvelle étape est ajoutée.
 */
function resolveStageShots(stage, ev) {
  if (stage.id !== 'ALL') return stage.shots ?? [];

  const authored   = stage.shots ?? [];
  const aggregated = ev.stages.filter(s => s.id !== 'ALL').flatMap(s => s.shots ?? []);

  const seen = new Set();
  return [...authored, ...aggregated].filter(sh => {
    if (seen.has(sh.src)) return false;
    seen.add(sh.src);
    return true;
  });
}

/** Jauge de boost segmentée réutilisable (tally, accueil…). */
function boostMeterHTML(pct, color, size = 10) {
  const segments = Array.from({ length: size }, (_, i) =>
    `<span class="boost-seg${i < Math.round((pct / 100) * size) ? ' is-lit' : ''}" style="--seg-color:${color}"></span>`
  ).join('');
  return `<div class="boost-meter" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">${segments}</div>`;
}

/**
 * Agrège toutes les stats nécessaires à la page d'accueil :
 * totaux par saison, par catégorie, meilleur/pire événement,
 * bilan des pronostics vainqueur, et prochain rendez-vous.
 *
 * Les totaux "par saison" et "meilleur/pire pronostic" n'incluent que
 * les événements du circuit RLCS officiel (isCanon). Les événements
 * hors-circuit (EWC, FIFAe…) restent visibles dans "par catégorie"
 * (sous leur propre libellé) mais ne polluent pas le bilan saison.
 */
function computeHomeStats() {
  const bySeason = {};
  const byKind   = {};
  let bestEv  = null;
  let worstEv = null;
  let pickHit = 0, pickMiss = 0, pickPending = 0;

  EVENTS.forEach(ev => {
    const season = String(ev.season);
    byKind[ev.kind]  ??= { hit: 0, of: 0 };

    if (ev.tally?.of > 0) {
      byKind[ev.kind].hit += ev.tally.hit;
      byKind[ev.kind].of  += ev.tally.of;

      if (isCanon(ev)) {
        bySeason[season] ??= { hit: 0, of: 0 };
        bySeason[season].hit += ev.tally.hit;
        bySeason[season].of  += ev.tally.of;

        const pct = pctOf(ev.tally);
        if (!bestEv  || pct > bestEv.pct)  bestEv  = { ev, pct };
        if (!worstEv || pct < worstEv.pct) worstEv = { ev, pct };
      }
    } else {
      bySeason[season] ??= { hit: 0, of: 0 };
    }

    if (ev.pick?.mine && ev.pick.mine !== 'TBD') {
      if (!ev.pick.actual)                        pickPending++;
      else if (ev.pick.mine === ev.pick.actual)    pickHit++;
      else                                         pickMiss++;
    }
  });

  const liveEvent = EVENTS.find(ev => ev.state === 'live') ?? null;
  const nextEvent = EVENTS.find(ev => ev.state === 'soon') ?? null;

  return { bySeason, byKind, bestEv, worstEv, pickHit, pickMiss, pickPending, liveEvent, nextEvent };
}


/* --------------------------------------------------------------------------
   3. VIEWER — visionneuse plein écran
   -------------------------------------------------------------------------- */

const Viewer = (() => {
  let roll  = [];
  let cursor = 0;

  const el = {
    get root()  { return document.getElementById('viewer'); },
    get img()   { return document.getElementById('viewer-img'); },
    get cap()   { return document.getElementById('viewer-caption'); },
    get count() { return document.getElementById('viewer-count'); },
    get prev()  { return document.getElementById('viewer-prev'); },
    get next()  { return document.getElementById('viewer-next'); },
    get close() { return document.getElementById('viewer-close'); },
  };

  function paint() {
    const shot = roll[cursor];
    if (!shot || !el.img) return;

    el.img.src = shot.src;
    el.img.alt = shot.caption ?? '';
    if (el.cap)   el.cap.textContent   = shot.caption ?? '';
    if (el.count) el.count.textContent = `${cursor + 1} / ${roll.length}`;

    if (el.prev) el.prev.disabled = cursor === 0;
    if (el.next) el.next.disabled = cursor === roll.length - 1;
  }

  function open(shots, index = 0) {
    if (!Array.isArray(shots) || !shots.length) return;
    roll   = shots;
    cursor = Math.max(0, Math.min(index, shots.length - 1));
    paint();
    el.root?.classList.add('is-open');
    el.root?.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    el.root?.classList.remove('is-open');
    el.root?.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function step(delta) {
    const target = cursor + delta;
    if (target < 0 || target >= roll.length) return;
    cursor = target;
    paint();
  }

  function bind() {
    el.close?.addEventListener('click', close);
    el.prev?.addEventListener('click', () => step(-1));
    el.next?.addEventListener('click', () => step(1));

    el.root?.addEventListener('click', e => {
      if (e.target === el.root) close();
    });

    document.addEventListener('keydown', e => {
      if (!el.root?.classList.contains('is-open')) return;
      if (e.key === 'Escape')     close();
      if (e.key === 'ArrowLeft')  step(-1);
      if (e.key === 'ArrowRight') step(1);
    });
  }

  return { open, close, bind };
})();


/* --------------------------------------------------------------------------
   4. BLOCKS — gabarits HTML
   -------------------------------------------------------------------------- */

// clé `${eventId}::${stageId}` → tableau de shots, pour la Viewer
const shotsIndex = new Map();

const Blocks = {

  /**
   * Cadran de score : lecture ou saisie.
   * @param {EventEntry} ev
   * @param {boolean} editing
   */
  tally(ev, editing = false) {
    const { id, tally, state } = ev;

    if (editing) {
      const h = tally?.hit ?? 0;
      const o = tally?.of  ?? 0;
      return `
        <div class="tally-box is-editing" data-eid="${escAttr(id)}">
          <form class="tally-form" data-action="none">
            <input type="number" class="tally-input" data-role="hit" value="${h}" min="0" max="999" inputmode="numeric" aria-label="Prédictions justes">
            <span class="tally-sep" aria-hidden="true">/</span>
            <input type="number" class="tally-input" data-role="of"  value="${o}" min="0" max="999" inputmode="numeric" aria-label="Total de prédictions">
            <button type="button" class="tally-save" data-action="commit-tally">Valider</button>
            <button type="button" class="tally-cancel" data-action="cancel-tally">Annuler</button>
          </form>
        </div>`;
    }

    if (!tally) {
      if (state === 'soon') {
        return `<div class="tally-box" data-eid="${escAttr(id)}"><p class="tally-empty">Pas encore joué</p></div>`;
      }
      const msg = state === 'live' ? 'En cours de résolution' : 'Score non saisi';
      return `
        <div class="tally-box" data-eid="${escAttr(id)}">
          <p class="tally-empty">${msg}</p>
          <button type="button" class="tally-edit-btn" data-action="edit-tally">Saisir mon score</button>
        </div>`;
    }

    const pct   = pctOf(tally);
    const color = gradeColor(pct);

    return `
      <div class="tally-box" data-eid="${escAttr(id)}">
        <div class="tally-score" style="color:${color}">
          ${tally.hit}<span class="tally-of">/${tally.of}</span>
        </div>
        <div class="tally-pct" style="color:${color}">${pct}% de réussite</div>
        ${boostMeterHTML(pct, color)}
      </div>`;
  },

  /**
   * Duel pronostic / résultat réel.
   * @param {Pick} pick
   */
  pick(pick) {
    if (!pick?.mine) return '';

    const verdict = !pick.actual
      ? 'pending'
      : pick.mine === pick.actual ? 'hit' : 'miss';

    const mineLogo   = logoFor(pick.mine);
    const actualLogo = logoFor(pick.actual);
    const mineImg   = mineLogo   ? `<img src="${escAttr(mineLogo)}" class="pick-logo" alt="" loading="lazy">`   : '';
    const actualImg = actualLogo ? `<img src="${escAttr(actualLogo)}" class="pick-logo" alt="" loading="lazy">` : '';

    const actualHTML = pick.actual ? `
      <div class="pick-actual">
        <span class="pick-arrow" aria-hidden="true">→</span>
        <span class="pick-tag">Vainqueur réel</span>
        <span class="pick-name">${actualImg}${escText(pick.actual)}</span>
      </div>` : '';

    return `
      <div class="pick-row" data-verdict="${verdict}">
        <span class="pick-light" aria-label="Pronostic ${verdict}"></span>
        <div class="pick-mine">
          <span class="pick-tag">Mon pronostic</span>
          <span class="pick-name">${mineImg}${escText(pick.mine)}</span>
        </div>
        ${actualHTML}
      </div>`;
  },

  flag(text) {
    if (!text) return '';
    return `<p class="shot-flag"><span aria-hidden="true">▸</span> ${escText(text)}</p>`;
  },

  /**
   * Grille d'images pour une étape.
   * @param {Stage} stage
   * @param {EventEntry} ev
   */
  shots(stage, ev) {
    const shots = resolveStageShots(stage, ev);

    if (!shots.length) {
      return `
        <div class="shots-grid">
          <div class="shot-empty">
            <span class="shot-empty-icon" aria-hidden="true">▢</span>
            <span>Rien à montrer pour l'instant</span>
          </div>
        </div>`;
    }

    const key = `${ev.id}::${stage.id}`;
    shotsIndex.set(key, shots);

    const tagText = ev.state === 'live' ? 'En cours' : 'Résolu';
    const tagCls  = ev.state === 'live' ? 'is-live' : 'is-done';

    const cards = shots.map((shot, i) => `
      <button type="button" class="shot-card" data-shots-key="${escAttr(key)}" data-shot-index="${i}"
              aria-label="Agrandir : ${escAttr(shot.caption ?? '')}">
        <span class="shot-tag ${tagCls}">${tagText}</span>
        <span class="shot-thumb">
          <img src="${escAttr(shot.src)}" alt="${escAttr(shot.caption ?? '')}" loading="lazy">
        </span>
        <span class="shot-caption">${escText(shot.caption ?? '')}</span>
        ${this.flag(shot.flag)}
      </button>`).join('');

    return `<div class="shots-grid">${cards}</div>`;
  },

  /**
   * Une étape sous forme d'item d'accordéon.
   * @param {Stage} stage
   * @param {EventEntry} ev
   * @param {boolean} open
   */
  stageItem(stage, ev, open) {
    const { label } = parseStageTitle(stage.title);
    return `
      <section class="stage-item${open ? ' is-open' : ''}" id="stage-${escAttr(ev.id)}-${escAttr(stage.id)}">
        <button type="button" class="stage-item-head" data-action="toggle-stage"
                data-eid="${escAttr(ev.id)}" data-sid="${escAttr(stage.id)}"
                aria-expanded="${open}">
          <span class="stage-item-title">${escText(label)}</span>
          <span class="stage-item-count">${resolveStageShots(stage, ev).length || '—'}</span>
          <span class="stage-item-caret" aria-hidden="true"></span>
        </button>
        <div class="stage-item-body">
          ${this.shots(stage, ev)}
        </div>
      </section>`;
  },

  /**
   * Page complète d'un événement.
   * @param {EventEntry} ev
   */
  event(ev) {
    const upcoming = ev.state === 'soon';

    let lastGroup = null;
    const stages = ev.stages.map((st) => {
      const { group } = parseStageTitle(st.title);
      const divider = (group && group !== lastGroup)
        ? `<p class="stage-group-label">${escText(group)}</p>` : '';
      lastGroup = group;
      return divider + this.stageItem(st, ev, false);
    }).join('');

    const pool = State.inSeason(ev.season);
    const idx  = pool.findIndex(e => e.id === ev.id);
    const prevEv = idx > 0 ? pool[idx - 1] : null;
    const nextEv = (idx > -1 && idx < pool.length - 1) ? pool[idx + 1] : null;

    const breadcrumb = `
      <nav class="breadcrumb" aria-label="Fil d'ariane">
        <a href="${Router.homeRoute}">Accueil</a>
        <span aria-hidden="true">/</span>
        <a href="${Router.seasonRoute(ev.season)}">${ev.season}</a>
        <span aria-hidden="true">/</span>
        <span aria-current="page">${escText(ev.name)}</span>
      </nav>`;

    const pager = `
      <nav class="event-pager" aria-label="Navigation entre événements">
        ${prevEv
          ? `<a class="event-pager-btn" href="${Router.eventRoute(prevEv.id)}"><span class="event-pager-dir">← Précédent</span><span class="event-pager-name">${escText(prevEv.name)}</span></a>`
          : '<span class="event-pager-btn is-disabled"></span>'}
        ${nextEv
          ? `<a class="event-pager-btn is-next" href="${Router.eventRoute(nextEv.id)}"><span class="event-pager-dir">Suivant →</span><span class="event-pager-name">${escText(nextEv.name)}</span></a>`
          : '<span class="event-pager-btn is-disabled"></span>'}
      </nav>`;

    const noncanonHTML = !isCanon(ev)
      ? `<span class="tag tag-noncanon" title="Ne compte pas dans les statistiques du circuit RLCS">Hors-circuit</span>`
      : '';

    return `
      <article class="event-panel" id="event-${escAttr(ev.id)}" data-season="${ev.season}" data-kind="${escAttr(ev.kind)}">

        ${breadcrumb}

        <header class="event-head">
          <div class="event-head-banner">
            <img src="${escAttr(ev.banner)}" class="event-head-logo" alt="Logo ${escAttr(ev.name)}">
          </div>

          <div class="event-head-info">
            <div class="event-head-titling">
              <h2 class="event-title">${escText(ev.name)}</h2>
              <div class="event-tags">
                <span class="event-dates">${escText(ev.dates)}</span>
                <span class="tag tag-kind">${kindLabel(ev.kind)}</span>
                <span class="tag tag-status" data-state="${escAttr(ev.state)}">
                  <span class="tag-dot" aria-hidden="true"></span>${STATUS_TEXT[ev.state] ?? ev.state}
                </span>
                ${noncanonHTML}
              </div>
              ${!upcoming ? this.pick(ev.pick) : ''}
            </div>
            ${!upcoming ? `<div id="tallyhost-${escAttr(ev.id)}">${this.tally(ev)}</div>` : ''}
          </div>
        </header>

        <div class="stage-toolbar">
          <button type="button" class="stage-toolbar-btn" data-action="expand-all" data-eid="${escAttr(ev.id)}">Tout ouvrir</button>
          <button type="button" class="stage-toolbar-btn" data-action="collapse-all" data-eid="${escAttr(ev.id)}">Tout fermer</button>
        </div>
        <div class="stage-accordion">${stages}</div>

        ${pager}
      </article>`;
  },

  /**
   * Carte compacte d'un événement (meilleur/pire, prochain rendez-vous…).
   * @param {EventEntry} ev
   * @param {object} [opts]
   */
  homeEventCard(ev, opts = {}) {
    const { pct = null, eyebrow = '', cta = null } = opts;
    const color = pct !== null ? gradeColor(pct) : null;

    return `
      <div class="home-ev-card">
        <div class="home-ev-banner">
          <img src="${escAttr(ev.banner)}" alt="" loading="lazy">
        </div>
        <div class="home-ev-body">
          ${eyebrow ? `<p class="home-ev-eyebrow">${escText(eyebrow)}</p>` : ''}
          <p class="home-ev-name">${escText(ev.name)}</p>
          <p class="home-ev-dates">${escText(ev.dates)}</p>
          ${pct !== null ? `<p class="home-ev-pct" style="color:${color}">${pct}%</p>` : ''}
          ${cta ? `<button type="button" class="home-ev-cta" data-action="goto-event" data-eid="${escAttr(ev.id)}" data-season="${ev.season}">${escText(cta)}</button>` : ''}
        </div>
      </div>`;
  },

  /**
   * Page d'accueil : bilan global, par saison, par catégorie,
   * meilleur/pire pronostic, bilan des picks et prochain rendez-vous.
   */
  home() {
    const totals = State.grandTotal();
    const stats  = computeHomeStats();

    const heroHTML = totals ? `
      <div class="home-hero-score">
        <div class="home-hero-pct" style="color:${gradeColor(totals.pct)}">${totals.pct}<span>%</span></div>
        <div class="home-hero-count">${totals.hit}<span class="home-hero-of">/${totals.of}</span> pronostics justes</div>
        ${boostMeterHTML(totals.pct, gradeColor(totals.pct), 16)}
      </div>` : `
      <div class="home-hero-score home-hero-empty">
        <p>Aucun score saisi pour l'instant.</p>
        <p class="home-hero-hint">Rends-toi sur un événement pour enregistrer ton premier pronostic.</p>
      </div>`;

    const seasonRows = State.seasons().map(season => {
      const t   = stats.bySeason[season];
      const pct = t?.of ? Math.round((t.hit / t.of) * 100) : null;
      const color = pct !== null ? gradeColor(pct) : 'var(--ink-mut)';
      return `
        <div class="home-bar-row">
          <span class="home-bar-label">${escText(season)}</span>
          <div class="home-bar-track">
            <div class="home-bar-fill" style="width:${pct ?? 0}%; background:${color}"></div>
          </div>
          <span class="home-bar-value" style="color:${color}">${pct !== null ? `${pct}%` : '—'}</span>
        </div>`;
    }).join('');

    const kindOrder = ['major', 'worlds', 'lan', 'qualifier', 'other'];
    const kindRows = kindOrder
      .filter(k => stats.byKind[k])
      .map(kind => {
        const t   = stats.byKind[kind];
        const pct = t?.of ? Math.round((t.hit / t.of) * 100) : null;
        const color = pct !== null ? gradeColor(pct) : 'var(--ink-mut)';
        return `
          <div class="home-bar-row">
            <span class="home-bar-label">${escText(kindLabel(kind))}</span>
            <div class="home-bar-track">
              <div class="home-bar-fill" style="width:${pct ?? 0}%; background:${color}"></div>
            </div>
            <span class="home-bar-value" style="color:${color}">${pct !== null ? `${pct}%` : '—'}</span>
          </div>`;
      }).join('');

    const bestWorstHTML = (stats.bestEv || stats.worstEv) ? `
      <section class="home-card home-card-wide">
        <h2 class="home-card-title">Meilleur &amp; pire pronostic</h2>
        <div class="home-ev-pair">
          ${stats.bestEv  ? this.homeEventCard(stats.bestEv.ev,  { pct: stats.bestEv.pct,  eyebrow: 'Meilleur score' }) : ''}
          ${stats.worstEv && stats.worstEv.ev.id !== stats.bestEv?.ev.id
            ? this.homeEventCard(stats.worstEv.ev, { pct: stats.worstEv.pct, eyebrow: 'Pire score' }) : ''}
        </div>
      </section>` : '';

    const totalPicks = stats.pickHit + stats.pickMiss + stats.pickPending;
    const picksHTML = totalPicks ? `
      <section class="home-card">
        <h2 class="home-card-title">Pronostics vainqueur</h2>
        <div class="home-picks-row">
          <div class="home-pick-stat" data-verdict="hit"><span class="home-pick-dot"></span>${stats.pickHit} juste${stats.pickHit > 1 ? 's' : ''}</div>
          <div class="home-pick-stat" data-verdict="miss"><span class="home-pick-dot"></span>${stats.pickMiss} raté${stats.pickMiss > 1 ? 's' : ''}</div>
          <div class="home-pick-stat" data-verdict="pending"><span class="home-pick-dot"></span>${stats.pickPending} en attente</div>
        </div>
      </section>` : '';

    const spotlightEvent = stats.liveEvent ?? stats.nextEvent;
    const spotlightHTML = spotlightEvent ? `
      <section class="home-card home-card-wide home-card-spotlight">
        <h2 class="home-card-title">${stats.liveEvent ? 'En ce moment' : 'Prochain rendez-vous'}</h2>
        ${this.homeEventCard(spotlightEvent, {
          eyebrow: stats.liveEvent ? 'En cours' : 'À venir',
          cta: stats.liveEvent ? "Voir l'événement" : 'Voir la fiche',
        })}
      </section>` : '';

    return `
      <section class="home-panel" id="home-panel">
        <header class="home-hero">
          <div class="home-hero-main">
            <p class="home-kicker" aria-hidden="true">Vue d'ensemble</p>
            <h1 class="home-title">Bilan des pronostics</h1>
            <p class="home-sub">Circuit RLCS officiel — saisons et catégories confondues.</p>
          </div>
          ${heroHTML}
        </header>

        <div class="home-grid">
          <section class="home-card">
            <h2 class="home-card-title">Par saison</h2>
            <div class="home-bar-list">${seasonRows || '<p class="home-empty">Rien à afficher.</p>'}</div>
          </section>

          <section class="home-card">
            <h2 class="home-card-title">Par catégorie</h2>
            <div class="home-bar-list">${kindRows || '<p class="home-empty">Rien à afficher.</p>'}</div>
          </section>

          ${picksHTML}
          ${bestWorstHTML}
          ${spotlightHTML}
        </div>
      </section>`;
  },
};


/* --------------------------------------------------------------------------
   5. SCREEN — écriture DOM
   -------------------------------------------------------------------------- */

const Screen = (() => {
  const $ = id => document.getElementById(id);
  let searchQuery = '';

  return {

    buildTicker() {
      const host = $('rail-ticker');
      if (!host) return;

      const totals = State.grandTotal();
      if (!totals) { host.replaceChildren(); return; }

      const color = gradeColor(totals.pct);
      host.innerHTML = `
        <div class="ticker-item">
          <div class="ticker-value" style="color:${color}">${totals.pct}%</div>
          <div class="ticker-label">Réussite globale</div>
        </div>
        <div class="ticker-item">
          <div class="ticker-value">${totals.hit}<span class="ticker-of">/${totals.of}</span></div>
          <div class="ticker-label">Pronostics posés</div>
        </div>`;
    },

    buildRail() {
      const list = $('event-list');
      if (!list) return;

      const frag = document.createDocumentFragment();

      State.inSeason(State.season()).forEach(ev => {
        const pct    = pctOf(ev.tally);
        const active = ev.id === State.current();

        const item = document.createElement('button');
        item.type = 'button';
        item.className = `event-item${active ? ' is-active' : ''}`;
        item.dataset.eid = ev.id;

        const logo = document.createElement('img');
        logo.src = ev.banner;
        logo.className = 'event-item-logo';
        logo.alt = '';

        const name = document.createElement('span');
        name.className = 'event-item-name';
        name.textContent = ev.name;

        item.append(logo, name);

        if (ev.state === 'live') {
          const dot = document.createElement('span');
          dot.className = 'event-item-live';
          dot.setAttribute('aria-label', 'En cours');
          item.appendChild(dot);
        }

        if (pct !== null) {
          const badge = document.createElement('span');
          badge.className = 'event-item-pct';
          badge.textContent = `${pct}%`;
          item.appendChild(badge);
        }

        frag.appendChild(item);
      });

      list.replaceChildren(frag);
      this.filterRail();
    },

    setSearch(query) {
      searchQuery = query;
      this.filterRail();
    },

    filterRail(query = searchQuery) {
      const list = $('event-list');
      if (!list) return;
      const q = query.trim().toLowerCase();
      list.querySelectorAll('.event-item').forEach(item => {
        const name = item.querySelector('.event-item-name')?.textContent.toLowerCase() ?? '';
        item.hidden = q.length > 0 && !name.includes(q);
      });
    },

    refreshTally(id) {
      const ev   = State.find(id);
      const host = $(`tallyhost-${id}`);
      if (!ev || !host) return;
      host.innerHTML = Blocks.tally(ev);
    },

    goEvent(id) {
      const ev = State.find(id);
      if (ev) {
        const s = String(ev.season);
        $('home-panel')?.classList.remove('is-active');
        $('home-link')?.classList.remove('is-active');
        document.querySelectorAll('.season-panel').forEach(p =>
          p.classList.toggle('is-active', p.id === `season-${s}`));
        document.querySelectorAll('.season-opt').forEach(b => {
          const active = b.dataset.season === s;
          b.classList.toggle('is-active', active);
          b.setAttribute('aria-pressed', String(active));
        });
      }

      document.querySelector('.event-panel.is-active')?.classList.remove('is-active');
      $(`event-${id}`)?.classList.add('is-active');
      document.querySelector('.event-item.is-active')?.classList.remove('is-active');
      document.querySelector(`.event-item[data-eid="${CSS.escape(id)}"]`)?.classList.add('is-active');
    },

    goSeason(season) {
      const s = String(season);
      $('home-panel')?.classList.remove('is-active');
      $('home-link')?.classList.remove('is-active');
      document.querySelectorAll('.season-opt').forEach(b => {
        const active = b.dataset.season === s;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-pressed', String(active));
      });
      document.querySelectorAll('.season-panel').forEach(p =>
        p.classList.toggle('is-active', p.id === `season-${s}`));
    },

    goHome() {
      document.querySelectorAll('.season-panel').forEach(p => p.classList.remove('is-active'));
      document.querySelectorAll('.season-opt').forEach(b => {
        b.classList.remove('is-active');
        b.setAttribute('aria-pressed', 'false');
      });
      document.querySelector('.event-item.is-active')?.classList.remove('is-active');
      $('home-panel')?.classList.add('is-active');
      $('home-link')?.classList.add('is-active');
    },

    toggleStage(eid, sid) {
      const panel = $(`event-${eid}`);
      if (!panel) return;
      panel.querySelectorAll('.stage-item').forEach(item => {
        const isTarget = item.id === `stage-${eid}-${sid}`;
        const willOpen = isTarget ? !item.classList.contains('is-open') : false;
        item.classList.toggle('is-open', willOpen);
        item.querySelector('.stage-item-head')?.setAttribute('aria-expanded', String(willOpen));
      });
    },

    /** Ouvre une étape précise (lien profond) et y défile. */
    openStage(eid, sid) {
      const panel  = $(`event-${eid}`);
      const target = $(`stage-${eid}-${sid}`);
      if (!panel || !target) return;
      panel.querySelectorAll('.stage-item').forEach(item => {
        const isTarget = item === target;
        item.classList.toggle('is-open', isTarget);
        item.querySelector('.stage-item-head')?.setAttribute('aria-expanded', String(isTarget));
      });
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    setAllStages(eid, open) {
      const panel = $(`event-${eid}`);
      if (!panel) return;
      panel.querySelectorAll('.stage-item').forEach(item => {
        item.classList.toggle('is-open', open);
        item.querySelector('.stage-item-head')?.setAttribute('aria-expanded', String(open));
      });
    },

    mount() {
      const stage = $('stage');
      if (!stage) return;

      const seasons = State.seasons();
      const active  = State.season();

      stage.innerHTML = Blocks.home() + seasons.map(season => `
        <section class="season-panel${season === active ? ' is-active' : ''}" id="season-${season}">
          <h1 class="season-title">Saison <span>${season}</span></h1>
          <div class="season-body">
            ${State.inSeason(season).map(ev => Blocks.event(ev)).join('')}
          </div>
        </section>`).join('');

      document.querySelectorAll('.season-opt').forEach(b => {
        const isActive = b.dataset.season === active;
        b.classList.toggle('is-active', isActive);
        b.setAttribute('aria-pressed', String(isActive));
      });
    },
  };
})();


/* --------------------------------------------------------------------------
   6. ACTIONS — orchestration State ↔ Screen
   -------------------------------------------------------------------------- */

const Actions = {

  goHome() {
    Router.go(Router.homeRoute);
  },

  goEvent(id) {
    if (!State.find(id)) return;
    Router.go(Router.eventRoute(id));
  },

  goSeason(season) {
    Router.go(Router.seasonRoute(season));
  },

  editTally(id) {
    const ev   = State.find(id);
    const host = document.getElementById(`tallyhost-${id}`);
    if (!ev || !host) return;
    host.innerHTML = Blocks.tally(ev, true);
    host.querySelector('[data-role="hit"]')?.focus();
  },

  cancelTally(id) {
    Screen.refreshTally(id);
  },

  commitTally(id) {
    const box = document.getElementById(`tallyhost-${id}`)?.querySelector('.tally-box');
    if (!box) return;

    const hit = Number(box.querySelector('[data-role="hit"]')?.value);
    const of  = Number(box.querySelector('[data-role="of"]')?.value);
    if (!Number.isFinite(hit) || !Number.isFinite(of)) return;

    State.recordTally(id, hit, of);
    Screen.refreshTally(id);
    Screen.buildRail();
    Screen.buildTicker();
  },
};


/* --------------------------------------------------------------------------
   7. DÉLÉGATION D'ÉVÉNEMENTS
   -------------------------------------------------------------------------- */

function wireEvents() {
  document.addEventListener('click', e => {

    const homeBtn = e.target.closest('#home-link');
    if (homeBtn) { Actions.goHome(); Drawer.close(); return; }

    const gotoBtn = e.target.closest('[data-action="goto-event"]');
    if (gotoBtn?.dataset.eid) { Actions.goEvent(gotoBtn.dataset.eid); return; }

    const seasonBtn = e.target.closest('.season-opt');
    if (seasonBtn) { Actions.goSeason(seasonBtn.dataset.season); Drawer.close(); return; }

    const eventBtn = e.target.closest('.event-item');
    if (eventBtn?.dataset.eid) { Actions.goEvent(eventBtn.dataset.eid); Drawer.close(); return; }

    const stageHead = e.target.closest('[data-action="toggle-stage"]');
    if (stageHead) {
      const { eid, sid } = stageHead.dataset;
      Screen.toggleStage(eid, sid);
      const isOpen = document.getElementById(`stage-${eid}-${sid}`)?.classList.contains('is-open');
      Router.replace(Router.eventRoute(eid, isOpen ? sid : null));
      return;
    }

    const expandBtn = e.target.closest('[data-action="expand-all"]');
    if (expandBtn?.dataset.eid) { Screen.setAllStages(expandBtn.dataset.eid, true); return; }

    const collapseBtn = e.target.closest('[data-action="collapse-all"]');
    if (collapseBtn?.dataset.eid) {
      Screen.setAllStages(collapseBtn.dataset.eid, false);
      Router.replace(Router.eventRoute(collapseBtn.dataset.eid));
      return;
    }

    const card = e.target.closest('.shot-card');
    if (card) {
      const shots = shotsIndex.get(card.dataset.shotsKey);
      if (shots?.length) Viewer.open(shots, parseInt(card.dataset.shotIndex, 10) || 0);
      return;
    }

    const actionBtn = e.target.closest('[data-action]');
    if (actionBtn) {
      const eid = actionBtn.closest('.tally-box')?.dataset.eid
               ?? actionBtn.closest('[id^="tallyhost-"]')?.id.replace(/^tallyhost-/, '');
      if (!eid) return;

      switch (actionBtn.dataset.action) {
        case 'edit-tally':   Actions.editTally(eid);   break;
        case 'cancel-tally': Actions.cancelTally(eid); break;
        case 'commit-tally': Actions.commitTally(eid); break;
      }
    }
  });
}


/* --------------------------------------------------------------------------
   7bis. TIROIR DE NAVIGATION MOBILE
   -------------------------------------------------------------------------- */

const Drawer = (() => {
  const $ = id => document.getElementById(id);

  function isOpen() { return $('rail')?.classList.contains('is-open') ?? false; }

  function open() {
    $('rail')?.classList.add('is-open');
    $('rail-backdrop')?.removeAttribute('hidden');
    $('mobile-toggle')?.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    if (!isOpen()) return;
    $('rail')?.classList.remove('is-open');
    $('rail-backdrop')?.setAttribute('hidden', '');
    $('mobile-toggle')?.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  function bind() {
    $('mobile-toggle')?.addEventListener('click', () => (isOpen() ? close() : open()));
    $('rail-backdrop')?.addEventListener('click', close);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  }

  return { open, close, bind };
})();


/* --------------------------------------------------------------------------
   7ter. GÉNÉRATEUR D'ÉVÉNEMENT — outil maintenance, activé via ?admin
   -------------------------------------------------------------------------- */

const Admin = (() => {
  const $ = id => document.getElementById(id);

  function isEnabled() {
    return new URLSearchParams(location.search).has('admin');
  }

  function slugify(s) {
    return String(s)
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-+|-+$)/g, '');
  }

  function jsStr(s) {
    return `'${String(s ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  }

  function shotRowHTML() {
    return `
      <div class="admin-shot" data-shot>
        <input data-field="shot-src" placeholder="/img/xxx.png">
        <input data-field="shot-caption" placeholder="Légende">
        <input data-field="shot-flag" placeholder="Note (optionnel)">
        <button type="button" class="admin-remove" data-action="admin-remove-shot">✕</button>
      </div>`;
  }

  function stageBlockHTML() {
    return `
      <fieldset class="admin-stage" data-stage>
        <legend>Étape <button type="button" class="admin-remove" data-action="admin-remove-stage">Retirer</button></legend>
        <div class="admin-grid">
          <label>Identifiant<input data-field="stage-id" placeholder="playoffs"></label>
          <label>Titre<input data-field="stage-title" placeholder="Playoffs"></label>
        </div>
        <div class="admin-shots" data-shots>${shotRowHTML()}</div>
        <button type="button" class="admin-add-shot" data-action="admin-add-shot">+ Ajouter une image</button>
      </fieldset>`;
  }

  function formHTML() {
    return `
      <form id="admin-form" class="admin-form">
        <div class="admin-grid">
          <label>Nom de l'événement<input name="name" required placeholder="Esports World Cup 2026"></label>
          <label>Identifiant (id)<input name="id" placeholder="auto-généré depuis le nom"></label>
          <label>Saison<input name="season" value="2026" required></label>
          <label>Type
            <select name="kind">
              <option value="major">Major</option>
              <option value="worlds">Worlds</option>
              <option value="lan">LAN</option>
              <option value="qualifier">Qualifier</option>
              <option value="other">Autre</option>
            </select>
          </label>
          <label>Statut
            <select name="state">
              <option value="soon">À venir</option>
              <option value="live">En cours</option>
              <option value="done">Terminé</option>
            </select>
          </label>
          <label>Hors-circuit RLCS (ne compte pas dans les stats)
            <select name="canon">
              <option value="true">Non — événement du circuit</option>
              <option value="false">Oui — hors-circuit</option>
            </select>
          </label>
          <label>Dates<input name="dates" placeholder="12–16 août 2026"></label>
          <label>Bannière<input name="banner" placeholder="/img/xxx.png"></label>
          <label>Mon pronostic (vainqueur)<input name="pickMine" placeholder="Karmine Corp"></label>
          <label>Vainqueur réel<input name="pickActual" placeholder="laisser vide si inconnu"></label>
          <label>Score juste<input name="tallyHit" type="number" min="0"></label>
          <label>Score total<input name="tallyOf" type="number" min="0"></label>
        </div>

        <div class="admin-stages" id="admin-stages"></div>
        <button type="button" class="admin-add-stage" data-action="admin-add-stage">+ Ajouter une étape</button>

        <div class="admin-actions">
          <button type="button" class="admin-generate" data-action="admin-generate">Générer le code</button>
        </div>

        <label class="admin-output-label">Code à coller dans EVENTS (id.js)
          <textarea id="admin-output" class="admin-output" readonly rows="12" placeholder="Le code généré apparaîtra ici…"></textarea>
        </label>
        <button type="button" class="admin-copy" data-action="admin-copy">Copier</button>
      </form>`;
  }

  function render() {
    const body = $('admin-body');
    if (!body) return;
    body.innerHTML = formHTML();
    $('admin-stages').insertAdjacentHTML('beforeend', stageBlockHTML());
  }

  function open() {
    render();
    $('admin-modal')?.classList.add('is-open');
    $('admin-modal')?.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    $('admin-modal')?.classList.remove('is-open');
    $('admin-modal')?.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function readForm() {
    const form = $('admin-form');
    const val = n => form.querySelector(`[name="${n}"]`)?.value.trim() ?? '';

    const stages = [...form.querySelectorAll('[data-stage]')].map(st => ({
      id: st.querySelector('[data-field="stage-id"]')?.value.trim() || 'etape',
      title: st.querySelector('[data-field="stage-title"]')?.value.trim() || 'Étape',
      shots: [...st.querySelectorAll('[data-shot]')]
        .map(sh => ({
          src: sh.querySelector('[data-field="shot-src"]')?.value.trim() || '',
          caption: sh.querySelector('[data-field="shot-caption"]')?.value.trim() || '',
          flag: sh.querySelector('[data-field="shot-flag"]')?.value.trim() || '',
        }))
        .filter(sh => sh.src),
    }));

    return {
      id: val('id'), name: val('name'), season: val('season') || '2026',
      kind: val('kind') || 'other', state: val('state') || 'soon',
      canon: val('canon') || 'true',
      banner: val('banner'), dates: val('dates'),
      pickMine: val('pickMine'), pickActual: val('pickActual'),
      tallyHit: val('tallyHit'), tallyOf: val('tallyOf'),
      stages,
    };
  }

  function buildEventCode(f) {
    const id = f.id || slugify(f.name);
    const lines = [];

    lines.push(`  {`);
    lines.push(`    id: ${jsStr(id)}, name: ${jsStr(f.name)}, season: ${f.season}, kind: ${jsStr(f.kind)}, state: ${jsStr(f.state)},`);
    if (f.canon === 'false') lines.push(`    canon: false,`);
    lines.push(`    banner: ${jsStr(f.banner || '/img/placeholder.png')}, dates: ${jsStr(f.dates)},`);
    lines.push(f.tallyOf ? `    tally: { hit: ${f.tallyHit || 0}, of: ${f.tallyOf} },` : `    tally: null,`);
    lines.push(`    pick: { mine: ${jsStr(f.pickMine || 'TBD')}, actual: ${f.pickActual ? jsStr(f.pickActual) : 'null'} },`);
    lines.push(`    stages: [`);

    f.stages.forEach(st => {
      lines.push(`      {`);
      lines.push(`        id: ${jsStr(st.id)}, title: ${jsStr(st.title)},`);
      lines.push(`        shots: [`);
      st.shots.forEach(sh => {
        const flagPart = sh.flag ? `, flag: ${jsStr(sh.flag)}` : '';
        lines.push(`          { src: ${jsStr(sh.src)}, caption: ${jsStr(sh.caption)}${flagPart} },`);
      });
      lines.push(`        ],`);
      lines.push(`      },`);
    });

    lines.push(`    ],`);
    lines.push(`  },`);
    return lines.join('\n');
  }

  function generate() {
    const out = $('admin-output');
    if (!out) return;
    const f = readForm();
    if (!f.name) { out.value = '// ⚠️ Le nom de l’événement est obligatoire.'; return; }
    out.value = buildEventCode(f);
  }

  function copyOutput() {
    const out = $('admin-output');
    if (!out?.value) return;
    navigator.clipboard?.writeText(out.value).then(() => {
      const btn = document.querySelector('[data-action="admin-copy"]');
      if (!btn) return;
      const prev = btn.textContent;
      btn.textContent = 'Copié !';
      setTimeout(() => { btn.textContent = prev; }, 1400);
    }).catch(() => {});
  }

  function bind() {
    if (!isEnabled()) return;
    $('admin-fab')?.removeAttribute('hidden');
    $('admin-fab')?.addEventListener('click', open);

    $('admin-modal')?.addEventListener('click', e => {
      const action = e.target.closest('[data-action]')?.dataset.action;
      if (!action) return;

      if (action === 'admin-close')       close();
      if (action === 'admin-add-stage')   $('admin-stages')?.insertAdjacentHTML('beforeend', stageBlockHTML());
      if (action === 'admin-remove-stage') e.target.closest('[data-stage]')?.remove();
      if (action === 'admin-add-shot')    e.target.closest('[data-stage]')?.querySelector('[data-shots]')
                                             ?.insertAdjacentHTML('beforeend', shotRowHTML());
      if (action === 'admin-remove-shot') e.target.closest('[data-shot]')?.remove();
      if (action === 'admin-generate')    generate();
      if (action === 'admin-copy')        copyOutput();
    });

    $('admin-modal')?.addEventListener('focusout', e => {
      if (e.target?.name !== 'name') return;
      const idInput = document.querySelector('#admin-form [name="id"]');
      if (idInput && !idInput.value) idInput.value = slugify(e.target.value);
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && $('admin-modal')?.classList.contains('is-open')) close();
    });
  }

  return { bind };
})();


/* --------------------------------------------------------------------------
   8. BOOT
   -------------------------------------------------------------------------- */

function boot() {
  Screen.mount();
  Screen.buildTicker();
  Viewer.bind();
  wireEvents();
  Router.bind();
  Drawer.bind();
  Admin.bind();

  document.getElementById('event-search')?.addEventListener('input', e => {
    Screen.setSearch(e.target.value);
  });

  const saved = State.current() || State.lastKnownEvent();
  if (!location.hash && saved && State.find(saved)) {
    Router.replace(Router.eventRoute(saved));
  } else {
    Router.handle();
  }
}

boot();