import { resetBookingBoard } from "@/lib/chocotson/board";
import { sendMessage } from "@/lib/chocotson/chat";
import {
  getOpenDataChecklist,
  getOpenDataView,
} from "@/lib/chocotson/opendata";
import {
  STEP_FEEDBACK_QUESTION,
  getStepFeedback,
  setStepFeedback,
  setStepFeedbackAsStudent,
} from "@/lib/chocotson/step-feedback";
import { seedElderlyBooking } from "./helpers/seed-elderly-booking";

describe("Phase 6 opendata and step feedback", () => {
  beforeEach(() => {
    resetBookingBoard();
  });

  it("段差に紐づくチャットでチャットの上に使う感想が段差と結びついている", () => {
    const { confirmation, step } = seedElderlyBooking("1-30", 2);
    const feedback = getStepFeedback(confirmation.bookingId);
    expect(feedback.stepId).toBe(step.id);
    expect(feedback.stepTitle).toBe(step.title);
    expect(feedback.bookingId).toBe(confirmation.bookingId);
  });

  // ASSUMED [A6]: 質問文は全段差で同じ固定文言。
  it("[A6] 段差が違っても同じ質問文が使われる", () => {
    const a = seedElderlyBooking("1-30", 0);
    const b = seedElderlyBooking("31-60", 0);
    expect(getStepFeedback(a.confirmation.bookingId).question).toBe(
      STEP_FEEDBACK_QUESTION,
    );
    expect(getStepFeedback(b.confirmation.bookingId).question).toBe(
      STEP_FEEDBACK_QUESTION,
    );
  });

  // ASSUMED [A1]: 5段階（1〜5）と未回答（null）から選べる。
  it("[A1] 5段階と未回答から選べる", () => {
    const { confirmation } = seedElderlyBooking("1-30");
    expect(getStepFeedback(confirmation.bookingId).rating).toBeNull();
    const rated = setStepFeedback(confirmation.bookingId, 2);
    expect(rated.rating).toBe(2);
    expect(getStepFeedback(confirmation.bookingId).rating).toBe(2);
  });

  it("送信ボタンなしで選んだ時点でその段差の感想として記録される", () => {
    const { confirmation } = seedElderlyBooking("1-30");
    setStepFeedback(confirmation.bookingId, 4);
    expect(getStepFeedback(confirmation.bookingId).rating).toBe(4);
  });

  // ASSUMED [A3]: 未回答のままでもチャット操作は続けられる。未回答へ戻せる。
  it("[A3] 未回答のままでもチャットの他の操作は続けられる", () => {
    const { confirmation } = seedElderlyBooking("1-30");
    expect(getStepFeedback(confirmation.bookingId).rating).toBeNull();
    const sent = sendMessage(confirmation.bookingId, "elderly", "質問があります");
    expect(sent.body).toBe("質問があります");
    setStepFeedback(confirmation.bookingId, null);
    expect(getStepFeedback(confirmation.bookingId).rating).toBeNull();
  });

  // ASSUMED [A7]: 同じ予約で選び直すと最新の感想で上書きされる。
  it("[A7] 選び直すと最新の感想で上書きされる", () => {
    const { confirmation } = seedElderlyBooking("1-30");
    setStepFeedback(confirmation.bookingId, 1);
    setStepFeedback(confirmation.bookingId, 5);
    expect(getStepFeedback(confirmation.bookingId).rating).toBe(5);
  });

  // ASSUMED [A10]: 学生は感想を記録できない。
  it("[A10] 学生は感想を記録できない", () => {
    const { confirmation } = seedElderlyBooking("1-30");
    expect(() => setStepFeedbackAsStudent(confirmation.bookingId, 3)).toThrow();
    expect(getStepFeedback(confirmation.bookingId).rating).toBeNull();
  });

  // ASSUMED [A9]: チェックリストはカタログの90段差。
  it("[A9] 90段差を選べるチェックリストがある", () => {
    const checklist = getOpenDataChecklist();
    expect(checklist).toHaveLength(90);
    expect(checklist[0]?.stepId).toBe(1);
    expect(checklist[89]?.stepId).toBe(90);
    expect(checklist.every((item) => item.stepTitle.length > 0)).toBe(true);
  });

  // ASSUMED [A8]: 段差を1つも選んでいないときはグラフを出さない。
  it("[A8] 段差を1つも選んでいないときはグラフは出ない", () => {
    const view = getOpenDataView([]);
    expect(view.hasChart).toBe(false);
    expect(view.promptMessage).toMatch(/選んで/);
    expect(view.rows).toHaveLength(0);
  });

  it("段差を1つ以上選ぶと選んだ段差だけが集計に反映される", () => {
    const first = seedElderlyBooking("1-30", 0);
    const second = seedElderlyBooking("31-60", 0);
    setStepFeedback(first.confirmation.bookingId, 1);
    setStepFeedback(second.confirmation.bookingId, 5);
    const view = getOpenDataView([first.step.id, second.step.id]);
    expect(view.hasChart).toBe(true);
    expect(view.rows.map((row) => row.stepId).sort((a, b) => a - b)).toEqual([
      first.step.id,
      second.step.id,
    ]);
    expect(view.rows.find((row) => row.stepId === first.step.id)?.ratings[1]).toBe(
      1,
    );
    expect(view.rows.find((row) => row.stepId === second.step.id)?.ratings[5]).toBe(
      1,
    );
  });

  it("選んでいる段差が集計結果から分かる", () => {
    const { confirmation, step } = seedElderlyBooking("1-30", 3);
    setStepFeedback(confirmation.bookingId, 3);
    const view = getOpenDataView([step.id]);
    expect(view.selectedStepIds).toEqual([step.id]);
    expect(view.rows[0]?.stepTitle).toBe(step.title);
  });

  // ASSUMED [A2]: 同一ブラウザのボード全予約を段差ごとに集計する。
  it("[A2] 複数予約の感想が段差ごとに集計される", () => {
    const a = seedElderlyBooking("1-30", 0);
    const b = seedElderlyBooking("1-30", 0);
    setStepFeedback(a.confirmation.bookingId, 2);
    setStepFeedback(b.confirmation.bookingId, 2);
    const view = getOpenDataView([a.step.id]);
    expect(view.rows[0]?.ratings[2]).toBe(2);
  });

  // ASSUMED [A5]: 触れた件数はその stepId の予約件数。
  it("[A5] 各段差についてチャットが何件あったかが分かる", () => {
    const stepFive = seedElderlyBooking("1-30", 4);
    seedElderlyBooking("1-30", 4);
    const other = seedElderlyBooking("31-60", 0);
    const view = getOpenDataView([stepFive.step.id, other.step.id]);
    const row5 = view.rows.find((row) => row.stepId === stepFive.step.id);
    const rowOther = view.rows.find((row) => row.stepId === other.step.id);
    expect(row5?.chatCount).toBe(2);
    expect(rowOther?.chatCount).toBe(1);
  });

  it("5段階と未回答の集計が分かりどの課題がつまずきか手がかりになる", () => {
    const stuck = seedElderlyBooking("1-30", 0);
    const easy = seedElderlyBooking("1-30", 1);
    setStepFeedback(stuck.confirmation.bookingId, 1);
    setStepFeedback(easy.confirmation.bookingId, 5);
    const view = getOpenDataView([stuck.step.id, easy.step.id]);
    expect(view.rows.find((row) => row.stepId === stuck.step.id)?.ratings[1]).toBe(
      1,
    );
    expect(view.rows.find((row) => row.stepId === easy.step.id)?.ratings[5]).toBe(
      1,
    );
  });

  it("まだ誰もチャットしていない段差は0件または未回答のみである", () => {
    const view = getOpenDataView([42]);
    const row = view.rows.find((r) => r.stepId === 42);
    expect(row?.chatCount).toBe(0);
    expect(row?.ratings.unanswered).toBe(0);
  });

  it("データがまだ無いとき空であることが分かる", () => {
    const view = getOpenDataView([1]);
    expect(view.rows[0]?.chatCount).toBe(0);
    expect(
      Object.values(view.rows[0]?.ratings ?? {}).reduce((a, b) => a + b, 0),
    ).toBe(0);
  });

  it("壊れた保存データでも集計が例外を投げない", () => {
    const store: Record<string, string> = {
      "chocotson.booking-board": "{not-json",
    };
    Object.defineProperty(globalThis, "localStorage", {
      value: {
        getItem: (key: string) => store[key] ?? null,
        setItem: (key: string, value: string) => {
          store[key] = value;
        },
        removeItem: (key: string) => {
          delete store[key];
        },
      },
      configurable: true,
    });
    expect(() => getOpenDataView([1])).not.toThrow();
    Reflect.deleteProperty(globalThis, "localStorage");
  });
});
