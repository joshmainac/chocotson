import {
  claimBooking,
  createStudentSession,
  getClaimReceipt,
  getStudentCopy,
  getVisibleBookings,
  goToBookingList,
  selectTeachingGroups,
} from "@/lib/chocotson/student";
import type { StepGroupId } from "@/lib/chocotson/types";

const GROUP_IDS: StepGroupId[] = ["1-30", "31-60", "61-90"];

describe("Phase 2 student intake", () => {
  it("アカウントなしで学生向けの入口から始められる", () => {
    const session = createStudentSession();
    expect(session.requiresAccount).toBe(false);
    expect(session.phase).toBe("groups");
  });

  it("教えられるグループとして 1-30 / 31-60 / 61-90 を一つ以上選べる", () => {
    const session = selectTeachingGroups(createStudentSession(), [
      "1-30",
      "31-60",
    ]);
    expect(session.teachingGroupIds).toEqual(["1-30", "31-60"]);
    expect(GROUP_IDS).toEqual(expect.arrayContaining(session.teachingGroupIds));
  });

  it("グループを選ぶまでは予約一覧に進まない", () => {
    const session = createStudentSession();
    expect(session.phase).toBe("groups");
    expect(session.teachingGroupIds).toHaveLength(0);
    expect(() => goToBookingList(session)).toThrow(/group|グループ/);
  });

  // ASSUMED [A1]: 予約はデモ一覧。高齢者セッションとは共有しない。
  it("[A1] 選んだグループに該当する予約だけが一覧に出る", () => {
    const session = goToBookingList(
      selectTeachingGroups(createStudentSession(), ["1-30"]),
    );
    const bookings = getVisibleBookings(session);
    expect(bookings.length).toBeGreaterThan(0);
    expect(bookings.every((booking) => booking.groupId === "1-30")).toBe(true);
  });

  it("一覧の各予約に段差と15分の日時が分かる", () => {
    const bookings = getVisibleBookings(
      goToBookingList(selectTeachingGroups(createStudentSession(), ["1-30"])),
    );
    expect(bookings.length).toBeGreaterThan(0);
    for (const booking of bookings) {
      expect(booking.stepTitle.length).toBeGreaterThan(0);
      expect(booking.slotStart).toBeInstanceOf(Date);
      expect(booking.durationMinutes).toBe(15);
    }
  });

  it("予約を一件これを受けると引き受けられる", () => {
    const listed = goToBookingList(
      selectTeachingGroups(createStudentSession(), ["1-30"]),
    );
    const target = getVisibleBookings(listed)[0];
    const claimed = claimBooking(listed, target.id);
    expect(claimed.claimedBookingId).toBe(target.id);
    expect(claimed.phase).toBe("receipt");
  });

  // ASSUMED [A2]: 受け済みはこのタブのセッションだけ。
  it("[A2] 受けた予約はこの画面では受け済みに見える", () => {
    const listed = goToBookingList(
      selectTeachingGroups(createStudentSession(), ["1-30"]),
    );
    const target = getVisibleBookings(listed)[0];
    const claimed = claimBooking(listed, target.id);
    const after = getVisibleBookings(claimed);
    expect(after.find((booking) => booking.id === target.id)?.taken).toBe(true);
  });

  it("受けたあと段差と日時の控えが表示される", () => {
    const listed = goToBookingList(
      selectTeachingGroups(createStudentSession(), ["1-30"]),
    );
    const target = getVisibleBookings(listed)[0];
    const receipt = getClaimReceipt(claimBooking(listed, target.id));
    expect(receipt.stepTitle).toBe(target.stepTitle);
    expect(receipt.slotStart).toEqual(target.slotStart);
  });

  it("控えの先には進まない", () => {
    const listed = goToBookingList(
      selectTeachingGroups(createStudentSession(), ["1-30"]),
    );
    const target = getVisibleBookings(listed)[0];
    const receipt = getClaimReceipt(claimBooking(listed, target.id));
    expect(receipt.hasNextScreen).toBe(false);
    expect(receipt.consultationStarted).toBe(false);
  });

    // ASSUMED [A3]: デモは 1-30 と 31-60 に予約あり。
    it("グループを複数選んだとき選んだグループの予約がまとめて見える", () => {
    const bookings = getVisibleBookings(
      goToBookingList(
        selectTeachingGroups(createStudentSession(), ["1-30", "31-60"]),
      ),
    );
    const groups = new Set(bookings.map((booking) => booking.groupId));
    expect(groups.has("1-30")).toBe(true);
    expect(groups.has("31-60")).toBe(true);
    expect(bookings.every((booking) => booking.groupId !== "61-90")).toBe(true);
  });

  // ASSUMED [A3]: デモ予約は 61-90 を空にする。
  it("[A3] 該当する予約が0件のとき予約がないことが分かる", () => {
    const bookings = getVisibleBookings(
      goToBookingList(selectTeachingGroups(createStudentSession(), ["61-90"])),
    );
    expect(bookings).toHaveLength(0);
    expect(getStudentCopy().emptyList.length).toBeGreaterThan(0);
  });

    it("まだ受けていないときグループを選び直すと一覧が変わる", () => {
      let session = goToBookingList(
        selectTeachingGroups(createStudentSession(), ["1-30"]),
      );
      const first = getVisibleBookings(session);
      session = goToBookingList(selectTeachingGroups(session, ["31-60"]));
      const second = getVisibleBookings(session);
      expect(first.every((booking) => booking.groupId === "1-30")).toBe(true);
      expect(second.every((booking) => booking.groupId === "31-60")).toBe(true);
      expect(second.some((booking) => booking.id === first[0]?.id)).toBe(false);
    });

    // ASSUMED [A4]: 学生向けコピーは日本語。「これを受ける」。
    it("[A4] 学生向けの案内は日本語で急かさず責めない", () => {
      const copy = getStudentCopy();
      expect(copy.language).toBe("ja");
      expect(copy.claimLabel).toMatch(/これを受ける/);
      const blob = `${copy.claimLabel}${copy.emptyList}`;
      expect(blob).toMatch(/[\u3040-\u30ff\u4e00-\u9faf]/);
      expect(blob).not.toMatch(/急いで|急げ|ダメ|失敗|できない人/);
    });

    // ASSUMED [A4]: ログイン・報酬の案内は出さない。
    it("[A4] ログインや報酬の案内で今回の終わりを越えない", () => {
      const copy = getStudentCopy();
      const blob = `${copy.claimLabel}${copy.emptyList}`;
      expect(blob).not.toMatch(/ログイン|会員登録|報酬|500円/);
    });
});
