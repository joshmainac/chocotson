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
  stepId: number | null;
  groupId: StepGroupId;
  slotStart: Date;
  durationMinutes: number;
  claimed: boolean;
  student: string | null;
  elderlyUserId: string | null;
  elderlyUserName: string | null;
  studentUserId: string | null;
  studentUserName: string | null;
  meetingUrl: string | null;
  consultationStatus: ConsultationStatus;
  startedBy: ConsultationParty | null;
  endedBy: ConsultationParty | null;
  availabilityLabel: string | null;
  candidateSlotStarts: Date[];
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
        candidateSlotStarts?: string[];
        consultationStatus?: ConsultationStatus;
        startedBy?: ConsultationParty | null;
        endedBy?: ConsultationParty | null;
        elderlyUserId?: string | null;
        elderlyUserName?: string | null;
        studentUserId?: string | null;
        studentUserName?: string | null;
        meetingUrl?: string | null;
        stepId?: number | null;
      }
    >;
    return rows.map((row) => ({
      ...row,
      slotStart: new Date(row.slotStart),
      candidateSlotStarts: (row.candidateSlotStarts ?? [row.slotStart]).map(
        (start) => new Date(start),
      ),
      consultationStatus: row.consultationStatus ?? "idle",
      startedBy: row.startedBy ?? null,
      endedBy: row.endedBy ?? null,
      elderlyUserId: row.elderlyUserId ?? null,
      elderlyUserName: row.elderlyUserName ?? null,
      studentUserId: row.studentUserId ?? null,
      studentUserName: row.studentUserName ?? null,
      meetingUrl: row.meetingUrl ?? null,
      stepId: row.stepId ?? null,
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
  stepId?: number;
  groupId: StepGroupId;
  slotStart: Date;
  durationMinutes: number;
  elderlyUserId?: string;
  elderlyUserName?: string;
  availabilityLabel?: string;
  candidateSlotStarts?: Date[];
}): BoardRecord {
  const record: BoardRecord = {
    id: newBookingId(),
    stepTitle: input.stepTitle,
    stepId: input.stepId ?? null,
    groupId: input.groupId,
    slotStart: input.slotStart,
    durationMinutes: input.durationMinutes,
    claimed: false,
    student: null,
    elderlyUserId: input.elderlyUserId ?? null,
    elderlyUserName: input.elderlyUserName ?? null,
    studentUserId: null,
    studentUserName: null,
    meetingUrl: null,
    consultationStatus: "idle",
    startedBy: null,
    endedBy: null,
    availabilityLabel: input.availabilityLabel ?? null,
    candidateSlotStarts: input.candidateSlotStarts?.length
      ? input.candidateSlotStarts
      : [input.slotStart],
  };
  writeBoard([...readBoard(), record]);
  return record;
}

export function claimOnBoard(
  bookingId: string,
  student?: { id: string; name: string },
  selectedSlotStart?: Date,
): BoardRecord {
  const current = readBoard();
  const target = current.find((record) => record.id === bookingId && !record.claimed);
  if (!target) {
    throw new Error("予約が見つかりません");
  }
  const claimed: BoardRecord = {
    ...target,
    claimed: true,
    studentUserId: student?.id ?? null,
    studentUserName: student?.name ?? null,
    meetingUrl: `/meeting/${target.id}`,
    slotStart: selectedSlotStart ?? target.slotStart,
  };
  writeBoard(current.map((record) => (record.id === bookingId ? claimed : record)));
  return claimed;
}

export function listBookingsForElderly(userId: string): BoardRecord[] {
  return readBoard()
    .filter((record) => record.elderlyUserId === userId)
    .sort((a, b) => a.slotStart.getTime() - b.slotStart.getTime());
}

export function listBookingsForStudent(userId: string): BoardRecord[] {
  return readBoard()
    .filter((record) => record.studentUserId === userId)
    .sort((a, b) => a.slotStart.getTime() - b.slotStart.getTime());
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
      elderlyUserId: record.elderlyUserId,
      elderlyUserName: record.elderlyUserName,
      availabilityLabel: record.availabilityLabel,
      candidateSlotStarts: record.candidateSlotStarts,
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

export function getBoardSnapshot(): string {
  if (canUseStorage()) {
    return localStorage.getItem(STORAGE_KEY) ?? "[]";
  }
  return serialize(memory);
}
