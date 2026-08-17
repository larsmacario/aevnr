import { BottomSheet } from "./BottomSheet";
import { MButton } from "./MButton";
import { M } from "../theme";
import { useI18n } from "../lib/i18n";

export interface AvatarActionSheetProps {
  open: boolean;
  onClose: () => void;
  onChoosePhoto: () => void;
  onRemovePhoto: () => void;
}

export function AvatarActionSheet({ open, onClose, onChoosePhoto, onRemovePhoto }: AvatarActionSheetProps) {
  const { t } = useI18n();
  return (
    <BottomSheet open={open} onClose={onClose} position="absolute" zIndex={30} aria-label={t("avatar.actions")}>
      <div style={{ fontFamily: M.display, fontWeight: 400, fontSize: 20, marginBottom: 14 }}>{t("avatar.title")}</div>
      <MButton
        type="button"
        onClick={() => {
          onClose();
          onChoosePhoto();
        }}
        variant="primary"
        size="md"
        fullWidth
        style={{ marginBottom: 10 }}
      >
        {t("avatar.choose")}
      </MButton>
      <MButton
        type="button"
        onClick={() => {
          onClose();
          onRemovePhoto();
        }}
        variant="ghost"
        size="md"
        fullWidth
        style={{ color: M.danger }}
      >
        {t("avatar.remove")}
      </MButton>
    </BottomSheet>
  );
}
