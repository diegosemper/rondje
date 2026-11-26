/*
 * De powerupkern: twintig kaarten, en wat ze met slokken doen.
 *
 * Dit is zuiver rekenwerk zonder scherm en zonder database, dus precies het
 * soort ding dat je kunt natrekken zonder vier telefoons te hoeven pakken.
 */
const { laad } = require('./bundel.cjs')
const { eis, gelijk, uitslag } = require('./keur.cjs')

const P = laad('engine/powerups.ts')

/** Vier spelers aan tafel; B zit links van A. */
const TAFEL = ['A', 'B', 'C', 'D']

/**
 * Een stand met deze kaarten.
 *
 * Sterke kaarten staan standaard ingezet -- anders zou de helft van de test
 * alleen meten dat een niet-ingezette kaart niets doet.
 */
function stand(kaarten, opties = {}) {
  const s = P.legeStand()
  s.ronde = 1
  s.over = P.CYCLUS
  s.kaarten = kaarten
  s.doelwit = opties.doelwit ?? {}
  s.actief =
    opties.actief ??
    Object.keys(kaarten).filter((u) => P.geefPowerup(kaarten[u])?.sterk)
  return s
}

/** De uitkomst als {uid: aantal}, zodat je er één regel van kunt maken. */
function per(regels) {
  const uit = {}
  for (const r of regels) uit[r.uid] = (uit[r.uid] ?? 0) + r.aantal
  return uit
}

const drink = (s, uid, n) => per(P.pasDrinkAan(s, TAFEL, uid, n))
const geef = (s, van, naar, n) => per(P.pasUitdelenAan(s, TAFEL, van, naar, n))

/* ── Zonder powerups verandert er niets ─────────────────────── */

gelijk('kale stand: drinken blijft drinken', drink(stand({}), 'A', 4), { A: 4 })
gelijk('kale stand: uitdelen komt aan', geef(stand({}), 'A', 'B', 3), { B: 3 })

/* ── De tien kleine kaarten ─────────────────────────────────── */

gelijk('schild: niets te drinken', drink(stand({ A: 'schild' }), 'A', 4), {})

gelijk(
  'doorgeefluik: de ander drinkt het',
  drink(stand({ A: 'doorgeefluik' }, { doelwit: { A: 'B' } }), 'A', 4),
  { B: 4 },
)

gelijk('dubbel uitdelen: twee keer zoveel', geef(stand({ A: 'dubbeluit' }), 'A', 'B', 3), {
  B: 6,
})

gelijk('halve straf: naar beneden afgerond', drink(stand({ A: 'halvestraf' }), 'A', 5), { A: 2 })

gelijk('spiegel: naar de buurman', drink(stand({ A: 'spiegel' }), 'A', 4), { B: 4 })

gelijk(
  'bodyguard: hij drinkt het voor de ander',
  drink(stand({ A: 'bodyguard' }, { doelwit: { A: 'B' } }), 'B', 4),
  { A: 4 },
)

gelijk(
  'stiltegebod: de uitdeling komt bij de vanger terecht',
  geef(stand({ A: 'stiltegebod' }, { doelwit: { A: 'B' } }), 'B', 'C', 3),
  { A: 3 },
)

gelijk('vlucht: niets drinken', drink(stand({ A: 'vlucht' }), 'A', 4), {})
gelijk('vlucht: niets uitdelen', geef(stand({ A: 'vlucht' }), 'A', 'B', 3), {})

gelijk(
  'kopje onder: de ander krijgt het dubbel',
  drink(stand({ A: 'kopjeonder' }, { doelwit: { A: 'B' } }), 'A', 3),
  { B: 6 },
)

gelijk('kurk: twee minder', drink(stand({ A: 'kurk' }), 'A', 5), { A: 3 })
gelijk('kurk: nooit onder nul', drink(stand({ A: 'kurk' }), 'A', 2), {})

/* ── De tien sterke kaarten ─────────────────────────────────── */

