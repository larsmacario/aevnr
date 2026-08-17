import { M } from "../theme";
import { Icon, type IconProps } from "./Icon";
import { MButton } from "./MButton";
import type { DashboardQuickActionId } from "../lib/dashboardQuickActions";
import { useI18n } from "../lib/i18n";

export interface PersonalQuickAction {
  id: DashboardQuickActionId;
  label: string;
  detail: string;
  icon: IconProps["name"];
  onClick: () => void;
}

export function PersonalQuickActions({ actions }: { actions: PersonalQuickAction[] }) {
  const { t } = useI18n();
  if (actions.length < 2) return null;
  const hasHero = actions.length === 3;
  return <section style={{ marginTop: 18 }}>
    <div style={{ fontSize: 13, letterSpacing: 1.2, color: M.mut, fontWeight: 700, marginBottom: 10 }}>{t("quickActions.title")}</div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
      {actions.map((action, index) => {
        const hero = hasHero && index === 0;
        return <MButton key={action.id} type="button" variant={hero ? "primary" : "secondary"} size="md" onClick={action.onClick} style={{ gridColumn: hero ? "1 / -1" : undefined, minHeight: hero ? 88 : 76, height: "auto", padding: hero ? "16px" : "13px", borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "flex-start", textAlign: "left", gap: 11, background: hero ? undefined : M.card }}>
          <div style={{ width: hero ? 42 : 36, height: hero ? 42 : 36, borderRadius: 12, background: hero ? "rgba(255,255,255,0.14)" : M.brandSoft, color: hero ? M.brandInk : M.brand, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name={action.icon} size={hero ? 20 : 18} stroke={2} /></div>
          <div style={{ minWidth: 0 }}><div style={{ color: hero ? M.brandInk : M.fg, fontWeight: 700, fontSize: hero ? 16 : 14, lineHeight: 1.2 }}>{action.label}</div><div style={{ color: hero ? "rgba(255,255,255,0.72)" : M.mut, fontSize: 12, lineHeight: 1.35, marginTop: 3 }}>{action.detail}</div></div>
        </MButton>;
      })}
    </div>
  </section>;
}
