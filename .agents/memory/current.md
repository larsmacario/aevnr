# Aktueller Stand

## Letzte Änderungen
- Vollständige Zweisprachigkeit (DE/EN) für die gesamte App umgesetzt: KI-Plan-Assistent, Body-Tracker, About-Seite, Intervall-Timer, Übungs- und Eingabedialoge, Offline-Banner, Drafts und Stats.
- KI-Prompts und System-Anweisungen in Supabase Edge Functions (`generate-fact-library`, `generate-daily-healthspan-recommendation`, `generate-daily-express-session`, `generate-training-plan`) auf strikte Unterscheidung der aktiven Spracheinstellung (DE vs. EN) angepasst.
- Supabase-Migration `add_fact_languages` auf Remote-Datenbank angewendet (`health_facts` und `user_daily_facts` mit `language`-Spalte & Constraints).
- Supabase Edge Functions (`generate-fact-library`, `facts`, `assign-daily-facts`, `generate-daily-healthspan-recommendation`, `generate-daily-express-session`, `generate-training-plan`) erfolgreich via MCP auf Projekt `ÆVNR` (`jnspiqnlwbsobqctmfnk`) deployed.
- Typprüfung (`tsc --noEmit`), 123 Vitest-Tests, Produktions-Build und iOS-Assets-Sync erfolgreich.

## Fokus
- Finale Validierung der zweisprachigen Generierung und UI-Elemente.

## Nächste Schritte
- Bei weiteren Web-Änderungen: `npm run build && npx cap copy ios`.
- Rechtliches, Domain und App-Bundle-ID auf ÆVNR ausrichten.

## Offene Punkte
- KI-Empfehlungen sind Lifestyle-/Präventionshilfe ohne medizinische Bewertung; Apple Health/Wearables folgen später.
- Worktree enthält die laufenden, noch nicht committeten Änderungen.
