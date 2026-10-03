/**
 * De nummers waar het om gaat bij René le Bak.
 *
 * Het spel draait om één plaat: "If I tell you" van René Le Blanc uit 2020.
 * In studentenhuizen gaat de playlist op shuffle, iedereen drukt om de beurt op
 * volgende, en zodra dát nummer begint drinkt de hele tafel een bak. Bij een
 * hardstyle-remix zijn het er twee.
 *
 * Hier zijn het fragmenten van dertig seconden van Apple, dezelfde bron die
 * Raad het Nummer en Hitster ook gebruiken. Geen eigen bestanden dus, en geen
 * Spotify: de app heeft er al een speler voor.
 *
 * De remixen staan er allebei in. Dat is geen detail: hoor je de intro van het
 * origineel dan weet je wat komt, maar een hardstyle-versie herken je pas een
 * seconde later -- en dan is het al twee bakken.
 */

export interface BakNummer {
  titel: string
  artiest: string
  url: string
  /** hoeveel bakken dit nummer kost */
  bakken: 1 | 2
}

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
