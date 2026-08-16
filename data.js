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

    grandTotal() {
      let hit = 0, of = 0;
      EVENTS.forEach(e => {
        if (e.tally?.of > 0) { hit += e.tally.hit; of += e.tally.of; }
      });
      if (!of) return null;
      return { hit, of, pct: Math.round((hit / of) * 100) };
    },
  };
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

function logoFor(name) {
  if (!name) return null;
  if (TEAM_LOGOS[name]) return TEAM_LOGOS[name];
  const lower = name.toLowerCase();
  const key = Object.keys(TEAM_LOGOS).find(k => k.toLowerCase() === lower);
  return key ? TEAM_LOGOS[key] : null;
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
 */
function computeHomeStats() {
  const bySeason = {};
  const byKind   = {};
  let bestEv  = null;
  let worstEv = null;
  let pickHit = 0, pickMiss = 0, pickPending = 0;

  EVENTS.forEach(ev => {
    const season = String(ev.season);
    bySeason[season] ??= { hit: 0, of: 0 };
    byKind[ev.kind]  ??= { hit: 0, of: 0 };

    if (ev.tally?.of > 0) {
      bySeason[season].hit += ev.tally.hit;
      bySeason[season].of  += ev.tally.of;
      byKind[ev.kind].hit  += ev.tally.hit;
      byKind[ev.kind].of   += ev.tally.of;

      const pct = pctOf(ev.tally);
      if (!bestEv  || pct > bestEv.pct)  bestEv  = { ev, pct };
      if (!worstEv || pct < worstEv.pct) worstEv = { ev, pct };
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
    const shots = stage.shots ?? [];

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
    return `
      <section class="stage-item${open ? ' is-open' : ''}" id="stage-${escAttr(ev.id)}-${escAttr(stage.id)}">
        <button type="button" class="stage-item-head" data-action="toggle-stage"
                data-eid="${escAttr(ev.id)}" data-sid="${escAttr(stage.id)}"
                aria-expanded="${open}">
          <span class="stage-item-title">${escText(stage.title)}</span>
          <span class="stage-item-count">${(stage.shots ?? []).length || '—'}</span>
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

    const stages = ev.stages.map((st, i) => this.stageItem(st, ev, i === 0)).join('');

    return `
      <article class="event-panel" id="event-${escAttr(ev.id)}" data-season="${ev.season}" data-kind="${escAttr(ev.kind)}">

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
              </div>
              ${!upcoming ? this.pick(ev.pick) : ''}
            </div>
            ${!upcoming ? `<div id="tallyhost-${escAttr(ev.id)}">${this.tally(ev)}</div>` : ''}
          </div>
        </header>

        <div class="stage-accordion">${stages}</div>
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

    const kindOrder = ['major', 'worlds', 'qualifier', 'other'];
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
            <p class="home-sub">Toutes saisons et catégories confondues.</p>
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
    Screen.goHome();
  },

  goEvent(id) {
    if (!State.find(id)) return;
    State.setCurrent(id);
    Screen.goEvent(id);
  },

  goSeason(season) {
    State.setSeason(season);
    Screen.goSeason(season);
    Screen.buildRail();

    const saved = State.current();
    const pool  = State.inSeason(season);
    const pick  = pool.find(e => e.id === saved) ?? pool[0];
    if (pick) this.goEvent(pick.id);
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
    if (homeBtn) { Actions.goHome(); return; }

    const gotoBtn = e.target.closest('[data-action="goto-event"]');
    if (gotoBtn?.dataset.eid) {
      Actions.goSeason(gotoBtn.dataset.season);
      Actions.goEvent(gotoBtn.dataset.eid);
      return;
    }

    const seasonBtn = e.target.closest('.season-opt');
    if (seasonBtn) { Actions.goSeason(seasonBtn.dataset.season); return; }

    const eventBtn = e.target.closest('.event-item');
    if (eventBtn?.dataset.eid) { Actions.goEvent(eventBtn.dataset.eid); return; }

    const stageHead = e.target.closest('[data-action="toggle-stage"]');
    if (stageHead) { Screen.toggleStage(stageHead.dataset.eid, stageHead.dataset.sid); return; }

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
   8. BOOT
   -------------------------------------------------------------------------- */

function boot() {
  Screen.mount();
  Screen.buildRail();
  Screen.buildTicker();
  Viewer.bind();
  wireEvents();

  const saved = State.current();
  const pool  = State.inSeason(State.season());
  const start = (saved && pool.find(e => e.id === saved)) ? saved : pool[0]?.id;
  if (start) State.setCurrent(start);

  Actions.goHome();
}

boot();