import { useState } from 'react'
import { EMOJIS, joinKamer, maakKamer, MAX_SPELERS } from '../net/kamer'
import { bewaarProfiel, leesEmoji, leesNaam } from '../net/profiel'
import { pastBijGroep, SPELLEN } from '../engine/registry'
import { tril } from '../ui/Basis'
import { Kroeg } from '../ui/Kroeg'

/* ─────────────────────────────────────────────────────────────
   Het beginscherm, in kroegstijl.

   Twee genummerde planken onder elkaar — wie ben je, met hoeveel zijn jullie —
   en daaronder beginnen. In die volgorde, want je moet weten wie je bent
   voordat de rest ergens op slaat.

   De poppetjes staan in een strip die je opzij schuift in plaats van in een
   raster: dat scheelt een kwart scherm en er passen er zo veel meer in.
   ───────────────────────────────────────────────────────────── */

const AANTALLEN = [2, 3, 4, 5, 6, 7, 8]

export function Start({
  uid,
  beginCode,
  bijBinnen,
}: {
  uid: string
  beginCode: string | null
  bijBinnen: (code: string) => void
}) {
  const [naam, zetNaam] = useState(leesNaam)
  const [emoji, zetEmoji] = useState(leesEmoji)
  const [aantal, zetAantal] = useState(4)
  const [code, zetCode] = useState(beginCode ?? '')
  const [bezig, zetBezig] = useState(false)
  const [fout, zetFout] = useState<string | null>(null)

  const naamOk = naam.trim().length >= 1
  const passend = SPELLEN.filter((s) => s.id !== 'testspel' && pastBijGroep(s, aantal)).length
  const totaal = SPELLEN.filter((s) => s.id !== 'testspel').length

  async function nieuweLobby() {
    if (!naamOk || bezig) return
    zetBezig(true)
    zetFout(null)
    try {
      bewaarProfiel(naam.trim(), emoji)
      bijBinnen(await maakKamer(uid, naam.trim(), emoji, aantal))
    } catch (e: any) {
      zetFout(e?.message ?? 'Er ging iets mis')
    } finally {
      zetBezig(false)
    }
  }

  async function meedoen() {
    const schoon = code.trim().toUpperCase()
    if (!naamOk || schoon.length !== 4 || bezig) return
    zetBezig(true)
    zetFout(null)
    try {
      bewaarProfiel(naam.trim(), emoji)
      const probleem = await joinKamer(schoon, uid, naam.trim(), emoji)
      if (probleem === 'bestaat-niet') zetFout(`Lobby ${schoon} bestaat niet.`)
      else if (probleem === 'vol') zetFout(`Die lobby zit vol (max ${MAX_SPELERS}).`)
      else bijBinnen(schoon)
    } catch (e: any) {
      zetFout(e?.message ?? 'Er ging iets mis')
    } finally {
      zetBezig(false)
    }
  }

  return (
    <>
      <Kroeg />
      <div className="scherm" style={{ gap: 12 }}>
        <div style={{ textAlign: 'center' }}>
          <img
            src={`${import.meta.env.BASE_URL}logo-512.png`}
            alt="DORST!"
            width={96}
            height={96}
            className="logo"
            style={{ width: 96, height: 96, maxWidth: '28vw' }}
          />
          <div className="kroeg-kop" style={{ marginTop: 4 }}>
            Spel starten
          </div>
        </div>

        {/* ── 1 · Wie ben je ── */}
        <div className="plank">
          <div className="plank-kop">
            1 · Wie ben je?
            <small>tik op je poppetje</small>
          </div>

          <div className="poppetjes">
            {EMOJIS.map((e) => (
              <button
                key={e}
                className={`poppetje ${e === emoji ? 'gekozen' : ''}`}
                onClick={() => {
                  tril(8)
                  zetEmoji(e)
                }}
              >
                {e}
              </button>
            ))}
          </div>

          <div className="lint">
            <input
              value={naam}
              onChange={(e) => zetNaam(e.target.value.slice(0, 12))}
              placeholder="je naam"
              autoComplete="off"
              autoCapitalize="words"
            />
          </div>
        </div>

        {/* ── 2 · Met hoeveel ── */}
        <div className="plank">
          <div className="plank-kop">
            2 · Met hoeveel spelen jullie?
            <small>
              {passend} van de {totaal} spellen
            </small>
          </div>

          <div className="munten">
            {AANTALLEN.map((n) => (
              <button
                key={n}
                className={`munt ${n === aantal ? 'gekozen' : ''}`}
                onClick={() => {
                  tril(8)
                  zetAantal(n)
                }}
              >
                {n}
              </button>
            ))}
          </div>

          <div className="bordje">
            {aantal === 2
              ? 'Met z’n tweeën vallen de groepsspellen af, zoals Kingsen en De Imposter.'
              : 'Je kunt dit later in de lobby nog aanpassen.'}
          </div>
        </div>

        {fout && (
          <div className="bordje" style={{ maxWidth: '100%', color: '#8c1f18', fontWeight: 700 }}>
            {fout}
          </div>
        )}

        {/* ── Beginnen ── */}
        <div className="onderaan" style={{ marginTop: 'auto' }}>
          <button className="plaat" disabled={!naamOk || bezig} onClick={nieuweLobby}>
            🍻 Nieuwe lobby
          </button>

          <div className="kroeg-kop" style={{ marginTop: 4 }}>
            of doe mee met een code
          </div>

          <div className="rij" style={{ alignItems: 'stretch' }}>
            <input
              className="codeplaat"
              style={{ flex: 2 }}
              value={code}
              onChange={(e) =>
                zetCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4))
              }
              placeholder="ABCD"
              inputMode="text"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
            <button
              className="plaat hout"
              style={{ flex: 1 }}
              disabled={!naamOk || code.trim().length !== 4 || bezig}
              onClick={meedoen}
            >
              Meedoen
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
