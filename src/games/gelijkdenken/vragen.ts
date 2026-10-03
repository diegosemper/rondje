/**
 * De vragen voor Gelijk Denken.
 *
 * Je moet hetzelfde typen als iemand anders. Dat maakt dit het enige spel in de
 * app waar een vraag kápot gaat aan te veel vrijheid.
 *
 * DAAR GING HET MIS. De vorige lijst zat vol met vragen als "noem iets wat je
 * niet in je zoekgeschiedenis wil" en "noem iets wat je alleen doet als niemand
 * kijkt". Leuke vragen om hardop te beantwoorden, maar er zijn duizend goede
 * antwoorden en dus typt iedereen iets anders. Dan matcht er niemand, valt er
 * niets te lachen, en is het spel stuk.
 *
 * Een goede vraag hier heeft één antwoord dat er bovenuit steekt, en hooguit
 * een stuk of drie die eronder zitten. "Noem een drank waar je gegarandeerd
 * ziek van wordt" werkt: de halve tafel typt tequila. Het blijft spicy, maar de
 * spice zit in het onderwerp en niet in hoe ver je antwoord uit elkaar kan
 * lopen.
 *
 * Vuistregel bij het schrijven: kun je zelf binnen twee seconden het antwoord
 * noemen dat de meeste mensen zullen geven? Zo nee, dan is de vraag te open.
 */
