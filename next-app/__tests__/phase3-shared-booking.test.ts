import {
  claimOnBoard,
  getElderlyBookingView,
  listBookingsForElderly,
  listBookingsForStudent,
  publishConfirmedBooking,
  resetBookingBoard,
} from "@/lib/chocotson/board";
import {
  claimBooking,
  createStudentSession,
  getClaimReceipt,
  getStudentCopy,
  getVisibleBookings,
  goToBookingList,
  selectTeachingGroups,
} from "@/lib/chocotson/student";
import { seedElderlyBooking } from "./helpers/seed-elderly-booking";

function studentList(groupIds: Array<"1-30" | "31-60" | "61-90">) {
  return goToBookingList(
    selectTeachingGroups(createStudentSession(), groupIds),
  );
}

describe("Phase 3 shared booking", () => {
  beforeEach(() => {
    resetBookingBoard();
  });

  // 高齢者の予約フローは既存の Phase 1 テストが守る。ここでは増やさない。

  // 一覧は、まだ受けていない高齢者の予約だけ。固定のデモ予約は使わない。
  it("[A2] 高齢者が予約すると学生入口からその予約が見える", () => {
    const { confirmation } = seedElderlyBooking("1-30");
    const bookings = getVisibleBookings(studentList(["1-30"]));
    expect(bookings).toHaveLength(1);
    expect(bookings[0]?.stepTitle).toBe(confirmation.stepTitle);
    expect(bookings[0]?.slotStart).toEqual(confirmation.slotStart);
    expect(bookings[0]?.groupId).toBe("1-30");
    expect(bookings[0]?.durationMinutes).toBe(15);
  });

  // 高齢者がまだ予約していなければ、1-30 でも一覧は空。
  it("[A2] 高齢者がまだ予約していないグループでは一覧が0件である", () => {
    const bookings = getVisibleBookings(studentList(["1-30"]));
    expect(bookings).toHaveLength(0);
    expect(getStudentCopy().emptyList.length).toBeGreaterThan(0);
  });

  it("学生の一覧には選んだグループの未受け予約だけが出る", () => {
    const first = seedElderlyBooking("1-30");
    seedElderlyBooking("31-60");
    const bookings = getVisibleBookings(studentList(["1-30"]));
    expect(bookings).toHaveLength(1);
    expect(bookings[0]?.stepTitle).toBe(first.confirmation.stepTitle);
    expect(bookings[0]?.groupId).toBe("1-30");
  });

  it("一覧の各予約に段差と15分の日時が分かる", () => {
    const { confirmation } = seedElderlyBooking("1-30");
    const bookings = getVisibleBookings(studentList(["1-30"]));
    expect(bookings).toHaveLength(1);
    expect(bookings[0]?.stepTitle).toBe(confirmation.stepTitle);
    expect(bookings[0]?.slotStart).toEqual(confirmation.slotStart);
    expect(bookings[0]?.durationMinutes).toBe(15);
  });

  // 控えが終わり。相談の実施・ログイン・報酬には進まない。
  it("[A6] 予約を一件受けると控えに同じ段差と日時が出て先には進まない", () => {
    const { confirmation } = seedElderlyBooking("1-30");
    const listed = studentList(["1-30"]);
    const target = getVisibleBookings(listed)[0];
    expect(target).toBeDefined();
    const receipt = getClaimReceipt(claimBooking(listed, target.id));
    expect(receipt.stepTitle).toBe(confirmation.stepTitle);
    expect(receipt.slotStart).toEqual(confirmation.slotStart);
    expect(receipt.hasNextScreen).toBe(false);
    expect(receipt.consultationStarted).toBe(false);
  });

  // 受けた予約は一覧から消える。別の学生入口からも消える。
  it("[A3] 受けた予約は学生の一覧から消える", () => {
    seedElderlyBooking("1-30");
    const listed = studentList(["1-30"]);
    const target = getVisibleBookings(listed)[0];
    expect(target).toBeDefined();
    claimBooking(listed, target.id);
    expect(getVisibleBookings(listed).find((booking) => booking.id === target.id)).toBeUndefined();
    expect(getVisibleBookings(studentList(["1-30"]))).toHaveLength(0);
  });

  it("[A3] 同じグループに二件あるとき受けた一件だけが消える", () => {
    const first = seedElderlyBooking("1-30", 4);
    const second = seedElderlyBooking("1-30", 8);
    const listed = studentList(["1-30"]);
    const before = getVisibleBookings(listed);
    expect(before).toHaveLength(2);
    const toClaim = before.find((booking) => booking.stepTitle === first.confirmation.stepTitle);
    expect(toClaim).toBeDefined();
    if (!toClaim) {
      throw new Error("claim target missing");
    }
    claimBooking(listed, toClaim.id);
    const after = getVisibleBookings(studentList(["1-30"]));
    expect(after).toHaveLength(1);
    expect(after[0]?.stepTitle).toBe(second.confirmation.stepTitle);
  });

  it("グループを複数選んだとき選んだグループの予約がまとめて見える", () => {
    const a = seedElderlyBooking("1-30");
    const b = seedElderlyBooking("31-60");
    const bookings = getVisibleBookings(studentList(["1-30", "31-60"]));
    expect(bookings).toHaveLength(2);
    const titles = bookings.map((booking) => booking.stepTitle);
    expect(titles).toEqual(
      expect.arrayContaining([a.confirmation.stepTitle, b.confirmation.stepTitle]),
    );
    expect(bookings.every((booking) => booking.groupId !== "61-90")).toBe(true);
  });

  it("別グループの予約は選んでいない一覧に出ない", () => {
    seedElderlyBooking("61-90");
    expect(getVisibleBookings(studentList(["1-30"]))).toHaveLength(0);
  });

  // 学生入口が二つでも、まだ受けていない同じ予約が見える。
  it("[A7] 二つの学生入口が同じ未受けの予約を見る", () => {
    const { confirmation } = seedElderlyBooking("1-30");
    const first = getVisibleBookings(studentList(["1-30"]));
    const second = getVisibleBookings(studentList(["1-30"]));
    expect(first).toHaveLength(1);
    expect(second).toHaveLength(1);
    expect(first[0]?.id).toBe(second[0]?.id);
    expect(first[0]?.stepTitle).toBe(confirmation.stepTitle);
    expect(second[0]?.stepTitle).toBe(confirmation.stepTitle);
  });

  it("まだ受けていないときグループを選び直すと一覧が変わる", () => {
    const a = seedElderlyBooking("1-30");
    const b = seedElderlyBooking("31-60");
    let session = studentList(["1-30"]);
    const first = getVisibleBookings(session);
    session = goToBookingList(selectTeachingGroups(session, ["31-60"]));
    const second = getVisibleBookings(session);
    expect(first).toHaveLength(1);
    expect(second).toHaveLength(1);
    expect(first[0]?.stepTitle).toBe(a.confirmation.stepTitle);
    expect(second[0]?.stepTitle).toBe(b.confirmation.stepTitle);
  });

  // 同じブラウザのボード。reset するまで残る。
  it("[A1] ボードをresetしなければ別の学生入口からも予約が見える", () => {
    const { confirmation } = seedElderlyBooking("1-30");
    const again = getVisibleBookings(studentList(["1-30"]));
    expect(again).toHaveLength(1);
    expect(again[0]?.stepTitle).toBe(confirmation.stepTitle);
  });

  it("[A1] ボードをresetすると予約は一覧から消える", () => {
    const { confirmation } = seedElderlyBooking("1-30");
    const before = getVisibleBookings(studentList(["1-30"]));
    expect(before).toHaveLength(1);
    expect(before[0]?.stepTitle).toBe(confirmation.stepTitle);
    resetBookingBoard();
    expect(getVisibleBookings(studentList(["1-30"]))).toHaveLength(0);
  });

  it("マッチング後は両者の予定に同じデモ相談URLが発行される", () => {
    const booking = publishConfirmedBooking({
      stepTitle: "LINEで写真を送る",
      groupId: "1-30",
      slotStart: new Date("2026-08-24T01:00:00Z"),
      durationMinutes: 15,
      elderlyUserId: "sato",
      elderlyUserName: "佐藤 よし子",
    });
    const matched = claimOnBoard(booking.id, {
      id: "aoki",
      name: "青木 颯太",
    });

    expect(matched.meetingUrl).toBe(`/meeting/${booking.id}`);
    expect(listBookingsForElderly("sato")[0]?.meetingUrl).toBe(
      matched.meetingUrl,
    );
    expect(listBookingsForStudent("aoki")[0]?.meetingUrl).toBe(
      matched.meetingUrl,
    );
    expect(listBookingsForElderly("sato")[0]?.studentUserName).toBe(
      "青木 颯太",
    );
  });

  // 受けたあとも、高齢者の確認に学生名は出さない。
  it("[A4] 学生が受けたあとでも高齢者の確認に学生は出ない", () => {
    seedElderlyBooking("1-30");
    const listed = studentList(["1-30"]);
    const target = getVisibleBookings(listed)[0];
    expect(target).toBeDefined();
    claimBooking(listed, target.id);
    expect(getElderlyBookingView(target.id).student).toBeNull();
  });
});
