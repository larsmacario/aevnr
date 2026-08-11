import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { APP_NAME, M } from "../theme";
import { useAuth } from "../lib/auth";
import { useBreakpoint } from "../lib/responsive";
import { Icon } from "./Icon";
import { MButton } from "./MButton";
import { UserAvatar } from "./UserAvatar";

export interface AppSidePanelProps {
  open: boolean;
  onClose: () => void;
  onOpenProfile: () => void;
  onOpenHistory: () => void;
  onOpenStats: () => void;
  onOpenSettings: () => void;
  onOpenAbout: () => void;
  onOpenSupport: () => void;
  onOpenExercises?: () => void;
}

type PanelItem = {
  label: string;
  description: string;
  icon: string;
  onClick: () => void;
};

function greetingForHour(hour: number): string {
  if (hour < 12) return "Guten Morgen";
  if (hour < 18) return "Guten Tag";
  return "Guten Abend";
}

function firstName(displayName: string): string {
  return displayName.trim().split(/\s+/)[0] || "Athlet";
}

function PanelAction({ item }: { item: PanelItem }) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.button
      type="button"
      onClick={item.onClick}
      whileHover={reducedMotion ? undefined : { y: -1, backgroundColor: "#FFFFFF", boxShadow: M.shadow }}
      whileTap={reducedMotion ? { opacity: 0.82 } : { scale: 0.985 }}
      transition={{ duration: 0.16, ease: "easeOut" }}
      style={{
        width: "100%",
        minHeight: 72,
        padding: "12px 13px",
        border: "1px solid " + M.line2,
        borderRadius: M.radiusCard,
        background: M.cardHi,
        color: M.fg,
        cursor: "pointer",
        textAlign: "left",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          background: M.card,
          border: "1px solid " + M.line2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon name={item.icon} size={18} stroke={1.8} color={M.fgBody} />
      </span>
      <span style={{ minWidth: 0, display: "grid", gap: 3, flex: 1 }}>
        <span style={{ fontFamily: M.label, fontWeight: 700, fontSize: 15, lineHeight: 1.1 }}>{item.label}</span>
        <span style={{ color: M.mut, fontFamily: M.body, fontSize: 13, lineHeight: 1.25 }}>{item.description}</span>
      </span>
      <Icon name="chevR" size={17} stroke={1.8} color={M.mut2} />
    </motion.button>
  );
}

