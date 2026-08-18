import { publishConfirmedBooking } from "./board";
import type {
  BookingSession,
  Confirmation,
  Step,
  StepGroupId,
  TimeSlot,
} from "./types";

function baseSession(): BookingSession {
  return {
    phase: "landing",
    selectedGroupId: null,
    selectedStep: null,
    selectedSlot: null,
    requiresAccount: false,
    requiresExplanation: false,
  };
}

export function createBookingSession(): BookingSession {
  return baseSession();
}

export function goToGroups(session: BookingSession): BookingSession {
  return {
    ...session,
    phase: "groups",
  };
}

export function openGroup(
  session: BookingSession,
  groupId: StepGroupId,
): BookingSession {
  return {
    ...session,
    phase: "steps",
    selectedGroupId: groupId,
  };
}

export function selectStep(
  session: BookingSession,
  step: Step,
): BookingSession {
  return {
    ...session,
    selectedGroupId: step.groupId,
    selectedStep: step,
  };
}

export function goToSlots(session: BookingSession): BookingSession {
  return {
    ...session,
    phase: "slots",
  };
}

export function selectSlot(
  session: BookingSession,
  slot: TimeSlot,
): BookingSession {
  return {
    ...session,
    selectedSlot: slot,
  };
}

export function reselectGroup(
  session: BookingSession,
  groupId: StepGroupId,
): BookingSession {
  return {
    ...session,
    phase: "steps",
    selectedGroupId: groupId,
    selectedStep: null,
    selectedSlot: null,
  };
}

export function confirmBooking(session: BookingSession): Confirmation {
  if (!session.selectedStep || !session.selectedSlot) {
    throw new Error("step and slot are required to confirm");
  }
  publishConfirmedBooking({
    stepTitle: session.selectedStep.title,
    groupId: session.selectedStep.groupId,
    slotStart: session.selectedSlot.start,
    durationMinutes: session.selectedSlot.durationMinutes,
  });
  return {
    accepted: true,
    stepTitle: session.selectedStep.title,
    slotStart: session.selectedSlot.start,
    student: null,
    phase: "confirmed",
    hasNextScreen: false,
  };
}
