/**
 * Schalen voor Golflengte.
 *
 * Een goede schaal heeft twee uitersten waar iedereen hetzelfde beeld bij
 * heeft, en genoeg ruimte ertussen om over te twisten. "Koud - heet" werkt;
 * "goed - slecht" niet, want dat is bij iedereen anders.
 */
export interface Schaal {
  links: string
  rechts: string
}

export const SCHALEN: Schaal[] = [
  { links: 'koud', rechts: 'heet' },
  { links: 'klein', rechts: 'groot' },
  { links: 'goedkoop', rechts: 'duur' },
  { links: 'langzaam', rechts: 'snel' },
  { links: 'stil', rechts: 'luid' },
  { links: 'zacht', rechts: 'hard' },
  { links: 'ouderwets', rechts: 'modern' },
  { links: 'saai', rechts: 'spannend' },
  { links: 'ongezond', rechts: 'gezond' },
  { links: 'gevaarlijk', rechts: 'veilig' },
  { links: 'lelijk', rechts: 'mooi' },
  { links: 'makkelijk', rechts: 'moeilijk' },
  { links: 'onbekend', rechts: 'beroemd' },
  { links: 'droog', rechts: 'nat' },
  { links: 'licht', rechts: 'zwaar' },
  { links: 'donker', rechts: 'fel' },
  { links: 'kinderachtig', rechts: 'volwassen' },
  { links: 'goor', rechts: 'lekker' },
  { links: 'nutteloos', rechts: 'onmisbaar' },
  { links: 'zeldzaam', rechts: 'overal' },
  { links: 'ontspannen', rechts: 'stressvol' },
  { links: 'schoon', rechts: 'vies' },
  { links: 'dichtbij', rechts: 'ver weg' },
  { links: 'stiekem', rechts: 'openlijk' },
  { links: 'geheim', rechts: 'algemeen bekend' },
  { links: 'goedkope date', rechts: 'dure date' },
  { links: 'huisdier', rechts: 'wild dier' },
  { links: 'ontbijt', rechts: 'avondeten' },
  { links: 'binnen', rechts: 'buiten' },
  { links: 'alleen doen', rechts: 'samen doen' },
  { links: 'guilty pleasure', rechts: 'trots op' },
  { links: 'onderschat', rechts: 'overschat' },
  { links: 'nooit gedaan', rechts: 'elke dag' },
  { links: 'zou ik nooit eten', rechts: 'zou ik elke dag eten' },
  { links: 'slecht idee', rechts: 'geniaal idee' },
]
