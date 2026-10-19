'use strict';

window.EVENTS = window.EVENTS || [];

window.EVENTS.push(
  {
    id: 'boston', name: 'Boston', season: 2026, kind: 'major', state: 'done',
    banner: '/img/ppboston.png', dates: '19–22 février 2026',
    tally: { hit: 26, of: 33 },
    pick: { mine: 'Team Vitality', actual: 'Gentle Mates' },
    stages: [
      {
        id: 'groups', title: 'Groups',
        shots: [
          { src: '/img/Boston-group.png', caption: 'Mes Prédictions Groups — Boston 2026' },
          { src: '/img/Boston-group-results.png', caption: 'Résultats Groups — Boston 2026' },
        ],
      },
      {
        id: 'playoffs', title: 'Playoffs',
        shots: [
          { src: '/img/Boston-playoff-results.png', caption: 'Résultats Playoffs — Boston 2026' },
        ],
      },
      {
        id: 'ALL', title: 'ALL',
        shots: [
          { src: '/img/Boston-ALL.png', caption: 'Résultats ALL — Boston 2026' },
        ],
      },
    ],
  },
  {
    id: 'paris', name: 'Paris', season: 2026, kind: 'major', state: 'done',
    banner: '/img/parispp.png', dates: '20–24 mai 2026',
    tally: { hit: 27, of: 37 },
    pick: { mine: 'Karmine Corp', actual: 'Karmine Corp' },
    stages: [
      {
        id: 'groups', title: 'Group Stage',
        shots: [
          { src: '/img/Paris-Group.png', caption: 'Mes Prédictions Groups — Paris 2026' },
          { src: '/img/Paris-Group-Results.png', caption: 'Résultats Groups — Paris 2026' },
        ],
      },
      {
        id: 'playoffs', title: 'Playoffs',
        shots: [
          { src: '/img/PARIS-Playoff.png', caption: 'Mes Prédictions Playoffs — Paris 2026', flag: 'Prédiction avant le commencement des Playoffs' },
          { src: '/img/PARIS-Playoff-results.png', caption: 'Résultat Playoffs — Paris 2026' },
        ],
      },
      {
        id: 'ALL', title: 'ALL',
        shots: [
          { src: '/img/Paris-ALL.png', caption: 'ALL — Paris 2026' },
        ],
      },
    ],
  },
  {
    id: '2V2 EU', name: '2v2 EU', season: 2026, kind: 'qualifier', state: 'done',
    banner: '/img/worlds2025.png', dates: '05–07 juin 2026',
    tally: { hit: 17, of: 29 },
    pick: { mine: 'NMJF', actual: 'NMJF' },
    stages: [
      {
        id: 'groups', title: 'Group Stage',
        shots: [
          { src: '/img/2V2-group-stage-predi.png', caption: 'Mes Prédictions Group Stage — 2v2 EU 2026', flag: 'Prédiction avant le commencement des Groups Stage' },
          { src: '/img/2V2-group-stage-results.png', caption: 'Résults Group Stage — 2v2 EU 2026' },
        ],
      },
      {
        id: 'playoffs', title: 'Playoffs',
        shots: [
          { src: '/img/2V2-playoff-predi.png', caption: 'Mes prédictions Playoffs - 2v2 EU 2026' },
          { src: '/img/2V2-playoff-results.png', caption: 'Résultats Playoffs - 2v2 EU 2026' },
        ],
      },
      {
        id: 'ALL', title: 'ALL',
        shots: [
          { src: '/img/ALL-predi-2V2-EU.png', caption: 'ALL - 2v2 EU' },
        ],
      },
    ],
  },
  {
    id: '1V1 EU', name: '1V1 EU', season: 2026, kind: 'qualifier', state: 'done',
    banner: '/img/worlds2025.png', dates: '19–21 juin 2026',
    tally: { hit: 6, of: 9 },
    pick: { mine: 'Mawk', actual: 'Nass' },
    stages: [
      {
        id: 'playoffs', title: 'Playoffs',
        shots: [
          { src: '/img/1V1-playoff-predi.png', caption: 'Mes prédictions Playoffs - 1v1 EU 2026', flag: 'Prédiction avant le commencement des Playoffs' },
          { src: '/img/1V1-playoff-results.png', caption: 'Résultats Playoffs - 1v1 EU 2026' },
        ],
      },
      {
        id: 'ALL', title: 'ALL',
        shots: [
          { src: '/img/1V1-playoff-results.png', caption: 'Résultats Playoffs - 1v1 EU 2026' },
        ],
      },
    ],
  },
  {
    id: 'LCQ-2026', name: 'LCQ 2026', season: 2026, kind: 'qualifier', state: 'done',
    banner: '/img/RLCSpp.png', dates: '3–25 juillet 2026',
    tally: { hit: 7, of: 9 },
    pick: { mine: 'Volaire', actual: 'Mate y Tapa' },
    stages: [
      {
        id: 'playoffs', title: 'Playoffs',
        shots: [
          { src: '/img/LCQ-2026-Result.png', caption: 'Mes prédictions Playoffs & Resultats - LCQ EU 2026' },
        ],
      },
    ],
  },
  {
    id: 'ewc-2026', name: 'Esports World Cup 2026', season: 2026, kind: 'other', state: 'done',
    canon: false,
    banner: '/img/ewcpp.png', dates: '12–16 août 2026',
    tally: { hit: 18, of: 28 },
    pick: { mine: 'Karmine Corp', actual: 'Falcons' },
    stages: [
      {
        id: 'groups', title: 'Group Stage',
        shots: [
          { src: '/img/EWC-group-stage.png', caption: 'Group Stage 2026' },
        ],
      },
      {
        id: 'playoffs', title: 'Playoffs',
        shots: [
          { src: '/img/EWC-playoff-predi.png', caption: 'Prédictions Playoffs', flag: 'Mes prédictions avant le début des playoffs !' },
          { src: '/img/EWC-playoff-results-2026.png', caption: 'Résultats Playoffs' },
        ],
      },
      {
        id: 'ALL', title: 'ALL',
        shots: [
          { src: '/img/EWC-ALL.png', caption: 'ALL - EWC 2026' },
        ],
      },
    ],
  },
  {
    id: 'worlds-2026', name: 'RLCS 2026 World Championship', season: 2026, kind: 'worlds', state: 'done',
    banner: '/img/Worlds2026.png', dates: '15–20 septembre 2026',
    tally: { hit: 36, of: 53 },
    pick: { mine: 'Karmine Corp', actual: 'Falcons' },
    stages: [
      {
        id: '3v3-play-in', title: '3v3 — Play-In',
        shots: [
          { src: '/img/Worlds-Playin-predi.png', caption: 'Mes prédictions Play-In — 3v3 Worlds 2026', flag: 'Prédiction avant le commencement du Play-In' },
          { src: '/img/Worlds-Playin-results.png', caption: 'Résultats Play-In — 3v3 Worlds 2026', flag: 'Résultats Play-In' },
        ],
      },
      {
        id: '3v3-groups', title: '3v3 — Group Stage',
        shots: [
          { src: '/img/Worlds-group-predi.png', caption: 'Mes prédictions Group Stage — 3v3 Worlds 2026', flag: 'Prédiction avant le commencement du Group Stage' },
          { src: '/img/Worlds-group-results.png', caption: 'Résultats Group Stage — 3v3 Worlds 2026', flag: 'Résultats Group Stage' },
        ],
      },
      {
        id: '3v3-playoffs', title: '3v3 — Playoffs',
        shots: [
          { src: '/img/Worlds-PO-predi.png', caption: 'Mes prédictions Play-Offs — 3v3 Worlds 2026', flag: 'Prédiction avant le commencement du Play-Offs' },
          { src: '/img/Worlds-PO-results.png', caption: 'Résultats Play-Offs — 3v3 Worlds 2026', flag: 'Résultats Play-Offs' },
        ],
      },
      {
        id: '2v2', title: '2v2 — World Championship',
        shots: [
          { src: '/img/Worlds-playoff-2v2-predi.png', caption: 'Mes prédictions Playoffs — 2V2 Worlds 2026', flag: 'Prédiction avant le commencement du 2V2' },
          { src: '/img/Worlds-playoff-2v2-results.png', caption: 'Résultats Playoffs — 2V2 Worlds 2026', flag: 'Résultats 2V2' },
        ],
      },
      {
        id: '1v1', title: '1v1 — World Championship',
        shots: [
          { src: '/img/Worlds-playoff-1v1-predi.png', caption: 'Mes prédictions Playoffs — 1V1 Worlds 2026', flag: 'Prédiction avant le commencement du 1V1' },
          { src: '/img/Worlds-playoff-1v1-results.png', caption: 'Résultats Playoffs — 1V1 Worlds 2026', flag: 'Résultats 1v1' },
        ],
      },
      { id: 'ALL', title: 'ALL', shots: [] },
    ],
  },
  {
    id: 'rocket-baguette-solo-2026',
    name: 'Rocket Baguette — Predator Solo Cup',
    season: 2026,
    kind: 'lan',
    state: 'live',
    canon: true,
    banner: '/img/Predator_Solo_Cup_2025.png',
    dates: '24–25 octobre 2026',
    source: 'https://liquipedia.net/rocketleague/Rocket_Baguette/Predator_Solo_Cup/2026#Results',
    tally: null,
    pick: { mine: 'Mawkzy', actual: null },
    stages: [],
    custom: true,
    matches: [
      {
        id: 'm101',
        stage: 'Demi-finales',
        a: 'Mawkzy',
        b: 'GiuK',
        pick: 'a',      // Ton prono : Mawkzy
        actual: null,   // Résultat réel pas encore joué
        pickedAt: 1761264000000
      },
      {
        id: 'm102',
        stage: 'Demi-finales',
        a: 'rust ez95',
        b: 'Mozzarella',
        pick: 'b',      // Ton prono : Mozzarella
        actual: null,
        pickedAt: 1761264000000
      },
      {
        id: 'm103',
        stage: 'Finale',
        a: 'TBD',       // Officiellement pas encore déterminé
        b: 'TBD',
        pick: 'a',      // Ton prono pour la finale
        actual: null,
        pickedAt: 1761265000000
      }
    ]
  },
  {
    id: 'knockout-series-2026',
    name: 'KNOCKOUT SERIES',
    season: 2026,
    kind: 'other',
    state: 'soon',
    canon: false,
    banner: '/img/RLCSpp.png',
    dates: '20 octobre – 14 novembre 2026',
    source: 'https://liquipedia.net/rocketleague/KNOCKOUT_SERIES/2026',
    tally: null,
    pick: { mine: 'Mawkzy', actual: null },
    stages: [],
    custom: true,
    matches: [
      /* --- QUARTS DE FINALE --- */
      { id: 'm201', stage: 'Quarts de finale', a: 'TBD', b: 'TBD', pick: null, actual: null, pickedAt: null },
      { id: 'm202', stage: 'Quarts de finale', a: 'TBD', b: 'TBD', pick: null, actual: null, pickedAt: null },
      { id: 'm203', stage: 'Quarts de finale', a: 'TBD', b: 'TBD', pick: null, actual: null, pickedAt: null },
      { id: 'm204', stage: 'Quarts de finale', a: 'TBD', b: 'TBD', pick: null, actual: null, pickedAt: null },

      /* --- DEMI-FINALES --- */
      { id: 'm205', stage: 'Demi-finales', a: 'TBD', b: 'TBD', pick: null, actual: null, pickedAt: null },
      { id: 'm206', stage: 'Demi-finales', a: 'TBD', b: 'TBD', pick: null, actual: null, pickedAt: null },

      /* --- FINALE --- */
      { id: 'm207', stage: 'Finale', a: 'TBD', b: 'TBD', pick: null, actual: null, pickedAt: null }
    ]
  },
);