import type { TimeSlot } from "./types";

const DURATION_MINUTES = 15;
const SLOTS_PER_DAY = 32;
const START_HOUR = 9;
const END_LAST_MINUTE = { hour: 16, minute: 45 };

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

function addCalendarDays(
  year: number,
  month: number,
  day: number,
  add: number,
) {
  const shifted = new Date(Date.UTC(year, month - 1, day + add));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

function tokyoWallTimeToDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
) {
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  const hh = String(hour).padStart(2, "0");
  const mi = String(minute).padStart(2, "0");
  return new Date(`${year}-${mm}-${dd}T${hh}:${mi}:00+09:00`);
}

function slotsForDay(year: number, month: number, day: number): TimeSlot[] {
  const slots: TimeSlot[] = [];
  for (let index = 0; index < SLOTS_PER_DAY; index += 1) {
    const totalMinutes = START_HOUR * 60 + index * DURATION_MINUTES;
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    slots.push({
      start: tokyoWallTimeToDate(year, month, day, hour, minute),
      durationMinutes: DURATION_MINUTES,
    });
  }
  const last = tokyoParts(slots[slots.length - 1].start);
  if (last.hour !== END_LAST_MINUTE.hour || last.minute !== END_LAST_MINUTE.minute) {
    throw new Error("slot grid must end at 16:45 JST");
  }
  return slots;
}

export function getAvailableSlots(now: Date): TimeSlot[] {
  const start = tokyoParts(now);
  const slots: TimeSlot[] = [];
  for (let offset = 0; offset < 7; offset += 1) {
    const day = addCalendarDays(start.year, start.month, start.day, offset);
    slots.push(...slotsForDay(day.year, day.month, day.day));
  }
  return slots;
}
