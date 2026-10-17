/* ==========================================================================
   id.js — Socle de données : réglages, libellés, roster d'équipes.
   Fichier sans dépendance, chargé en tout premier (defer).
   Expose au scope global : APP, STATUS_TEXT, KIND_TEXT, TEAM_LOGOS, EVENTS
   ========================================================================== */

'use strict';


/* --------------------------------------------------------------------------
   RÉGLAGES
   -------------------------------------------------------------------------- */

const APP = Object.freeze({
  DB_KEY: 'onirlcs.tally.v3',
  SESSION: {
    SEASON: 'onirlcs.season',
    EVENT:  'onirlcs.event',
  },
  LOCAL: {
    LAST_EVENT: 'onirlcs.last-event',
  },
  GRADE: { GOOD: 80, MID: 65 },
  START_SEASON: '2025',
});

/** État d'un événement → libellé affiché */
const STATUS_TEXT = Object.freeze({
  done: 'Terminé',
  live: 'En cours',
  soon: 'À venir',
});

/**
 * Catégorie d'un événement → libellé affiché.
 * NB : 'lan' désigne un tournoi LAN du circuit RLCS qui n'est
 * ni un Major ni un Worlds (ex : Kick-Off LAN).
 */
const KIND_TEXT = Object.freeze({
  major:     'Major',
  worlds:    'Worlds',
  qualifier: 'Qualifier',
  lan:       'LAN',
  other:     'Autre',
});


/* --------------------------------------------------------------------------
   ROSTER — nom d'équipe → logo
   Une entrée par variante orthographique connue. Résolution insensible
   à la casse assurée par logoFor() dans app.js.
   -------------------------------------------------------------------------- */

/** @type {Record<string, string>} */
const TEAM_LOGOS = Object.freeze({
  'BDS':                '/teams/BDS.png',
  'Team BDS':           '/teams/BDS.png',
  'Complexity':         '/teams/COMP.png',
  'Dignitas':           '/teams/DIG.png',
  'Falcons':            '/teams/FLCN.png',
  'Five Fears':         '/teams/FF.png',
  'FF':                 '/teams/FF.png',
  'Geekay':             '/teams/GEEK.png',
  'GenG':               '/teams/GENG.png',
  'Gen.G':              '/teams/GENG.png',
  'HC':                 '/teams/HC.png',
  'Karmine':            '/teams/KC.png',
  'Karmine Corp':       '/teams/KC.png',
  'KarmineCorp':        '/teams/KC.png',
  'Luminosity':         '/teams/LUM.png',
  'Gentle Mates':       '/teams/M8.png',
  'GentleMates':        '/teams/M8.png',
  'Gentlemates':        '/teams/M8.png',
  'M8':                 '/teams/M8.png',
  'Manchester City':    '/teams/MAN.png',
  'MIBR':               '/teams/MIBR.png',
  'Ninjas In Pyjamas':  '/teams/NIP.png',
  'NiP':                '/teams/NIP.png',
  'NIP':                '/teams/NIP.png',
  'NRG':                '/teams/NRG.png',
  'PWR':                '/teams/PWR.png',
  'R8 Esport':          '/teams/R8.png',
  'R8':                 '/teams/R8.png',
  'Shopify Rebellion':  '/teams/REB.png',
  'Shopify Rebelion':   '/teams/REB.png',
  'Twisted Minds':      '/teams/TM.png',
  'Team Secret':        '/teams/TS.png',
  'TSM':                '/teams/TSM.png',
  'Ultimates':          '/teams/ULT.png',
  'Team Vitality':      '/teams/VIT.png',
  'Vitality':           '/teams/VIT.png',
  'Virtus Pro':         '/teams/VP.png',
  'VP':                 '/teams/VP.png',
  'Wildcard':           '/teams/WILD.png',
  'NMJF':               '/teams/Default.png',
  'Mawk':               '/teams/France.png',
  'Nass':               '/teams/M8.png',
});


/* --------------------------------------------------------------------------
   CALENDRIER — événements RLCS suivis
   Les événements sont désormais alimentés dynamiquement par les fichiers
   présents dans le dossier events/ (2025.js, 2026.js, 2027.js).
   -------------------------------------------------------------------------- */

/** @typedef {{ src: string, caption: string, flag?: string }} Shot */
/** @typedef {{ id: string, title: string, shots: Shot[] }} Stage */
/** @typedef {{ hit: number, of: number }} Tally */
/** @typedef {{ mine: string, actual: string|null }} Pick */

/**
 * @typedef {{
 *   id: string, name: string, season: number,
 *   kind: 'major'|'worlds'|'qualifier'|'lan'|'other',
 *   state: 'done'|'live'|'soon',
 *   banner: string, dates: string,
 *   canon?: boolean,
 *   tally?: Tally|null,
 *   pick: Pick,
 *   stages: Stage[],
 * }} EventEntry
 */

/** @type {EventEntry[]} */
const EVENTS = window.EVENTS || [];