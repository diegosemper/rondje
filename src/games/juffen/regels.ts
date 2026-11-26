/**
 * De rekenregels van Juffen, los van het scherm en los van de spelstand.
 *
 * Dit is het enige stuk waar je echt iets fout kunt rekenen, en dan laat de app
 * iemand drinken voor een getal dat gewoon mocht. Daarom staat het apart en
 * wordt het los nagerekend.
 */

/** De tafels waaruit je kunt kiezen. */
export const TAFELS = [2, 3, 4, 5, 6, 7, 8, 9, 10]

/**
 * Tafel 1 zit er niet bij, en dat is geen vergetelheid: elk getal is een
 * veelvoud van 1, dus elk getal zou verboden zijn en er valt niets te tellen.
 */

/**
 * Is dit getal verboden bij deze tafel?
 *
 * Drie redenen, en ze mogen allemaal tegelijk gelden:
 *  · het is een veelvoud van de tafel
 *  · het cijfer van de tafel staat erin (bij tafel 10 is dat de nul)
 *  · het is een dubbel getal: 11, 22, 33 en zo door
 */
export function isVerboden(getal: number, tafel: number): boolean {
  const cijfer = tafel === 10 ? '0' : String(tafel)
  const tekst = String(getal)
  const veelvoud = getal % tafel === 0
  const bevatCijfer = tekst.includes(cijfer)
  const dubbel = tekst.length > 1 && [...tekst].every((c) => c === tekst[0])
  return veelvoud || bevatCijfer || dubbel
}

/**
 * Wat de hele tafel per persoon drinkt als de telling klapt.
 *
 * Het getal waar je op stond, verdeeld over iedereen en naar boven afgerond --
 * zo ontsnapt er niemand bij een rest. Hoe verder de groep kwam, hoe duurder
 * het wordt, en dat is precies wat een lange telling spannend maakt.
 */
export function slokkenPerPersoon(getal: number, aantalSpelers: number): number {
  if (aantalSpelers <= 0) return getal
  return Math.max(1, Math.ceil(getal / aantalSpelers))
}

/**
 * Het eerstvolgende getal dat wél mag.
 *
 * Alleen nodig om te laten zien hoe ver de telling nog had kunnen komen; het
 * spel zelf loopt getal voor getal. De grens is er om te voorkomen dat dit
 * eeuwig doorzoekt als er in een reeks niets meer mag.
 */
export function volgendToegestaan(vanaf: number, tafel: number, grens = 500): number | null {
  for (let n = vanaf + 1; n <= grens; n++) {
    if (!isVerboden(n, tafel)) return n
  }
  return null
}
