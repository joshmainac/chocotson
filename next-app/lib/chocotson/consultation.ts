import {
  getBoardRecord,
  updateConsultationOnBoard,
} from "./board";
import type {
  ConsultationParty,
  ConsultationView,
} from "./types";

function toView(record: NonNullable<ReturnType<typeof getBoardRecord>>): ConsultationView {
  return {
    status: record.consultationStatus,
    startedBy: record.startedBy,
    endedBy: record.endedBy,
    hasMedia: false,
    hasNextScreen: false,
    stepTitle: record.stepTitle,
    slotStart: record.slotStart,
  };
}

function requireRecord(bookingId: string) {
  const record = getBoardRecord(bookingId);
  if (!record) {
    throw new Error("予約が見つかりません");
  }
  return record;
}

export function getConsultation(bookingId: string): ConsultationView {
  return toView(requireRecord(bookingId));
}

export function startConsultation(
  bookingId: string,
  party: ConsultationParty,
): ConsultationView {
  const record = requireRecord(bookingId);
  if (!record.claimed) {
    throw new Error("まだ受けていない予約です");
  }
  if (record.consultationStatus === "active") {
    throw new Error("すでに相談中です");
  }
  if (record.consultationStatus === "ended") {
    throw new Error("すでに終わっています");
  }
  return toView(
    updateConsultationOnBoard(bookingId, {
      consultationStatus: "active",
      startedBy: party,
      endedBy: null,
    }),
  );
}

export function endConsultation(
  bookingId: string,
  party: ConsultationParty,
): ConsultationView {
  const record = requireRecord(bookingId);
  if (record.consultationStatus !== "active") {
    throw new Error("相談中ではありません");
  }
  return toView(
    updateConsultationOnBoard(bookingId, {
      consultationStatus: "ended",
      startedBy: record.startedBy,
      endedBy: party,
    }),
  );
}
