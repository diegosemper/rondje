/**
 * Woorden om te tekenen.
 *
 * Alles moet met een vinger op een telefoonscherm te doen zijn, dus concrete
 * dingen met een herkenbare vorm. De tekenaar krijgt er drie te zien en kiest
 * er één.
 *
 * De pittige woorden onderaan zijn het hele punt van dit spel. Een huis of een
 * boom tekent iedereen zonder blikken of blozen; een tafel gaat pas gillen als
 * er iemand met een vinger op zijn scherm zit te worstelen met iets wat hij
 * liever niet had getrokken. Ze moeten wel te tekenen zijn — daar is op
 * geselecteerd.
 */
export const TEKEN_WOORDEN: string[] = [
  // dingen om je heen
  'huis', 'boom', 'auto', 'fiets', 'boot', 'vliegtuig', 'trein', 'raket',
  'ladder', 'brug', 'molen', 'kerk', 'tent', 'iglo', 'vuurtoren', 'kasteel',
  'deur', 'raam', 'trap', 'schoorsteen', 'hek', 'brievenbus', 'lantaarnpaal',

  // dieren
  'kat', 'hond', 'vis', 'vogel', 'olifant', 'giraf', 'slang', 'spin',
  'kikker', 'schildpad', 'pinguïn', 'haai', 'octopus', 'vlinder', 'bij',
  'koe', 'varken', 'kip', 'paard', 'muis', 'krokodil', 'eekhoorn', 'uil',

  // eten en drinken
  'pizza', 'taart', 'banaan', 'appel', 'wortel', 'ei', 'kaas', 'brood',
  'ijsje', 'hamburger', 'patat', 'spaghetti', 'ananas', 'druiven', 'paprika',
  'bierglas', 'wijnfles', 'kopje koffie', 'rietje', 'cocktail',

  // spullen
  'bril', 'hoed', 'schoen', 'sok', 'paraplu', 'sleutel', 'telefoon', 'laptop',
  'boek', 'potlood', 'schaar', 'klok', 'lamp', 'stoel', 'bed', 'bank',
  'tandenborstel', 'kam', 'spiegel', 'emmer', 'bezem', 'hamer', 'zaag',
  'koffer', 'rugzak', 'portemonnee', 'ring', 'kroon', 'zwaard', 'schild',

  // natuur en weer
  'zon', 'maan', 'ster', 'wolk', 'regenboog', 'bliksem', 'sneeuwvlok',
  'vulkaan', 'berg', 'eiland', 'cactus', 'bloem', 'paddenstoel', 'blad',

  // mensen en lichaam
  'hand', 'voet', 'oog', 'oor', 'neus', 'hart', 'skelet', 'baard',
  'sneeuwpop', 'robot', 'geest', 'piraat', 'ridder', 'clown', 'zeemeermin',

  // feest en vrije tijd
  'ballon', 'cadeau', 'vuurwerk', 'kerstboom', 'slinger', 'kaars',
  'gitaar', 'piano', 'trommel', 'microfoon', 'koptelefoon',
  'voetbal', 'basketbal', 'skateboard', 'ski', 'zwembad', 'hangmat',
  'dobbelsteen', 'speelkaart', 'schaakstuk', 'ballonvaart',

  // waar het om draait
  'zoenen', 'een kater', 'een bh', 'een string', 'een condoom', 'een nude',
  'vreemdgaan', 'een dickpic', 'een striptease', 'een one-night stand',
  'een vrijgezellenfeest', 'een gebroken hart', 'een blind date', 'flirten',
  'de friendzone', 'een zuigzoen', 'een vibrator', 'een sekswinkel',
  'een stripper', 'een tongzoen', 'een liefdesbrief', 'een bikinilijn',
  'een harige rug', 'een scheet', 'kotsen', 'een kruis', 'billen',
  'een borstel in de wc', 'een tampon', 'een luier', 'een spiekbriefje',
  'een dronken man', 'een lachgasballon', 'een kroegruzie', 'een kotszak',
  'een vrijpartij', 'een hotelbed', 'een pornoster', 'een nachtclub',
  // ── derde lading ──
  'een ijszak op je hoofd', 'een zuigplek', 'twee stoelen en een kaars', 'een afterparty', 'een braakemmer',
  'een uitsmijter', 'een danspaal', 'een dansende man op een tafel', 'een naaktstrand', 'een sauna',
  'een opblaaskrokodil', 'een tondeuse', 'een megafoon', 'een confettikanon', 'een nekbrace',
  'een krukkenpaar', 'een parkeerboete', 'een politieauto', 'een brandalarm', 'een rookmachine',
  'een frikandel', 'een kapsalon', 'een bitterbal', 'een oliebol', 'een kratje bier',
  'een shotglas', 'een cocktail', 'een wijnvlek', 'een bierbuik', 'een boxershort',
  'een beugelbeha', 'een tanga', 'een condoomwikkel', 'een handboei', 'een tuinslang',
  'een winkelwagentje', 'een bakfiets', 'een partytent', 'een springkussen', 'een klapstoel',
  'een tuinkabouter', 'een hondendrol', 'een vieze sok', 'een wasmand', 'een schimmelplek',
  'een tatoeage', 'een piercing', 'een pruik', 'een carnavalspak', 'een slipper',
  'een gedeelde locatie', 'een groepsapp', 'een profielfoto', 'een spraakbericht', 'een screenshot',
  'een tweede telefoon', 'een zoekbalk', 'een wifi-router', 'een oplader', 'een lege batterij',
  'een zwangerschapstest', 'een morning-afterpil', 'een wachtkamer', 'een huisarts', 'een spuit',
  'een logeerbed', 'een badkuip', 'een draaideur', 'een fietsenstalling', 'een invalidentoilet',
]
