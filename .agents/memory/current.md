# Aktueller Stand

## Letzte Änderungen
- Healthspan-Pivot umgesetzt: Dashboard, tägliche Check-ins (Schlaf/Stress/Energie), Recovery-Trends, Zone-2-Flow und private Körperfoto-URLs.
- Express Tracking besitzt regelbasierten Coach sowie freiwillige KI-Tages-Sessions mit 30-Tage-Historie, Präferenzen, Startwerten und editierbarer Review.
- KI-Tagesempfehlung wird nach dem Check-in erzeugt, im Preferences-Cache gespeichert und fällt ohne Einwilligung/Netz/Fehler auf einen individuellen Regel-Fallback zurück.
- Supabase Edge Functions `generate-daily-express-session` (v2) und `generate-daily-healthspan-recommendation` (v1) sind aktiv; Tests zuletzt: 88 erfolgreich.

## Fokus
- Healthspan-UX auf Gerät testen, insbesondere KI-Check-in-Empfehlung und Express-Startwerte.

## Nächste Schritte
- Bei Web-Änderungen vor iOS-Test: `npm run build && npx cap sync ios`.
- Rechtliches, Domain und App-Bundle-ID auf ÆVNR ausrichten.

## Offene Punkte
- KI-Empfehlungen sind Lifestyle-/Präventionshilfe ohne medizinische Bewertung; Apple Health/Wearables folgen später.
- Worktree enthält die laufenden, noch nicht committeten Healthspan-Änderungen.
