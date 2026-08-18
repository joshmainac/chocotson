import {
  getElderlyBookingView,
  resetBookingBoard,
} from "@/lib/chocotson/board";
import {
  endConsultation,
  getConsultation,
  startConsultation,
} from "@/lib/chocotson/consultation";
import { getClaimReceipt } from "@/lib/chocotson/student";
import {
  claimBooking,
  createStudentSession,
  getVisibleBookings,
  goToBookingList,
  selectTeachingGroups,
} from "@/lib/chocotson/student";
import { seedElderlyBooking } from "./helpers/seed-elderly-booking";

function claimFirstBooking() {
  resetBookingBoard();
  const { confirmation } = seedElderlyBooking("1-30");
  const listed = goToBookingList(
    selectTeachingGroups(createStudentSession(), ["1-30"]),
  );
  const target = getVisibleBookings(listed)[0];
  if (!target) {
    throw new Error("seeded booking missing");
  }
  const claimed = claimBooking(listed, target.id);
  return { confirmation, target, claimed };
}

describe("Phase 4 consultation box", () => {
  beforeEach(() => {
    resetBookingBoard();
  });

  // ASSUMED [A2]: 受けたあとなら枠の時刻を待たずに始められる。
  it("[A2] 予約を受けたあと枠の時刻を待たずに相談を始められる", () => {
    const { target, confirmation } = claimFirstBooking();
    expect(target.slotStart.getTime()).toBeGreaterThan(Date.now() - 86400000);
    const view = startConsultation(target.id, "student");
    expect(view.status).toBe("active");
    expect(view.stepTitle).toBe(confirmation.stepTitle);
    expect(view.slotStart).toEqual(confirmation.slotStart);
  });

  // ASSUMED [A4]: 学生からも高齢者からも始められる。
  it("[A4] 学生からもその予約の高齢者からも相談を始められる", () => {
    const studentClaim = claimFirstBooking();
    expect(startConsultation(studentClaim.target.id, "student").startedBy).toBe(
      "student",
    );
    const elderlyClaim = claimFirstBooking();
    expect(startConsultation(elderlyClaim.target.id, "elderly").startedBy).toBe(
      "elderly",
    );
  });

  // ASSUMED [A1]: 相談状態は同一ブラウザのボード。両方から同じ状態が見える。
  it("[A1] 始めたら両方から相談中だと分かる", () => {
    const { target } = claimFirstBooking();
    startConsultation(target.id, "student");
    expect(getConsultation(target.id).status).toBe("active");
    expect(getConsultation(target.id).status).toBe("active");
  });

  // ASSUMED [A3]: 箱だけ。映像や文字のやりとりは無い。
  it("[A3] 相談に映像や文字のやりとりは無い", () => {
    const { target } = claimFirstBooking();
    const view = startConsultation(target.id, "elderly");
    expect(view.hasMedia).toBe(false);
  });

  // ASSUMED [A4]: 終了も学生・高齢者のどちらからでもできる。
  it("[A4] どちらからでも相談を終えられる", () => {
    const a = claimFirstBooking();
    startConsultation(a.target.id, "student");
    expect(endConsultation(a.target.id, "elderly").endedBy).toBe("elderly");
    const b = claimFirstBooking();
    startConsultation(b.target.id, "elderly");
    expect(endConsultation(b.target.id, "student").endedBy).toBe("student");
  });

  // ASSUMED [A1]: 終了状態も同じボードで両方から見える。
  it("[A1] 終えたら両方から相談が終わりだと分かる", () => {
    const { target } = claimFirstBooking();
    startConsultation(target.id, "student");
    endConsultation(target.id, "student");
    expect(getConsultation(target.id).status).toBe("ended");
    expect(getConsultation(target.id).status).toBe("ended");
  });

  // ASSUMED [A7]: 相談は受けた予約に対してだけ。未受けでは始められない。
  it("[A7] まだ受けていない予約では相談を始められない", () => {
    const { confirmation } = seedElderlyBooking("1-30");
    const listed = goToBookingList(
      selectTeachingGroups(createStudentSession(), ["1-30"]),
    );
    const open = getVisibleBookings(listed)[0];
    expect(open).toBeDefined();
    expect(open.stepTitle).toBe(confirmation.stepTitle);
    expect(() => startConsultation(open.id, "elderly")).toThrow(
      /まだ受けていない/,
    );
  });

  // ASSUMED [A8]: 相談中の予約は二重に始められない。
  it("[A8] すでに相談中の予約をもう一度は始められない", () => {
    const { target } = claimFirstBooking();
    startConsultation(target.id, "student");
    expect(() => startConsultation(target.id, "elderly")).toThrow(
      /すでに相談中/,
    );
  });

  // ASSUMED [A9]: 終わった相談は再開できない。
  it("[A9] 終わった相談はもう一度始められない", () => {
    const { target } = claimFirstBooking();
    startConsultation(target.id, "student");
    endConsultation(target.id, "student");
    expect(() => startConsultation(target.id, "elderly")).toThrow(
      /すでに終わ/,
    );
  });

  // ASSUMED [A5]: 受付時点の控えは変えない。相談は別状態で idle。
  it("[A5] 受付の控えではまだ相談は始まっていない", () => {
    const { claimed, target } = claimFirstBooking();
    const receipt = getClaimReceipt(claimed);
    expect(receipt.consultationStarted).toBe(false);
    expect(receipt.hasNextScreen).toBe(false);
    expect(getConsultation(target.id).status).toBe("idle");
    expect(getElderlyBookingView(target.id)?.student).toBeNull();
  });

  // ASSUMED [A6]: 終わったら終わり。ログイン・報酬・次画面は無い。
  it("[A6] 終わったあとにログインや報酬や次の画面は無い", () => {
    const { target } = claimFirstBooking();
    startConsultation(target.id, "student");
    const ended = endConsultation(target.id, "student");
    expect(ended.status).toBe("ended");
    expect(ended.hasNextScreen).toBe(false);
    expect(ended.hasMedia).toBe(false);
  });
});
