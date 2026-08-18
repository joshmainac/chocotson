import { getLandingCopy, getConsultationDurationMinutes } from "@/lib/chocotson/copy";
import { getStepGroups, getStepsInGroup } from "@/lib/chocotson/catalog";
import { getAvailableSlots } from "@/lib/chocotson/slots";
import {
  confirmBooking,
  createBookingSession,
  goToGroups,
  goToSlots,
  openGroup,
  reselectGroup,
  selectSlot,
  selectStep,
} from "@/lib/chocotson/booking";
import type { StepGroupId } from "@/lib/chocotson/types";

const GROUP_IDS: StepGroupId[] = ["1-30", "31-60", "61-90"];

function tokyoParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
  };
}

function tokyoDayKey(date: Date) {
  const { year, month, day } = tokyoParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

describe("Phase 1 elderly booking", () => {
  describe("landing", () => {
    it("入口で一度にひとつと短い時間が案内される", () => {
      const copy = getLandingCopy();
      expect(copy.oneAtATime).toMatch(/一度にひとつ/);
      expect(copy.shortTime).toMatch(/短|15分/);
      expect(copy.durationMinutesLabel).toMatch(/15分/);
    });

    // ASSUMED [A5]: 入口はランディングから3グループへ進む。josh-docs/ASSUMPTIONS.md 参照。
    it("[A5] 入口から段差の3グループへ進める", () => {
      const session = goToGroups(createBookingSession());
      expect(session.phase).toBe("groups");
      expect(getStepGroups()).toHaveLength(3);
    });

    it("家族ではない相手に短い時間だけ聞ける位置づけが伝わる", () => {
      const copy = getLandingCopy();
      expect(copy.notFamily).toMatch(/家族ではない|家族以外/);
      expect(copy.durationMinutesLabel).toMatch(/15分/);
    });

    // ASSUMED [A8]: UI は日本語。josh-docs/ASSUMPTIONS.md 参照。
    it("[A8] 画面や文言は日本語で、急かさず責めないトーンである", () => {
      const copy = getLandingCopy();
      const blob = `${copy.oneAtATime}${copy.shortTime}${copy.notFamily}${copy.durationMinutesLabel}`;
      expect(copy.language).toBe("ja");
      expect(blob).toMatch(/[\u3040-\u30ff\u4e00-\u9faf]/);
      expect(blob).not.toMatch(/急いで|急げ|ダメ|失敗|できない人/);
    });
  });

  describe("catalog", () => {
    // ASSUMED [A1]: 90段は3グループ×30。文言の一字一句一致は見ない。josh-docs/ASSUMPTIONS.md 参照。
    it("[A1] 段差は 1-30 / 31-60 / 61-90 の3グループから辿れる", () => {
      const groups = getStepGroups();
      expect(groups.map((group) => group.id)).toEqual(GROUP_IDS);
      const opened = GROUP_IDS.map((groupId) =>
        openGroup(goToGroups(createBookingSession()), groupId),
      );
      expect(opened.map((session) => session.selectedGroupId)).toEqual(GROUP_IDS);
      expect(opened.every((session) => session.phase === "steps")).toBe(true);
    });

    // ASSUMED [A1]: 各グループ30件・合計90。一字一句一致は見ない。josh-docs/ASSUMPTIONS.md 参照。
    it("[A1] 各グループには30の段差がある", () => {
      const groups = getStepGroups();
      expect(groups.flatMap((group) => group.steps)).toHaveLength(90);
      for (const groupId of GROUP_IDS) {
        const steps = getStepsInGroup(groupId);
        expect(steps).toHaveLength(30);
        expect(steps.every((step) => step.groupId === groupId)).toBe(true);
      }
    });

    it("グループの中から困っていることを一つ選んで相談の対象にできる", () => {
      const step = getStepsInGroup("1-30")[0];
      const session = selectStep(
        openGroup(goToGroups(createBookingSession()), "1-30"),
        step,
      );
      expect(session.selectedStep?.id).toBe(step.id);
      expect(session.selectedStep?.title).toBe(step.title);
    });

    // ASSUMED [A9]: 自由記述のその他は無い。josh-docs/ASSUMPTIONS.md 参照。
    it("[A9] カタログ外の自由記述その他は無い", () => {
      const titles = getStepGroups().flatMap((group) =>
        group.steps.map((step) => step.title),
      );
      expect(titles).toHaveLength(90);
      expect(titles.join("\n")).not.toMatch(/その他|自由記述|自分で書く/);
    });
  });

  describe("booking flow", () => {
    // ASSUMED [A10]: 同時に予約できる段差は1つ。josh-docs/ASSUMPTIONS.md 参照。
    it("[A10] 一度に選べる相談内容は1つである", () => {
      const steps = getStepsInGroup("1-30");
      let session = openGroup(goToGroups(createBookingSession()), "1-30");
      session = selectStep(session, steps[0]);
      session = selectStep(session, steps[1]);
      expect(session.selectedStep?.id).toBe(steps[1].id);
      expect(session.selectedStep?.id).not.toBe(steps[0].id);
    });

    it("アカウントなしで段差の選択から予約完了まで進める", () => {
      const session = createBookingSession();
      expect(session.requiresAccount).toBe(false);
      const step = getStepsInGroup("1-30")[0];
      const slot = getAvailableSlots(new Date("2026-08-18T01:00:00Z"))[0];
      const confirmed = confirmBooking(
        selectSlot(
          goToSlots(
            selectStep(
              openGroup(goToGroups(session), "1-30"),
              step,
            ),
          ),
          slot,
        ),
      );
      expect(confirmed.accepted).toBe(true);
    });

    it("うまく説明できなくても段差を選ぶだけで予約の手続きに進める", () => {
      const session = createBookingSession();
      expect(session.requiresExplanation).toBe(false);
      const withStep = selectStep(
        openGroup(goToGroups(session), "1-30"),
        getStepsInGroup("1-30")[0],
      );
      expect(goToSlots(withStep).phase).toBe("slots");
    });

    it("相談の時間は基本15分として案内される", () => {
      expect(getConsultationDurationMinutes()).toBe(15);
      expect(getLandingCopy().durationMinutesLabel).toMatch(/15/);
    });

    // ASSUMED [A10]: 予約前ならグループや段差を選び直せる。選び直すと前の選択は置き換わる。josh-docs/ASSUMPTIONS.md 参照。
    it("[A10] 予約する前なら別のグループや別の段差に選び直せる", () => {
      const first = getStepsInGroup("1-30")[0];
      const second = getStepsInGroup("31-60")[0];
      let session = selectStep(
        openGroup(goToGroups(createBookingSession()), "1-30"),
        first,
      );
      session = reselectGroup(session, "31-60");
      expect(session.selectedGroupId).toBe("31-60");
      expect(session.selectedStep).toBeNull();
      session = selectStep(session, second);
      expect(session.selectedStep?.id).toBe(second.id);
      expect(session.selectedStep?.id).not.toBe(first.id);
      expect(session.phase).not.toBe("confirmed");
    });
  });

  describe("slots", () => {
    const now = new Date("2026-08-18T00:00:00Z");

    // ASSUMED [A2]: この先数日＝当日含む7日間。josh-docs/ASSUMPTIONS.md 参照。
    it("[A2] 空き枠は当日を含む7日間である", () => {
      const slots = getAvailableSlots(now);
      const days = [...new Set(slots.map((slot) => tokyoDayKey(slot.start)))].sort();
      expect(days).toEqual([
        "2026-08-18",
        "2026-08-19",
        "2026-08-20",
        "2026-08-21",
        "2026-08-22",
        "2026-08-23",
        "2026-08-24",
      ]);
    });

    // ASSUMED [A3]: 09:00–17:00 JST・15分刻み。最後の開始は16:45。josh-docs/ASSUMPTIONS.md 参照。
    it("[A3] 空き枠は09:00から16:45まで15分刻みである", () => {
      const slots = getAvailableSlots(now);
      const byDay = new Map<string, typeof slots>();
      for (const slot of slots) {
        const key = tokyoDayKey(slot.start);
        byDay.set(key, [...(byDay.get(key) ?? []), slot]);
      }
      expect(slots.every((slot) => slot.durationMinutes === 15)).toBe(true);
      for (const daySlots of byDay.values()) {
        const ordered = [...daySlots].sort(
          (a, b) => a.start.getTime() - b.start.getTime(),
        );
        const starts = ordered.map((slot) => tokyoParts(slot.start));
        expect(starts[0]).toMatchObject({ hour: 9, minute: 0 });
        expect(starts.at(-1)).toMatchObject({ hour: 16, minute: 45 });
        expect(ordered).toHaveLength(32);
        expect(starts.some((part) => part.hour === 17)).toBe(false);
        for (const part of starts) {
          expect([0, 15, 30, 45]).toContain(part.minute);
        }
      }
    });

    it("選んだ内容について15分の空き時間を選んで予約できる", () => {
      const slots = getAvailableSlots(now);
      const session = selectSlot(
        goToSlots(
          selectStep(
            openGroup(goToGroups(createBookingSession()), "1-30"),
            getStepsInGroup("1-30")[0],
          ),
        ),
        slots[0],
      );
      expect(session.selectedSlot?.start).toEqual(slots[0].start);
      expect(session.selectedSlot?.durationMinutes).toBe(15);
    });

    // ASSUMED [A4]: 空き枠は常に空のダミー。予約後も埋まらない。josh-docs/ASSUMPTIONS.md 参照。
    it("[A4] 空き枠はダミーで埋まらない", () => {
      const before = getAvailableSlots(now);
      const step = getStepsInGroup("1-30")[0];
      confirmBooking(
        selectSlot(
          goToSlots(
            selectStep(openGroup(goToGroups(createBookingSession()), "1-30"), step),
          ),
          before[0],
        ),
      );
      const after = getAvailableSlots(now);
      expect(after).toHaveLength(before.length);
      expect(after.map((slot) => slot.start.toISOString())).toEqual(
        before.map((slot) => slot.start.toISOString()),
      );
    });
  });

  describe("confirmation", () => {
    function bookFirstSlot() {
      const step = getStepsInGroup("1-30")[0];
      const slot = getAvailableSlots(new Date("2026-08-18T00:00:00Z"))[0];
      const session = selectSlot(
        goToSlots(
          selectStep(
            openGroup(goToGroups(createBookingSession()), "1-30"),
            step,
          ),
        ),
        slot,
      );
      return { step, slot, confirmation: confirmBooking(session) };
    }

    it("予約が受け付けられたことが高齢者に分かる", () => {
      const { confirmation } = bookFirstSlot();
      expect(confirmation.accepted).toBe(true);
      expect(confirmation.stepTitle.length).toBeGreaterThan(0);
    });

    // ASSUMED [A6]: 確認画面に段差名と予約日時を出す。josh-docs/ASSUMPTIONS.md 参照。
    it("[A6] 確認画面に選んだ段差と予約日時が表示される", () => {
      const { step, slot, confirmation } = bookFirstSlot();
      expect(confirmation.stepTitle).toBe(step.title);
      expect(confirmation.slotStart).toEqual(slot.start);
    });

    // ASSUMED [A6]: 学生名は出さない。josh-docs/ASSUMPTIONS.md 参照。
    it("[A6] 予約の確認に相手の学生は表示されない", () => {
      const { confirmation } = bookFirstSlot();
      expect(confirmation.student).toBeNull();
    });

    // ASSUMED [A7]: 確認画面が終端。永続化しない。josh-docs/ASSUMPTIONS.md 参照。
    it("[A7] 確認画面の先には進まない", () => {
      const { confirmation } = bookFirstSlot();
      expect(confirmation.phase).toBe("confirmed");
      expect(confirmation.hasNextScreen).toBe(false);
    });
  });
});
