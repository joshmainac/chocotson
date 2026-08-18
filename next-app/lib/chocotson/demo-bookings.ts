import { STEPS_1_30, STEPS_31_60 } from "./catalog-data";
import type { IncomingBooking } from "./types";

/** デモ予約（A3: 1-30 / 31-60 のみ。61-90 は無し） */
export const DEMO_BOOKINGS: IncomingBooking[] = [
  {
    id: "demo-booking-1-30",
    stepTitle: STEPS_1_30[0].title,
    groupId: "1-30",
    slotStart: new Date("2026-08-19T09:00:00+09:00"),
    durationMinutes: 15,
    taken: false,
  },
  {
    id: "demo-booking-31-60",
    stepTitle: STEPS_31_60[0].title,
    groupId: "31-60",
    slotStart: new Date("2026-08-19T10:00:00+09:00"),
    durationMinutes: 15,
    taken: false,
  },
];
