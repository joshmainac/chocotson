import {
  confirmBooking,
  createBookingSession,
  goToGroups,
  goToSlots,
  openGroup,
  selectSlot,
  selectStep,
} from "@/lib/chocotson/booking";
import { getStepsInGroup } from "@/lib/chocotson/catalog";
import { getAvailableSlots } from "@/lib/chocotson/slots";
import type { StepGroupId } from "@/lib/chocotson/types";

/** テスト用。指定グループの段差を予約確定する。 */
export function seedElderlyBooking(groupId: StepGroupId, stepIndex = 4) {
  const step = getStepsInGroup(groupId)[stepIndex];
  if (!step) {
    throw new Error("missing catalog step");
  }
  let session = goToSlots(
    selectStep(openGroup(goToGroups(createBookingSession()), groupId), step),
  );
  const slot = getAvailableSlots(new Date())[0];
  session = selectSlot(session, slot);
  return { confirmation: confirmBooking(session), step, slot };
}
