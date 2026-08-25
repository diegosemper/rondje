/* ─────────────────────────────────────────────────────────────
   DE SCHAKELAAR

   Zet DICHT op `true` en publiceer: iedereen die de link opent krijgt een
   "even dicht"-pagina en niemand kan meer spelen. Zet hem op `false` en
   publiceer: alles doet het weer.

   De app laadt in dichte stand niets van Firebase en start geen lobby's op,
   dus ook wie de app al open had staan komt er niet meer in zodra hij
   ververst.

   Bewust hier en niet in de database: dit staat in de code, dus het gaat mee
   in de geschiedenis en er is geen enkele kans dat de app het gemist heeft
   omdat er net geen verbinding was.
   ───────────────────────────────────────────────────────────── */

export const DICHT = true

/** Wat er op de pagina staat als hij dicht is. */
export const DICHT_TITEL = 'Even dicht'
export const DICHT_TEKST = 'DORST! is nu even niet open. Probeer het later nog eens.'
