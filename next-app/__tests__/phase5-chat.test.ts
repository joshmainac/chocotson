import { resetBookingBoard } from "@/lib/chocotson/board";
import * as chatApi from "@/lib/chocotson/chat";
import { getChat, sendMessage } from "@/lib/chocotson/chat";
import {
  endConsultation,
  getConsultation,
  startConsultation,
} from "@/lib/chocotson/consultation";
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

describe("Phase 5 booking chat", () => {
  beforeEach(() => {
    resetBookingBoard();
  });

  // ASSUMED [A1]: チャットのキーは予約の bookingId。josh-docs/ASSUMPTIONS.md 参照。
  it("[A1] 高齢者が予約を確定すると学生が受ける前でも文字を送れる", () => {
    const { confirmation } = seedElderlyBooking("1-30");
    const sent = sendMessage(confirmation.bookingId, "elderly", "電源の切り方が分からない");
    expect(sent.sender).toBe("elderly");
    expect(sent.body).toBe("電源の切り方が分からない");
    expect(sent.bookingId).toBe(confirmation.bookingId);
    const chat = getChat(confirmation.bookingId);
    expect(chat.messages).toHaveLength(1);
    expect(chat.messages[0]?.body).toBe("電源の切り方が分からない");
  });

  it("学生がその予約を受けると相談の開始を待たずに文字を送れる", () => {
    const { target, confirmation } = claimFirstBooking();
    expect(getConsultation(target.id).status).toBe("idle");
    const sent = sendMessage(target.id, "student", "一緒にやりましょう");
    expect(sent.sender).toBe("student");
    expect(sent.body).toBe("一緒にやりましょう");
    expect(getChat(confirmation.bookingId).messages).toEqual([
      expect.objectContaining({ sender: "student", body: "一緒にやりましょう" }),
    ]);
  });

  it("相手がまだ画面にいなくても送れる側から文字を送れる", () => {
    const { confirmation } = seedElderlyBooking("1-30");
    sendMessage(confirmation.bookingId, "elderly", "先に書いておきます");
    const listed = goToBookingList(
      selectTeachingGroups(createStudentSession(), ["1-30"]),
    );
    const open = getVisibleBookings(listed)[0];
    if (!open) {
      throw new Error("open booking missing");
    }
    claimBooking(listed, open.id);
    expect(getChat(open.id).messages[0]?.body).toBe("先に書いておきます");
    sendMessage(open.id, "student", "受けました。読みました");
    expect(getChat(confirmation.bookingId).messages.map((m) => m.body)).toEqual([
      "先に書いておきます",
      "受けました。読みました",
    ]);
  });

  // ASSUMED [A6]: メッセージは古い順。予約ごとに分離。josh-docs/ASSUMPTIONS.md 参照。
  it("[A6] 送った文面が同じ予約の相手側からも読める", () => {
    const { target, confirmation } = claimFirstBooking();
    sendMessage(confirmation.bookingId, "elderly", "一通目");
    sendMessage(target.id, "student", "二通目");
    const asElderly = getChat(confirmation.bookingId);
    const asStudent = getChat(target.id);
    expect(asElderly.messages.map((m) => m.body)).toEqual(["一通目", "二通目"]);
    expect(asStudent.messages.map((m) => m.body)).toEqual(["一通目", "二通目"]);
  });

  it("予約ごとのやりとりは混ざらない", () => {
    const first = seedElderlyBooking("1-30", 0);
    const second = seedElderlyBooking("31-60", 0);
    sendMessage(first.confirmation.bookingId, "elderly", "一件目だけ");
    sendMessage(second.confirmation.bookingId, "elderly", "二件目だけ");
    expect(getChat(first.confirmation.bookingId).messages.map((m) => m.body)).toEqual([
      "一件目だけ",
    ]);
    expect(getChat(second.confirmation.bookingId).messages.map((m) => m.body)).toEqual([
      "二件目だけ",
    ]);
    expect(getChat(first.confirmation.bookingId).stepTitle).toBe(
      first.confirmation.stepTitle,
    );
    expect(getChat(second.confirmation.bookingId).stepTitle).toBe(
      second.confirmation.stepTitle,
    );
  });

  it("それぞれの文面が高齢者のものか学生のものか分かる", () => {
    const { target, confirmation } = claimFirstBooking();
    sendMessage(confirmation.bookingId, "elderly", "高齢側");
    sendMessage(target.id, "student", "学生側");
    const messages = getChat(confirmation.bookingId).messages;
    expect(messages[0]).toMatchObject({ sender: "elderly", body: "高齢側" });
    expect(messages[1]).toMatchObject({ sender: "student", body: "学生側" });
  });

  it("やりとりのあいだも段差の題が分かり何についての相談かがずれない", () => {
    const { confirmation, target } = claimFirstBooking();
    sendMessage(confirmation.bookingId, "elderly", "この段差について");
    startConsultation(target.id, "student");
    endConsultation(target.id, "elderly");
    const chat = getChat(confirmation.bookingId);
    expect(chat.stepTitle).toBe(confirmation.stepTitle);
    expect(chat.stepTitle.length).toBeGreaterThan(0);
  });

  it("相談を終えてもそれまでに送った文字はボードをリセットするまで読める", () => {
    const { target, confirmation } = claimFirstBooking();
    sendMessage(confirmation.bookingId, "elderly", "終了前のメモ");
    startConsultation(target.id, "student");
    endConsultation(target.id, "elderly");
    expect(getConsultation(target.id).status).toBe("ended");
    expect(getChat(confirmation.bookingId).messages.map((m) => m.body)).toContain(
      "終了前のメモ",
    );
  });

  // ASSUMED [A7]: 送信可否は相談 status に依存しない。josh-docs/ASSUMPTIONS.md 参照。
  it("[A7] 相談が終わったあとも新たに文字を送れる", () => {
    const { target, confirmation } = claimFirstBooking();
    startConsultation(target.id, "elderly");
    sendMessage(confirmation.bookingId, "elderly", "相談中の文");
    sendMessage(target.id, "student", "相談中の返事");
    endConsultation(target.id, "elderly");
    sendMessage(confirmation.bookingId, "elderly", "終わったあと高齢");
    sendMessage(target.id, "student", "終わったあと学生");
    expect(getChat(target.id).messages.map((m) => m.body)).toEqual([
      "相談中の文",
      "相談中の返事",
      "終わったあと高齢",
      "終わったあと学生",
    ]);
  });

  // ASSUMED [A4]: 未知の予約はエラー。josh-docs/ASSUMPTIONS.md 参照。
  it("[A4] 予約がまだ無いときは文字のやりとりは無い", () => {
    expect(() => getChat("booking-does-not-exist")).toThrow(/予約が見つかりません/);
    expect(() => sendMessage("booking-does-not-exist", "elderly", "hello")).toThrow(
      /予約が見つかりません/,
    );
  });

  // ASSUMED [A8]: 未受け学生は日本語エラー。josh-docs/ASSUMPTIONS.md 参照。
  it("[A8] 学生は予約を受ける前には文字を送れない", () => {
    const { confirmation } = seedElderlyBooking("1-30");
    expect(() => sendMessage(confirmation.bookingId, "student", "まだ受けてない")).toThrow(
      /受け/,
    );
    expect(getChat(confirmation.bookingId).messages).toHaveLength(0);
  });

  // ASSUMED [A3]: 空は trim 後長さ0。josh-docs/ASSUMPTIONS.md 参照。
  it("[A3] 空の文面だけでは送れない", () => {
    const { confirmation } = seedElderlyBooking("1-30");
    expect(() => sendMessage(confirmation.bookingId, "elderly", "")).toThrow(/空|本文/);
    expect(() => sendMessage(confirmation.bookingId, "elderly", "   ")).toThrow(/空|本文/);
    expect(getChat(confirmation.bookingId).messages).toHaveLength(0);
  });

  // ASSUMED [A5]: 文字数上限なし。josh-docs/ASSUMPTIONS.md 参照。
  it("[A5] 長い文面でも送れる", () => {
    const { confirmation } = seedElderlyBooking("1-30");
    const longBody = "あ".repeat(2000);
    const sent = sendMessage(confirmation.bookingId, "elderly", longBody);
    expect(sent.body).toBe(longBody);
    expect(getChat(confirmation.bookingId).messages[0]?.body).toBe(longBody);
  });

  // ASSUMED [A10]: 取り消し手段なし。josh-docs/ASSUMPTIONS.md 参照。
  it("[A10] 送った文字は取り消せずボードをリセットするまで残る", () => {
    const { confirmation, target } = claimFirstBooking();
    sendMessage(confirmation.bookingId, "elderly", "取り消せない文");
    startConsultation(target.id, "student");
    endConsultation(target.id, "student");
    expect(getChat(confirmation.bookingId).messages.map((m) => m.body)).toEqual([
      "取り消せない文",
    ]);
    expect(Object.keys(chatApi)).not.toContain("deleteMessage");
    expect(Object.keys(chatApi)).not.toContain("unsendMessage");
  });

  // ASSUMED [A2]: リセットでメッセージも消える。josh-docs/ASSUMPTIONS.md 参照。
  it("[A2] ボードをリセットするとやりとりは見えなくなる", () => {
    const { confirmation } = seedElderlyBooking("1-30");
    const bookingId = confirmation.bookingId;
    sendMessage(bookingId, "elderly", "消える文");
    expect(getChat(bookingId).messages).toHaveLength(1);
    resetBookingBoard();
    expect(() => getChat(bookingId)).toThrow(/予約が見つかりません/);
  });

  it("アカウントなしで高齢者入口と学生入口からやりとりできる", () => {
    const { confirmation } = seedElderlyBooking("1-30");
    expect(confirmation.hasNextScreen).toBe(false);
    sendMessage(confirmation.bookingId, "elderly", "アカウント不要");
    expect(getChat(confirmation.bookingId).requiresAccount).toBe(false);

    const listed = goToBookingList(
      selectTeachingGroups(createStudentSession(), ["1-30"]),
    );
    expect(listed.requiresAccount).toBe(false);
    const open = getVisibleBookings(listed)[0];
    if (!open) {
      throw new Error("open booking missing");
    }
    claimBooking(listed, open.id);
    sendMessage(open.id, "student", "こちらもアカウント不要");
    expect(getChat(open.id).requiresAccount).toBe(false);
    expect(getChat(open.id).messages).toHaveLength(2);
  });

  it("同じブラウザで入口を開き直してもその予約の文字のやりとりが見える", () => {
    const { confirmation } = seedElderlyBooking("1-30");
    sendMessage(confirmation.bookingId, "elderly", "開き直しても残る");
    const reopenedStudent = goToBookingList(
      selectTeachingGroups(createStudentSession(), ["1-30"]),
    );
    const open = getVisibleBookings(reopenedStudent)[0];
    if (!open) {
      throw new Error("open booking missing");
    }
    expect(open.id).toBe(confirmation.bookingId);
    expect(getChat(open.id).messages.map((m) => m.body)).toEqual(["開き直しても残る"]);
  });

  // ASSUMED [A9]: 文字でも hasMedia は false。josh-docs/ASSUMPTIONS.md 参照。
  it("[A9] 相談のやりとりに映像は出ない", () => {
    const { target, confirmation } = claimFirstBooking();
    sendMessage(confirmation.bookingId, "elderly", "文字だけ");
    startConsultation(target.id, "student");
    expect(getConsultation(target.id).hasMedia).toBe(false);
    expect(getChat(confirmation.bookingId).hasMedia).toBe(false);
  });

  it("相談が終わったあとにログインや報酬の画面へ進まない", () => {
    const { target, confirmation } = claimFirstBooking();
    sendMessage(confirmation.bookingId, "elderly", "あとで");
    startConsultation(target.id, "student");
    const ended = endConsultation(target.id, "student");
    expect(ended.hasNextScreen).toBe(false);
    expect(getChat(confirmation.bookingId).hasNextScreen).toBe(false);
  });
});