export const GELIJK_VRAGEN: string[] = [
  // ── drank: bijna altijd hetzelfde antwoord ──
  'Noem de drank waar je gegarandeerd ziek van wordt',
  'Noem het drankje dat je bestelt als je snel dronken wil worden',
  'Noem het bier dat op elk studentenfeest staat',
  'Noem de snack die je om vier uur \'s nachts haalt',
  'Noem het eerste wat je drinkt tegen een kater',
  'Noem het klassieke excuus om niet mee te gaan stappen',
  'Noem de smoes die je gebruikt om eerder weg te gaan',
  'Noem het lichaamsdeel waar je kotst als je te veel op hebt',
  'Noem wat je kwijtraakt op een feest',
  'Noem het eerste wat je checkt als je wakker wordt na een feest',

  // ── daten: één voor de hand liggend antwoord ──
  'Noem de app waarop je je ex stalkt',
  'Noem het bericht dat iedereen dronken verstuurt',
  'Noem het tijdstip waarop je je ex appt',
  'Noem de slechtste openingszin die er bestaat',
  'Noem het eerste wat je bekijkt op een datingprofiel',
  'Noem de plek waar een eerste date altijd heen gaat',
  'Noem de smoes om geen tweede date te willen',
  'Noem het woord waarmee iemand je afwijst',
  'Noem de plek in huis waar op een feestje gezoend wordt',
  'Noem het kledingstuk dat als eerste uitgaat',
  'Noem wat je verstopt voor een date op bezoek komt',
  'Noem de vraag die je nooit aan je partner moet stellen',
  'Noem de reden waarom mensen ghosten',
  'Noem het lichaamsdeel waar mensen spijt krijgen van een tattoo',
  'Noem wat je zegt als je betrapt wordt op je telefoon',

  // ── lijf en schaamte: iedereen denkt aan hetzelfde ──
  'Noem het eerste wat je bedekt als er onverwacht iemand binnenkomt',
  'Noem het geluid dat je in bed niet wil horen',
  'Noem waar het in een studentenhuis naar ruikt',
  'Noem het lichaamsdeel dat het snelst zweet',
  'Noem de plek waar je een zuigzoen niet wil hebben',
  'Noem wat er op de ochtend na een feest naast je bed ligt',
  'Noem het kledingstuk dat je drie dagen aanhoudt',
  'Noem wat je doet om er nuchter uit te zien',
  'Noem waar je naar ruikt na een nacht stappen',
  'Noem het moment waarop een feest ontspoort',

  // ── de tafel zelf ──
  'Noem het spelletje dat altijd uit de hand loopt',
  'Noem wie er als eerste dronken is vanavond',
  'Noem wie hier het slechtst tegen drank kan',
  'Noem wie hier als eerste naar huis gaat',
  'Noem wie er het meest op zijn telefoon zit',
  'Noem de straf die niemand wil',
  'Noem het lichaamsdeel waarmee je een fles opent als het moet',

  // ── makkelijk en onschuldig, als adempauze ──
  'Noem een biermerk',
  'Noem een sterke drank',
  'Noem een snack bij de snackbar',
  'Noem een plek waar iedereen op vakantie gaat',
  'Noem een app die iedereen heeft',
  'Noem iets wat in deze kamer staat',
  'Noem een dag van de week om uit te gaan',
  'Noem een festival',
  'Noem een kleur',
  'Noem een lichaamsdeel',
  // ── tweede lading: ook hier geldt dat er één antwoord bovenuit moet steken ──
  'Noem de plek waar iedereen zijn eerste zoen had',
  'Noem het lichaamsdeel dat je als eerste scheert voor een date',
  'Noem het excuus dat je gebruikt als je niet wil zoenen',
  'Noem de film die iedereen op date kijkt',
  'Noem wat je zegt als iemand vraagt of je nog wakker bent',
  'Noem de drank die meisjes op een feest drinken',
  'Noem de drank die jongens op een feest drinken',
  'Noem het eerste wat je kwijtraakt als je dronken bent',
  'Noem waar je je telefoon terugvindt na een feest',
  'Noem het geluid dat je maakt na een shotje',
  'Noem de plek waar je in slaap valt als het te veel was',
  'Noem wat je eet als je dronken thuiskomt',
  'Noem de app die je dronken opent',
  'Noem wie je als eerste belt om vier uur \'s nachts',
  'Noem het smoesje dat je tegen je ouders gebruikt',
  'Noem wat je zegt als je te laat bent',
  'Noem waar je je drank verstopt voor je ouders',
  'Noem het kledingstuk dat je van je ex nog hebt',
  'Noem het eerste wat je checkt bij een nieuwe match',
  'Noem het emoji dat flirten betekent',
  'Noem het woord dat je gebruikt in plaats van seks',
  'Noem het bijnaampje dat iedereen gênant vindt',
  'Noem waar de meeste mensen hun condooms bewaren',
  'Noem het moment waarop je weet dat het een goede date is',
  'Noem waar je naartoe gaat als je even weg wil op een feest',
  'Noem het lichaamsdeel waar iedereen naar kijkt',
  'Noem wat je tegen een uitsmijter zegt',
  'Noem de reden waarom je niet binnen mag',
  'Noem het liedje waarop iedereen gaat zingen',
  'Noem de dans die iedereen doet als hij dronken is',
  'Noem wat er altijd kapot gaat op een huisfeest',
  'Noem de kamer waar je op een feest niet moet kijken',
  'Noem waar je op slaapt als er geen bed is',
  'Noem wat je leent van je huisgenoot zonder te vragen',
  'Noem waar het in de koelkast van een student naar ruikt',
  'Noem wat er na een feest op de vloer plakt',
  'Noem wie er altijd als laatste opruimt',
  'Noem het klusje waar niemand aan begint',
  'Noem wat je doet als je de laatste bent op een feest',
  'Noem de tijd waarop een goed feest ophoudt leuk te zijn',
  'Noem wat je doet om van iemand af te komen',
  'Noem wat je antwoordt als iemand vraagt of je verliefd bent',
  'Noem waar je aan denkt bij het woord spannend',
  'Noem het cadeau dat je aan je ex gaf en terug wil',
  // ── makkelijk, als adempauze ──
  'Noem een stad in Nederland',
  'Noem een voetbalclub',
  'Noem een automerk',
  'Noem een sport',
  'Noem een dier',
  'Noem een getal tussen één en tien',
]
