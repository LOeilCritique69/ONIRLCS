'use strict';

window.EVENTS = window.EVENTS || [];

window.EVENTS.push(
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
  }
);