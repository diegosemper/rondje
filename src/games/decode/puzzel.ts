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
 * Hoeveel aanwijzingen we het liefst hebben, gegeven het aantal spelers.
 *
 * Meer dan er spelers zijn, met opzet. Elke aanwijzing die overblijft is er een
 * die je nodig hebt, dus met meer aanwijzingen dan mensen krijgt iemand er twee
 * op zijn scherm en moet de tafel echt alles bij elkaar leggen.
 */
function doelAantal(aantal: number): number {
  // Hoogstens drie regels op één scherm: meer dan dat leest niemand voor aan
  // een tafel die al drie glazen op heeft. Bij twee spelers is dat dus zes
  // aanwijzingen, bij acht zou het er vierentwintig mogen zijn -- maar boven de
  // twaalf wordt het boekhouden in plaats van puzzelen.
  return Math.min(aantal * 3, 12)
}

/**
 * Gooit alles eruit wat niet nodig is.
 *
 * Na het opbouwen zitten er vaak aanwijzingen tussen die achteraf niets meer
 * toevoegen, omdat een latere aanwijzing hetzelfde werk deed. Die moeten weg:
 * een aanwijzing die je kunt missen betekent dat één speler de hele ronde niets
 * te melden heeft, en dat merkt hij.
 *
 * Wat overblijft is een set waarin élke aanwijzing nodig is. Laat er eentje weg
 * en er blijven twee codes over.
 */
function snoei(gekozen: Aanwijzing[], alle: number[][]): Aanwijzing[] {
  const uit = [...gekozen]
  for (let i = uit.length - 1; i >= 0; i--) {
    const zonder = uit.filter((_, j) => j !== i)
    let over = alle
    for (const a of zonder) over = over.filter(a.klopt)
    if (over.length === 1) uit.splice(i, 1)
  }
  return uit
}

/**
 * Bouwt de puzzel.
 *
 * DIT WAS EERST VEEL TE MAKKELIJK, en de oorzaak zat in de opzet: er werd
 * telkens de aanwijzing gekozen die de meeste codes wegstreepte. Dat klinkt
 * slim, maar de scherpste aanwijzing is altijd een weggevertje als "het eerste
 * cijfer is 7". Met drie van die kaarten staat de halve code al op tafel en is
 * het binnen twintig seconden klaar. Er viel niets af te leiden -- je hoefde
 * alleen maar voor te lezen wat je had.
 *
 * Nu gebeurt het andersom. Er wordt gezocht naar aanwijzingen die ieder voor
 * zich wéinig wegstrepen, zoals "het derde cijfer is even" of "de eerste twee
 * cijfers zijn samen groter dan de laatste twee". Daar heb je er veel meer van
 * nodig, en geen enkele geeft in zijn eentje iets weg. Pas als je ze
 * combineert kom je ergens, en dat is precies het spel.
 *
 * De zoektocht doet een aantal pogingen met verschillende drempels voor hoe
 * zwak een aanwijzing minimaal moet zijn. Zijn er alleen zwakke aanwijzingen
 * toegestaan, dan lukt het soms niet om op één code uit te komen; dan wordt de
 * drempel losser. Van alle gelukte pogingen wint die met het aantal
 * aanwijzingen dat het dichtst bij het doel zit.
 */
export function maakPuzzel(rng: () => number, aantal: number): Puzzel {
  const code = [0, 1, 2, 3].map(() => Math.floor(rng() * 10))
  const pool = kandidaten(code)
  const alle = alleCodes()
  const doel = doelAantal(aantal)

  // Hoeveel codes houdt elke aanwijzing over als je hem alleen gebruikt? Hoe
  // meer er overblijft, hoe zwakker de aanwijzing en hoe liever we hem hebben.
  const metKracht = pool.map((a) => ({ a, houdt: alle.filter(a.klopt).length }))

  // Van streng naar los. Bij 4000 mogen alleen aanwijzingen mee die in hun
  // eentje bijna niets wegstrepen; bij 0 mag alles, ook het weggevertje.
  const drempels = [4000, 3000, 2000, 1000, 0]
  let beste: Aanwijzing[] | null = null

  for (const drempel of drempels) {
    const mag = metKracht.filter((x) => x.houdt >= drempel)
    if (mag.length === 0) continue

    for (let poging = 0; poging < 12; poging++) {
      // Zwakste eerst, maar met ruis erdoorheen: anders krijgt elke puzzel met
      // dezelfde code dezelfde aanwijzingen in dezelfde volgorde.
      const volgorde = [...mag]
        .map((x) => ({ x, sleutel: x.houdt * (0.75 + 0.5 * rng()) }))
        .sort((p, q) => q.sleutel - p.sleutel)
        .map((p) => p.x.a)

      let over = alle
      const gekozen: Aanwijzing[] = []
      for (const a of volgorde) {
        if (over.length === 1) break
        const rest = over.filter(a.klopt)
        // Voegt niets toe? Overslaan; anders staat er straks een aanwijzing
        // tussen waar niemand iets aan heeft.
        if (rest.length === over.length) continue
        gekozen.push(a)
        over = rest
      }

      if (over.length !== 1) continue
      const nodig = snoei(gekozen, alle)

      // Van de sets die op één scherm passen willen we juist de grootste: hoe
      // meer aanwijzingen er nodig zijn, hoe meer de tafel moet combineren.
      // Past er niets, dan is de kleinste de minst slechte.
      const past = nodig.length <= doel
      const bestePast = beste !== null && beste.length <= doel
      if (
        beste === null ||
        (past && !bestePast) ||
        (past && bestePast && nodig.length > beste.length) ||
        (!past && !bestePast && nodig.length < beste.length)
      ) {
        beste = nodig
      }
      if (beste.length === doel) break
    }

    if (beste && beste.length === doel) break
  }

  /*
   * Past het nog steeds niet op de schermen, dan moet het scherper.
   *
   * Dat gebeurt vooral met z'n tweeën: twaalf zwakke aanwijzingen verdeeld over
   * twee telefoons is vijf regels per scherm, en dat leest niemand voor. Dan is
   * de oude aanpak beter -- steeds de aanwijzing die het meeste wegstreept --
   * want die is met een stuk of vier klaar. Zo'n potje is makkelijker, maar met
   * twee man valt er nu eenmaal weinig samen te leggen.
   */
  if (!beste || beste.length > doel) {
    let over = alle
    const scherp: Aanwijzing[] = []
    while (over.length > 1 && scherp.length < 8) {
      let besteA: Aanwijzing | null = null
      let besteOver = over
      for (const a of pool) {
        if (scherp.includes(a)) continue
        const rest = over.filter(a.klopt)
        if (besteA === null || rest.length < besteOver.length) {
          besteA = a
          besteOver = rest
        }
      }
      if (!besteA || besteOver.length === over.length) break
      scherp.push(besteA)
      over = besteOver
    }
    if (over.length === 1 && (!beste || scherp.length < beste.length)) {
      beste = snoei(scherp, alle)
    }
  }

  // Nog steeds niets? Dan is er altijd nog de code zelf, cijfer voor cijfer.
  // Dat hoort niet te gebeuren, maar een puzzel die niet klopt is erger dan een
  // makkelijke.
  const gekozen =
    beste ??
    code.map((cijfer, i) => ({
      tekst: `Het ${PLEK[i]} cijfer is ${cijfer}.`,
      klopt: (c: number[]) => c[i] === cijfer,
    }))

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
