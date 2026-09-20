/* ==========================================================================
   id.js — Socle de données : réglages, libellés, roster d'équipes,
           calendrier d'événements RLCS.
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

   Champ `canon` (optionnel, défaut = true si absent) :
   marque si l'événement fait partie du circuit officiel RLCS.
   `canon: false` = tournoi hors-circuit (ex : EWC, FIFAe — événements
   multi-jeux ou d'un autre jeu) : toujours affiché, mais exclu des
   agrégats "par saison" / "meilleur-pire" / total général dans app.js.
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
const EVENTS = [

  /* ── Saison 2025 ─────────────────────────────────────────────────────── */

  {
    id: 'birmingham', name: 'Birmingham', season: 2025, kind: 'major', state: 'done',
    banner: '/img/Birminghampp.png', dates: '27–30 mars 2025',
    tally: { hit: 35, of: 42 },
    pick: { mine: 'Karmine', actual: 'Karmine' },
    stages: [
      {
        id: 'swiss', title: 'Swiss',
        shots: [
          { src: '/img/Birg-swiss-predi.png', caption: 'Prédiction Swiss Stage — Birmingham 2025' },
          { src: '/img/Birmingham-swiss.png',  caption: 'Swiss Stage — Birmingham 2025' },
        ],
      },
      {
        id: 'mainevent', title: 'Main Event',
        shots: [
          { src: '/img/Birg-predi-PO-avant.png', caption: 'Main Event Bracket Prediction — Birmingham 2025', flag: 'Prédiction avant le commencement des Playoffs' },
          { src: '/img/Birmingham-mainevent.png', caption: 'Main Event Bracket — Birmingham 2025' },
        ],
      },
      {
        id: 'ALL', title: 'ALL',
        shots: [
          { src: '/img/Birmingham-ALL.png', caption: 'ALL — Birmingham 2025' },
        ],
      },
    ],
  },

  {
    id: 'raleigh', name: 'Raleigh', season: 2025, kind: 'major', state: 'done',
    banner: '/img/ppraleigh.png', dates: '26–29 juin 2025',
    tally: { hit: 32, of: 42 },
    pick: { mine: 'Falcons', actual: 'Falcons' },
    stages: [
      {
        id: 'swiss', title: 'Swiss',
        shots: [
          { src: '/img/RALEIGH-SWISS.png', caption: 'Swiss Stage — Raleigh 2025' },
          { src: '/img/RALEIGH-SWISS-results.png', caption: 'Swiss Stage résultats — Raleigh 2025' },
        ],
      },
      {
        id: 'playoffs', title: 'Playoffs',
        shots: [
          { src: '/img/RALEIGH-MAINEVENT-results.png', caption: 'Playoffs — Raleigh 2025' },
        ],
      },
      {
        id: 'ALL', title: 'ALL',
        shots: [
          { src: '/img/RALEIGH-results.png', caption: 'ALL — Raleigh 2025' },
        ],
      },
    ],
  },

  {
    id: 'LCQ', name: 'LCQ', season: 2025, kind: 'qualifier', state: 'done',
    banner: '/img/RLCSpp.png', dates: 'Début été 2025',
    tally: { hit: 4, of: 9 },
    pick: { mine: 'GentleMates', actual: 'Ninjas In Pyjamas' },
    stages: [
      {
        id: 'mainevent', title: 'Main Event',
        shots: [
          { src: '/img/LCQ-mainevent.png', caption: 'LCQ 2025' },
        ],
      },
    ],
  },

  {
    id: 'ewc', name: 'EWC', season: 2025, kind: 'other', state: 'done',
    canon: false,
    banner: '/img/EWCpp.png', dates: '14–17 août 2025',
    tally: { hit: 22, of: 28 },
    pick: { mine: 'Karmine', actual: 'Karmine' },
    stages: [
      {
        id: 'groups', title: 'Groups',
        shots: [
          { src: '/img/EWC-group.png', caption: 'Group Stage — EWC 2025' },
        ],
      },
      {
        id: 'mainevent', title: 'Main Event',
        shots: [
          { src: '/img/EWC-mainevent.png', caption: 'ME — EWC 2025' },
        ],
      },
      {
        id: 'ALL', title: 'ALL',
        shots: [
          { src: '/img/EWC.png', caption: 'ALL — EWC 2025' },
        ],
      },
    ],
  },


  /* ── Saison 2026 ─────────────────────────────────────────────────────── */

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
        id: 'groups',
        title: 'Group Stage',
        shots: [
          { src: '/img/2V2-group-stage-predi.png', caption: 'Mes Prédictions Group Stage — 2v2 EU 2026', flag: 'Prédiction avant le commencement des Groups Stage' },
          { src: '/img/2V2-group-stage-results.png', caption: 'Résults Group Stage — 2v2 EU 2026' },
        ],
      },
      {
        id: 'playoffs',
        title: 'Playoffs',
        shots: [
          { src: '/img/2V2-playoff-predi.png', caption: 'Mes prédictions Playoffs - 2v2 EU 2026' },
          { src: '/img/2V2-playoff-results.png', caption: 'Résultats Playoffs - 2v2 EU 2026' },
        ],
      },
      {
        id: 'ALL',
        title: 'ALL',
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
        id: 'playoffs',
        title: 'Playoffs',
        shots: [
          { src: '/img/1V1-playoff-predi.png', caption: 'Mes prédictions Playoffs - 1v1 EU 2026', flag: 'Prédiction avant le commencement des Playoffs' },
          { src: '/img/1V1-playoff-results.png', caption: 'Résultats Playoffs - 1v1 EU 2026' },
        ],
      },
      {
        id: 'ALL',
        title: 'ALL',
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
        id: 'playoffs',
        title: 'Playoffs',
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
        id: 'groups',
        title: 'Group Stage',
        shots: [
          { src: '/img/EWC-group-stage.png', caption: 'Group Stage 2026' },
        ],
      },
      {
        id: 'playoffs',
        title: 'Playoffs',
        shots: [
          { src: '/img/EWC-playoff-predi.png', caption: 'Prédictions Playoffs', flag: 'Mes prédictions avant le début des playoffs !' },
          { src: '/img/EWC-playoff-results-2026.png', caption: 'Résultats Playoffs' },
        ],
      },
      {
        id: 'ALL',
        title: 'ALL',
        shots: [
          { src: '/img/EWC-ALL.png', caption: 'ALL - EWC 2026' },
        ],
      },
    ],
  },

  /* ── WORLDS 2026 : 3V3 + 2V2 + 1V1 ─────────────────────────────────── */

  {
    id: 'worlds-2026',
    name: 'RLCS 2026 World Championship',
    season: 2026,
    kind: 'worlds',
    tally: { hit: 36, of: 53 },
    state: 'done',
    banner: '/img/Worlds2026.png',
    dates: '15–20 septembre 2026',

    pick: {
      mine: 'Karmine Corp',
      actual: 'Falcons',
    },

    stages: [

      /* ── 3V3 ───────────────────────────────────────────────────────── */

      {
        id: '3v3-play-in',
        title: '3v3 — Play-In',
        shots: [
          {
            src: '/img/Worlds-Playin-predi.png',
            caption: 'Mes prédictions Play-In — 3v3 Worlds 2026',
            flag: 'Prédiction avant le commencement du Play-In',
          },
          {
            src: '/img/Worlds-Playin-results.png',
            caption: 'Résultats Play-In — 3v3 Worlds 2026',
            flag: 'Résultats Play-In',
          },
        ],
      },

      {
        id: '3v3-groups',
        title: '3v3 — Group Stage',
        shots: [
          {
            src: '/img/Worlds-group-predi.png',
            caption: 'Mes prédictions Group Stage — 3v3 Worlds 2026',
            flag: 'Prédiction avant le commencement du Group Stage',
          },
          {
            src: '/img/Worlds-group-results.png',
            caption: 'Résultats Group Stage — 3v3 Worlds 2026',
            flag: 'Résultats Group Stage',
          },
        ],
      },

      {
        id: '3v3-playoffs',
        title: '3v3 — Playoffs',
        shots: [
          {
            src: '/img/Worlds-PO-predi.png',
            caption: 'Mes prédictions Play-Offs — 3v3 Worlds 2026',
            flag: 'Prédiction avant le commencement du Play-Offs',
          },
          {
            src: '/img/Worlds-PO-results.png',
            caption: 'Résultats Play-Offs — 3v3 Worlds 2026',
            flag: 'Résultats Play-Offs',
          },
        ],
      },

      /* ── 2V2 ───────────────────────────────────────────────────────── */

      {
        id: '2v2',
        title: '2v2 — World Championship',
        shots: [
          {
            src: '/img/Worlds-playoff-2v2-predi.png',
            caption: 'Mes prédictions Playoffs — 2V2 Worlds 2026',
            flag: 'Prédiction avant le commencement du 2V2',
          },
          {
            src: '/img/Worlds-playoff-2v2-results.png',
            caption: 'Résultats Playoffs — 2V2 Worlds 2026',
            flag: 'Résultats 2V2',
          },
        ],
      },

      /* ── 1V1 ───────────────────────────────────────────────────────── */

      {
        id: '1v1',
        title: '1v1 — World Championship',
        shots: [
          {
            src: '/img/Worlds-playoff-1v1-predi.png',
            caption: 'Mes prédictions Playoffs — 1V1 Worlds 2026',
            flag: 'Prédiction avant le commencement du 1V1',
          },
          {
            src: '/img/Worlds-playoff-1v1-results.png',
            caption: 'Résultats Playoffs — 1V1 Worlds 2026',
            flag: 'Résultats 1v1',
          },
        ],
      },

      /* ── VUE GLOBALE ──────────────────────────────────────────────── */

      {
        id: 'ALL',
        title: 'ALL',
        shots: [],
      },

    ],
  },

  {
    id: 'FIFAe-2026',
    name: 'FIFAe World Cup 2026',
    season: 2026,
    kind: 'other',
    state: 'soon',
    canon: false,
    banner: '/img/fifae.png',
    dates: '20-25 octobre 2026',

    pick: {
      mine: 'TBD',
      actual: null,
    },

    stages: [
      {
        id: 'groups',
        title: 'Groups',
        shots: [],
      },
      {
        id: 'playoffs',
        title: 'Playoffs',
        shots: [],
      },
      {
        id: 'ALL',
        title: 'ALL',
        shots: [],
      },
    ],
  },

  {
    id: 'Kick-Off-LAN-2026',
    name: 'Kick-Off Lan 2026',
    season: 2026,
    kind: 'lan',
    state: 'soon',
    banner: '/img/kick-off.png',
    dates: '09-13 décembre 2026',

    pick: {
      mine: 'TBD',
      actual: null,
    },

    stages: [
      {
        id: 'groups',
        title: 'Groups',
        shots: [],
      },
      {
        id: 'playoffs',
        title: 'Playoffs',
        shots: [],
      },
      {
        id: 'ALL',
        title: 'ALL',
        shots: [],
      },
    ],
  },

];