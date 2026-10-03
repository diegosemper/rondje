/**
 * De korte voorbeeldjes bij elk spel.
 *
 * In de lobby staat naast elk spel een ▶. Daarachter zit geen filmpje maar een
 * rijtje beeldjes dat vanzelf doorloopt: drie of vier schermen die laten zien
 * wat je doet en wat het je kost. Dat is met opzet geen video -- vijfendertig
 * filmpjes zijn niet te maken en al helemaal niet te onderhouden, en een echte
 * video zou de app van een paar honderd kilobyte naar tientallen megabytes
 * brengen voor iets wat je één keer kijkt.
 *
 * Een beeldje moet in één oogopslag te lezen zijn, dus alle velden zijn kort en
 * allemaal optioneel. Laat weg wat je niet nodig hebt.
 */

export interface Beeld {
  /** groot in beeld, meestal één emoji */
  teken?: string
  /** speelkaarten of stenen als korte tekst, bijvoorbeeld 'A♥' */
  kaarten?: string[]
  /** de kop: wat er op dit moment gebeurt */
  kop?: string
  /** één regel die het uitlegt */
  tekst?: string
  /** een nagebootste knop, zodat je ziet waar je op zou tikken */
  knop?: string
  /** wat het kost of oplevert, bijvoorbeeld '3 slokken' */
  slok?: string
}
