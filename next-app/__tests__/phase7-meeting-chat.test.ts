import { resetBookingBoard } from "@/lib/chocotson/board";
import { getChat, sendMessage } from "@/lib/chocotson/chat";
import {
  endConsultation,
  startConsultation,
} from "@/lib/chocotson/consultation";
import {
  buildMeetingUrl,
  getMeetingRoomView,
  resolveMeetingRoomParty,
} from "@/lib/chocotson/meeting-room";
import {
  getStepFeedback,
  setStepFeedback,
} from "@/lib/chocotson/step-feedback";
import {
  claimBooking,
  createStudentSession,
  getVisibleBookings,
  goToBookingList,
  selectTeachingGroups,
} from "@/lib/chocotson/student";
import {
  confirmBooking,
  createBookingSession,
  goToGroups,
  goToSlots,
  openGroup,
  selectSlot,
  selectStep,
} from "@/lib/chocotson/booking";
import { getStepsInGroup } from "@/lib/chocotson/catalog";
import { getAvailableSlots } from "@/lib/chocotson/slots";
import type { StepGroupId } from "@/lib/chocotson/types";
import { seedElderlyBooking } from "./helpers/seed-elderly-booking";

function seedElderlyBookingAsSato(groupId: StepGroupId = "1-30") {
  const step = getStepsInGroup(groupId)[0];
  if (!step) {
    throw new Error("missing catalog step");
  }
  let session = goToSlots(
    selectStep(openGroup(goToGroups(createBookingSession()), groupId), step),
  );
  const slot = getAvailableSlots(new Date())[0];
  session = selectSlot(session, slot);
  return {
    confirmation: confirmBooking(session, { id: "sato", name: "佐藤 よし子" }),
    step,
    slot,
  };
}

function seedClaimedBooking() {
  resetBookingBoard();
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

describe("Phase 7 meeting URL and chat unify", () => {
  beforeEach(() => {
    resetBookingBoard();
  });

  it("[A1] 相談URLはチャットルートのレイアウトで旧DEMO MEETINGカードは出ない", () => {
    const { bookingId } = seedClaimedBooking();
    const view = getMeetingRoomView(bookingId, "elderly");
    expect(view.layout).toBe("chat-root");
    expect(view.showLegacyMeetingCard).toBe(false);
  });

  it("[A7] 相談URLから予約に紐づくチャットが使える", () => {
    const { bookingId } = seedClaimedBooking();
    const view = getMeetingRoomView(bookingId, "student");
    expect(view.showChat).toBe(true);
    sendMessage(bookingId, "student", "相談URLから送ります");
    sendMessage(bookingId, "elderly", "返信します");
    expect(getChat(bookingId).messages.map((m) => m.body)).toEqual([
      "相談URLから送ります",
      "返信します",
    ]);
  });

  it("[A2] 高齢者が相談URLを開くと段差感想が使える", () => {
    const { bookingId } = seedClaimedBooking();
    const view = getMeetingRoomView(bookingId, "elderly");
    expect(view.showStepFeedback).toBe(true);
    setStepFeedback(bookingId, 4);
    expect(getStepFeedback(bookingId).rating).toBe(4);
  });

  it("[A3] 学生が相談URLを開いても段差感想 UI は出ない", () => {
    const { bookingId } = seedClaimedBooking();
    const view = getMeetingRoomView(bookingId, "student");
    expect(view.showStepFeedback).toBe(false);
  });

  it("[A5] 第三者が相談URLを開いても段差感想 UI は出ない", () => {
    const { bookingId } = seedClaimedBooking();
    const view = getMeetingRoomView(bookingId, "guest");
    expect(view.showStepFeedback).toBe(false);
    expect(view.showChat).toBe(true);
    expect(view.party).toBe("guest");
  });

  it("[A9] 相談URLから相談を開始・終了できる", () => {
    const { bookingId } = seedClaimedBooking();
    const idle = getMeetingRoomView(bookingId, "elderly");
    expect(idle.canStartConsultation).toBe(true);
    expect(idle.canEndConsultation).toBe(false);
    startConsultation(bookingId, "elderly");
    const active = getMeetingRoomView(bookingId, "student");
    expect(active.canEndConsultation).toBe(true);
    endConsultation(bookingId, "student");
    const ended = getMeetingRoomView(bookingId, "elderly");
    expect(ended.canStartConsultation).toBe(false);
    expect(ended.canEndConsultation).toBe(false);
  });

  it("[A4] 相談終了後に party に応じたマイページへ戻れる", () => {
    const { bookingId } = seedClaimedBooking();
    expect(getMeetingRoomView(bookingId, "elderly").homePath).toBeNull();
    startConsultation(bookingId, "elderly");
    endConsultation(bookingId, "elderly");
    expect(getMeetingRoomView(bookingId, "elderly").homePath).toBe("/");
    expect(getMeetingRoomView(bookingId, "student").homePath).toBe("/student");
  });

  it("[A8] 相談URLで送った内容がマイページ側の同じ予約でも見える", () => {
    const { bookingId } = seedClaimedBooking();
    sendMessage(bookingId, "elderly", "マイページと同じ内容");
    setStepFeedback(bookingId, 2);
    expect(getChat(bookingId).messages[0]?.body).toBe("マイページと同じ内容");
    expect(getStepFeedback(bookingId).rating).toBe(2);
    expect(getMeetingRoomView(bookingId, "elderly").showChat).toBe(true);
  });

  it("[A10] 存在しない bookingId では案内が返り例外を投げない", () => {
    expect(() => getMeetingRoomView("booking-missing", "elderly")).not.toThrow();
    const view = getMeetingRoomView("booking-missing", "elderly");
    expect(view.found).toBe(false);
    expect(view.layout).toBe("missing");
    expect(view.promptMessage).toMatch(/見つかり|ブラウザ/);
  });

  it("[A11] 未マッチの予約でも高齢者は相談URLでチャットと感想が使える", () => {
    const { confirmation } = seedElderlyBooking("1-30");
    const view = getMeetingRoomView(confirmation.bookingId, "elderly");
    expect(view.showChat).toBe(true);
    expect(view.showStepFeedback).toBe(true);
    sendMessage(confirmation.bookingId, "elderly", "受付前メッセージ");
    expect(getChat(confirmation.bookingId).messages).toHaveLength(1);
  });

  it("[A6] 相談URLのパス形式は /meeting/{bookingId} である", () => {
    const { bookingId } = seedClaimedBooking();
    expect(buildMeetingUrl(bookingId)).toBe(`/meeting/${bookingId}`);
  });

  it("アクティブ高齢者ユーザーから party が elderly と推定される", () => {
    const { confirmation } = seedElderlyBookingAsSato();
    expect(
      resolveMeetingRoomParty(confirmation.bookingId, "sato", null),
    ).toBe("elderly");
  });

  it("アクティブ学生ユーザーから party が student と推定される", () => {
    const { bookingId } = seedClaimedBooking();
    expect(resolveMeetingRoomParty(bookingId, null, "aoki")).toBe("student");
  });

  it("どちらのデモユーザーでもない場合は guest になる", () => {
    const { bookingId } = seedClaimedBooking();
    expect(resolveMeetingRoomParty(bookingId, null, null)).toBe("guest");
  });

  it("マイページと相談URLの両方から相談開始ができる", () => {
    const { bookingId } = seedClaimedBooking();
    expect(getMeetingRoomView(bookingId, "elderly").canStartConsultation).toBe(
      true,
    );
    startConsultation(bookingId, "elderly");
    expect(getMeetingRoomView(bookingId, "student").canEndConsultation).toBe(
      true,
    );
  });
});
