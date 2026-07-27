/* ==========================================================================
   id.js — Sections 1 & 2 : Configuration & Données de tournois
   Chargé en premier (defer). Aucune dépendance externe.
   Expose : CONFIG, STATUS_LABELS, TYPE_LABELS, TEAMS, TOURNAMENTS
   ========================================================================== */

'use strict';


/* --------------------------------------------------------------------------
   1. CONFIGURATION
   -------------------------------------------------------------------------- */

const CONFIG = Object.freeze({
  STORAGE_KEY:  'rlcs_scores2',
  SESSION_KEYS: {
    CATEGORY:   'rlcs_current_category',
    TOURNAMENT: 'rlcs_current_tournament',
  },
  SCORE_THRESHOLDS: { GOOD: 80, OK: 65 },
  DEFAULT_YEAR: '2025',
});

const STATUS_LABELS = Object.freeze({
  completed: 'Terminé',
  ongoing:   'En cours',
  upcoming:  'À venir',
});

const TYPE_LABELS = Object.freeze({
  major:     'Major',
  worlds:    'Worlds',
  qualifier: 'Qualifier',
  other:     'Autre',
});


/* --------------------------------------------------------------------------
   1b. REGISTRE DES ÉQUIPES
   Pour ajouter une équipe : une seule ligne ici.
   La clé doit correspondre exactement à la valeur de `pred` / `result`
   dans TOURNAMENTS (insensible à la casse — voir getTeam() dans data.js).
   -------------------------------------------------------------------------- */

/** @type {Record<string, string>} nom → chemin logo */
const TEAMS = Object.freeze({
  // BDS
  'BDS':                '/teams/BDS.png',
  'Team BDS':           '/teams/BDS.png',
  // Complexity
  'Complexity':         '/teams/COMP.png',
  // Dignitas
  'Dignitas':           '/teams/DIG.png',
  // Falcons
  'Falcons':            '/teams/FLCN.png',
  // Five Fears
  'Five Fears':         '/teams/FF.png',
  'FF':                 '/teams/FF.png',
  // Geekay
  'Geekay':             '/teams/GEEK.png',
  // Gen.G
  'GenG':               '/teams/GENG.png',
  'Gen.G':              '/teams/GENG.png',
  // HC
  'HC':                 '/teams/HC.png',
  // Karmine Corp
  'Karmine':            '/teams/KC.png',
  'Karmine Corp':       '/teams/KC.png',
  'KarmineCorp':        '/teams/KC.png',
  // Luminosity
  'Luminosity':         '/teams/LUM.png',
  // Gentle Mates
  'Gentle Mates':       '/teams/M8.png',
  'GentleMates':        '/teams/M8.png',
  'Gentlemates':        '/teams/M8.png',
  'M8':                 '/teams/M8.png',
  // Manchester City
  'Manchester City':    '/teams/MAN.png',
  // MIBR
  'MIBR':               '/teams/MIBR.png',
  // Ninjas In Pyjamas
  'Ninjas In Pyjamas':  '/teams/NIP.png',
  'NiP':                '/teams/NIP.png',
  'NIP':                '/teams/NIP.png',
  // NRG
  'NRG':                '/teams/NRG.png',
  // PWR
  'PWR':                '/teams/PWR.png',
  // R8 Esport
  'R8 Esport':          '/teams/R8.png',
  'R8':                 '/teams/R8.png',
  // Shopify Rebellion
  'Shopify Rebellion':  '/teams/REB.png',
  'Shopify Rebelion':   '/teams/REB.png',
  // Twisted Minds
  'Twisted Minds':      '/teams/TM.png',
  // Team Secret
  'Team Secret':        '/teams/TS.png',
  // TSM
  'TSM':                '/teams/TSM.png',
  // Ultimates
  'Ultimates':          '/teams/ULT.png',
  // Team Vitality
  'Team Vitality':      '/teams/VIT.png',
  'Vitality':           '/teams/VIT.png',
  // Virtus Pro
  'Virtus Pro':         '/teams/VP.png',
  'VP':                 '/teams/VP.png',
  // Wildcard
  'Wildcard':           '/teams/WILD.png',
  'NMJF':               '/teams/Default.png',
  'Mawk':               '/teams/France.png',
  'Nass':               '/teams/M8.png'
});


