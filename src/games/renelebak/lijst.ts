/**
 * De playlist van René le Bak, en dat zijn maar drie nummers.
 *
 * Het spel komt uit de studentenhuizen: de playlist staat op shuffle, iedereen
 * drukt om de beurt op volgende, en zodra "If I tell you" van René Le Blanc
 * begint drinkt degene die drukte een bak. Bij een hardstyle-remix zijn het er
 * twee.
 *
 * Al het andere in die playlist is "Solid Stigma" van Angerfist, en dat is
 * precies de grap: hardcore waar je niets van hoeft, afgewisseld met een
 * zoetsappige plaat uit 2020 waar je een bak van moet. Je weet binnen een halve
 * seconde welke kant het op gaat.
 *
 * Er zit dus met opzet géén lijst met honderd gewone nummers achter. Hoorde je
 * elke keer iets anders, dan is het een muziekquiz; nu is het de spanning van
 * twee intro's die je allebei uit je hoofd kent.
 *
 * De fragmenten zijn de dertig-seconden-previews van Apple, dezelfde bron die
 * Raad het Nummer en Hitster ook gebruiken. Geen Spotify en geen eigen
 * bestanden dus.
 */

export interface BakNummer {
  titel: string
  artiest: string
  url: string
  /** hoeveel bakken dit nummer kost; 0 is veilig */
  bakken: 0 | 1 | 2
}

/** Het veilige nummer. Dit hoor je de meeste keren. */
export const VEILIG: BakNummer = {
  titel: 'Solid Stigma',
  artiest: 'Angerfist',
  url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/c8/71/74/c8717452-8bd9-da89-39f8-e3d5aaf6f4de/mzaf_13102584456711041914.plus.aac.p.m4a',
  bakken: 0,
}

/**
 * De nummers waar het om gaat.
 *
 * Het origineel kost één bak, de twee hardstyle-remixen kosten er twee. De
 * remixen staan er allebei in zodat het niet altijd dezelfde intro is: hoor je
 * het origineel dan weet je meteen hoe duur het is, bij een remix duurt dat een
 * seconde langer -- en dan is het al twee bakken.
 */
export const BAK_NUMMERS: BakNummer[] = [
  {
    titel: 'If I Tell You',
    artiest: 'René Le Blanc',
    url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/ac/2e/7a/ac2e7a02-fb20-7e70-fb33-e6f3ec26500f/mzaf_8028800477597334031.plus.aac.p.m4a',
    bakken: 1,
  },
  {
    titel: 'If I Tell You (hardstyle remix)',
    artiest: 'Skoften Sloopservice',
    url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/89/08/df/8908dfb4-69ed-df85-69f1-5c985c1e90cd/mzaf_2930143434059784096.plus.aac.p.m4a',
    bakken: 2,
  },
  {
    titel: 'If I Tell You (hardstyle remix)',
    artiest: "Altijd Larstig & Rob Gasd'rop",
    url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/da/ef/b1/daefb1cc-9b5b-c5c7-abd9-d81eb7509833/mzaf_6212315741690259534.plus.aac.p.m4a',
    bakken: 2,
  },
]
