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
  // ── vierde lading ──
  'een strijkplank', 'een wasknijper', 'een droogmolen', 'een stofzuigerzak', 'een dweilemmer',
  'een brandblusser', 'een rookmelder', 'een deurmat', 'een brievenbus', 'een hangslot',
  'een kurkentrekker', 'een flessenopener', 'een rietje', 'een ijsemmer', 'een tapkraan',
  'een bierfust', 'een likeurglaasje', 'een cocktailprikker', 'een limoenschijf', 'een pindaschaaltje',
  'een fonduevork', 'een barbecuetang', 'een vuurkorf', 'een houtskoolzak', 'een aanmaakblokje',
  'een tuinstoel', 'een schommelbank', 'een vogelhuisje', 'een hondenmand', 'een krabmast',
  'een goudvissenkom', 'een hamsterrad', 'een vogelkooi', 'een aquariumpomp', 'een terrarium',
  'een parasol', 'een windscherm', 'een bodyboard', 'een duikplank', 'een snorkel',
  'een luchtmatras', 'een zonnehoed', 'een koelbox', 'een thermoskan', 'een picknickmand',
  'een muggenspray', 'een pleisterrol', 'een mitella', 'een rollator', 'een ijskrabber',
  'een dakkoffer', 'een aanhanger', 'een krik', 'een startkabel', 'een jerrycan',
  'een pechdriehoek', 'een veiligheidshesje', 'een parkeerschijf', 'een wielklem', 'een kassabon',
  'een pinautomaat', 'een kleingeld', 'een sleutelhanger', 'een kijkgaatje', 'een cijferslot',
  'een beugel', 'een tandartsstoel', 'een bloedprik', 'een weegschaal', 'een halter',
  'een loopband', 'een badmuts', 'een natte handdoek', 'een massagebank', 'een gezichtsmasker',
  'een slagroomtaart', 'een cadeaubon', 'een wenskaart', 'een bruidsboeket', 'een vuurpijl',
  'een champagnekurk', 'een pepernoot', 'een lootje', 'een kerstdiner', 'een rouwkaart',
  'een beamer', 'een printerstoring', 'een volle inbox', 'een videobel', 'een deadline',
  'een verhuisdoos', 'een huurcontract', 'een lekkende kraan', 'een verstopte afvoer', 'een kookwekker',
  'een pizzadoos', 'een mayonaisezakje', 'een bezorgscooter', 'een kledingrek', 'een retourzending',
]
