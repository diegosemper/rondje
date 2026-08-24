import { useState } from 'react'
import { EMOJIS, joinKamer, maakKamer, MAX_SPELERS } from '../net/kamer'
import { bewaarProfiel, leesEmoji, leesNaam } from '../net/profiel'
import { GroteKnop } from '../ui/Basis'

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
  const [code, zetCode] = useState(beginCode ?? '')
  const [bezig, zetBezig] = useState(false)
  const [fout, zetFout] = useState<string | null>(null)

  const naamOk = naam.trim().length >= 1

  async function nieuweLobby() {
    if (!naamOk || bezig) return
    zetBezig(true)
    zetFout(null)
    try {
      bewaarProfiel(naam.trim(), emoji)
      const nieuw = await maakKamer(uid, naam.trim(), emoji)
      bijBinnen(nieuw)
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
    <div className="scherm">
      <div style={{ textAlign: 'center', paddingTop: 8 }}>
        <h1>
          Rondje <span style={{ color: 'var(--goud)' }}>🍺</span>
        </h1>
        <div className="zacht klein">Veertig drankspellen, één lobby</div>
      </div>

      <div>
        <div className="kop-klein" style={{ marginBottom: 6 }}>
          Hoe heet je?
        </div>
        <input
          value={naam}
          onChange={(e) => zetNaam(e.target.value.slice(0, 12))}
          placeholder="Je naam"
          autoComplete="off"
          autoCapitalize="words"
        />
      </div>

      <div>
        <div className="kop-klein" style={{ marginBottom: 6 }}>
          Kies een poppetje
        </div>
        <div className="emoji-raster">
          {EMOJIS.map((e) => (
            <button
              key={e}
              className={`emoji-knop ${e === emoji ? 'gekozen' : ''}`}
              onClick={() => zetEmoji(e)}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      {fout && (
        <div className="kaartje" style={{ borderColor: 'var(--rood)', color: 'var(--rood)' }}>
          {fout}
        </div>
      )}

      <div className="onderaan" style={{ marginTop: 'auto' }}>
        <GroteKnop kleur="goud" enorm uit={!naamOk || bezig} bijTik={nieuweLobby}>
          Nieuwe lobby
        </GroteKnop>

        <hr className="streep" />
        <div className="kop-klein" style={{ textAlign: 'center' }}>
          of doe mee met een code
        </div>

        <input
          className="code-invoer"
          value={code}
          onChange={(e) => zetCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4))}
          placeholder="ABCD"
          inputMode="text"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        <GroteKnop uit={!naamOk || code.trim().length !== 4 || bezig} bijTik={meedoen}>
          Meedoen
        </GroteKnop>
      </div>
    </div>
  )
}
