# ÆVNR

Mobile-first Healthspan-Coach für präventiv orientierte Nutzer. ÆVNR verbindet
Krafttraining, Ausdauer, Ernährung & Körper sowie Erholung – ohne medizinische Diagnosen.

## Stack

- **Vite + React 18 + TypeScript**; Supabase für Auth, Postgres, Storage und Edge Functions
- Local-first für Pläne, Übungen und tägliche Healthspan-Check-ins via Dexie-Outbox
- Capacitor-iOS-Wrapper; Körperfotos liegen in privatem Storage und werden über Signed URLs geladen

## Befehle

```bash
npm install      # Abhängigkeiten installieren
npm run dev      # Dev-Server (http://localhost:5173)
npm run build    # Typecheck + Production-Build (dist/)
npm run preview  # Production-Build lokal ansehen
npm run lint     # nur Typecheck (tsc --noEmit)
```

## Struktur

```
src/
  theme.ts            Design-Tokens (M) + Helfer
  lib/healthspan.ts   Erklärbare Bereiche und Tagesempfehlungen
  lib/db.ts           Supabase-Queries, Check-ins und Offline-Sync-Registrierung
  components/         Mobile UI, Check-in-Sheet und Healthspan-Dashboard
  screens/            Dashboard, Tracking, Pläne, Timer, Körper & Recovery
  PhoneApp.tsx        Tab-/Push-Router
```

## Funktionen

- **Healthspan-Dashboard** — Wochenfortschritt für Kraft, Ausdauer, Ernährung & Körper sowie Erholung
- **Tages-Check-in** — Schlaf, Qualität, Stress, Energie und optionale Notiz; Empfehlungen sind nachvollziehbar und nie automatisch
- **Training & Timer** — Pläne, Live-/Express-Tracking, Cardio-Metriken, HF-Zonen und EMOM / AMRAP / TABATA / For Time
- **Recovery & Körper** — Protein, Wasser, Gewicht, Maße und private Vorher-/Nachher-Fotos

> Hinweis: ÆVNR ist ein Lifestyle- und Präventionsprodukt. Es erstellt keine Diagnosen und ersetzt keine medizinische Beratung.
