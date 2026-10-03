/**
 * Het voorbeeldje van elk spel, voor het ▶ in de lobby.
 *
 * Bij elkaar in één bestand en niet verspreid over de spellen. Dat is hier
 * beter: je wil ze naast elkaar kunnen lezen om te zien of ze dezelfde toon en
 * lengte hebben, en de lobby heeft ze toch op id nodig. Een spel zonder
 * voorbeeldje krijgt gewoon geen ▶ te zien, dus er gaat niets stuk als er een
 * mist.
 *
 * Wat een goed voorbeeldje doet: het laat één ronde zien, in de woorden van het
 * spel zelf, en het eindigt bij wat het je kost. Niet de regels opsommen -- die
 * staan al op het uitlegscherm.
 */
import type { Beeld } from '../engine/demo'

export const DEMOS: Record<string, Beeld[]> = {
  bussen: [
    { teken: '🚌', kop: 'Vier vragen', tekst: 'Rood of zwart? Je tikt, de kaart draait om.' },
    { kaarten: ['7♠'], kop: 'Fout', tekst: 'De eerste vraag kost er één.', slok: '1 slok' },
    { teken: '🌲', kop: 'De boom', tekst: 'Heb je de kaart die openvalt? Tik hem aan — snelheid telt.' },
    { teken: '🚌', kop: 'De bus', tekst: 'Wie de meeste kaarten overheeft, rijdt alleen de bus terug.' },
  ],
  imposter: [
    { teken: '🕵️', kop: 'Jouw woord', tekst: 'Op je scherm staat SNACKBAR. Bij één iemand staat iets anders.' },
    { kop: 'Typ één woord', tekst: 'Je typt "frikandel". Genoeg om erbij te horen, niet genoeg om het weg te geven.' },
    { teken: '🗳️', kop: 'Stemmen', tekst: 'Wie paste er niet bij? Iedereen wijst tegelijk aan.' },
    { kop: 'Mis', tekst: 'Zat je ernaast, dan drink je. De imposter lacht.', slok: '3 slokken' },
  ],
  dealer: [
    { kaarten: ['🂠'], kop: 'Alleen de dealer ziet hem', tekst: 'Jij moet de waarde raden.' },
    { knop: 'Ik gok een 8', kop: 'Hoger of lager', tekst: 'De dealer zegt hoger. Nog één kans.' },
    { kaarten: ['V♦'], kop: 'Het was een vrouw', tekst: 'Je zat er drie naast.', slok: '3 slokken' },
    { teken: '🃏', kop: 'Vier dezelfde', tekst: 'Liggen er vier achten? Dan verzin jij een minigame.' },
  ],
  ezelen: [
    { kaarten: ['9♥', '9♠', '9♦', '4♣'], kop: 'Schuif er één door', tekst: 'Je houdt wat je nodig hebt en geeft de rest naar links.' },
    { kaarten: ['9♥', '9♠', '9♦', '9♣'], kop: 'Vier gelijk', tekst: 'Leg stil je duim op tafel. Zeg niets.' },
    { teken: '👍', kop: 'Wie het merkt', tekst: 'De rest moet het aan tafel zien en volgen.' },
    { kop: 'De laatste', tekst: 'Wie als laatste zijn duim neerlegt, drinkt.', slok: '5 slokken' },
  ],
  perudo: [
    { teken: '🏺', kop: 'Vijf stenen', tekst: 'Je gooit onder je beker. Alleen jij ziet ze.' },
    { knop: 'Vier keer een 3', kop: 'Bieden', tekst: 'Je zegt hoe vaak dat oog aan tafel ligt — bij iedereen samen.' },
    { knop: 'Dudo!', kop: 'Niet geloven', tekst: 'Alle bekers gaan omhoog en er wordt geteld.' },
    { kop: 'Er lagen er drie', tekst: 'De bieder zat ernaast en raakt een steen kwijt.', slok: '2 slokken' },
  ],
  vingers: [
    { teken: '📳', kop: 'Allemaal een vinger', tekst: 'De telefoon van de host ligt in het midden.' },
    { kop: 'Blijf liggen', tekst: 'Niet bewegen. Na een paar tellen licht er één plek op.' },
    { teken: '👆', kop: 'Jij bent het', tekst: 'Jouw vinger lag op de verkeerde plek.', slok: '3 slokken' },
  ],
  tekenen: [
    { teken: '🎨', kop: 'Kies je woord', tekst: 'Drie woorden, jij pakt er één: "een zuigzoen".' },
    { kop: 'Tekenen', tekst: 'Je tekent met je vinger. De rest ziet het live verschijnen.' },
    { knop: 'zuigzoen', kop: 'Geraden', tekst: 'Wie het als eerste typt is veilig.' },
    { kop: 'Te laat', tekst: 'Wie het niet had, drinkt. Niemand geraden? Dan de tekenaar.', slok: '3 slokken' },
  ],
  verhaal: [
    { teken: '📖', kop: 'De opening', tekst: '"{naam} werd wakker naast iemand, en wist even niet wie."' },
    { kop: 'Jouw woord', tekst: 'In je zin moet "beugelbeha". Succes.' },
    { kop: 'Stemmen', tekst: 'Alle zinnen komen anoniem in beeld. Je stemt op de beste, niet op je eigen.' },
    { kop: 'Geen stem', tekst: 'De winnaar deelt uit. Wie niemand overtuigde, drinkt.', slok: '2 slokken' },
  ],
  blackstories: [
    { teken: '🕯️', kop: 'Het raadsel', tekst: '"Hij belde zelf de brandweer en wilde doodgaan van schaamte."' },
    { kop: 'Vraag hardop', tekst: 'De verteller zegt alleen ja, nee of niet relevant. Telefoons mogen weg.' },
    { kop: 'Gekraakt', tekst: 'Wie erachter komt, deelt uit.', slok: '5 slokken' },
    { kop: 'Of niet', tekst: 'Komt niemand eruit, dan drinkt de hele groep.', slok: '3 slokken' },
  ],
  slechtantwoord: [
    { kop: 'De zin', tekst: '"Mijn moeder ging naar de winkel en zag daar ___."' },
    { knop: 'een oude vrouw met laaghangende tieten', kop: 'Jouw kaart', tekst: 'Zes kaarten in je hand, elke ronde nieuwe.' },
    { teken: '⚖️', kop: 'De jury kiest', tekst: 'Alles komt anoniem in beeld. De jury van die ronde beslist.' },
    { kop: 'Gewonnen', tekst: 'De winnaar deelt uit. Trek je een 🃏, dan vul je zelf iets in.', slok: '3 slokken' },
  ],
  decode: [
    { teken: '🔐', kop: 'Vier cijfers', tekst: 'Er is één code en drie minuten.' },
    { kop: 'Jouw aanwijzing', tekst: '"Het derde cijfer is even." Vertel hem hardop, laat je scherm niet zien.' },
    { kop: 'Samen', tekst: 'Alle aanwijzingen zijn nodig. Laat er één weg en er blijven twee codes over.' },
    { kop: 'Te laat', tekst: 'Niet gekraakt? Dan drinkt iedereen.', slok: '4 slokken' },
  ],
  driekaart: [
    { teken: '🂠', kop: 'Blind inzetten', tekst: 'Eerst slokken op je hand, dan op Pair Plus. Kaarten nog dicht.' },
    { kaarten: ['9♥', '9♦', '4♣'], kop: 'Een paar', tekst: 'Meedoen verdubbelt je inzet, passen kost je hem.' },
    { kaarten: ['A♠', 'K♠', '3♠'], kop: 'De dealer heeft kleur', tekst: 'Je hand verliest, maar je paar betaalt alsnog uit.' },
    { kop: 'Beide', tekst: 'Drinken voor je hand, uitdelen voor Pair Plus.', slok: '6 drinken, 4 uitdelen' },
  ],
  paardenrace: [
    { teken: '🏇', kop: 'Zet op een kleur', tekst: 'Drie slokken op ♥. De vier azen staan aan de start.' },
    { kaarten: ['7♥'], kop: 'Harten loopt', tekst: 'Elke kaart laat die kleur een stap vooruit.' },
    { kaarten: ['🂠'], kop: 'Terugslag', tekst: 'Zijn alle azen een rij voorbij, dan gaat er een kaart open en moet die kleur terug.' },
    { teken: '🏁', kop: 'Harten wint', tekst: 'Goed gegokt is het dubbele uitdelen. Ernaast is je inzet drinken.', slok: '6 uitdelen' },
  ],
  toepen: [
    { kaarten: ['9♥', 'A♠', '10♦', 'B♣'], kop: 'Vier kaarten', tekst: 'Let op: de 9 is de hoogste en de 10 de laagste.' },
    { kop: 'Kleur bekennen', tekst: 'Heb je de gevraagde kleur, dan moet je die spelen.' },
    { knop: 'Toep!', kop: 'Inzet omhoog', tekst: 'De rest kiest: meegaan voor het nieuwe bedrag, of nu eruit voor het oude.' },
    { kop: 'Minste slagen', tekst: 'Wie de meeste slagen pakt wint en deelt uit. De rest drinkt de inzet.', slok: '2 slokken' },
  ],
  renelebak: [
    { teken: '⏭️', kop: 'Jij mag drukken', tekst: 'Krijg jij het nummer, dan drink jij alleen. De rest is save.' },
    { teken: '🔊', kop: 'Solid Stigma', tekst: 'Hardcore. Save — doorgeven aan de volgende.' },
    { kop: 'If I Tell You', tekst: 'Dát nummer. Jij drukte, dus jij drinkt.', slok: '4 slokken' },
    { kop: 'Hardstyle', tekst: 'Bij een remix zijn het er twee. Hij kan meteen vallen of pas bij de twintigste.', slok: '8 slokken' },
  ],
  nummers: [
    { teken: '🎵', kop: 'Een tiende seconde', tekst: 'Dat is alles wat je hoort. Typ wat je denkt.' },
    { knop: 'Langer horen', kop: 'Samen beslissen', tekst: 'Meer horen mag alleen als iedereen die nog zoekt dat wil.' },
    { kop: 'Eerste', tekst: 'Wie hem als eerste heeft deelt 7 uit, de tweede 5, daarna minder.', slok: '7 uitdelen' },
    { kop: 'Niet geraden', tekst: 'Krijg je hem niet, dan drink je.', slok: '5 slokken' },
  ],
  hitster: [
    { teken: '📅', kop: 'Hoor het nummer', tekst: 'Je weet niet uit welk jaar het komt.' },
    { kop: 'Plaats hem', tekst: 'Tussen 1994 en 2008? Zet hem op de goede plek in je tijdlijn.' },
    { kop: 'Goed', tekst: 'De kaart is van jou en het andere team drinkt.', slok: '2 slokken' },
    { kop: 'Eerst bij vijf', tekst: 'Wie als eerste vijf kaarten in de tijdlijn heeft, wint.' },
  ],
  flappy: [
    { teken: '🐤', kop: 'Tik om te fladderen', tekst: 'Niet tegen de buizen, en blijf in beeld.' },
    { kop: 'Sneller', tekst: 'Het gaat steeds harder en de gaten worden kleiner.' },
    { teken: '💥', kop: 'Af', tekst: 'Jouw afstand staat vast. Nu de volgende.' },
    { kop: 'De verste', tekst: 'Wie het verst komt deelt tien uit. De rest drinkt.', slok: '10 uitdelen' },
  ],
  stapeltoren: [
    { teken: '🏗️', kop: 'Een blok schuift', tekst: 'Tik op het goede moment om hem te laten vallen.' },
    { kop: 'Mis', tekst: 'Wat over de rand steekt, valt eraf. Je toren wordt smaller.' },
    { kop: 'Hoe hoger hoe beter', tekst: 'Wie het hoogst komt deelt tien uit. De rest drinkt.', slok: '10 uitdelen' },
  ],
  pijlen: [
    { teken: '➡️', kop: 'Dichte pijl', tekst: 'Veeg de kant op waar hij wijst.' },
    { teken: '⬅️', kop: 'Omlijnde pijl', tekst: 'Veeg precies de andere kant op. Daar gaat het mis.' },
    { kop: 'Sneller', tekst: 'Elke goede veeg maakt de volgende sneller.' },
    { kop: 'De meeste', tekst: 'Wie de meeste haalt deelt tien uit. De rest drinkt.', slok: '10 uitdelen' },
  ],
  wiskunde: [
    { teken: '➗', kop: '7 × 8', tekst: 'Vier knoppen, iedereen tegelijk.' },
    { knop: '56', kop: 'Snelste goed', tekst: 'Dat zijn 3 punten. Ook goed maar langzamer is 1.' },
    { kop: 'Tien sommen', tekst: 'Steeds moeilijker. Aan het eind drinkt iedereen behalve de winnaar.', slok: '3 slokken' },
  ],
  kleurenklap: [
    { kop: 'ROOD', tekst: 'Maar de letters zijn blauw. Tik op de kleur van de letters.' },
    { knop: 'blauw', kop: 'Goed', tekst: 'Niet op wat er staat. Daar gaat bijna iedereen de eerste keer de fout in.' },
    { kop: 'Minder tijd', tekst: 'Elke ronde krijg je minder. Aan het eind drinkt iedereen behalve de winnaar.', slok: '3 slokken' },
  ],
  tienseconden: [
    { teken: '⏱️', kop: 'Doeltijd 17 seconden', tekst: 'Iedereen krijgt hetzelfde getal.' },
    { kop: '3 · 2 · 1', tekst: 'Iedereen gaat op gereed en dan start de klok tegelijk.' },
    { kop: 'Je ziet niets', tekst: 'Geen cijfers, geen balkje. Tik STOP als je denkt dat je er bent.' },
    { kop: '21,4', tekst: 'Je zat er het verst naast. Wie het dichtst bij zit, drinkt niets.', slok: '4 slokken' },
  ],
  duel: [
    { teken: '⚔️', kop: 'Twee spelers', tekst: 'Het scherm staat rood. Nog niet tikken.' },
    { kop: 'Groen', tekst: 'Zo snel mogelijk tikken. Te vroeg telt als verlies.' },
    { kop: 'Verloren', tekst: 'Je drinkt en ligt eruit. De laatste die overblijft deelt uit.', slok: '3 slokken' },
  ],
  opbouwen: [
    { teken: '🎰', kop: 'Gooi', tekst: 'Een 5. De pot staat op 5 en jij mag door.' },
    { kop: 'Nog een keer', tekst: 'Een 4 erbij. De pot staat op 9. Stoppen mag altijd.' },
    { teken: '🎲', kop: 'Een 1', tekst: 'Daar gaat je hele pot — en die drink je zelf.', slok: '9 slokken' },
  ],
  golflengte: [
    { teken: '📻', kop: 'De schaal', tekst: 'preuts ←→ schaamteloos. Eén speler ziet de geheime plek.' },
    { knop: 'festival', kop: 'Eén woord', tekst: 'Dat is zijn hele hint. Meer mag hij niet zeggen.' },
    { kop: 'Schuiven', tekst: 'De rest zet de schuif waar ze denken dat het zit.' },
    { kop: 'Ernaast', tekst: 'Hoe verder ernaast, hoe meer je drinkt.', slok: '3 slokken' },
  ],
  spiegel: [
    { teken: '🪞', kop: 'Jouw woord', tekst: 'LOGEERBED, uit de groep "in de slaapkamer".' },
    { kop: 'Twee hetzelfde', tekst: 'Eén ander heeft precies jouw woord. Misschien.' },
    { kop: 'Hinten', tekst: 'Praat erover, maar zeg je woord nooit hardop.' },
    { kop: 'Wijs aan', tekst: 'Wie is jouw spiegel? Fout gewezen kost je slokken.', slok: '3 slokken' },
  ],
  ketting: [
    { teken: '🔗', kop: 'Jouw getal', tekst: '63. Alleen jij ziet het.' },
    { kop: 'Op volgorde', tekst: 'Samen leggen jullie ze van laag naar hoog. Praten mag niet. Kreunen wel.' },
    { kop: 'Te vroeg', tekst: 'Jij legde 63 terwijl er nog een 41 open stond. Je drinkt het verschil.', slok: '2 slokken' },
  ],
  eenentwintig: [
    { kaarten: ['8♥', '9♠'], kop: '17', tekst: 'Nog een kaart, of stoppen?' },
    { kaarten: ['8♥', '9♠', '7♦'], kop: '24', tekst: 'Overboord. Je drinkt wat je te ver zat.', slok: '3 slokken' },
    { kop: 'Dichtst bij 21', tekst: 'Wie het dichtst komt zonder eroverheen, mag uitdelen.', slok: '3 uitdelen' },
  ],
  bom: [
    { teken: '💣', kop: 'De categorie', tekst: '"Smoesjes om eerder weg te gaan."' },
    { kop: 'Noem er een', tekst: 'En geef meteen door. De timer is onzichtbaar.' },
    { kop: 'Boem', tekst: 'Tussen de 30 en 120 seconden. Wie hem vasthoudt, drinkt.', slok: '5 slokken' },
  ],
  gelijkdenken: [
    { teken: '👯', kop: 'De vraag', tekst: '"Noem de drank waar je gegarandeerd ziek van wordt."' },
    { knop: 'tequila', kop: 'Typ je antwoord', tekst: 'Iedereen tegelijk. Het suffe antwoord is het goede.' },
    { kop: 'Match', tekst: 'Typte iemand anders hetzelfde? Je bent veilig.' },
    { kop: 'Alleen', tekst: 'Origineel zijn kost je een slok.', slok: '2 slokken' },
  ],
  dertig: [
    { teken: '⏳', kop: 'Vijf woorden', tekst: 'Dertig seconden. Omschrijf ze aan je eigen team.' },
    { kop: 'Niet het woord zelf', tekst: 'Vastgelopen? Overslaan mag, maar dat kost tijd.' },
    { kop: 'Drie gehaald', tekst: 'Wat jij haalt, drinkt iedereen van het andere team.', slok: '3 slokken' },
  ],
  stellingen: [
    { teken: '⚖️', kop: 'De stelling', tekst: '"Zoenen op een feestje telt niet."' },
    { kop: 'Eens of oneens', tekst: 'Iedereen tegelijk, niemand ziet de rest.' },
    { kop: '5 tegen 2', tekst: 'De kleinste groep drinkt. Gelijkspel? Dan ruziet iedereen door.', slok: '3 slokken' },
  ],
  hilo: [
    { kaarten: ['8♦'], kop: 'Hoger of lager?', tekst: 'Je moet kiezen. Stoppen kan niet.' },
    { kaarten: ['8♦', 'B♠'], kop: 'Goed', tekst: 'Je streak groeit en je gaat door.' },
    { kaarten: ['B♠', '4♥'], kop: 'Fout', tekst: 'Je deelt je hele streak uit — en dan is het voorbij.', slok: '4 uitdelen' },
  ],
  wievanons: [
    { teken: '🗳️', kop: 'De vraag', tekst: '"Wie zou als eerste een trio voorstellen?"' },
    { kop: 'Stem geheim', tekst: 'Iedereen tegelijk, op iemand anders.' },
    { kop: 'Vier stemmen', tekst: 'Wie de meeste stemmen krijgt, drinkt er evenveel.', slok: '4 slokken' },
  ],
  snelstevinger: [
    { teken: '🔴', kop: 'Rood', tekst: 'Nog niet tikken.' },
    { teken: '🟢', kop: 'Groen', tekst: 'Nu. Zo snel mogelijk.' },
    { kop: 'Traagste', tekst: 'De laatste drinkt 2. Te vroeg getikt kost er 3.', slok: '2 slokken' },
  ],
}
