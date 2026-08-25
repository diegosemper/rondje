import { useState } from 'react'
import { EMOJIS, joinKamer, maakKamer, MAX_SPELERS } from '../net/kamer'
import { bewaarProfiel, leesEmoji, leesNaam } from '../net/profiel'
import { pastBijGroep, SPELLEN } from '../engine/registry'
import { GroteKnop } from '../ui/Basis'
import { Feest } from '../ui/Feest'

/* ─────────────────────────────────────────────────────────────
   Het beginscherm.

   Drie dingen achter elkaar: wie ben je, met hoeveel zijn jullie, en maak je
   een lobby of doe je mee. In die volgorde, want je moet weten wie je bent
   voordat de rest ergens op slaat.

   Het aantal spelers is puur een filter op de spellijst. Kies je twee, dan
   verdwijnen de spellen die er meer nodig hebben helemaal uit beeld in plaats
   van dat je ze grijs ziet staan.
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
  const [open, zetOpen] = useState(false)
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
      const nieuw = await maakKamer(uid, naam.trim(), emoji, aantal)
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
    <>
      <Feest />
      <div className="scherm">
        <div style={{ textAlign: 'center' }}>
          <img
            src={`${import.meta.env.BASE_URL}logo-512.png`}
            alt="DORST!"
            width={112}
            height={112}
            className="logo"
            style={{ width: 112, height: 112, maxWidth: '34vw' }}
          />
        </div>

        {/* ── Wie ben je ── */}
        <div className="paneel">
          <div className="paneel-kop">
            <span className="kop-klein">1 · Wie ben je?</span>
            <span className="klein zacht">tik op je poppetje</span>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
            <button
              className={`emoji-groot ${open ? 'open' : ''}`}
              onClick={() => zetOpen(!open)}
              aria-label="Kies een poppetje"
            >
              {emoji}
            </button>
            <input
              style={{ flex: 1 }}
              value={naam}
              onChange={(e) => zetNaam(e.target.value.slice(0, 12))}
              placeholder="Je naam"
              autoComplete="off"
              autoCapitalize="words"
            />
          </div>

          {open && (
            <div className="emoji-strip">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  className={`emoji-knop ${e === emoji ? 'gekozen' : ''}`}
                  onClick={() => {
                    zetEmoji(e)
                    zetOpen(false)
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Met hoeveel ── */}
        <div className="paneel">
          <div className="paneel-kop">
            <span className="kop-klein">2 · Met hoeveel spelen jullie?</span>
            <span className="klein zacht">
              {passend} van de {totaal} spellen
            </span>
          </div>

          <div className="aantal-rij">
            {AANTALLEN.map((n) => (
              <button
                key={n}
                className={`aantal-knop ${n === aantal ? 'gekozen' : ''}`}
                onClick={() => zetAantal(n)}
              >
                {n}
                {n === MAX_SPELERS ? '' : ''}
              </button>
            ))}
          </div>

          <div className="klein zacht" style={{ marginTop: 6 }}>
            {aantal === 2
              ? 'Met z’n tweeën vallen de spellen af die een groep nodig hebben, zoals Kingsen en De Imposter.'
              : 'Je kunt dit later in de lobby nog aanpassen.'}
          </div>
        </div>

        {fout && (
          <div className="kaartje" style={{ borderColor: 'var(--rood)', color: 'var(--rood)' }}>
            {fout}
          </div>
        )}

        {/* ── Beginnen ── */}
        <div className="onderaan" style={{ marginTop: 'auto' }}>
          <GroteKnop kleur="goud" enorm uit={!naamOk || bezig} bijTik={nieuweLobby}>
            🍻 Nieuwe lobby
          </GroteKnop>

          <div className="of-streep">
            <span>of doe mee met een code</span>
          </div>

          <div className="rij" style={{ alignItems: 'stretch' }}>
            <input
              className="code-invoer"
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
            <GroteKnop
              uit={!naamOk || code.trim().length !== 4 || bezig}
              bijTik={meedoen}
            >
              Meedoen
            </GroteKnop>
          </div>
        </div>
      </div>
    </>
  )
}
