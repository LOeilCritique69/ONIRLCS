/* ==========================================================================
   predict.js — Pronostics manuels d'OniRLCS.

   Permet de créer ses propres tournois (petites compétitions absentes du
   site externe), d'y saisir des matchs, de pronostiquer chaque match puis
   d'entrer le résultat. Le score (juste / total) est calculé automatiquement
   et alimente le reste du site : rail, accueil, statistiques.

   Chargé APRÈS id.js et AVANT data.js : les tournois manuels sont injectés
   dans EVENTS avant que State n'indexe les événements. Tout ce qui touche à
   State / Screen / Router / Blocks / Drawer (définis dans data.js) n'est
   appelé qu'à l'exécution des handlers, donc une fois tout chargé.

   Stockage : localStorage, clé 'onirlcs.custom.v1' (ce navigateur seulement).
   Export / import JSON dans les Réglages pour sauvegarder et changer d'appareil.
   ========================================================================== */

'use strict';

const Predict = (() => {

  const KEY         = 'onirlcs.custom.v1';
  const SEASONS     = [2025, 2026, 2027];     // = boutons de saison de index.html
  const MAX_MATCHES = 500;

  const FALLBACK_BANNER =
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64' fill='none' " +
    "stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'>" +
    "<path d='M20 10h24v14a12 12 0 0 1-24 0z'/><path d='M20 14H10v4a10 10 0 0 0 10 10M44 14h10v4a10 10 0 0 1-10 10'/>" +
    "<path d='M32 36v10M24 54h16M27 46h10v8H27z'/></svg>";

  /** État purement UI (non persisté). */
  const ui = { lastStage: new Map() };

  /* ------------------------------------------------------------------------
     Utilitaires
     ------------------------------------------------------------------------ */

  const $      = id => document.getElementById(id);
  const lower  = s => String(s).toLowerCase();
  const uid    = () => Math.random().toString(36).slice(2, 8);
  const clean  = (s, max = 80) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
  const plural = (n, one, many = one + 's') => `${n} ${n > 1 ? many : one}`;

  function slugify(s) {
    return String(s)
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-+|-+$)/g, '');
  }

  /** http(s) uniquement (jamais javascript:), ou chemin relatif "/…" si autorisé. */
  function safeUrl(u, allowRelative = false) {
    const v = String(u ?? '').trim();
    if (!v) return '';
    if (allowRelative && /^\/(?!\/)/.test(v)) return v;
    try {
      const x = new URL(v);
      return (x.protocol === 'https:' || x.protocol === 'http:') ? x.href : '';
    } catch { return ''; }
  }

  function fmtDate(ts) {
    return new Date(ts).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  let toastTimer = 0;
  function toast(msg) {
    let el = $('pred-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'pred-toast';
      el.className = 'pred-toast';
      el.setAttribute('role', 'status');
      document.body.append(el);
    }
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 4500);
  }


  /* ------------------------------------------------------------------------
     Modèle : un tournoi manuel est une entrée d'EVENTS avec custom: true et
     une liste de matchs. Côté 'a' / 'b' (et non le nom) pour que renommer un
     joueur ne casse pas les pronostics.
       match = { id, stage, a, b, pick: 'a'|'b'|null, actual: 'a'|'b'|null, pickedAt }
     ------------------------------------------------------------------------ */

  function normMatch(m) {
    if (!m || typeof m !== 'object') return null;
    const a = clean(m.a, 60), b = clean(m.b, 60);
    if (!a || !b || lower(a) === lower(b)) return null;
    const side = v => (v === 'a' || v === 'b') ? v : null;
    const at   = Number(m.pickedAt);
    return {
      id:       clean(m.id, 20).replace(/[^\w-]/g, '') || 'm' + uid(),
      stage:    clean(m.stage, 60),
      a, b,
      pick:     side(m.pick),
      actual:   side(m.actual),
      pickedAt: Number.isFinite(at) && at > 0 ? at : null,
    };
  }

  /** Compteurs d'un tournoi : seuls les pronostics dont le résultat est connu comptent. */
  function counts(ev) {
    let hit = 0, of = 0, pending = 0, unpicked = 0, results = 0;
    ev.matches.forEach(m => {
      if (m.actual) results++;
      if (m.pick) {
        if (m.actual) { of++; if (m.pick === m.actual) hit++; }
        else pending++;
      } else if (!m.actual) {
        unpicked++;
      }
    });
    return { hit, of, pending, unpicked, results, total: ev.matches.length };
  }

  /** Recalcule score et statut (le statut découle des résultats saisis). */
  function derive(ev) {
    const c = counts(ev);
    ev.tally = c.of > 0 ? { hit: c.hit, of: c.of } : null;
    ev.state = !c.total ? 'soon' : c.results === c.total ? 'done' : c.results > 0 ? 'live' : 'soon';
    return c;
  }

  function hydrate(r) {
    if (!r || typeof r !== 'object') return null;
    const name = clean(r.name, 80);
    if (!name) return null;

    const seen = new Set();
    const matches = (Array.isArray(r.matches) ? r.matches : [])
      .slice(0, MAX_MATCHES)
      .map(normMatch)
      .filter(Boolean)
      .map(m => { while (seen.has(m.id)) m.id = 'm' + uid(); seen.add(m.id); return m; });

    const bannerUser = safeUrl(r.banner, true);
    const w = (r.winner && typeof r.winner === 'object') ? r.winner : {};

    const ev = {
      id:     clean(r.id, 60).replace(/[^\w-]/g, '') || 'c-' + (slugify(name) || uid()),
      name,
      season: SEASONS.includes(Number(r.season)) ? Number(r.season) : 2026,
      kind:   'other',
      state:  'soon',
      canon:  r.canon === true,
      banner: bannerUser || FALLBACK_BANNER,
      bannerUser,
      dates:  clean(r.dates, 40),
      source: safeUrl(r.source),
      tally:  null,
      pick:   { mine: clean(w.mine, 60), actual: clean(w.actual, 60) || null },
      stages: [],
      custom: true,
      matches,
      createdAt: Number(r.createdAt) > 0 ? Number(r.createdAt) : Date.now(),
    };
    derive(ev);
    return ev;
  }

  function serialize(ev) {
    return {
      id: ev.id, name: ev.name, season: ev.season, dates: ev.dates,
      source: ev.source, banner: ev.bannerUser, canon: ev.canon === true,
      winner: { mine: ev.pick.mine, actual: ev.pick.actual },
      matches: ev.matches.map(({ id, stage, a, b, pick, actual, pickedAt }) =>
        ({ id, stage, a, b, pick, actual, pickedAt })),
      createdAt: ev.createdAt,
    };
  }

  function uniqueId(base, self = null) {
    let id = base;
    while (EVENTS.some(e => e.id === id && e !== self)) id = `${base}-${uid()}`;
    return id;
  }

  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(EVENTS.filter(e => e.custom).map(serialize)));
      return true;
    } catch (err) {
      console.warn('[Predict] écriture localStorage impossible :', err);
      toast('⚠ Sauvegarde impossible : le navigateur refuse le stockage local. Exporte tes données dès que possible.');
      return false;
    }
  }

  /** Reprend la casse d'un nom déjà saisi (évite "mawk" ≠ "Mawk"). */
  function canonName(ev, name) {
    const n = lower(name);
    for (const m of ev.matches) {
      if (lower(m.a) === n) return m.a;
      if (lower(m.b) === n) return m.b;
    }
    return name;
  }

  function canonWinner(ev, mine, actual) {
    mine   = mine   ? canonName(ev, mine)   : '';
    actual = actual ? canonName(ev, actual) : null;
    if (actual && lower(actual) === lower(mine)) actual = mine;   // même joueur, même casse
    return { mine, actual };
  }

  /**
   * Lignes "Étape | A vs B" → [{ stage, a, b }].
   *  - "Étape |" seul sur une ligne définit l'étape des lignes suivantes ;
   *  - une ligne sans "|" reprend l'étape précédente ;
   *  - séparateurs de duel : vs, v, contre, - (entourés d'espaces) ;
   *  - lignes vides et lignes commençant par # ignorées.
   */
  function parseBulk(text, defaultStage = '') {
    const SEP = /\s+(?:vs\.?|v|contre|[-–—])\s+/i;
    const items = [], skipped = [];
    let stage = defaultStage;

    String(text ?? '').split(/\r?\n/).forEach(raw => {
      const line = raw.trim();
      if (!line || line.startsWith('#')) return;

      let body = line;
      const bar = line.indexOf('|');
      if (bar >= 0) {
        stage = clean(line.slice(0, bar), 60);
        body  = line.slice(bar + 1).trim();
        if (!body) return;                       // ligne d'en-tête d'étape
      }

      const parts = body.split(SEP);
      const a = parts.length === 2 ? clean(parts[0], 60) : '';
      const b = parts.length === 2 ? clean(parts[1], 60) : '';
      if (!a || !b || lower(a) === lower(b)) { skipped.push(line); return; }
      items.push({ stage, a, b });
    });

    return { items, skipped };
  }

  function addMatches(ev, items) {
    const keyOf = (stage, a, b) => `${lower(stage)}|${[lower(a), lower(b)].sort().join('~')}`;
    const have  = new Set(ev.matches.map(m => keyOf(m.stage, m.a, m.b)));
    let added = 0, dup = 0, over = 0;

    for (const it of items) {
      if (ev.matches.length >= MAX_MATCHES) { over++; continue; }
      const a = canonName(ev, it.a), b = canonName(ev, it.b);
      const k = keyOf(it.stage, a, b);
      if (have.has(k)) { dup++; continue; }
      have.add(k);
      ev.matches.push({ id: 'm' + uid(), stage: it.stage, a, b, pick: null, actual: null, pickedAt: null });
      added++;
    }
    return { added, dup, over };
  }


  /* ------------------------------------------------------------------------
     Rendu du panneau de pronostics (injecté par Blocks.event)
     ------------------------------------------------------------------------ */

  function matchHTML(m) {
    const locked  = Boolean(m.actual);
    const verdict = !m.pick ? 'none' : !m.actual ? 'pending' : m.pick === m.actual ? 'hit' : 'miss';
    const stamp   = { hit: 'Juste', miss: 'Raté', pending: 'En attente' }[verdict] || (m.actual ? 'Sans prono' : '');

    const cell = side => {
      const name   = m[side];
      const logo   = logoFor(name);
      const img    = logo ? `<img src="${escAttr(logo)}" class="pm-logo" alt="" loading="lazy">` : '';
      const picked = m.pick === side;
      const won    = m.actual === side;
      const pickTitle = locked
        ? 'Verrouillé : le résultat est saisi'
        : picked
          ? (m.pickedAt ? `Pronostiqué le ${fmtDate(m.pickedAt)} — clic pour retirer` : 'Pronostiqué — clic pour retirer')
          : `Pronostiquer ${name}`;

      return `
        <div class="pm-cell${picked ? ' is-pick' : ''}${won ? ' is-win' : ''}">
          <button type="button" class="pm-pick" data-p="pick" data-side="${side}" aria-pressed="${picked}"${locked ? ' disabled' : ''} title="${escAttr(pickTitle)}">${img}<span class="pm-name">${escText(name)}</span></button>
          <button type="button" class="pm-win" data-p="win" data-side="${side}" aria-pressed="${won}" aria-label="${escAttr(name + ' a gagné')}" title="${escAttr(won ? 'Retirer le résultat' : 'Résultat : ' + name + ' gagne')}">✓</button>
        </div>`;
    };

    const label = `${m.stage ? m.stage + ' : ' : ''}${m.a} contre ${m.b}`;
    return `
      <div class="pm" role="group" aria-label="${escAttr(label)}" data-mid="${escAttr(m.id)}" data-verdict="${verdict}">
        ${cell('a')}<span class="pm-vs" aria-hidden="true">vs</span>${cell('b')}
        <span class="pm-stampbox">${stamp ? `<span class="pm-stamp">${stamp}</span>` : ''}</span>
        <button type="button" class="pm-del" data-p="del-match" aria-label="Supprimer ce match" title="Supprimer ce match">✕</button>
      </div>`;
  }

  /**
   * Panneau complet : résumé, outils, ajout de matchs, liste groupée par étape.
   * @param {EventEntry & { matches: object[] }} ev
   */
  function panelHTML(ev) {
    const c  = counts(ev);
    const id = escAttr(ev.id);

    const names  = [...new Set(ev.matches.flatMap(m => [m.a, m.b]))];
    const stages = [...new Set(ev.matches.map(m => m.stage).filter(Boolean))];
    const lastStage = ui.lastStage.get(ev.id) ?? ev.matches[ev.matches.length - 1]?.stage ?? '';

    const bits = [plural(c.total, 'match', 'matchs'), `${plural(c.of, 'résolu')}`, `${c.pending} en attente`];
    if (c.unpicked) bits.push(`${c.unpicked} à pronostiquer`);
    const summary = c.total ? bits.join(' · ') : 'Aucun match enregistré';

    const groups = new Map();
    ev.matches.forEach(m => {
      const k = m.stage || '';
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(m);
    });

    const list = c.total
      ? [...groups].map(([stage, ms]) =>
          `${(groups.size > 1 || stage) ? `<p class="stage-group-label">${escText(stage || 'Matchs')}</p>` : ''}${ms.map(matchHTML).join('')}`
        ).join('')
      : `<div class="pred-empty">Ajoute les matchs du tournoi ci-dessus (un par un, ou en masse), puis clique sur un joueur pour pronostiquer.</div>`;

    const source = ev.source
      ? `<a class="pred-link" href="${escAttr(ev.source)}" target="_blank" rel="noopener noreferrer">Source ↗</a>` : '';

    return `
      <section class="pred" data-pid="${id}" aria-label="Pronostics manuels">
        <div class="pred-head">
          <h3 class="pred-title">Pronostics</h3>
          <p class="pred-summary">${escText(summary)}</p>
          <div class="pred-tools">
            ${source}
            <button type="button" class="stage-toolbar-btn" data-p="edit-event">Modifier</button>
            <button type="button" class="stage-toolbar-btn pred-danger" data-p="delete-event">Supprimer</button>
          </div>
        </div>

        <form class="pred-add" data-p-form="add-match" autocomplete="off">
          <input name="stage" list="pred-stages-${id}" maxlength="60" placeholder="Étape (ex : Quarts)" value="${escAttr(lastStage)}" aria-label="Étape">
          <input name="a" list="pred-names-${id}" maxlength="60" placeholder="Joueur / équipe A" required aria-label="Côté A">
          <span class="pm-vs" aria-hidden="true">vs</span>
          <input name="b" list="pred-names-${id}" maxlength="60" placeholder="Joueur / équipe B" required aria-label="Côté B">
          <button type="submit" class="admin-generate pred-add-btn">Ajouter</button>
          <datalist id="pred-names-${id}">${names.map(n => `<option value="${escAttr(n)}">`).join('')}</datalist>
          <datalist id="pred-stages-${id}">${stages.map(s => `<option value="${escAttr(s)}">`).join('')}</datalist>
        </form>

        <details class="pred-bulk">
          <summary>Ajout en masse</summary>
          <form data-p-form="bulk">
            <textarea name="bulk" class="pred-textarea" rows="6" aria-label="Matchs à ajouter" placeholder="Quarts | Mawk vs Nass&#10;Nass vs NMJF&#10;Demies | Mawk vs NMJF"></textarea>
            <p class="pred-hint">Un match par ligne. <code>Étape | A vs B</code> — l'étape est reprise sur les lignes suivantes. Séparateurs acceptés : <code>vs</code>, <code>v</code>, <code>-</code>.</p>
            <button type="submit" class="stage-toolbar-btn">Ajouter ces matchs</button>
          </form>
        </details>

        <div class="pred-list">${list}</div>
      </section>`;
  }


  /* ------------------------------------------------------------------------
     Rafraîchissement
     ------------------------------------------------------------------------ */

  /** Remplace seulement la fiche de l'événement (garde défilement et focus). */
  function refresh(id) {
    const ev  = State.find(id);
    const old = $('event-' + id);
    if (!ev || !old) return;

    const f = document.activeElement;
    const row = f && old.contains(f) ? f.closest('.pm') : null;
    const keep = row ? { mid: row.dataset.mid, p: f.dataset.p, side: f.dataset.side } : null;

    const tpl = document.createElement('template');
    tpl.innerHTML = Blocks.event(ev).trim();
    const fresh = tpl.content.firstElementChild;
    if (old.classList.contains('is-active')) fresh.classList.add('is-active');
    fresh.classList.add('no-anim');
    old.replaceWith(fresh);

    Screen.buildRail();
    Screen.buildTicker();

    if (keep && keep.p) {
      const row2 = fresh.querySelector(`.pm[data-mid="${keep.mid}"]`);
      let el = row2?.querySelector(`[data-p="${keep.p}"]` + (keep.side ? `[data-side="${keep.side}"]` : ''));
      if (!el || el.disabled) el = row2?.querySelector(`[data-p="win"]` + (keep.side ? `[data-side="${keep.side}"]` : ''));
      el?.focus({ preventScroll: true });
    }
  }

  /** Reconstruit tout (création, modification de saison/nom, suppression, import). */
  function rebuild(goId) {
    Screen.mount();
    Screen.buildTicker();
    Router.go(goId ? Router.eventRoute(goId) : Router.homeRoute);
  }

  function finish(ev) {
    derive(ev);
    persist();
    refresh(ev.id);
  }


  /* ------------------------------------------------------------------------
     Éditeur (création / modification d'un tournoi)
     ------------------------------------------------------------------------ */

  let editing = null;
  let opener  = null;

  function editorHTML() {
    return `
      <form id="predict-form" class="admin-form" data-p-form="editor" autocomplete="off">
        <div class="admin-grid">
          <label class="pred-span2">Nom du tournoi
            <input name="name" required maxlength="80" placeholder="Rocket Baguette — Predator Solo Cup"></label>
          <label>Saison
            <select name="season">${SEASONS.map(s => `<option value="${s}">${s}</option>`).join('')}</select></label>
          <label>Dates
            <input name="dates" maxlength="40" placeholder="24–25 octobre 2026"></label>
          <label class="pred-span2">Lien source (Liquipedia…)
            <input name="source" type="url" inputmode="url" placeholder="https://liquipedia.net/…"></label>
          <label class="pred-span2">Bannière (optionnel)
            <input name="banner" placeholder="/img/xxx.png ou https://…"></label>
          <label>Mon pronostic vainqueur
            <input name="mine" maxlength="60" placeholder="Mawk"></label>
          <label>Vainqueur réel
            <input name="actual" maxlength="60" placeholder="vide tant que ce n'est pas joué"></label>
        </div>

        <label class="pref-switch"><span>Compter dans les stats du circuit RLCS</span><input type="checkbox" name="canon" role="switch"></label>
        <p class="pred-hint">Désactivé par défaut : un petit tournoi hors circuit ne doit pas tirer ton % global.</p>

        <label class="pred-bulk-label" data-create-only>Matchs (optionnel, un par ligne)
          <textarea name="lines" class="pred-textarea" rows="7" placeholder="Quarts | Mawk vs Nass&#10;Nass vs NMJF&#10;Demies | Mawk vs NMJF"></textarea></label>
        <p class="pred-hint" data-create-only>Format <code>Étape | A vs B</code>. Tu pourras en ajouter d'autres plus tard, au fil du bracket.</p>

        <div class="pred-actions">
          <button type="submit" class="admin-generate" id="predict-submit">Créer le tournoi</button>
          <button type="button" class="stage-toolbar-btn" data-p="editor-close">Annuler</button>
        </div>
      </form>`;
  }

  function ensureModal() {
    let modal = $('predict-modal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'predict-modal';
    modal.className = 'modal';
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = `
      <div class="modal-backdrop" data-p="editor-close"></div>
      <div class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="predict-modal-title">
        <div class="modal-head">
          <h2 id="predict-modal-title"></h2>
          <button type="button" class="modal-close" data-p="editor-close" aria-label="Fermer">✕</button>
        </div>
        <div class="modal-body">${editorHTML()}</div>
      </div>`;
    document.body.append(modal);
    return modal;
  }

  function defaultSeason() {
    const y = new Date().getFullYear();
    return SEASONS.includes(y) ? y : 2026;
  }

  function openEditor(ev, from) {
    const modal = ensureModal();
    const f = $('predict-form');
    editing = ev || null;
    opener  = from || document.activeElement;

    f.reset();
    $('predict-modal-title').textContent = ev ? 'Modifier le tournoi' : 'Nouveau pronostic manuel';
    $('predict-submit').textContent      = ev ? 'Enregistrer' : 'Créer le tournoi';

    const set = (n, v) => { f.elements[n].value = v ?? ''; };
    set('name', ev?.name);
    set('season', ev?.season ?? defaultSeason());
    set('dates', ev?.dates);
    set('source', ev?.source);
    set('banner', ev?.bannerUser);
    set('mine', ev?.pick.mine);
    set('actual', ev?.pick.actual);
    f.elements.canon.checked = ev ? ev.canon === true : false;
    f.querySelectorAll('[data-create-only]').forEach(el => { el.hidden = Boolean(ev); });

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    f.elements.name.focus();
  }

  function closeEditor() {
    const modal = $('predict-modal');
    if (!modal?.classList.contains('is-open')) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (opener && document.contains(opener)) opener.focus?.({ preventScroll: true });
    opener = null;
  }

  function submitEditor(form) {
    const fd = new FormData(form);
    const name = clean(fd.get('name'), 80);
    if (!name) { toast('Donne un nom au tournoi.'); form.elements.name.focus(); return; }

    const sourceRaw = String(fd.get('source') ?? '').trim();
    const bannerRaw = String(fd.get('banner') ?? '').trim();
    const source = safeUrl(sourceRaw);
    const banner = safeUrl(bannerRaw, true);
    if (sourceRaw && !source) { toast('Lien source invalide (http ou https attendu).'); form.elements.source.focus(); return; }
    if (bannerRaw && !banner) { toast('Bannière invalide (chemin /… ou lien http/https).'); form.elements.banner.focus(); return; }

    const season = Number(fd.get('season'));
    const fields = {
      name,
      season: SEASONS.includes(season) ? season : defaultSeason(),
      dates:  clean(fd.get('dates'), 40),
      source,
      canon:  fd.has('canon'),
    };
    const mine   = clean(fd.get('mine'), 60);
    const actual = clean(fd.get('actual'), 60);

    if (editing) {
      const ev = editing;
      Object.assign(ev, fields, { bannerUser: banner, banner: banner || FALLBACK_BANNER });
      ev.pick = canonWinner(ev, mine, actual);
      derive(ev);
      persist();
      closeEditor();
      toast('Tournoi mis à jour.');
      rebuild(ev.id);
      return;
    }

    const ev = hydrate({ ...fields, banner, winner: { mine: '', actual: '' }, matches: [] });
    ev.id = uniqueId(ev.id);
    const parsed = parseBulk(fd.get('lines'));
    const res    = addMatches(ev, parsed.items);
    ev.pick = canonWinner(ev, mine, actual);
    derive(ev);

    State.register(ev);
    persist();
    closeEditor();

    const notes = [`${plural(res.added, 'match', 'matchs')} ajouté${res.added > 1 ? 's' : ''}`];
    if (parsed.skipped.length) notes.push(`${plural(parsed.skipped.length, 'ligne')} illisible${parsed.skipped.length > 1 ? 's' : ''} ignorée${parsed.skipped.length > 1 ? 's' : ''}`);
    if (res.dup)  notes.push(`${plural(res.dup, 'doublon')} ignoré${res.dup > 1 ? 's' : ''}`);
    toast(`Tournoi créé — ${notes.join(' · ')}.`);
    rebuild(ev.id);
  }


  /* ------------------------------------------------------------------------
     Actions sur les matchs
     ------------------------------------------------------------------------ */

  function addMatchFromForm(ev, form) {
    const fd = new FormData(form);
    const stage = clean(fd.get('stage'), 60);
    const a = clean(fd.get('a'), 60), b = clean(fd.get('b'), 60);

    if (!a || !b)                 { toast('Renseigne les deux côtés du match.'); return; }
    if (lower(a) === lower(b))    { toast('Les deux côtés du match sont identiques.'); return; }

    ui.lastStage.set(ev.id, stage);
    const res = addMatches(ev, [{ stage, a, b }]);
    if (res.over) { toast(`Limite de ${MAX_MATCHES} matchs atteinte.`); return; }
    if (!res.added) { toast('Ce match existe déjà dans cette étape.'); return; }

    finish(ev);
    $('event-' + ev.id)?.querySelector('.pred-add [name="a"]')?.focus({ preventScroll: true });
  }

  function addBulkFromForm(ev, form) {
    const parsed = parseBulk(new FormData(form).get('bulk'), ui.lastStage.get(ev.id) ?? '');
    if (!parsed.items.length) {
      toast(parsed.skipped.length ? 'Aucune ligne lisible. Format attendu : Étape | A vs B' : 'Rien à ajouter.');
      return;
    }
    const res = addMatches(ev, parsed.items);
    ui.lastStage.set(ev.id, parsed.items[parsed.items.length - 1].stage);

    const notes = [`${plural(res.added, 'match', 'matchs')} ajouté${res.added > 1 ? 's' : ''}`];
    if (parsed.skipped.length) notes.push(`${plural(parsed.skipped.length, 'ligne')} ignorée${parsed.skipped.length > 1 ? 's' : ''}`);
    if (res.dup)  notes.push(`${plural(res.dup, 'doublon')} ignoré${res.dup > 1 ? 's' : ''}`);
    if (res.over) notes.push(`limite de ${MAX_MATCHES} atteinte`);
    toast(notes.join(' · ') + '.');

    if (res.added) finish(ev);
  }

  function deleteEvent(ev) {
    if (!confirm(`Supprimer « ${ev.name} » et ses ${plural(ev.matches.length, 'match', 'matchs')} ? Cette action est définitive (pense à exporter avant).`)) return;
    State.unregister(ev.id);
    persist();
    toast('Tournoi supprimé.');
    rebuild(null);
  }


  /* ------------------------------------------------------------------------
     Export / import (sauvegarde : tout vit dans le localStorage du navigateur)
     ------------------------------------------------------------------------ */

  function readJSON(raw, fallback) {
    try { return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
  }

  function exportData() {
    const payload = {
      app: 'onirlcs',
      version: 1,
      exportedAt: new Date().toISOString(),
      tallies: readJSON(localStorage.getItem(APP.DB_KEY), {}),
      custom:  EVENTS.filter(e => e.custom).map(serialize),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `onirlcs-sauvegarde-${payload.exportedAt.slice(0, 10)}.json`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('Sauvegarde exportée.');
  }

  async function importFile(file) {
    let data;
    try { data = JSON.parse(await file.text()); }
    catch { toast('Fichier illisible : ce n’est pas un JSON valide.'); return; }

    if (!data || data.app !== 'onirlcs' || typeof data.tallies !== 'object' || !Array.isArray(data.custom)) {
      toast('Ce fichier n’est pas une sauvegarde OniRLCS.');
      return;
    }

    const custom = data.custom.map(hydrate).filter(Boolean);
    const tallies = Object.fromEntries(
      Object.entries(data.tallies ?? {})
        .filter(([, v]) => v && Number.isFinite(Number(v.hit)) && Number.isFinite(Number(v.of)) && Number(v.of) > 0)
        .map(([k, v]) => {
          const of = Math.min(999, Math.floor(Number(v.of)));
          return [String(k).slice(0, 80), { hit: Math.max(0, Math.min(of, Math.floor(Number(v.hit)))), of }];
        })
    );

    const msg = `Importer ${plural(custom.length, 'tournoi manuel', 'tournois manuels')} et ${plural(Object.keys(tallies).length, 'score')} ?\n\n` +
                'Cela REMPLACE tes données locales actuelles (scores saisis et tournois manuels).';
    if (!confirm(msg)) return;

    try {
      localStorage.setItem(APP.DB_KEY, JSON.stringify(tallies));
      localStorage.setItem(KEY, JSON.stringify(custom.map(serialize)));
    } catch {
      toast('Import impossible : le navigateur refuse le stockage local.');
      return;
    }
    location.reload();
  }


  /* ------------------------------------------------------------------------
     Délégation d'événements
     ------------------------------------------------------------------------ */

  function onClick(e) {
    const t = e.target.closest('[data-p]');
    if (!t) return;

    const pid = t.closest('[data-pid]')?.dataset.pid;
    const ev  = pid ? State.find(pid) : null;
    const mid = t.closest('[data-mid]')?.dataset.mid;
    const m   = ev?.custom && mid ? ev.matches.find(x => x.id === mid) : null;

    switch (t.dataset.p) {
      case 'new-event':
        Drawer.close();
        openEditor(null, t);
        break;

      case 'edit-event':
        if (ev?.custom) openEditor(ev, t);
        break;

      case 'delete-event':
        if (ev?.custom) deleteEvent(ev);
        break;

      case 'editor-close':
        closeEditor();
        break;

      case 'pick': {
        const side = t.dataset.side;
        if (!m || m.actual || (side !== 'a' && side !== 'b')) break;
        m.pick = m.pick === side ? null : side;
        m.pickedAt = m.pick ? Date.now() : null;
        finish(ev);
        break;
      }

      case 'win': {
        const side = t.dataset.side;
        if (!m || (side !== 'a' && side !== 'b')) break;
        m.actual = m.actual === side ? null : side;
        finish(ev);
        break;
      }

      case 'del-match': {
        if (!m) break;
        if ((m.pick || m.actual) && !confirm(`Supprimer « ${m.a} vs ${m.b} » et son pronostic ?`)) break;
        ev.matches.splice(ev.matches.indexOf(m), 1);
        finish(ev);
        break;
      }

      case 'export':
        exportData();
        break;

      case 'import':
        $('data-import-file')?.click();
        break;
    }
  }

  function onSubmit(e) {
    const form = e.target.closest?.('[data-p-form]');
    if (!form) return;
    e.preventDefault();

    const ev = State.find(form.closest('[data-pid]')?.dataset.pid);

    switch (form.dataset.pForm) {
      case 'add-match': if (ev?.custom) addMatchFromForm(ev, form); break;
      case 'bulk':      if (ev?.custom) addBulkFromForm(ev, form);  break;
      case 'editor':    submitEditor(form);                         break;
    }
  }

  function onKeydown(e) {
    const modal = $('predict-modal');
    if (!modal?.classList.contains('is-open')) return;

    if (e.key === 'Escape') { e.preventDefault(); closeEditor(); return; }

    if (e.key === 'Tab') {                         // piège du focus dans la modale
      const focusable = [...modal.querySelectorAll('input, select, textarea, button, a[href]')]
        .filter(el => !el.disabled && !el.closest('[hidden]') && el.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  document.addEventListener('click', onClick);
  document.addEventListener('submit', onSubmit);
  document.addEventListener('keydown', onKeydown);
  $('data-import-file')?.addEventListener('change', e => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) importFile(file);
  });


  /* ------------------------------------------------------------------------
     Chargement : injecte les tournois sauvegardés dans EVENTS (avant State)
     ------------------------------------------------------------------------ */

  (function init() {
    let raw = null, arr = [];
    try {
      raw = localStorage.getItem(KEY);
      arr = raw ? JSON.parse(raw) : [];
    } catch {
      // JSON corrompu : on garde une copie avant que la prochaine sauvegarde ne l'écrase
      try { if (raw) localStorage.setItem(KEY + '.corrupt', raw); } catch { /* ignore */ }
      arr = [];
    }
    if (!Array.isArray(arr)) arr = [];

    arr.forEach(r => {
      const ev = hydrate(r);
      if (!ev) return;
      ev.id = uniqueId(ev.id);
      EVENTS.push(ev);
    });
  })();

  return { panelHTML, counts, derive, hydrate, parseBulk, addMatches, serialize };
})();