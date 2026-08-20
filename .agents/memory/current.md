# Aktueller Stand

## Letzte Änderungen
- **App Store Readiness Check & Optimierungen abgeschlossen:**
  - **AppIcon ohne Alpha-Kanal:** Alpha-Transparenz aus `AppIcon-512@2x.png` entfernt (strikt gefordert von Apple Asset Validation).
  - **Apple Privacy Manifest (`PrivacyInfo.xcprivacy`):** Angelegt und im Xcode-Projekt registriert (Pflicht seit Mai 2024 für UserDefaults, BootTime, FileTimestamp, DiskSpace).
  - **`Info.plist` gehärtet:** Export Compliance (`ITSAppUsesNonExemptEncryption = false`), `NSPhotoLibraryAddUsageDescription`, `NSBluetoothPeripheralUsageDescription`, einheitlicher Light-Modus (`UIUserInterfaceStyle`) und iPhone-Portrait-Lock ergänzt.
  - **LaunchScreen & Splash-Harmonisierung:** Hintergrundfarbe in `capacitor.config.ts`, `LaunchScreen.storyboard` und `Splash.imageset` auf `#F6F6F4` angepasst (verhindert weiße Blitze beim Start).
  - **Rechtliches im Auth-Flow:** AGB- und Datenschutz-Links direkt unter den Registrierungs-CTA in `AuthFlow.tsx` integriert (App Store Review Guideline 5.1.1/5.1.2).
  - **Account-Löschung verifiziert:** Apple Guideline 5.1.1(v) wird über `ProfileScreen` und `delete-account` Edge Function erfüllt.
  - **Automatisierungs-Script:** `scripts/prepare-app-store-assets.js` und `npm run appstore:prep` für kontinuierliche App-Store-Asset-Prüfung integriert.
  - **Build & Tests:** TypeScript (`tsc --noEmit`), 124 Unit-Tests (`vitest`), Vite-Produktions-Build und native Xcode-Kompilierung (`xcodebuild`) 100% erfolgreich.

## Fokus
- App Store Submission Vorbereitung & TestFlight Upload.

## Nächste Schritte
- Bei Bedarf App-Bundle-ID (`appId`) im Apple Developer Account final verknüpfen (aktuell `com.larsmacario.rephive`).
- Archivieren und Upload über Xcode (`Product > Archive` -> `Distribute App` -> `TestFlight & App Store`).

## Offene Punkte
- KI-Empfehlungen sind Lifestyle-/Präventionshilfe ohne medizinische Bewertung (Disclaimers sind im UI hinterlegt).
- Worktree enthält die laufenden Änderungen.
