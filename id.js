/* ==========================================================================
   id.js — Sections 1 & 2 : Configuration & Données de tournois
   Chargé en premier (defer). Aucune dépendance externe.
   Expose : CONFIG, STATUS_LABELS, TYPE_LABELS, TOURNAMENTS
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
   2. DONNÉES DE TOURNOIS
   -------------------------------------------------------------------------- */

/** @typedef {{ src: string, label: string, note?: string }} GalleryImage */
/** @typedef {{ id: string, label: string, desc?: string, imgs: GalleryImage[] }} Phase */
/** @typedef {{ correct: number, total: number }} Score */
/** @typedef {{ pred: string, predLogo: string|null, result: string|null, resultLogo: string|null }} Champion */
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
    champion: { pred: 'Karmine', predLogo: '/teams/KC.png', result: 'Karmine', resultLogo: '/teams/KC.png' },
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
    champion: { pred: 'Falcons', predLogo: '/teams/FLCN.png', result: 'Falcons', resultLogo: '/teams/FLCN.png' },
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
    champion: { pred: 'GentleMates', predLogo: '/teams/M8.png', result: 'Ninjas In Pyjamas', resultLogo: '/teams/nip.png' },
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
    champion: { pred: 'Karmine', predLogo: '/teams/KC.png', result: 'Karmine', resultLogo: '/teams/KC.png' },
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
    champion: { pred: 'Team Vitality', predLogo: '/teams/VIT.png', result: 'Gentle Mates', resultLogo: '/teams/M8.png' },
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
    champion: { pred: 'Karmine Corp', predLogo: '/teams/KC.png', result: 'Karmine Corp', resultLogo: '/teams/KC.png' },
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
    id: '2V2 EU', name: '2v2 EU', year: 2026, type: 'qualifier', status: 'upcoming',
    logo: '/img/worlds2025.png', date: '05–07 juin 2026',
    champion: { pred: 'TBD', predLogo: null, result: null, resultLogo: null },
    phases: [
      { id: 'groups',   label: 'Group Stage', imgs: [] },
      { id: 'playoffs', label: 'Playoffs',    imgs: [] },
      { id: 'ALL',      label: 'ALL',         imgs: [] },
    ],
  },

  {
    id: '1V1 EU', name: '1V1 EU', year: 2026, type: 'qualifier', status: 'upcoming',
    logo: '/img/worlds2025.png', date: '19–21 juin 2026',
    champion: { pred: 'TBD', predLogo: null, result: null, resultLogo: null },
    phases: [
      { id: 'groups',   label: 'Group Stage', imgs: [] },
      { id: 'playoffs', label: 'Playoffs',    imgs: [] },
      { id: 'ALL',      label: 'ALL',         imgs: [] },
    ],
  },

  {
    id: 'LCQ-2026', name: 'LCQ 2026', year: 2026, type: 'qualifier', status: 'upcoming',
    logo: '/img/RLCSpp.png', date: '3–25 juillet 2026',
    champion: { pred: 'TBD', predLogo: null, result: null, resultLogo: null },
    phases: [
      { id: 'groups',   label: 'Group Stage', imgs: [] },
      { id: 'playoffs', label: 'Playoffs',    imgs: [] },
      { id: 'ALL',      label: 'ALL',         imgs: [] },
    ],
  },

  {
    id: 'ewc-2026', name: 'Esports World Cup 2026', year: 2026, type: 'other', status: 'upcoming',
    logo: '/img/ewcpp.png', date: '12–16 août 2026',
    champion: { pred: 'TBD', predLogo: null, result: null, resultLogo: null },
    phases: [
      { id: 'groups',   label: 'Groups',   imgs: [] },
      { id: 'playoffs', label: 'Playoffs', imgs: [] },
      { id: 'ALL',      label: 'ALL',      imgs: [] },
    ],
  },

  {
    id: 'worlds-2026', name: 'RLCS 2026 World Championship', year: 2026, type: 'worlds', status: 'upcoming',
    logo: '/img/Worlds2025.png', date: '15–20 septembre 2026',
    champion: { pred: 'TBD', predLogo: null, result: null, resultLogo: null },
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
    champion: { pred: 'TBD', predLogo: null, result: null, resultLogo: null },
    phases: [
      { id: 'playoffs', label: 'Playoffs', imgs: [] },
    ],
  },

  {
    id: 'worlds-1v1-2026', name: 'RLCS 2026 1v1 World Championship', year: 2026, type: 'worlds', status: 'upcoming',
    logo: '/img/Worlds2025.png', date: '15–20 septembre 2026',
    champion: { pred: 'TBD', predLogo: null, result: null, resultLogo: null },
    phases: [
      { id: 'main', label: 'Main Event', imgs: [] },
    ],
  },

  {
    id: 'enc-2026', name: 'Esports Nations Cup 2026', year: 2026, type: 'other', status: 'upcoming',
    logo: '/img/enc.png', date: '3–8 novembre 2026',
    champion: { pred: 'TBD', predLogo: null, result: null, resultLogo: null },
    phases: [
      { id: 'groups',   label: 'Groups',   imgs: [] },
      { id: 'playoffs', label: 'Playoffs', imgs: [] },
      { id: 'ALL',      label: 'ALL',      imgs: [] },
    ],
  },

];