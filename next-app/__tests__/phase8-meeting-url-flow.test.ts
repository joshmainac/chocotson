import { getBoardRecord, resetBookingBoard } from "@/lib/chocotson/board";
import { getMypageConsultationSurface } from "@/lib/chocotson/consultation-surface";
import { getChat, sendMessage } from "@/lib/chocotson/chat";
import {
  buildMeetingUrl,
  getMeetingRoomView,
} from "@/lib/chocotson/meeting-room";
import {
  claimBooking,
  createStudentSession,
  getVisibleBookings,
  goToBookingList,
  selectTeachingGroups,
} from "@/lib/chocotson/student";
import { seedElderlyBooking } from "./helpers/seed-elderly-booking";

function claimFirstBooking() {
  const { confirmation } = seedElderlyBooking("1-30");
  const listed = goToBookingList(
    selectTeachingGroups(createStudentSession(), ["1-30"]),
  );
  const target = getVisibleBookings(listed)[0];
  if (!target) {
    throw new Error("seeded booking missing");
  }
  claimBooking(listed, target.id, { id: "aoki", name: "青木 翔" });
  return { confirmation, bookingId: confirmation.bookingId };
}

describe("Phase 8 meeting URL at booking and single flow", () => {
  beforeEach(() => {
    resetBookingBoard();
  });

  // ASSUMED [A1]: 相談URLは publishConfirmedBooking 時に /meeting/{id}。josh-docs/ASSUMPTIONS.md 参照。
  it("[A1] 予約確定時点で相談URLが発行される", () => {
    const { confirmation } = seedElderlyBooking("1-30");
    const record = getBoardRecord(confirmation.bookingId);
    expect(record?.meetingUrl).toBe(
      buildMeetingUrl(confirmation.bookingId),
    );
  });

  // ASSUMED [A4]: claim 後も URL は同一。josh-docs/ASSUMPTIONS.md 参照。
  it("[A4] 学生が受けても相談URLは同じ", () => {
    const { confirmation, bookingId } = claimFirstBooking();
    const beforeUrl = buildMeetingUrl(bookingId);
    const after = getBoardRecord(bookingId);
    expect(after?.meetingUrl).toBe(beforeUrl);
    expect(after?.meetingUrl).toBe(
      getBoardRecord(confirmation.bookingId)?.meetingUrl,
    );
  });

  // ASSUMED [A3]: マイページはインライン相談UIなし。josh-docs/ASSUMPTIONS.md 参照。
  it("[A3] マイページではインライン相談UIを出さない", () => {
    const surface = getMypageConsultationSurface();
    expect(surface.showInlineChat).toBe(false);
    expect(surface.showConsultationControls).toBe(false);
  });

  // ASSUMED [A5]: 自動リダイレクトせずリンク導線。showInlineChat/Controls off で担保。josh-docs/ASSUMPTIONS.md 参照。
  it("[A5] マイページ相談面はリンクのみでインライン相談UIは出さない", () => {
    const surface = getMypageConsultationSurface();
    expect(surface.showInlineChat).toBe(false);
    expect(surface.showConsultationControls).toBe(false);
  });

  // ASSUMED [A2]: マッチング前も高齢者は相談URLでチャット可。josh-docs/ASSUMPTIONS.md 参照。
  it("[A2] マッチング前でも相談URLで高齢者はチャットできる", () => {
    const { confirmation } = seedElderlyBooking("1-30");
    const view = getMeetingRoomView(confirmation.bookingId, "elderly");
    expect(view.showChat).toBe(true);
    expect(view.canSendChat).toBe(true);
    sendMessage(confirmation.bookingId, "elderly", "相談URLから先に書きます");
    expect(getChat(confirmation.bookingId).messages[0]?.body).toBe(
      "相談URLから先に書きます",
    );
  });

  // ASSUMED [A7]: マッチング前は student/guest は canSendChat=false。josh-docs/ASSUMPTIONS.md 参照。
  it("[A7] マッチング前は相談URLで学生側はチャット送信不可", () => {
    const { confirmation } = seedElderlyBooking("1-30");
    const studentView = getMeetingRoomView(confirmation.bookingId, "student");
    const guestView = getMeetingRoomView(confirmation.bookingId, "guest");
    expect(studentView.canSendChat).toBe(false);
    expect(guestView.canSendChat).toBe(false);
  });

  // ASSUMED [A6]: 相談開始は claimed 必須。josh-docs/ASSUMPTIONS.md 参照。
  it("[A6] マッチング前は相談開始ボタンが出ない", () => {
    const { confirmation } = seedElderlyBooking("1-30");
    const view = getMeetingRoomView(confirmation.bookingId, "elderly");
    expect(view.canStartConsultation).toBe(false);
    expect(view.canEndConsultation).toBe(false);
  });

  it("マッチング後は相談URLから相談の開始・終了ができる", () => {
    const { bookingId } = claimFirstBooking();
    const idle = getMeetingRoomView(bookingId, "elderly");
    expect(idle.canStartConsultation).toBe(true);
    expect(idle.canSendChat).toBe(true);
    const studentIdle = getMeetingRoomView(bookingId, "student");
    expect(studentIdle.canSendChat).toBe(true);
  });

  it("相談URLからの段差感想は高齢者のみ", () => {
    const { bookingId } = claimFirstBooking();
    expect(getMeetingRoomView(bookingId, "elderly").showStepFeedback).toBe(true);
    expect(getMeetingRoomView(bookingId, "student").showStepFeedback).toBe(
      false,
    );
  });

  it("デモナビ向けにマッチング前の最新予約でも meetingUrl がある", () => {
    const { confirmation } = seedElderlyBooking("1-30");
    expect(getBoardRecord(confirmation.bookingId)?.meetingUrl).toBe(
      buildMeetingUrl(confirmation.bookingId),
    );
  });
});