/* --------------------------------------------------------------------------
   2. DONNÉES DE TOURNOIS
   -------------------------------------------------------------------------- */

/** @typedef {{ src: string, label: string, note?: string }} GalleryImage */
/** @typedef {{ id: string, label: string, desc?: string, imgs: GalleryImage[] }} Phase */
/** @typedef {{ correct: number, total: number }} Score */

/**
 * @typedef {{ pred: string, result: string|null }} Champion
 * Les logos sont résolus automatiquement depuis TEAMS — ne plus les saisir ici.
 */

/**
 * @typedef {{
 *   id: string, name: string, year: number,
 *   type: 'major'|'worlds'|'qualifier'|'other',
 *   status: 'completed'|'ongoing'|'upcoming',
 *   logo: string, date: string,
 *   score?: Score|null,
 *   champion: Champion,
 *   phases: Phase[],
 *   description?: string,
 * }} Tournament
 */

/** @type {Tournament[]} */
const TOURNAMENTS = [

  /* ── 2025 ──────────────────────────────────────────────────────────────── */

  {
    id: 'birmingham', name: 'Birmingham', year: 2025, type: 'major', status: 'completed',
    logo: '/img/Birminghampp.png', date: '27–30 mars 2025',
    score: { correct: 35, total: 42 },
    champion: { pred: 'Karmine', result: 'Karmine' },
    phases: [
      {
        id: 'swiss', label: 'Swiss',
        imgs: [
          { src: '/img/Birg-swiss-predi.png',  label: 'Prédiction Swiss Stage — Birmingham 2025' },
          { src: '/img/Birmingham-swiss.png',   label: 'Swiss Stage — Birmingham 2025' },
        ],
      },
      {
        id: 'mainevent', label: 'Main Event',
        imgs: [
          { src: '/img/Birg-predi-PO-avant.png', label: 'Main Event Bracket Prediction — Birmingham 2025', note: 'Prédiction avant le commencement des Playoffs' },
          { src: '/img/Birmingham-mainevent.png', label: 'Main Event Bracket — Birmingham 2025' },
        ],
      },
      {
        id: 'ALL', label: 'ALL',
        imgs: [
          { src: '/img/Birmingham-ALL.png', label: 'ALL — Birmingham 2025' },
        ],
      },
    ],
  },

  {
    id: 'raleigh', name: 'Raleigh', year: 2025, type: 'major', status: 'completed',
    logo: '/img/ppraleigh.png', date: '26–29 juin 2025',
    score: { correct: 32, total: 42 },
    champion: { pred: 'Falcons', result: 'Falcons' },
    phases: [
      {
        id: 'swiss', label: 'Swiss',
        imgs: [
          { src: '/img/RALEIGH-SWISS.png',         label: 'Swiss Stage — Raleigh 2025' },
          { src: '/img/RALEIGH-SWISS-results.png',  label: 'Swiss Stage résultats — Raleigh 2025' },
        ],
      },
      {
        id: 'playoffs', label: 'Playoffs',
        imgs: [
          { src: '/img/RALEIGH-MAINEVENT-results.png', label: 'Playoffs — Raleigh 2025' },
        ],
      },
      {
        id: 'ALL', label: 'ALL',
        imgs: [
          { src: '/img/RALEIGH-results.png', label: 'ALL — Raleigh 2025' },
        ],
      },
    ],
  },

  {
    id: 'LCQ', name: 'LCQ', year: 2025, type: 'qualifier', status: 'completed',
    logo: '/img/RLCSpp.png', date: 'Début été 2025',
    score: { correct: 4, total: 9 },
    champion: { pred: 'GentleMates', result: 'Ninjas In Pyjamas' },
    phases: [
      {
        id: 'mainevent', label: 'Main Event',
        imgs: [
          { src: '/img/LCQ-mainevent.png', label: 'LCQ 2025' },
        ],
      },
    ],
  },

  {
    id: 'ewc', name: 'EWC', year: 2025, type: 'other', status: 'completed',
    logo: '/img/EWCpp.png', date: '14–17 août 2025',
    score: { correct: 22, total: 28 },
    champion: { pred: 'Karmine', result: 'Karmine' },
    phases: [
      {
        id: 'groups', label: 'Groups',
        imgs: [
          { src: '/img/EWC-group.png', label: 'Group Stage — EWC 2025' },
        ],
      },
      {
        id: 'mainevent', label: 'Main Event',
        imgs: [
          { src: '/img/EWC-mainevent.png', label: 'ME — EWC 2025' },
        ],
      },
      {
        id: 'ALL', label: 'ALL',
        imgs: [
          { src: '/img/EWC.png', label: 'ALL — EWC 2025' },
        ],
      },
    ],
  },


  /* ── 2026 ──────────────────────────────────────────────────────────────── */

  {
    id: 'boston', name: 'Boston', year: 2026, type: 'major', status: 'completed',
    logo: '/img/ppboston.png', date: '19–22 février 2026',
    score: { correct: 26, total: 33 },
    champion: { pred: 'Team Vitality', result: 'Gentle Mates' },
    phases: [
      {
        id: 'groups', label: 'Groups',
        imgs: [
          { src: '/img/Boston-group.png',          label: 'Mes Prédictions Groups — Boston 2026' },
          { src: '/img/Boston-group-results.png',   label: 'Résultats Groups — Boston 2026' },
        ],
      },
      {
        id: 'playoffs', label: 'Playoffs',
        imgs: [
          { src: '/img/Boston-playoff-results.png', label: 'Résultats Playoffs — Boston 2026' },
        ],
      },
      {
        id: 'ALL', label: 'ALL',
        imgs: [
          { src: '/img/Boston-ALL.png', label: 'Résultats ALL — Boston 2026' },
        ],
      },
    ],
  },

  {
    id: 'paris', name: 'Paris', year: 2026, type: 'major', status: 'completed',
    logo: '/img/parispp.png', date: '20–24 mai 2026',
    score: { correct: 27, total: 37 },
    champion: { pred: 'Karmine Corp', result: 'Karmine Corp' },
    phases: [
      {
        id: 'groups', label: 'Group Stage',
        imgs: [
          { src: '/img/Paris-Group.png',         label: 'Mes Prédictions Groups — Paris 2026' },
          { src: '/img/Paris-Group-Results.png',  label: 'Résultats Groups — Paris 2026' },
        ],
      },
      {
        id: 'playoffs', label: 'Playoffs',
        imgs: [
          { src: '/img/PARIS-Playoff.png',         label: 'Mes Prédictions Playoffs — Paris 2026', note: 'Prédiction avant le commencement des Playoffs' },
          { src: '/img/PARIS-Playoff-results.png',  label: 'Résultat Playoffs — Paris 2026' },
        ],
      },
      {
        id: 'ALL', label: 'ALL',
        imgs: [
          { src: '/img/Paris-ALL.png', label: 'ALL — Paris 2026' },
        ],
      },
    ],
  },

  {
    id: '2V2 EU', name: '2v2 EU', year: 2026, type: 'qualifier', status: 'completed',
    logo: '/img/worlds2025.png', date: '05–07 juin 2026',
    score: { correct: 17, total: 29 },
    champion: { pred: 'NMJF', result: 'NMJF' },
    phases: [
      { id: 'groups',   label: 'Group Stage', imgs: [{ src: '/img/2V2-group-stage-predi.png', label: 'Mes Prédictions Group Stage — 2v2 EU 2026', note: 'Prédiction avant le commencement des Groups Stage' }, { src: '/img/2V2-group-stage-results.png', label: 'Résults Group Stage — 2v2 EU 2026' }] },
      { id: 'playoffs', label: 'Playoffs',    imgs: [{ src: '/img/2V2-playoff-predi.png', label: 'Mes prédictions Playoffs - 2v2 EU 2026' }, { src: '/img/2V2-playoff-results.png', label: 'Résultats Playoffs - 2v2 EU 2026' }] },
      { id: 'ALL',      label: 'ALL',         imgs: [{ src: '/img/ALL-predi-2V2-EU.png', label: 'ALL - 2v2 EU' }] },
    ],
  },

  {
    id: '1V1 EU', name: '1V1 EU', year: 2026, type: 'qualifier', status: 'completed',
    logo: '/img/worlds2025.png', date: '19–21 juin 2026',
    score: { correct: 6, total: 9 },
    champion: { pred: 'Mawk', result: 'Nass' },
    phases: [
      { id: 'playoffs', label: 'Playoffs',    imgs: [{ src: '/img/1V1-playoff-predi.png', label: 'Mes prédictions Playoffs - 1v1 EU 2026',  note: 'Prédiction avant le commencement des Playoffs' }, { src: '/img/1V1-playoff-results.png', label: 'Résultats Playoffs - 1v1 EU 2026' }] },
      { id: 'ALL',      label: 'ALL',         imgs: [{ src: '/img/1V1-playoff-results.png', label: 'Résultats Playoffs - 1v1 EU 2026' }] },
    ],
  },

  {
    id: 'LCQ-2026', name: 'LCQ 2026', year: 2026, type: 'qualifier', status: 'completed',
    logo: '/img/RLCSpp.png', date: '3–25 juillet 2026',
    score: { correct: 7, total: 9 },
    champion: { pred: 'Volaire', result: 'Mate y Tapa' },
    phases: [
      { id: 'playoffs', label: 'Playoffs',    imgs: [{ src: '/img/LCQ-2026-Result.png', label: 'Mes prédictions Playoffs & Resultats - LCQ EU 2026' }] },
      { id: 'ALL',      label: 'ALL',         imgs: [] },
    ],
  },

  {
    id: 'ewc-LCQ-2026', name: 'Esports World Cup LCQ 2026', year: 2026, type: 'other', status: 'ongoing',
    logo: '/img/ewcpp.png', date: '12–16 août 2026',
    champion: { pred: 'TBD', result: null },
    phases: [
      { id: 'groups',   label: 'Groups',   imgs: [] },
      { id: 'playoffs', label: 'Playoffs', imgs: [] },
      { id: 'ALL',      label: 'ALL',      imgs: [] },
    ],
  },

  {
    id: 'ewc-2026', name: 'Esports World Cup 2026', year: 2026, type: 'other', status: 'upcoming',
    logo: '/img/ewcpp.png', date: '12–16 août 2026',
    champion: { pred: 'TBD', result: null },
    phases: [
      { id: 'groups',   label: 'Groups',   imgs: [] },
      { id: 'playoffs', label: 'Playoffs', imgs: [] },
      { id: 'ALL',      label: 'ALL',      imgs: [] },
    ],
  },

  {
    id: 'worlds-2026', name: 'RLCS 2026 World Championship', year: 2026, type: 'worlds', status: 'upcoming',
    logo: '/img/Worlds2025.png', date: '15–20 septembre 2026',
    champion: { pred: 'TBD', result: null },
    phases: [
      { id: 'swiss',    label: 'Swiss',       imgs: [] },
      { id: 'groups',   label: 'Group Stage', imgs: [] },
      { id: 'playoffs', label: 'Playoffs',    imgs: [] },
      { id: 'ALL',      label: 'ALL',         imgs: [] },
    ],
  },

  {
    id: 'worlds-2v2-2026', name: 'RLCS 2026 2v2 World Championship', year: 2026, type: 'worlds', status: 'upcoming',
    logo: '/img/Worlds2025.png', date: '15–20 septembre 2026',
    champion: { pred: 'TBD', result: null },
    phases: [
      { id: 'playoffs', label: 'Playoffs', imgs: [] },
    ],
  },

  {
    id: 'worlds-1v1-2026', name: 'RLCS 2026 1v1 World Championship', year: 2026, type: 'worlds', status: 'upcoming',
    logo: '/img/Worlds2025.png', date: '15–20 septembre 2026',
    champion: { pred: 'TBD', result: null },
    phases: [
      { id: 'main', label: 'Main Event', imgs: [] },
    ],
  },

  {
    id: 'enc-2026', name: 'Esports Nations Cup 2026', year: 2026, type: 'other', status: 'upcoming',
    logo: '/img/enc.png', date: '3–8 novembre 2026',
    champion: { pred: 'TBD', result: null },
    phases: [
      { id: 'groups',   label: 'Groups',   imgs: [] },
      { id: 'playoffs', label: 'Playoffs', imgs: [] },
      { id: 'ALL',      label: 'ALL',      imgs: [] },
    ],
  },

];