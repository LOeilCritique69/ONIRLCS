/* ==========================================================================
   predict.js — Découplage complet Prédictions / Résultats Officiels
   ========================================================================== */

'use strict';

const Predict = (() => {

  const ui = { lastStage: new Map() };

  const $      = id => document.getElementById(id);
  const lower  = s => String(s).toLowerCase();
  const plural = (n, one, many = one + 's') => `${n} ${n > 1 ? many : one}`;

  function counts(ev) {
    let hit = 0, of = 0, pending = 0, unpicked = 0, results = 0;
    (ev.matches || []).forEach(m => {
      if (m.actual) results++;
      if (m.pick) {
        if (m.actual) { of++; if (m.pick === m.actual) hit++; }
        else pending++;
      } else if (!m.actual) {
        unpicked++;
      }
    });
    return { hit, of, pending, unpicked, results, total: (ev.matches || []).length };
  }

  function derive(ev) {
    const c = counts(ev);
    ev.tally = c.of > 0 ? { hit: c.hit, of: c.of } : null;
    ev.state = !c.total ? 'soon' : c.results === c.total ? 'done' : c.results > 0 ? 'live' : 'soon';
    return c;
  }

  function panelHTML(ev) {
    const c  = counts(ev);
    const id = escAttr(ev.id);

    const matches = ev.matches || [];

    // --- 1. PREPARER LES DONNEES POUR MES PREDICTIONS (ARBRE PREDICTIF) ---
    // Copie indépendante pour ne pas altérer le tableau officiel
    const predMatches = JSON.parse(JSON.stringify(matches));
    
    // Propagation des pronostics vers la finale
    const demis = predMatches.filter(m => m.stage === 'Demi-finales');
    const finalePred = predMatches.find(m => m.stage === 'Finale');

    if (finalePred && demis.length >= 2) {
      const winner1 = demis[0].pick ? demis[0][demis[0].pick] : 'TBD';
      const winner2 = demis[1].pick ? demis[1][demis[1].pick] : 'TBD';
      finalePred.a = winner1;
      finalePred.b = winner2;
    }

    // --- 2. PREPARER LES DONNEES POUR LES RESULTATS OFFICIELS ---
    // Copie indépendante se basant uniquement sur m.actual
    const officialMatches = JSON.parse(JSON.stringify(matches));
    const demisOfficial = officialMatches.filter(m => m.stage === 'Demi-finales');
    const finaleOfficial = officialMatches.find(m => m.stage === 'Finale');

    if (finaleOfficial && demisOfficial.length >= 2) {
      const realWinner1 = demisOfficial[0].actual ? demisOfficial[0][demisOfficial[0].actual] : (matches.find(m => m.id === finaleOfficial.id)?.a || 'TBD');
      const realWinner2 = demisOfficial[1].actual ? demisOfficial[1][demisOfficial[1].actual] : (matches.find(m => m.id === finaleOfficial.id)?.b || 'TBD');
      finaleOfficial.a = realWinner1;
      finaleOfficial.b = realWinner2;
    }

    // Regroupement par étape pour le rendu
    const buildGroups = (matchList) => {
      const g = new Map();
      matchList.forEach(m => {
        const k = m.stage || 'Matchs';
        if (!g.has(k)) g.set(k, []);
        g.get(k).push(m);
      });
      return g;
    };

    const predGroups = buildGroups(predMatches);
    const officialGroups = buildGroups(officialMatches);

    // ----------------------------------------------------------------------
    // RENDU 1 : MES PRÉDICTIONS
    // ----------------------------------------------------------------------
    const predictionsBracketHTML = [...predGroups].map(([stageName, ms]) => {
      const matchups = ms.map(m => {
        const locked = Boolean(m.actual);

        const renderPickTeam = side => {
          const name = m[side] || 'TBD';
          const logo = logoFor(name);
          const img = logo ? `<img src="${escAttr(logo)}" class="team-logo" alt="" loading="lazy">` : '';
          const isPick = m.pick === side;

          return `
            <button type="button" class="team-btn ${isPick ? 'is-pick' : ''}" 
                    data-p="pick" data-side="${side}" ${locked || name === 'TBD' ? 'disabled' : ''} 
                    title="Pronostiquer ${escAttr(name)}">
              <span class="team-name">${escText(name)}</span>
              ${img}
            </button>`;
        };

        const verdict = !m.pick ? 'Sans prono' : !m.actual ? 'En attente' : m.pick === m.actual ? '✓ Juste' : '✕ Raté';

        return `
          <div class="matchup" data-mid="${escAttr(m.id)}">
            ${renderPickTeam('a')}
            ${renderPickTeam('b')}
            <div class="matchup-footer">
              <span class="matchup-status">${verdict}</span>
            </div>
          </div>`;
      }).join('');

      return `
        <div class="bracket-round">
          <div class="bracket-round-title">${escText(stageName)}</div>
          ${matchups}
        </div>`;
    }).join('');

    // ----------------------------------------------------------------------
    // RENDU 2 : RÉSULTATS OFFICIELS (INDÉPENDANT)
    // ----------------------------------------------------------------------
    const resultsBracketHTML = [...officialGroups].map(([stageName, ms]) => {
      const matchups = ms.map(m => {
        const renderResultTeam = side => {
          const name = m[side] || 'TBD';
          const logo = logoFor(name);
          const img = logo ? `<img src="${escAttr(logo)}" class="team-logo" alt="" loading="lazy">` : '';
          const isWinner = m.actual === side;

          return `
            <div class="team-btn team-display ${isWinner ? 'is-winner' : ''}">
              <span class="team-name">${escText(name)}</span>
              ${img}
            </div>`;
        };

        return `
          <div class="matchup">
            ${renderResultTeam('a')}
            ${renderResultTeam('b')}
          </div>`;
      }).join('');

      return `
        <div class="bracket-round">
          <div class="bracket-round-title">${escText(stageName)}</div>
          ${matchups}
        </div>`;
    }).join('');

    const source = ev.source
      ? `<a class="pred-link" href="${escAttr(ev.source)}" target="_blank" rel="noopener noreferrer">Source ↗</a>` : '';

    return `
      <section class="pred" data-pid="${id}" aria-label="Pronostics manuels">
        <div class="pred-head">
          <h3 class="pred-title">${escText(ev.name)}</h3>
          <p class="pred-summary">${plural(c.total, 'match', 'matchs')} · ${c.of} résolus</p>
          <div class="pred-tools">${source}</div>
        </div>

        <div class="tables-grid">
          <!-- PRÉDICTIONS -->
          <div class="table-block is-predictions">
            <div class="table-header">
              <h4 class="table-header-title">🎯 Mes Prédictions</h4>
            </div>
            <div class="bracket-container">
              <div class="bracket">
                ${predictionsBracketHTML || '<div class="pred-empty">Aucun match.</div>'}
              </div>
            </div>
          </div>

          <!-- RÉSULTATS OFFICIELS -->
          <div class="table-block is-results">
            <div class="table-header">
              <h4 class="table-header-title">🏆 Résultats Officiels</h4>
            </div>
            <div class="bracket-container">
              <div class="bracket">
                ${resultsBracketHTML || '<div class="pred-empty">Aucun match.</div>'}
              </div>
            </div>
          </div>
        </div>
      </section>`;
  }

  function refresh(id) {
    const ev  = State.find(id);
    const old = $('event-' + id);
    if (!ev || !old) return;

    const tpl = document.createElement('template');
    tpl.innerHTML = Blocks.event(ev).trim();
    const fresh = tpl.content.firstElementChild;
    if (old.classList.contains('is-active')) fresh.classList.add('is-active');
    fresh.classList.add('no-anim');
    old.replaceWith(fresh);

    Screen.buildRail();
    Screen.buildTicker();
  }

  function finish(ev) {
    derive(ev);
    refresh(ev.id);
  }

  function onClick(e) {
    const t = e.target.closest('[data-p="pick"]');
    if (!t) return;

    const pid = t.closest('[data-pid]')?.dataset.pid;
    const ev  = pid ? State.find(pid) : null;
    const mid = t.closest('[data-mid]')?.dataset.mid;
    const m   = ev?.custom && mid ? ev.matches.find(x => x.id === mid) : null;

    if (!m || m.actual) return;

    const side = t.dataset.side;
    m.pick = m.pick === side ? null : side;
    m.pickedAt = m.pick ? Date.now() : null;
    finish(ev);
  }

  document.addEventListener('click', onClick);

  return { panelHTML, counts, derive };
})();