gelijk(
  'veto: de kaart van de ander doet niets',
  drink(stand({ A: 'veto', B: 'schild' }, { doelwit: { A: 'B' } }), 'B', 4),
  { B: 4 },
)
gelijk(
  'veto werkt niet als hij niet ingezet is',
  drink(
    stand({ A: 'veto', B: 'schild' }, { doelwit: { A: 'B' }, actief: [] }),
    'B',
    4,
  ),
  {},
)

gelijk(
  'drinkbuddy: samen drinken',
  drink(stand({ A: 'drinkbuddy' }, { doelwit: { A: 'B' } }), 'A', 3),
  { A: 3, B: 3 },
)

{
  const s = stand({ A: 'omkering' })
  gelijk('omkering: zijn eigen drinken valt weg', drink(s, 'A', 4), {})
  gelijk('omkering: en komt als uitdeling terug', per(P.omkeringUitdelen(s, TAFEL, 'A', 4)), {
    B: 2,
    C: 1,
    D: 1,
  })
  gelijk('omkering: uitdelen wordt zelf opdrinken', geef(s, 'A', 'B', 3), { A: 3 })
}

gelijk(
  'groepsbeschermer: de rest betaalt',
  drink(stand({ A: 'groepsbeschermer' }), 'A', 3),
  { B: 3, C: 3, D: 3 },
)

gelijk(
  'dubbele straf: de ander drinkt dubbel',
  drink(stand({ A: 'dubbelestraf' }, { doelwit: { A: 'B' } }), 'B', 3),
  { B: 6 },
)

gelijk('scherprechter: de rest krijgt er twee bij', drink(stand({ A: 'scherprechter' }), 'B', 3), {
  B: 5,
})
gelijk('scherprechter: hij zelf niet', drink(stand({ A: 'scherprechter' }), 'A', 3), { A: 3 })

gelijk('belasting: wie uitdeelt drinkt er zelf twee', geef(stand({ A: 'belasting' }), 'B', 'C', 3), {
  C: 3,
  B: 2,
})
gelijk('belasting: niet over zijn eigen uitdelingen', geef(stand({ A: 'belasting' }), 'A', 'B', 3), {
  B: 3,
})

{
  const s = stand({ A: 'sneeuwbal' })
  gelijk('sneeuwbal 1: twee erbij', geef(s, 'A', 'B', 2), { B: 4 })
  gelijk('sneeuwbal 2: vier erbij', geef(s, 'A', 'B', 2), { B: 6 })
  gelijk('sneeuwbal 3: zes erbij', geef(s, 'A', 'B', 2), { B: 8 })
  gelijk('sneeuwbal 4: groeit niet door', geef(s, 'A', 'B', 2), { B: 8 })
}

gelijk('gulle hand: zes erbij', geef(stand({ A: 'gullehand' }), 'A', 'B', 1), { B: 7 })

gelijk('kaatsmuur: de uitdeler drinkt mee', geef(stand({ B: 'kaatsmuur' }), 'A', 'B', 3), {
  B: 3,
  A: 3,
})

/* ── Kaarten die elkaar in de weg zitten ────────────────────── */

{
  // A stuurt alles naar B, B alles naar A. Dit mag niet eeuwig doorlopen.
  const s = stand({ A: 'doorgeefluik', B: 'doorgeefluik' }, { doelwit: { A: 'B', B: 'A' } })
  const regels = P.pasDrinkAan(s, TAFEL, 'A', 4)
  eis('kringetje: het stopt', regels.length > 0 && regels.length < 10)
  gelijk('kringetje: er gaat niets verloren of bij', regels.reduce((a, r) => a + r.aantal, 0), 4)
}

{
  // Omkering plus dubbel uitdelen bij dezelfde speler bestaat niet (je hebt
  // één kaart), maar omkering plus de kaatsmuur van een ander wel.
  const s = stand({ A: 'omkering', B: 'kaatsmuur' })
  const regels = geef(s, 'A', 'B', 3)
  gelijk('omkering gaat voor op de kaatsmuur van de ander', regels, { A: 3 })
}

