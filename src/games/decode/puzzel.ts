/**
 * Het puzzelwerk van De Code, los van het scherm en los van de spelstand.
 *
 * Er wordt een code van vier cijfers bedacht en daar worden aanwijzingen bij
 * gezocht die samen precies één code overhouden. Niet uit een lijst met
 * bedachte puzzels: die zijn na drie potjes op en iemand herkent ze. Zo is elk
 * potje nieuw en klopt hij altijd.
 *
 * DE KERN: een aanwijzing is een uitspraak plus een zeef. Met die zeven gaan
 * we alle tienduizend mogelijke codes langs en houden we over wat er nog kan.
 * Zijn er meerdere aanwijzingen nodig om op één uit te komen, dan pakken we er
 * steeds een die de meeste codes wegstreept.
 *
 * Waarom dat laatste: nemen we zomaar aanwijzingen, dan heb je er al gauw acht
 * nodig en is het aan tafel niet meer te doen. Door telkens de scherpste te
 * pakken kom je meestal met drie of vier uit, en dan is het nog een puzzel in
 * plaats van boekhouding.
 */

export interface Aanwijzing {
  /** wat er op het scherm van die speler staat */
  tekst: string
  /** klopt deze uitspraak voor die code? */
  klopt: (code: number[]) => boolean
}

export interface Puzzel {
  code: number[]
  aanwijzingen: string[]
}

const PLEK = ['eerste', 'tweede', 'derde', 'vierde']

/** Alle tienduizend codes, als lijstjes van vier cijfers. */
function alleCodes(): number[][] {
  const uit: number[][] = []
  for (let n = 0; n < 10000; n++) {
    uit.push([Math.floor(n / 1000) % 10, Math.floor(n / 100) % 10, Math.floor(n / 10) % 10, n % 10])
  }
  return uit
}

function som(code: number[]): number {
  return code.reduce((a, b) => a + b, 0)
}

/**
 * Alle aanwijzingen die wáár zijn voor deze code.
 *
 * Ze zijn met opzet allemaal in één zin te zeggen en in je hoofd te
 * controleren. Een aanwijzing als "de cijfers vormen een rekenkundige reeks"
 * snijdt heel scherp, maar daar komt een dronken tafel nooit uit.
 */
function kandidaten(code: number[]): Aanwijzing[] {
  const uit: Aanwijzing[] = []
  const tel = (c: number[], cijfer: number) => c.filter((x) => x === cijfer).length

  // Per plek: het exacte cijfer, en of hij even of oneven is.
  code.forEach((cijfer, i) => {
    uit.push({
      tekst: `Het ${PLEK[i]} cijfer is ${cijfer}.`,
      klopt: (c) => c[i] === cijfer,
    })
    uit.push({
      tekst: `Het ${PLEK[i]} cijfer is ${cijfer % 2 === 0 ? 'even' : 'oneven'}.`,
      klopt: (c) => c[i] % 2 === cijfer % 2,
    })
    uit.push({
      tekst: `Het ${PLEK[i]} cijfer is ${cijfer >= 5 ? '5 of hoger' : 'lager dan 5'}.`,
      klopt: (c) => (cijfer >= 5 ? c[i] >= 5 : c[i] < 5),
    })
  })

  // Hoe vaak een cijfer voorkomt — ook als het er nul keer is, want "er zit
  // geen enkele 7 in" streept een hoop weg.
  for (let cijfer = 0; cijfer <= 9; cijfer++) {
    const n = tel(code, cijfer)
    uit.push({
      tekst:
        n === 0
          ? `Er zit geen enkele ${cijfer} in de code.`
          : `Er zit${n === 1 ? '' : 'ten'} precies ${n} keer een ${cijfer} in de code.`,
      klopt: (c) => tel(c, cijfer) === n,
    })
  }

  // Onderlinge vergelijkingen tussen twee plekken.
  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
      if (code[i] === code[j]) {
        uit.push({
          tekst: `Het ${PLEK[i]} en het ${PLEK[j]} cijfer zijn gelijk.`,
          klopt: (c) => c[i] === c[j],
        })
      } else {
        const groter = code[i] > code[j] ? i : j
        const kleiner = code[i] > code[j] ? j : i
        uit.push({
          tekst: `Het ${PLEK[groter]} cijfer is groter dan het ${PLEK[kleiner]}.`,
          klopt: (c) => c[groter] > c[kleiner],
        })
      }
    }
  }

  // Eigenschappen van de hele code.
  const s = som(code)
  uit.push({ tekst: `De vier cijfers zijn samen ${s}.`, klopt: (c) => som(c) === s })
  uit.push({
    tekst: `De vier cijfers zijn samen ${s % 2 === 0 ? 'even' : 'oneven'}.`,
    klopt: (c) => som(c) % 2 === s % 2,
  })

  const uniek = new Set(code).size === 4
  uit.push({
    tekst: uniek
      ? 'Alle vier de cijfers zijn verschillend.'
      : 'Er komt minstens één cijfer twee keer voor.',
    klopt: (c) => (new Set(c).size === 4) === uniek,
  })

  const oplopend = code.every((x, i) => i === 0 || x >= code[i - 1])
  if (oplopend) {
    uit.push({
      tekst: 'De code loopt van links naar rechts niet omlaag.',
      klopt: (c) => c.every((x, i) => i === 0 || x >= c[i - 1]),
    })
  }

  const evenAantal = code.filter((x) => x % 2 === 0).length
  uit.push({
    tekst: `Er zit${evenAantal === 1 ? '' : 'ten'} ${evenAantal} even cijfer${evenAantal === 1 ? '' : 's'} in de code.`,
    klopt: (c) => c.filter((x) => x % 2 === 0).length === evenAantal,
  })

  const eersteTwee = code[0] + code[1]
  const laatsteTwee = code[2] + code[3]
  if (eersteTwee === laatsteTwee) {
    uit.push({
      tekst: 'De eerste twee cijfers zijn samen evenveel als de laatste twee.',
      klopt: (c) => c[0] + c[1] === c[2] + c[3],
    })
  } else {
    const helft = eersteTwee > laatsteTwee ? 'eerste' : 'laatste'
    uit.push({
      tekst: `De ${helft} twee cijfers zijn samen groter dan de andere twee.`,
      klopt: (c) =>
        helft === 'eerste' ? c[0] + c[1] > c[2] + c[3] : c[2] + c[3] > c[0] + c[1],
    })
  }

  return uit
}

