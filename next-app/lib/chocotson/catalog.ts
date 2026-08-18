import { STEPS_1_30, STEPS_31_60, STEPS_61_90 } from "./catalog-data";
import type { Step, StepGroup, StepGroupId } from "./types";

const GROUPS: StepGroup[] = [
  {
    id: "1-30",
    label: "1〜30　AIにたどり着くまで",
    steps: STEPS_1_30,
  },
  {
    id: "31-60",
    label: "31〜60　AIを使い始める",
    steps: STEPS_31_60,
  },
  {
    id: "61-90",
    label: "61〜90　AIを使ったあとのつまずき",
    steps: STEPS_61_90,
  },
];

export function getStepGroups(): StepGroup[] {
  return GROUPS;
}

export function getStepsInGroup(groupId: StepGroupId): Step[] {
  const group = GROUPS.find((item) => item.id === groupId);
  return group?.steps ?? [];
}
