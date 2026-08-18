import type { ConsultationParty, ConsultationView } from "./types";

export function getConsultation(_bookingId: string): ConsultationView {
  throw new Error("not implemented");
}

export function startConsultation(
  _bookingId: string,
  _party: ConsultationParty,
): ConsultationView {
  throw new Error("not implemented");
}

export function endConsultation(
  _bookingId: string,
  _party: ConsultationParty,
): ConsultationView {
  throw new Error("not implemented");
}
