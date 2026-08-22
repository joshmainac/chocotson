import {
  getBoardRecord,
  listOpenBookings,
  publishConfirmedBooking,
  resetBookingBoard,
} from "@/lib/chocotson/board";
import {
  STUDENT_SETTINGS_KEY,
  getStudentSettings,
  saveStudentSettings,
} from "@/lib/chocotson/local-demo-store";
import {
  claimBooking,
  createStudentSession,
  goToBookingList,
  selectTeachingGroups,
} from "@/lib/chocotson/student";

describe("availability matching", () => {
  beforeEach(() => resetBookingBoard());

  it("高齢者の複数候補と時間帯ラベルが学生側へ届く", () => {
    const candidates = [
      new Date("2026-08-24T01:00:00Z"),
      new Date("2026-08-24T01:30:00Z"),
    ];
    publishConfirmedBooking({
      stepTitle: "LINEで写真を送る",
      groupId: "1-30",
      slotStart: candidates[0],
      durationMinutes: 15,
      availabilityLabel: "8月24日・10:00〜12:00の間",
      candidateSlotStarts: candidates,
    });

    const incoming = listOpenBookings()[0];
    expect(incoming.availabilityLabel).toMatch(/10:00〜12:00/);
    expect(incoming.candidateSlotStarts).toEqual(candidates);
  });

  it("学生が候補の中から相談開始時刻を確定できる", () => {
    const candidates = [
      new Date("2026-08-24T01:00:00Z"),
      new Date("2026-08-24T02:00:00Z"),
    ];
    const booking = publishConfirmedBooking({
      stepTitle: "地図を使う",
      groupId: "1-30",
      slotStart: candidates[0],
      durationMinutes: 15,
      candidateSlotStarts: candidates,
    });
    const session = goToBookingList(
      selectTeachingGroups(createStudentSession(), ["1-30"]),
    );

    claimBooking(session, booking.id, { id: "aoki", name: "青木 颯太" }, candidates[1]);
    expect(getBoardRecord(booking.id)?.slotStart).toEqual(candidates[1]);
  });
});

describe("student settings", () => {
  const values = new Map<string, string>();

  beforeEach(() => {
    values.clear();
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
      },
    });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { dispatchEvent: jest.fn() },
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, "localStorage");
    Reflect.deleteProperty(globalThis, "window");
  });

  it("ITレベル・得意分野・終日シフトを学生ごとに保存する", () => {
    saveStudentSettings("aoki", {
      itLevel: "advanced",
      skills: ["LINE", "セキュリティ"],
      shifts: [{ date: "2026-08-24", allDay: true, start: "09:00", end: "17:00" }],
    });

    expect(getStudentSettings("aoki")).toMatchObject({
      itLevel: "advanced",
      shifts: [{ allDay: true }],
    });
    expect(values.has(STUDENT_SETTINGS_KEY)).toBe(true);
  });
});
