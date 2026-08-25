/**
 * Woordgroepen voor Spiegelspelers.
 *
 * Iedereen krijgt een woord uit dezelfde groep. Twee spelers krijgen precies
 * hetzelfde; de rest krijgt iets anders uit die groep. Ze lijken dus genoeg op
 * elkaar dat een vage hint bij meerdere woorden past.
 *
 * Elke groep moet minstens acht woorden hebben, want met acht spelers heb je
 * er zeven verschillende nodig plus de dubbele.
 */
export interface Groep {
  naam: string
  woorden: string[]
}

export const GROEPEN: Groep[] = [
  {
    naam: 'drank',
    woorden: ['bier', 'wijn', 'cola', 'koffie', 'thee', 'water', 'wodka', 'melk', 'sap', 'whisky'],
  },
  {
    naam: 'dieren',
    woorden: ['hond', 'kat', 'paard', 'olifant', 'muis', 'slang', 'haai', 'uil', 'konijn', 'beer'],
  },
  {
    naam: 'eten',
    woorden: ['pizza', 'patat', 'soep', 'brood', 'sushi', 'pasta', 'salade', 'taart', 'kaas', 'ei'],
  },
  {
    naam: 'vervoer',
    woorden: ['fiets', 'trein', 'auto', 'vliegtuig', 'boot', 'metro', 'bus', 'scooter', 'taxi', 'tram'],
  },
  {
    naam: 'plekken',
    woorden: ['strand', 'school', 'ziekenhuis', 'kroeg', 'bos', 'museum', 'station', 'kerk', 'zolder', 'garage'],
  },
  {
    naam: 'weer',
    woorden: ['regen', 'sneeuw', 'zon', 'mist', 'storm', 'hagel', 'onweer', 'wind', 'vorst', 'hitte'],
  },
  {
    naam: 'kleding',
    woorden: ['jas', 'broek', 'schoenen', 'muts', 'sok', 'trui', 'jurk', 'riem', 'sjaal', 'hemd'],
  },
  {
    naam: 'sport',
    woorden: ['voetbal', 'tennis', 'zwemmen', 'hardlopen', 'schaatsen', 'boksen', 'golf', 'yoga', 'hockey', 'darten'],
  },
  {
    naam: 'lichaam',
    woorden: ['hand', 'voet', 'oog', 'neus', 'knie', 'oor', 'rug', 'tand', 'haar', 'duim'],
  },
  {
    naam: 'in huis',
    woorden: ['bank', 'bed', 'lamp', 'spiegel', 'deur', 'raam', 'tafel', 'kast', 'stoel', 'trap'],
  },
  {
    naam: 'beroepen',
    woorden: ['bakker', 'dokter', 'agent', 'leraar', 'kapper', 'piloot', 'boer', 'kok', 'monteur', 'kelner'],
  },
  {
    naam: 'muziek',
    woorden: ['gitaar', 'piano', 'drums', 'zingen', 'techno', 'festival', 'radio', 'koptelefoon', 'viool', 'karaoke'],
  },
  {
    naam: 'gevoel',
    woorden: ['boos', 'blij', 'moe', 'bang', 'verliefd', 'jaloers', 'trots', 'verdrietig', 'zenuwachtig', 'verveeld'],
  },
  {
    naam: 'feest',
    woorden: ['taart', 'ballon', 'cadeau', 'vuurwerk', 'confetti', 'dansen', 'toost', 'slingers', 'kaarsjes', 'muziek'],
  },
  {
    naam: 'natuur',
    woorden: ['boom', 'berg', 'rivier', 'woestijn', 'eiland', 'grot', 'vulkaan', 'meer', 'bloem', 'zee'],
  },
  {
    naam: 'op vakantie',
    woorden: ['koffer', 'hotel', 'paspoort', 'zonnebrand', 'camping', 'vliegveld', 'kaart', 'gids', 'souvenir', 'strandbed'],
  },
]
