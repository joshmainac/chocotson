export type MypageConsultationSurface = {
  showInlineChat: boolean;
  showConsultationControls: boolean;
};

export function getMypageConsultationSurface(): MypageConsultationSurface {
  return {
    showInlineChat: false,
    showConsultationControls: false,
  };
}