export function AppSidePanel({
  open,
  onClose,
  onOpenProfile,
  onOpenHistory,
  onOpenStats,
  onOpenSettings,
  onOpenAbout,
  onOpenSupport,
  onOpenExercises,
}: AppSidePanelProps) {
  const { profile, signOut } = useAuth();
  const breakpoint = useBreakpoint();
  const isDesktop = breakpoint === "desktop";
  const displayName = profile?.display_name?.trim() || "Athlet";
  const name = firstName(displayName);
  const greeting = greetingForHour(new Date().getHours());

  const runFromMenu = (action: () => void) => {
    onClose();
    action();
  };

  const legalBaseUrl = (import.meta.env.VITE_LEGAL_BASE_URL ?? "https://rephive.app").replace(/\/$/, "");

  const openExternalLegal = (path: string) => {
    onClose();
    window.open(`${legalBaseUrl}${path}`, "_blank", "noopener,noreferrer");
  };

  const panelSections: { title: string; items: PanelItem[] }[] = [
    {
      title: "PERSÖNLICHER BEREICH",
      items: [{ label: "Profil", description: "Deine Daten und Präferenzen", icon: "user", onClick: () => runFromMenu(onOpenProfile) }],
    },
    {
      title: "TRAINING & ERKENNTNISSE",
      items: [
        { label: "Verlauf", description: "Deine vergangenen Einheiten", icon: "history", onClick: () => runFromMenu(onOpenHistory) },
        { label: "Übungen", description: "Deine persönliche Bibliothek", icon: "dumbbell", onClick: () => onOpenExercises && runFromMenu(onOpenExercises) },
        { label: "Statistik", description: "Entwicklung im Überblick", icon: "layers", onClick: () => runFromMenu(onOpenStats) },
      ],
    },
    {
      title: "EINSTELLUNGEN",
      items: [{ label: "Einstellungen", description: "App und Training abstimmen", icon: "edit", onClick: () => runFromMenu(onOpenSettings) }],
    },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Menü schließen"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            style={{ position: "fixed", inset: 0, border: "none", background: "rgba(0, 0, 0, 0.45)", zIndex: 60, cursor: "pointer" }}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Menü"
            initial={{ x: "100%" }}
            animate={{ x: "0%" }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              width: isDesktop ? "40vw" : "100vw",
              background: M.panel,
              borderLeft: "1px solid " + M.line,
              zIndex: 61,
              display: "flex",
              flexDirection: "column",
              boxShadow: "-10px 0 26px rgba(0, 0, 0, 0.32)",
            }}
          >
            <header
              style={{
                padding: "calc(env(safe-area-inset-top, 0px) + 18px) 20px 18px",
                borderBottom: "1px solid " + M.line2,
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 13, minWidth: 0 }}>
                <UserAvatar size={48} displayName={displayName} avatarPath={profile?.avatar_path} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: M.mut, fontFamily: M.label, fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>
                    {greeting}, {name}
                  </div>
                  <div style={{ marginTop: 4, color: M.fg, fontFamily: M.label, fontSize: 19, fontWeight: 700, lineHeight: 1.1 }}>
                    Schön, dass du da bist.
                  </div>
                  <div style={{ marginTop: 5, color: M.mut, fontFamily: M.body, fontSize: 13, lineHeight: 1.3 }}>
                    Dein Raum für nachhaltige Stärke.
                  </div>
                </div>
              </div>
              <MButton onClick={onClose} variant="secondary" size="icon" aria-label="Menü schließen" haptic={false}>
                <Icon name="x" size={16} stroke={2.3} color={M.mut} />
              </MButton>
            </header>

            <div style={{ padding: "18px 16px 28px", display: "grid", gap: 22, overflowY: "auto" }}>
              {panelSections.map((section) => (
                <section key={section.title}>
                  <div style={{ marginBottom: 8, padding: "0 2px", color: M.mut, fontFamily: M.label, fontSize: 12, fontWeight: 700, letterSpacing: "0.09em" }}>
                    {section.title}
                  </div>
                  <div style={{ display: "grid", gap: 7 }}>{section.items.map((item) => <PanelAction key={item.label} item={item} />)}</div>
                </section>
              ))}
            </div>

            <footer style={{ marginTop: "auto", padding: "16px 20px calc(16px + env(safe-area-inset-bottom, 0px))", borderTop: "1px solid " + M.line2, display: "grid", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <button type="button" onClick={() => runFromMenu(onOpenSupport)} style={footerLinkStyle}>
                  Support <Icon name="chevR" size={13} stroke={2} color={M.mut2} />
                </button>
                <button type="button" onClick={() => runFromMenu(onOpenAbout)} style={footerLinkStyle}>
                  Über {APP_NAME} <Icon name="chevR" size={13} stroke={2} color={M.mut2} />
                </button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", color: M.mut2, fontFamily: M.body, fontSize: 12 }}>
                {[
                  ["Impressum", "/impressum"],
                  ["AGB", "/agb"],
                  ["Datenschutz", "/datenschutz"],
                ].map(([label, path]) => (
                  <button key={label} type="button" onClick={() => openExternalLegal(path)} aria-label={`${label} (öffnet externe Seite)`} style={legalLinkStyle}>
                    {label} <Icon name="externalLink" size={11} stroke={1.9} color={M.mut2} />
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <span style={{ color: M.mut2, fontFamily: M.body, fontSize: 12 }}>Version {__APP_VERSION__}</span>
                <button type="button" onClick={() => runFromMenu(signOut)} style={{ ...footerLinkStyle, color: M.mut }}>
                  Abmelden
                </button>
              </div>
            </footer>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

const footerLinkStyle = {
  border: "none",
  padding: 0,
  background: "transparent",
  color: M.fgBody,
  fontFamily: M.body,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 3,
};

const legalLinkStyle = {
  ...footerLinkStyle,
  color: M.mut2,
  fontSize: 12,
  fontWeight: 500,
};
