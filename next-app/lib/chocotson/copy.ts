import type { LandingCopy } from "./types";

export function getLandingCopy(): LandingCopy {
  return {
    language: "ja",
    oneAtATime: "一度にひとつ。それが、いちばん早い。",
    shortTime: "短い時間だけ、ちょこっと聞いてみる。",
    notFamily: "家族ではない誰かに、15分だけ。",
    durationMinutesLabel: "15分の相談",
  };
}

export function getConsultationDurationMinutes(): number {
  return 15;
}
