import {
  getBoardRecord,
  updateStepRatingOnBoard,
} from "./board";

export const STEP_FEEDBACK_QUESTION = "この段差について、どう思いましたか？";

export type StepRating = 1 | 2 | 3 | 4 | 5;

export type StepFeedbackView = {
  bookingId: string;
  stepId: number;
  stepTitle: string;
  question: string;
  rating: StepRating | null;
};

function requireRecord(bookingId: string) {
  const record = getBoardRecord(bookingId);
  if (!record) {
    throw new Error("予約が見つかりません");
  }
  if (record.stepId == null) {
    throw new Error("段差が見つかりません");
  }
  return record;
}

function toView(record: ReturnType<typeof requireRecord>): StepFeedbackView {
  return {
    bookingId: record.id,
    stepId: record.stepId as number,
    stepTitle: record.stepTitle,
    question: STEP_FEEDBACK_QUESTION,
    rating: record.stepRating,
  };
}

export function getStepFeedback(bookingId: string): StepFeedbackView {
  return toView(requireRecord(bookingId));
}

export function setStepFeedback(
  bookingId: string,
  rating: StepRating | null,
): StepFeedbackView {
  requireRecord(bookingId);
  const updated = updateStepRatingOnBoard(bookingId, rating);
  return toView(updated);
}

export function setStepFeedbackAsStudent(
  bookingId: string,
  _rating: StepRating | null,
): StepFeedbackView {
  requireRecord(bookingId);
  throw new Error("学生は感想を記録できません");
}
