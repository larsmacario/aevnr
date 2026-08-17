import { CATALOG_UNSELECTED, EQUIPMENT_OPTIONS } from "../lib/exerciseCatalog";
import { catalogLabelStyle, catalogSelectStyleForValue } from "./catalogSelectStyle";
import { useI18n } from "../lib/i18n";
import { equipmentTranslationKey } from "../lib/catalogLabels";

export interface EquipmentSelectProps {
  value: string;
  onChange: (equipment: string) => void;
  embedded?: boolean;
}

export function EquipmentSelect({ value, onChange, embedded }: EquipmentSelectProps) {
  const { t } = useI18n();
  const inList = (EQUIPMENT_OPTIONS as readonly string[]).includes(value);

  const field = (
    <>
      <div style={catalogLabelStyle}>{t("catalog.equipment")}</div>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={catalogSelectStyleForValue(value)}>
        <option value={CATALOG_UNSELECTED}>{t("catalog.select")}</option>
        {!inList && value ? <option value={value}>{value}</option> : null}
        {EQUIPMENT_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {equipmentTranslationKey(opt) ? t(equipmentTranslationKey(opt)!) : opt}
          </option>
        ))}
      </select>
    </>
  );

  if (embedded) {
    return <div style={{ flex: 1, minWidth: 0 }}>{field}</div>;
  }

  return <div style={{ marginBottom: 14 }}>{field}</div>;
}
