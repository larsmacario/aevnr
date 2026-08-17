import {
  CATALOG_UNSELECTED,
  DEFAULT_MUSCLE_GROUP,
  MUSCLE_GROUP_SECTIONS,
  isLegacyMuscleGroup,
  normalizeMuscleGroup,
} from "../lib/exerciseCatalog";
import { M } from "../theme";
import { catalogLabelStyle, catalogSelectStyle, catalogSelectStyleForValue } from "./catalogSelectStyle";
import { useI18n } from "../lib/i18n";
import { muscleGroupTranslationKey } from "../lib/catalogLabels";

function MuscleGroupOptions({ includeAll, includePlaceholder }: { includeAll?: boolean; includePlaceholder?: boolean }) {
  const { t } = useI18n();
  return (
    <>
      {includePlaceholder && (
        <option value={CATALOG_UNSELECTED}>{t("catalog.select")}</option>
      )}
      {includeAll && <option value="">{t("catalog.all")}</option>}
      {MUSCLE_GROUP_SECTIONS.map((section) => (
        <optgroup key={section.id} label={t(section.id === "upper" ? "aiPlan.muscles.upper" : "aiPlan.muscles.lower")}>
          {section.groups.map((group) => (
            <option key={group} value={group}>
              {muscleGroupTranslationKey(group) ? t(muscleGroupTranslationKey(group)!) : group}
            </option>
          ))}
        </optgroup>
      ))}
    </>
  );
}

export interface MuscleGroupFilterSelectProps {
  mode: "filter";
  value: string | null;
  onChange: (group: string | null) => void;
}

export interface MuscleGroupFormSelectProps {
  mode: "form";
  value: string;
  rawValue?: string;
  onChange: (group: string) => void;
  /** Renders label + select only for side-by-side rows (e.g. with equipment). */
  embedded?: boolean;
}

export type MuscleGroupSelectProps = MuscleGroupFilterSelectProps | MuscleGroupFormSelectProps;

export function MuscleGroupSelect(props: MuscleGroupSelectProps) {
  const { t } = useI18n();
  if (props.mode === "filter") {
    return (
      <div style={{ marginBottom: 10 }}>
        <div style={catalogLabelStyle}>{t("catalog.muscleGroup")}</div>
        <select
          value={props.value ?? ""}
          onChange={(e) => props.onChange(e.target.value ? e.target.value : null)}
          style={catalogSelectStyle}
        >
          <MuscleGroupOptions includeAll />
        </select>
      </div>
    );
  }

  const legacyHint =
    props.rawValue && props.rawValue !== props.value && isLegacyMuscleGroup(props.rawValue)
      ? props.rawValue
      : null;

  const field = (
    <>
      <div style={catalogLabelStyle}>{t("catalog.muscleGroup")}</div>
      <select
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        style={catalogSelectStyleForValue(props.value)}
      >
        <MuscleGroupOptions includePlaceholder />
      </select>
    </>
  );

  if (props.embedded) {
    return <div style={{ flex: 1, minWidth: 0 }}>{field}</div>;
  }

  return (
    <div style={{ marginBottom: 14 }}>
      {field}
      {legacyHint && (
        <div style={{ fontSize: 13, color: M.mut2, marginTop: 8 }}>{t("catalog.formerly", { value: legacyHint })}</div>
      )}
    </div>
  );
}

export function initialMuscleGroupFromStored(stored: string | undefined): {
  value: string;
  rawValue?: string;
} {
  if (!stored) return { value: DEFAULT_MUSCLE_GROUP };
  const normalized = normalizeMuscleGroup(stored);
  if (stored !== normalized) return { value: normalized, rawValue: stored };
  return { value: stored };
}
