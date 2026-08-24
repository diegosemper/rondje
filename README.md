# Rondje 🍺

Veertig korte drankspellen in één lobby. Iedereen opent dezelfde link op zijn
telefoon, typt de lobbycode, en de groep gaat samen door de spellen heen.
Uitgespeeld? Skip, volgende.

- 3 tot 8 spelers
- Web-app: geen installatie, geen app store
- Zwaarte instelbaar in de lobby — inclusief een **droge stand** met strafpunten
  in plaats van slokken, zodat wie rijdt gewoon mee kan doen
- Elke speler heeft een privéscherm, dus bluffen en geheime rollen kunnen echt

---

## Zelf draaien

Node.js staat al geïnstalleerd in `%LOCALAPPDATA%\rondje-tools`. Open een
PowerShell-venster in deze map en typ:

```powershell
npm run dev
```

Ga naar `http://localhost:5173`. Open dezelfde pagina in meerdere
browservensters om meerdere spelers na te doen.

**Met echte telefoons op je eigen wifi:**

```powershell
npm run telefoon
```

Daar staat een adres bij als `http://192.168.1.20:5173/`. Dat kan elke telefoon
op jouw wifi openen.

**Controleren of de code klopt:**

```powershell
npm run build
```

---

## Firebase instellen (eenmalig, gratis)

De app zelf is een gewone website. Om telefoons live met elkaar te verbinden
gebruiken we Firebase. Zolang dat niet is ingesteld, laat de app een
uitlegscherm zien.

1. Ga naar [console.firebase.google.com](https://console.firebase.google.com)
2. **Project toevoegen** → naam `rondje` → Google Analytics uit
3. **Build → Realtime Database → Database maken** → locatie `europe-west1` →
   *Start in vergrendelde modus*
4. **Build → Authentication → Aan de slag** → tabblad *Sign-in method* →
   **Anoniem** inschakelen
5. **Tandwiel → Projectinstellingen → Jouw apps → `</>`** → bijnaam `rondje` →
   registreren. Kopieer de getoonde waarden naar
   [`src/net/firebaseConfig.ts`](src/net/firebaseConfig.ts)
6. **Realtime Database → Regels** → plak de inhoud van
   [`database.rules.json`](database.rules.json) → **Publiceren**

> De Firebase-sleutel staat gewoon openbaar in deze repo. Dat hoort zo bij
> web-apps: de sleutel zegt alleen wélk project het is. De beveiliging zit in
> de regels uit stap 6.

---

## Online zetten

Zodra deze map een GitHub-repository is en je pusht naar `main`, bouwt
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) de app en zet
hem op GitHub Pages.

Eenmalig instellen: **Settings → Pages → Source: GitHub Actions**.

Daarna is elke update een kwestie van:

```powershell
git add .
git commit -m "wat er veranderd is"
git push
```

Twee minuten later staat het op `https://<jouw-naam>.github.io/<repo>/`.

---

## Hoe het in elkaar zit

Drie dingen werken samen:

| Onderdeel | Wat het doet |
|---|---|
| De app | Een website die op elke telefoon draait |
| Firebase | Een gedeeld prikbord in de cloud: alle telefoons zien dezelfde stand |
| De host-telefoon | Draait de spellogica en schrijft de uitkomst weg |

De telefoon van wie de lobby opende is de spelleider. De andere telefoons
sturen alleen "ik druk op deze knop" en krijgen het resultaat terug. Zo kunnen
twee telefoons het nooit oneens worden over wie er aan de beurt is.

```
   HOST                          Firebase                GAST
   ────                          ────────                ────
   draait de spellogica  ─schrijft─▶  spelstand  ─leest─▶  toont het scherm
   leest wat gasten doen ◀─leest───   acties     ◀schrijft─ "ik druk op HOGER"
```

### Mappen

```
src/
├─ engine/     het fundament: kaartdeck, beurten, slokken, stemmen, timer
├─ net/        verbinding met Firebase, de lobby, en de host-loop
├─ ui/         knoppen, speelkaarten, het rode drinkscherm, de vormgeving
├─ schermen/   start, lobby, spelkiezer, uitleg, spelen, scorebord
└─ games/      één mapje per spel
```

### Een spel toevoegen

Maak een mapje in `src/games/` en voeg één regel toe aan
[`src/games/index.ts`](src/games/index.ts). Meer is het niet. Een spel ziet er
zo uit:

```ts
export const mijnspel: GameModule<MijnState> = {
  id: 'mijnspel',
  naam: 'Mijn Spel',
  uitleg: 'Eén zin voor op de spelkiezer.',
  regels: ['Max vier korte regels', 'want niemand leest meer dan dat'],
  minSpelers: 2,
  maxSpelers: 8,
  duur: 'kort',
  tags: ['kaarten'],
  privescherm: false,

  init(ctx)                 { /* beginstand */ },
  reduce(state, actie, ctx) { /* draait alleen op de host */ },
  View({ state, ctx })      { /* wat je op je scherm ziet */ },
  isKlaar(state)            { /* wanneer is het afgelopen */ },
}
```

Wat `ctx` je geeft in `reduce`: `drink()`, `deelUit()`, `iedereenDrinkt()`,
`zetPrive()`, `log()`, `klaar()`, plus `rng()` en `spelers`. De
zwaarte-instelling wordt automatisch verrekend — geef gewoon het aantal door
dat je bedoelt.

**Geheime informatie:** alles wat in de spelstand onder de sleutel `_geheim`
staat, blijft op de telefoon van de host en gaat nooit naar de andere
telefoons. Wat één speler wél mag zien, geef je met `ctx.zetPrive(uid, data)`;
die speler leest het terug als `ctx.prive` in de View.

---

## Stand van zaken

| Fase | | |
|---|---|---|
| 0 | Gereedschap | ✅ Node draait |
| 1 | Fundament + lobby | ✅ gebouwd, wacht op Firebase-sleutel |
| 2 | Drie spellen als bewijs | ✅ HiLo, Wie van Ons, Snelste Vinger |
| 3 | Klassiekers (Bussen, Kingsen, …) | openstaand |
| 4 | Geheim & bluf | openstaand |
| 5 | Reflex & chaos | openstaand |
| 6 | Praten & sociaal | openstaand |
| 7 | Afwerking | openstaand |
