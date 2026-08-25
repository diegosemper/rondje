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

  // ── meer muziek & film ──
  { groep: 'Beyoncé', imposter: 'muziek' },
  { groep: 'Concert', imposter: 'muziek' },
  { groep: 'Vinyl', imposter: 'muziek' },
  { groep: 'Koptelefoon', imposter: 'muziek' },
  { groep: 'Bioscoop', imposter: 'uitgaan' },
  { groep: 'Popcorn', imposter: 'bioscoop' },
  { groep: 'Horrorfilm', imposter: 'film' },
  { groep: 'Tekenfilm', imposter: 'film' },
  { groep: 'Documentaire', imposter: 'televisie' },
  { groep: 'Podcast', imposter: 'luisteren' },
  { groep: 'Radio', imposter: 'muziek' },
  { groep: 'Dj', imposter: 'feest' },
  { groep: 'Piano', imposter: 'instrument' },
  { groep: 'Viool', imposter: 'instrument' },

  // ── meer sport ──
  { groep: 'Formule 1', imposter: 'sport' },
  { groep: 'Golf', imposter: 'sport' },
  { groep: 'Wielrennen', imposter: 'sport' },
  { groep: 'Yoga', imposter: 'sport' },
  { groep: 'Sportschool', imposter: 'sporten' },
  { groep: 'Hockey', imposter: 'sport' },
  { groep: 'Volleybal', imposter: 'sport' },
  { groep: 'Zwemmen', imposter: 'sport' },
  { groep: 'Scheidsrechter', imposter: 'voetbal' },
  { groep: 'Penalty', imposter: 'voetbal' },
  { groep: 'Olympische Spelen', imposter: 'sport' },
  { groep: 'Klimmen', imposter: 'sport' },
  { groep: 'Wandelen', imposter: 'buiten' },
  { groep: 'Surfen', imposter: 'zee' },

  // ── meer eten & drinken ──
  { groep: 'Hamburger', imposter: 'eten' },
  { groep: 'Pannenkoek', imposter: 'eten' },
  { groep: 'Kapsalon', imposter: 'eten' },
  { groep: 'Shoarma', imposter: 'eten' },
  { groep: 'Poffertjes', imposter: 'eten' },
  { groep: 'Hagelslag', imposter: 'ontbijt' },
  { groep: 'Pindakaas', imposter: 'broodbeleg' },
  { groep: 'Drop', imposter: 'snoep' },
  { groep: 'Chocolade', imposter: 'snoep' },
  { groep: 'IJsje', imposter: 'toetje' },
  { groep: 'Tiramisu', imposter: 'toetje' },
  { groep: 'Wijn', imposter: 'drinken' },
  { groep: 'Whisky', imposter: 'drinken' },
  { groep: 'Cola', imposter: 'drinken' },
  { groep: 'Smoothie', imposter: 'drinken' },
  { groep: 'Oliebollen', imposter: 'feestdag' },
  { groep: 'Gourmetten', imposter: 'kerst' },
  { groep: 'Barbecue', imposter: 'zomer' },
  { groep: 'Kroket', imposter: 'snack' },
  { groep: 'Ramen', imposter: 'eten' },
  { groep: 'Taco', imposter: 'eten' },
  { groep: 'Appeltaart', imposter: 'gebak' },
  { groep: 'Erwtensoep', imposter: 'soep' },
  { groep: 'Kaas', imposter: 'eten' },
  { groep: 'Gehaktbal', imposter: 'eten' },
  { groep: 'Slagroom', imposter: 'taart' },

  // ── meer plaatsen ──
  { groep: 'Parijs', imposter: 'stad' },
  { groep: 'Rotterdam', imposter: 'stad' },
  { groep: 'Berlijn', imposter: 'stad' },
  { groep: 'Italië', imposter: 'land' },
  { groep: 'Amerika', imposter: 'land' },
  { groep: 'Japan', imposter: 'land' },
  { groep: 'Strand', imposter: 'vakantie' },
  { groep: 'Bergen', imposter: 'natuur' },
  { groep: 'Bos', imposter: 'natuur' },
  { groep: 'Dierentuin', imposter: 'uitje' },
  { groep: 'Museum', imposter: 'uitje' },
  { groep: 'Sauna', imposter: 'ontspanning' },
  { groep: 'Kerk', imposter: 'gebouw' },
  { groep: 'Tankstation', imposter: 'weg' },
  { groep: 'Snelweg', imposter: 'weg' },
  { groep: 'Metro', imposter: 'vervoer' },
  { groep: 'Veerboot', imposter: 'vervoer' },
  { groep: 'Hotel', imposter: 'vakantie' },
  { groep: 'Zolder', imposter: 'huis' },
  { groep: 'Efteling', imposter: 'pretpark' },

  // ── meer dieren ──
  { groep: 'Kangoeroe', imposter: 'dier' },
  { groep: 'Slang', imposter: 'dier' },
  { groep: 'Kikker', imposter: 'dier' },
  { groep: 'Uil', imposter: 'vogel' },
  { groep: 'Koe', imposter: 'boerderij' },
  { groep: 'Paard', imposter: 'dier' },
  { groep: 'Konijn', imposter: 'huisdier' },
  { groep: 'Goudvis', imposter: 'huisdier' },
  { groep: 'Spin', imposter: 'insect' },
  { groep: 'Bij', imposter: 'insect' },
  { groep: 'Walvis', imposter: 'zee' },
  { groep: 'Kameel', imposter: 'woestijn' },

  // ── meer beroepen ──
  { groep: 'Brandweerman', imposter: 'beroep' },
  { groep: 'Bakker', imposter: 'beroep' },
  { groep: 'Boer', imposter: 'beroep' },
  { groep: 'Advocaat', imposter: 'beroep' },
  { groep: 'Postbode', imposter: 'beroep' },
  { groep: 'Stewardess', imposter: 'vliegtuig' },
  { groep: 'Kok', imposter: 'keuken' },
  { groep: 'Fotograaf', imposter: 'beroep' },
  { groep: 'Influencer', imposter: 'internet' },
  { groep: 'Koning', imposter: 'koninklijk' },
  { groep: 'Verpleegkundige', imposter: 'ziekenhuis' },

  // ── meer spullen ──
  { groep: 'Laptop', imposter: 'computer' },
  { groep: 'Horloge', imposter: 'sieraad' },
  { groep: 'Ring', imposter: 'sieraad' },
  { groep: 'Paraplu', imposter: 'regen' },
  { groep: 'Zonnebril', imposter: 'zomer' },
  { groep: 'Rugzak', imposter: 'school' },
  { groep: 'Portemonnee', imposter: 'spullen' },
  { groep: 'Sleutels', imposter: 'spullen' },
  { groep: 'Kaars', imposter: 'sfeer' },
  { groep: 'Spiegel', imposter: 'badkamer' },
  { groep: 'Tandenborstel', imposter: 'badkamer' },
  { groep: 'Stofzuiger', imposter: 'huishouden' },
  { groep: 'Magnetron', imposter: 'keuken' },
  { groep: 'Koelkast', imposter: 'keuken' },
  { groep: 'Wekker', imposter: 'slapen' },
  { groep: 'Klompen', imposter: 'schoenen' },
  { groep: 'Bakfiets', imposter: 'fiets' },
  { groep: 'OV-chipkaart', imposter: 'trein' },

  // ── meer feest & uitgaan ──
  { groep: 'Nachtclub', imposter: 'uitgaan' },
  { groep: 'Kater', imposter: 'drinken' },
  { groep: 'Shotje', imposter: 'drinken' },
  { groep: 'Bierpong', imposter: 'spel' },
  { groep: 'Vuurwerk', imposter: 'oud en nieuw' },
  { groep: 'Oud en nieuw', imposter: 'feestdag' },
  { groep: 'Halloween', imposter: 'feest' },
  { groep: 'Valentijnsdag', imposter: 'feestdag' },
  { groep: 'Moederdag', imposter: 'feestdag' },
  { groep: 'Pepernoten', imposter: 'sinterklaas' },
  { groep: 'Zwarte Cross', imposter: 'festival' },

  // ── meer school & werk ──
  { groep: 'Huiswerk', imposter: 'school' },
  { groep: 'Gymles', imposter: 'school' },
  { groep: 'Schoolreisje', imposter: 'school' },
  { groep: 'Diploma', imposter: 'school' },
  { groep: 'Stage', imposter: 'werk' },
  { groep: 'Salaris', imposter: 'werk' },
  { groep: 'Kantoor', imposter: 'werk' },
  { groep: 'Ontslag', imposter: 'werk' },
  { groep: 'Zoom', imposter: 'videobellen' },

  // ── meer weer & natuur ──
  { groep: 'Regenboog', imposter: 'lucht' },
  { groep: 'Storm', imposter: 'weer' },
  { groep: 'Mist', imposter: 'weer' },
  { groep: 'Hittegolf', imposter: 'zomer' },
  { groep: 'Vulkaan', imposter: 'natuur' },
  { groep: 'Zonnebrand', imposter: 'zomer' },
  { groep: 'Muggenbeet', imposter: 'zomer' },

  // ── internet & games ──
  { groep: 'Minecraft', imposter: 'game' },
  { groep: 'Mario', imposter: 'game' },
  { groep: 'YouTube', imposter: 'internet' },
  { groep: 'Google', imposter: 'internet' },
  { groep: 'Wifi', imposter: 'internet' },
  { groep: 'Selfie', imposter: 'foto' },
  { groep: 'Meme', imposter: 'internet' },
  { groep: 'Instagram', imposter: 'app' },
]
