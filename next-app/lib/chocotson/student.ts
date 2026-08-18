import { DEMO_BOOKINGS } from "./demo-bookings";
import type {
  ClaimReceipt,
  IncomingBooking,
  StepGroupId,
  StudentCopy,
  StudentSession,
} from "./types";

function baseSession(): StudentSession {
  return {
    phase: "groups",
    teachingGroupIds: [],
    claimedBookingId: null,
    requiresAccount: false,
  };
}

export function createStudentSession(): StudentSession {
  return baseSession();
}

export function selectTeachingGroups(
  session: StudentSession,
  groupIds: StepGroupId[],
): StudentSession {
  return {
    ...session,
    teachingGroupIds: groupIds,
  };
}

export function goToBookingList(session: StudentSession): StudentSession {
  if (session.teachingGroupIds.length === 0) {
    throw new Error("教えられるグループを選んでください");
  }
  return {
    ...session,
    phase: "list",
  };
}

export function getVisibleBookings(session: StudentSession): IncomingBooking[] {
  return DEMO_BOOKINGS.filter((booking) =>
    session.teachingGroupIds.includes(booking.groupId),
  ).map((booking) => ({
    ...booking,
    taken: booking.id === session.claimedBookingId,
  }));
}

export function claimBooking(
  session: StudentSession,
  bookingId: string,
): StudentSession {
  const booking = getVisibleBookings(session).find((item) => item.id === bookingId);
  if (!booking) {
    throw new Error("予約が見つかりません");
  }
  if (booking.taken) {
    throw new Error("この予約はすでに受け済みです");
  }
  return {
    ...session,
    phase: "receipt",
    claimedBookingId: bookingId,
  };
}

export function getClaimReceipt(session: StudentSession): ClaimReceipt {
  if (!session.claimedBookingId) {
    throw new Error("受けた予約がありません");
  }
  const booking = DEMO_BOOKINGS.find((item) => item.id === session.claimedBookingId);
  if (!booking) {
    throw new Error("予約が見つかりません");
  }
  return {
    stepTitle: booking.stepTitle,
    slotStart: booking.slotStart,
    hasNextScreen: false,
    consultationStarted: false,
  };
}

export function getStudentCopy(): StudentCopy {
  return {
    language: "ja",
    claimLabel: "これを受ける",
    emptyList: "いま、このグループの予約はありません。",
  };
}
