import type {
  ConsultationParty,
  ConsultationStatus,
  IncomingBooking,
  StepGroupId,
} from "./types";

const STORAGE_KEY = "chocotson.booking-board";
const BOARD_EVENT = "chocotson-board";

export type BoardRecord = {
  id: string;
  stepTitle: string;
  groupId: StepGroupId;
  slotStart: Date;
  durationMinutes: number;
  claimed: boolean;
  student: string | null;
  consultationStatus: ConsultationStatus;
  startedBy: ConsultationParty | null;
  endedBy: ConsultationParty | null;
};

let memory: BoardRecord[] = [];

function canUseStorage() {
  try {
    return typeof localStorage !== "undefined";
  } catch {
    return false;
  }
}

function serialize(records: BoardRecord[]) {
  return JSON.stringify(
    records.map((record) => ({
      ...record,
      slotStart: record.slotStart.toISOString(),
    })),
  );
}

function parse(raw: string | null): BoardRecord[] | null {
  if (!raw) {
    return null;
  }
  try {
    const rows = JSON.parse(raw) as Array<
      Omit<BoardRecord, "slotStart"> & {
        slotStart: string;
        consultationStatus?: ConsultationStatus;
        startedBy?: ConsultationParty | null;
        endedBy?: ConsultationParty | null;
      }
    >;
    return rows.map((row) => ({
      ...row,
      slotStart: new Date(row.slotStart),
      consultationStatus: row.consultationStatus ?? "idle",
      startedBy: row.startedBy ?? null,
      endedBy: row.endedBy ?? null,
    }));
  } catch {
    return null;
  }
}

function readBoard(): BoardRecord[] {
  if (canUseStorage()) {
    const stored = parse(localStorage.getItem(STORAGE_KEY));
    if (stored) {
      memory = stored;
    }
  }
  return memory;
}

function writeBoard(next: BoardRecord[]) {
  memory = next;
  if (canUseStorage()) {
    localStorage.setItem(STORAGE_KEY, serialize(next));
    window.dispatchEvent(new Event(BOARD_EVENT));
  }
}

export function resetBookingBoard(): void {
  writeBoard([]);
}

function newBookingId(): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `booking-${random}`;
}

export function publishConfirmedBooking(input: {
  stepTitle: string;
  groupId: StepGroupId;
  slotStart: Date;
  durationMinutes: number;
}): BoardRecord {
  const record: BoardRecord = {
    id: newBookingId(),
    stepTitle: input.stepTitle,
    groupId: input.groupId,
    slotStart: input.slotStart,
    durationMinutes: input.durationMinutes,
    claimed: false,
    student: null,
    consultationStatus: "idle",
    startedBy: null,
    endedBy: null,
  };
  writeBoard([...readBoard(), record]);
  return record;
}

export function claimOnBoard(bookingId: string): BoardRecord {
  const current = readBoard();
  const target = current.find((record) => record.id === bookingId && !record.claimed);
  if (!target) {
    throw new Error("予約が見つかりません");
  }
  const claimed: BoardRecord = { ...target, claimed: true };
  writeBoard(current.map((record) => (record.id === bookingId ? claimed : record)));
  return claimed;
}

export function listOpenBookings(): IncomingBooking[] {
  return readBoard()
    .filter((record) => !record.claimed)
    .map((record) => ({
      id: record.id,
      stepTitle: record.stepTitle,
      groupId: record.groupId,
      slotStart: record.slotStart,
      durationMinutes: record.durationMinutes,
      taken: false,
    }));
}

export function getBoardRecord(bookingId: string): BoardRecord | undefined {
  return readBoard().find((record) => record.id === bookingId);
}

export function updateConsultationOnBoard(
  bookingId: string,
  patch: Pick<BoardRecord, "consultationStatus" | "startedBy" | "endedBy">,
): BoardRecord {
  const current = readBoard();
  const target = current.find((record) => record.id === bookingId);
  if (!target) {
    throw new Error("予約が見つかりません");
  }
  const next: BoardRecord = { ...target, ...patch };
  writeBoard(current.map((record) => (record.id === bookingId ? next : record)));
  return next;
}

export function getElderlyBookingView(bookingId: string): {
  student: string | null;
} {
  const record = getBoardRecord(bookingId);
  if (!record) {
    throw new Error("予約が見つかりません");
  }
  return { student: record.student };
}

export function subscribeBoard(listener: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) {
      listener();
    }
  };
  const onLocal = () => listener();
  window.addEventListener("storage", onStorage);
  window.addEventListener(BOARD_EVENT, onLocal);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(BOARD_EVENT, onLocal);
  };
}
