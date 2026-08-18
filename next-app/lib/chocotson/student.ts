import { claimOnBoard, getBoardRecord, listOpenBookings } from "./board";
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
  return listOpenBookings().filter((booking) =>
    session.teachingGroupIds.includes(booking.groupId),
  );
}

export function claimBooking(
  session: StudentSession,
  bookingId: string,
): StudentSession {
  const booking = getVisibleBookings(session).find((item) => item.id === bookingId);
  if (booking) {
    claimOnBoard(bookingId);
    return {
      ...session,
      phase: "receipt",
      claimedBookingId: bookingId,
    };
  }
  const existing = getBoardRecord(bookingId);
  if (existing?.claimed) {
    return {
      ...session,
      phase: "receipt",
      claimedBookingId: bookingId,
    };
  }
  throw new Error("予約が見つかりません");
}

export function getClaimReceipt(session: StudentSession): ClaimReceipt {
  if (!session.claimedBookingId) {
    throw new Error("受けた予約がありません");
  }
  const booking = getBoardRecord(session.claimedBookingId);
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