/* ── Niets wordt negatief, en niets wordt een halve slok ────── */

for (const p of P.POWERUPS) {
  for (const n of [1, 2, 3, 4, 5, 6, 7]) {
    for (const wie of ['A', 'B']) {
      const s = stand({ A: p.id }, { doelwit: { A: 'B' } })
      for (const regels of [
        P.pasDrinkAan(s, TAFEL, wie, n),
        P.pasUitdelenAan(s, TAFEL, wie, wie === 'A' ? 'B' : 'A', n),
        P.omkeringUitdelen(s, TAFEL, wie, n),
      ]) {
        for (const r of regels) {
          eis(
            `${p.id}: hele slokken boven nul (${wie}, ${n})`,
            Number.isInteger(r.aantal) && r.aantal > 0,
            `kreeg ${r.aantal} bij ${r.uid}`,
          )
        }
      }
    }
  }
}

/* ── Werkzaam: een sterke kaart doet niets zonder inzet ─────── */

for (const p of P.POWERUPS) {
  const s = stand({ A: p.id }, { actief: [] })
  const w = P.werkzaam(s, 'A')
  eis(
    `${p.id}: ${p.sterk ? 'sterk, dus uit zonder inzet' : 'klein, dus altijd aan'}`,
    p.sterk ? w === null : w?.id === p.id,
  )
}

/* ── Trekken: iedereen iets anders, en niet hetzelfde als net ─ */

{
  let zaad = 12345
  const rng = () => {
    zaad = (zaad * 1103515245 + 12345) & 0x7fffffff
    return zaad / 0x7fffffff
  }

  for (let poging = 0; poging < 200; poging++) {
    const vorige = { A: 'schild', B: 'veto', C: 'kurk', D: 'omkering' }
    const kaarten = P.trekKaarten(rng, TAFEL, vorige)
    const ids = TAFEL.map((u) => kaarten[u])

    eis('trekken: iedereen krijgt een kaart', ids.every(Boolean))
    eis('trekken: geen twee dezelfde', new Set(ids).size === ids.length, ids.join(','))
    eis(
      'trekken: niet dezelfde als vorige ronde',
      TAFEL.every((u) => kaarten[u] !== vorige[u]),
      ids.join(','),
    )
    eis('trekken: alleen bestaande kaarten', ids.every((id) => !!P.geefPowerup(id)))
  }
}

/* ── De catalogus zelf ──────────────────────────────────────── */

{
  const ids = P.POWERUPS.map((p) => p.id)
  gelijk('twintig kaarten', ids.length, 20)
  eis('geen dubbele ids', new Set(ids).size === ids.length)
  gelijk('tien sterke', P.POWERUPS.filter((p) => p.sterk).length, 10)
  for (const p of P.POWERUPS) {
    eis(`${p.id}: heeft naam, teken en uitleg`, !!p.naam && !!p.teken && !!p.uitleg)
  }
  // Elke kaart die een doelwit vraagt moet er ook echt iets mee doen, en elke
  // kaart die er een gebruikt moet erom vragen. Anders kies je voor niets, of
  // staat een kaart stil omdat niemand hem heeft gericht.
  for (const p of P.POWERUPS) {
    if (p.doelwit) continue
    const zonder = drink(stand({ A: p.id }), 'A', 3)
    const met = drink(stand({ A: p.id }, { doelwit: { A: 'B' } }), 'A', 3)
    gelijk(`${p.id}: vraagt niet om een doelwit, dus maakt het geen verschil`, zonder, met)
  }
}

/* ── Keuzes van spelers samenvoegen ─────────────────────────── */

