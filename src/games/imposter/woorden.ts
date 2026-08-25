/**
 * Woordparen voor De Imposter.
 *
 * De groep krijgt het specifieke woord, de imposter het algemene. Dus:
 * groep SHAKIRA, imposter MUZIEK.
 *
 * Waarom die kant op en niet andersom: de imposter kan dan altijd íets
 * zeggen dat past ("liedje", "zingen") en valt niet meteen door de mand. De
 * spanning verschuift naar de groep, die moet bewijzen dat ze het woord kent
 * zonder het weg te geven.
 *
 * Een goed paar voldoet aan twee dingen:
 *  · het algemene woord dekt het specifieke echt
 *  · er zijn genoeg woorden die bij allebei passen om even mee te komen
 *
 * Voeg gerust regels toe — hoe meer, hoe langer je ermee doet.
 */

export interface WoordPaar {
  /** wat de meeste spelers zien */
  groep: string
  /** wat de imposter ziet */
  imposter: string
}

export const WOORDPAREN: WoordPaar[] = [
  // muziek & film
  { groep: 'Shakira', imposter: 'muziek' },
  { groep: 'Gitaar', imposter: 'instrument' },
  { groep: 'Techno', imposter: 'muziek' },
  { groep: 'Titanic', imposter: 'film' },
  { groep: 'Harry Potter', imposter: 'boek' },
  { groep: 'Netflix', imposter: 'televisie' },
  { groep: 'Karaoke', imposter: 'zingen' },
  { groep: 'Drumstel', imposter: 'instrument' },
  { groep: 'Songfestival', imposter: 'muziek' },

  // sport
  { groep: 'Ajax', imposter: 'sport' },
  { groep: 'Tennis', imposter: 'sport' },
  { groep: 'Schaatsen', imposter: 'sport' },
  { groep: 'Marathon', imposter: 'hardlopen' },
  { groep: 'Bokser', imposter: 'sporter' },
  { groep: 'Zwembad', imposter: 'water' },
  { groep: 'Darten', imposter: 'spel' },
  { groep: 'Skiën', imposter: 'vakantie' },

  // eten & drinken
  { groep: 'Pizza', imposter: 'eten' },
  { groep: 'Sushi', imposter: 'eten' },
  { groep: 'Frikandel', imposter: 'snack' },
  { groep: 'Stroopwafel', imposter: 'koek' },
  { groep: 'Bitterballen', imposter: 'borrel' },
  { groep: 'Heineken', imposter: 'drinken' },
  { groep: 'Espresso', imposter: 'koffie' },
  { groep: 'Mojito', imposter: 'cocktail' },
  { groep: 'Patat', imposter: 'eten' },
  { groep: 'Boerenkool', imposter: 'groente' },
  { groep: 'Tequila', imposter: 'drinken' },

  // plaatsen
  { groep: 'Amsterdam', imposter: 'stad' },
  { groep: 'Spanje', imposter: 'land' },
  { groep: 'Ibiza', imposter: 'vakantie' },
  { groep: 'Vliegveld', imposter: 'reizen' },
  { groep: 'Camping', imposter: 'vakantie' },
  { groep: 'Ziekenhuis', imposter: 'gebouw' },
  { groep: 'Bibliotheek', imposter: 'gebouw' },
  { groep: 'Kroeg', imposter: 'uitgaan' },
  { groep: 'Achtbaan', imposter: 'pretpark' },
  { groep: 'Woestijn', imposter: 'natuur' },

  // dieren
  { groep: 'Olifant', imposter: 'dier' },
  { groep: 'Pinguïn', imposter: 'dier' },
  { groep: 'Haai', imposter: 'zee' },
  { groep: 'Teckel', imposter: 'hond' },
  { groep: 'Papegaai', imposter: 'vogel' },
  { groep: 'Mug', imposter: 'insect' },

  // mensen & beroepen
  { groep: 'Tandarts', imposter: 'beroep' },
  { groep: 'Politieagent', imposter: 'beroep' },
  { groep: 'Kapper', imposter: 'beroep' },
  { groep: 'Piloot', imposter: 'beroep' },
  { groep: 'Leraar', imposter: 'school' },
  { groep: 'Barman', imposter: 'kroeg' },
  { groep: 'Chirurg', imposter: 'dokter' },

  // spullen
  { groep: 'iPhone', imposter: 'telefoon' },
  { groep: 'Spijkerbroek', imposter: 'kleding' },
  { groep: 'Sneakers', imposter: 'schoenen' },
  { groep: 'Tesla', imposter: 'auto' },
  { groep: 'Fiets', imposter: 'vervoer' },
  { groep: 'Koffer', imposter: 'reizen' },
  { groep: 'Tattoo', imposter: 'lichaam' },
  { groep: 'Bril', imposter: 'gezicht' },
  { groep: 'Wasmachine', imposter: 'huishouden' },
  { groep: 'Airfryer', imposter: 'keuken' },

  // apps & schermen
  { groep: 'TikTok', imposter: 'app' },
  { groep: 'Spotify', imposter: 'muziek' },
  { groep: 'WhatsApp', imposter: 'telefoon' },
  { groep: 'Tinder', imposter: 'daten' },
  { groep: 'PlayStation', imposter: 'gamen' },
  { groep: 'Fortnite', imposter: 'game' },

  // gelegenheden
  { groep: 'Bruiloft', imposter: 'feest' },
  { groep: 'Carnaval', imposter: 'feest' },
  { groep: 'Sinterklaas', imposter: 'feestdag' },
  { groep: 'Kerstmis', imposter: 'feestdag' },
  { groep: 'Koningsdag', imposter: 'feestdag' },
  { groep: 'Festival', imposter: 'muziek' },
  { groep: 'Verjaardag', imposter: 'feest' },
  { groep: 'Begrafenis', imposter: 'plechtigheid' },

  // school & werk
  { groep: 'Wiskunde', imposter: 'school' },
  { groep: 'Tentamen', imposter: 'school' },
  { groep: 'Rijbewijs', imposter: 'examen' },
  { groep: 'Vergadering', imposter: 'werk' },
  { groep: 'Sollicitatie', imposter: 'werk' },

  // weer & natuur
  { groep: 'Onweer', imposter: 'weer' },
  { groep: 'Sneeuw', imposter: 'winter' },
  { groep: 'Zonsondergang', imposter: 'lucht' },
  { groep: 'Tulpen', imposter: 'bloemen' },
  { groep: 'Herfst', imposter: 'seizoen' },

  // typisch Nederlands
  { groep: 'Molen', imposter: 'gebouw' },
  { groep: 'Grachten', imposter: 'water' },
  { groep: 'Albert Heijn', imposter: 'winkel' },
  { groep: 'IKEA', imposter: 'winkel' },
  { groep: 'File', imposter: 'verkeer' },
  { groep: 'NS', imposter: 'trein' },
  { groep: 'Studentenhuis', imposter: 'wonen' },
]
