import { getBoardRecord } from "./board";

export type MeetingRoomParty = "elderly" | "student" | "guest";

export type MeetingRoomLayout = "chat-root" | "legacy-meeting-card" | "missing";

export type MeetingRoomView = {
  bookingId: string;
  found: boolean;
  layout: MeetingRoomLayout;
  showLegacyMeetingCard: boolean;
  showStepFeedback: boolean;
  showChat: boolean;
  homePath: string | null;
  promptMessage: string | null;
  canStartConsultation: boolean;
  canEndConsultation: boolean;
  party: MeetingRoomParty;
};

const MISSING_PROMPT =
  "相談予定が見つかりません。このURLを発行したブラウザで開いてください。";

export function buildMeetingUrl(bookingId: string): string {
  return `/meeting/${bookingId}`;
}

export function resolveMeetingRoomParty(
  bookingId: string,
  activeElderlyUserId: string | null,
  activeStudentUserId: string | null,
): MeetingRoomParty {
  const booking = getBoardRecord(bookingId);
  if (!booking) {
    return "guest";
  }
  if (
    activeElderlyUserId &&
    booking.elderlyUserId === activeElderlyUserId
  ) {
    return "elderly";
  }
  if (
    activeStudentUserId &&
    booking.studentUserId === activeStudentUserId
  ) {
    return "student";
  }
  return "guest";
}

export function getMeetingRoomView(
  bookingId: string,
  party: MeetingRoomParty,
): MeetingRoomView {
  const booking = getBoardRecord(bookingId);
  if (!booking) {
    return {
      bookingId,
      found: false,
      layout: "missing",
      showLegacyMeetingCard: false,
      showStepFeedback: false,
      showChat: false,
      homePath: null,
      promptMessage: MISSING_PROMPT,
      canStartConsultation: false,
      canEndConsultation: false,
      party,
    };
  }

  const status = booking.consultationStatus;
  const canStartConsultation = booking.claimed && status === "idle";
  const canEndConsultation = status === "active";
  let homePath: string | null = null;
  if (status === "ended") {
    if (party === "elderly") {
      homePath = "/";
    } else if (party === "student") {
      homePath = "/student";
    }
  }

  return {
    bookingId,
    found: true,
    layout: "chat-root",
    showLegacyMeetingCard: false,
    showStepFeedback: party === "elderly",
    showChat: true,
    homePath,
    promptMessage: null,
    canStartConsultation,
    canEndConsultation,
    party,
  };
}