{
  const basis = stand({ A: 'veto', B: 'drinkbuddy', C: 'schild' }, { actief: [] })
  basis.inzetten = { A: 2, B: 2 }

  // Twee spelers kiezen tegelijk; beide keuzes moeten blijven staan. Dit is
  // waarom ze niet in dezelfde tekst geschreven worden.
  const samen = P.voegKeuzesSamen(basis, {
    A: { doel: 'C', inzet: 'ja' },
    B: { doel: 'A', inzet: 'nee' },
  })
  gelijk('samenvoegen: beide doelwitten blijven', samen.doelwit, { A: 'C', B: 'A' })
  gelijk('samenvoegen: alleen wie ja zei is actief', samen.actief, ['A'])
  gelijk('samenvoegen: beiden hebben gekozen', samen.gereed.sort(), ['A', 'B'])

  // De stand zelf verandert niet; er komt een nieuwe uit.
  gelijk('samenvoegen: laat de stand ongemoeid', basis.actief, [])

  // Zonder inzetten over kun je niet alsnog ja zeggen.
  const leeg = P.voegKeuzesSamen({ ...basis, inzetten: { A: 0 } }, { A: { inzet: 'ja' } })
  gelijk('samenvoegen: ja zonder inzet telt niet', leeg.actief, [])
  gelijk('samenvoegen: maar hij heeft wel gekozen', leeg.gereed, ['A'])

  // Een leeg doelwit (je kiest opnieuw) wist de keuze in plaats van hem te
  // vervangen door niets.
  const opnieuw = P.voegKeuzesSamen(
    { ...basis, doelwit: { A: 'B' } },
    { A: { doel: '' } },
  )
  gelijk('samenvoegen: leeg doelwit laat de oude staan', opnieuw.doelwit, { A: 'B' })

  // Niets gekozen: precies de stand terug.
  gelijk('samenvoegen: zonder keuzes verandert niets', P.voegKeuzesSamen(basis, {}), basis)
}

/* ── Teruggeven van een inzet ───────────────────────────────── */

{
  // Deze kaarten kunnen alleen iets als er uitgedeeld wordt. Wordt er in een
  // spel niets uitgedeeld, dan hoort de inzet terug te komen.
  const alleenBijUitdelen = ['dubbeluit', 'sneeuwbal', 'gullehand', 'belasting', 'kaatsmuur']
  for (const p of P.POWERUPS) {
    gelijk(
      `${p.id}: heeft ${alleenBijUitdelen.includes(p.id) ? 'wel' : 'geen'} uitdeling nodig`,
      P.heeftZinZonderUitdelen(p.id),
      !alleenBijUitdelen.includes(p.id),
    )
  }

  /*
   * En dat moet kloppen met wat de kaarten echt doen: een kaart die zonder
   * uitdelen zin heeft, moet een gewone drinkopdracht ook echt veranderen.
   * Anders zou je je inzet onterecht kwijt zijn.
   */
  for (const p of P.POWERUPS.filter((x) => x.sterk)) {
    /*
     * A heeft de kaart onder de loep. Twee opstellingen, want de kaarten
     * grijpen op verschillende dingen in: de ene op je eigen slokken, de
     * andere op die van een ander, en Veto op de kaart van een ander -- dus
     * moet er in die tweede opstelling ook echt een kaart liggen om uit te
     * zetten.
     */
    const opstellingen = [{}, { B: 'schild' }]

    const doetIets = opstellingen.some((rest) =>
      ['A', 'B'].some((wie) => {
        const kaal = stand({ ...rest })
        const s = stand({ A: p.id, ...rest }, { doelwit: { A: 'B' } })
        if (JSON.stringify(drink(kaal, wie, 4)) !== JSON.stringify(drink(s, wie, 4))) return true
        // Omkering haalt het drinken weg en stuurt het als uitdeling rond;
        // dat telt ook als verandering.
        return Object.keys(per(P.omkeringUitdelen(s, TAFEL, wie, 4))).length > 0
      }),
    )

    eis(
      `${p.id}: verandert ${P.heeftZinZonderUitdelen(p.id) ? 'wel' : 'niet'} een kale drinkopdracht`,
      doetIets === P.heeftZinZonderUitdelen(p.id),
      `kaal: A ${JSON.stringify(drink(stand({ A: p.id }, { doelwit: { A: 'B' } }), 'A', 4))}`,
    )
  }
}

process.exit(uitslag('powerups'))