/**
 * Bouwt een puzzel met precies zoveel aanwijzingen als er spelers zijn.
 *
 * Eerst wordt er een set gekozen die de code helemaal vastlegt: telkens de
 * aanwijzing die de meeste kandidaten wegstreept. Zijn er daarna nog spelers
 * over, dan krijgen die een aanwijzing die ook waar is maar niets nieuws
 * toevoegt. Dat is met opzet — iedereen moet iets te zeggen hebben, en niemand
 * hoort te weten of zijn eigen aanwijzing de doorslag geeft.
 */
export function maakPuzzel(rng: () => number, aantal: number): Puzzel {
  const code = [0, 1, 2, 3].map(() => Math.floor(rng() * 10))
  const pool = kandidaten(code)

  // Husselen, zodat twee potjes met dezelfde code toch anders aanvoelen.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }

  let over = alleCodes()
  const gekozen: Aanwijzing[] = []

  // Zolang er meer dan één code mogelijk is: pak de scherpste aanwijzing.
  while (over.length > 1 && gekozen.length < 8) {
    let beste: Aanwijzing | null = null
    let besteOver: number[][] = over

    for (const a of pool) {
      if (gekozen.includes(a)) continue
      const rest = over.filter(a.klopt)
      if (rest.length < besteOver.length || beste === null) {
        beste = a
        besteOver = rest
      }
    }

    if (!beste || besteOver.length === over.length) break
    gekozen.push(beste)
    over = besteOver
  }

  // Aanvullen tot iedereen er een heeft. Deze voegen niets toe, en dat mag:
  // ze zijn waar, en niemand kan aan zijn eigen kaartje zien of hij ertoe doet.
  for (const a of pool) {
    if (gekozen.length >= aantal) break
    if (!gekozen.includes(a)) gekozen.push(a)
  }

  // Meer aanwijzingen dan spelers? Dan moeten er een paar samen op één scherm,
  // anders is de code niet meer af te leiden.
  return { code, aanwijzingen: verdeel(gekozen.map((a) => a.tekst), aantal) }
}

/**
 * Verdeelt de aanwijzingen over de spelers.
 *
 * Zijn er meer aanwijzingen dan spelers, dan krijgt iemand er twee op zijn
 * scherm. Dat is beter dan er een weglaten: zonder die ene is de code niet
 * meer te bepalen en zit de tafel voor niets te puzzelen.
 */
function verdeel(teksten: string[], aantal: number): string[] {
  const uit: string[] = Array.from({ length: aantal }, () => '')
  teksten.forEach((t, i) => {
    const plek = i % aantal
    uit[plek] = uit[plek] ? `${uit[plek]}\n${t}` : t
  })
  return uit
}

/** Of deze invoer de code is. */
export function isGoed(code: number[], gok: string): boolean {
  return gok.length === 4 && gok === code.join('')
}
