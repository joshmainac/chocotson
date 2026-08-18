export type StepGroupId = "1-30" | "31-60" | "61-90";

export type Step = {
  id: number;
  title: string;
  groupId: StepGroupId;
};

export type StepGroup = {
  id: StepGroupId;
  label: string;
  steps: Step[];
};

export type TimeSlot = {
  start: Date;
  durationMinutes: number;
};

export type BookingPhase =
  | "landing"
  | "groups"
  | "steps"
  | "slots"
  | "confirmed";

export type BookingSession = {
  phase: BookingPhase;
  selectedGroupId: StepGroupId | null;
  selectedStep: Step | null;
  selectedSlot: TimeSlot | null;
  requiresAccount: boolean;
  requiresExplanation: boolean;
};

export type Confirmation = {
  accepted: boolean;
  stepTitle: string;
  slotStart: Date;
  student: string | null;
  phase: "confirmed";
  hasNextScreen: boolean;
};

export type LandingCopy = {
  language: "ja";
  oneAtATime: string;
  shortTime: string;
  notFamily: string;
  durationMinutesLabel: string;
};
