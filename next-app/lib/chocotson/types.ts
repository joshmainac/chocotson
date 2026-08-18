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
  bookingId: string;
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

export type IncomingBooking = {
  id: string;
  stepTitle: string;
  groupId: StepGroupId;
  slotStart: Date;
  durationMinutes: number;
  taken: boolean;
};

export type StudentPhase = "groups" | "list" | "receipt";

export type StudentSession = {
  phase: StudentPhase;
  teachingGroupIds: StepGroupId[];
  claimedBookingId: string | null;
  requiresAccount: boolean;
};

export type ClaimReceipt = {
  stepTitle: string;
  slotStart: Date;
  hasNextScreen: boolean;
  consultationStarted: boolean;
};

export type StudentCopy = {
  language: "ja";
  claimLabel: string;
  emptyList: string;
};

export type ConsultationParty = "elderly" | "student";

export type ConsultationStatus = "idle" | "active" | "ended";

export type ConsultationView = {
  status: ConsultationStatus;
  startedBy: ConsultationParty | null;
  endedBy: ConsultationParty | null;
  hasMedia: false;
  hasNextScreen: false;
  stepTitle: string;
  slotStart: Date;
};
