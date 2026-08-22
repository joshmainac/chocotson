import { listAllBoardRecords } from "./board";
import { getStepGroups } from "./catalog";

export type RatingCounts = {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
  unanswered: number;
};

export type StepOpenDataRow = {
  stepId: number;
  stepTitle: string;
  chatCount: number;
  ratings: RatingCounts;
};

export type OpenDataChecklistItem = {
  stepId: number;
  stepTitle: string;
};

export type OpenDataView = {
  hasChart: boolean;
  promptMessage: string | null;
  selectedStepIds: number[];
  rows: StepOpenDataRow[];
};

const PROMPT_MESSAGE = "比較する段差を選んでください";

function emptyRatingCounts(): RatingCounts {
  return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, unanswered: 0 };
}

function getAllSteps() {
  return getStepGroups().flatMap((group) => group.steps);
}

function getStepTitle(stepId: number): string {
  return getAllSteps().find((step) => step.id === stepId)?.title ?? `段差 ${stepId}`;
}

function aggregateStep(stepId: number, records: ReturnType<typeof listAllBoardRecords>) {
  const matching = records.filter((record) => record.stepId === stepId);
  const ratings = emptyRatingCounts();
  for (const record of matching) {
    if (record.stepRating == null) {
      ratings.unanswered += 1;
    } else {
      ratings[record.stepRating] += 1;
    }
  }
  return {
    stepId,
    stepTitle: matching[0]?.stepTitle ?? getStepTitle(stepId),
    chatCount: matching.length,
    ratings,
  };
}

export function getOpenDataChecklist(): OpenDataChecklistItem[] {
  return getAllSteps().map((step) => ({
    stepId: step.id,
    stepTitle: step.title,
  }));
}

export function getOpenDataView(selectedStepIds: number[]): OpenDataView {
  if (selectedStepIds.length === 0) {
    return {
      hasChart: false,
      promptMessage: PROMPT_MESSAGE,
      selectedStepIds: [],
      rows: [],
    };
  }

  let records: ReturnType<typeof listAllBoardRecords> = [];
  try {
    records = listAllBoardRecords();
  } catch {
    records = [];
  }

  return {
    hasChart: true,
    promptMessage: null,
    selectedStepIds: [...selectedStepIds],
    rows: selectedStepIds.map((stepId) => aggregateStep(stepId, records)),
  };
}
