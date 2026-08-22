import type { StepGroupId } from "./types";

export type ElderlyDemoUser = {
  id: string;
  name: string;
  nameKana: string;
  initial: string;
  color: string;
  initialCompletedSteps: number;
  joinedAt: string;
  phone: string;
  area: string;
  nextGoal: string;
};

export type StudentDemoUser = {
  id: string;
  name: string;
  nameKana: string;
  initial: string;
  color: string;
  school: string;
  grade: string;
  teachingGroupIds: StepGroupId[];
};

export const ELDERLY_DEMO_USERS: ElderlyDemoUser[] = [
  {
    id: "sato",
    name: "佐藤 よし子",
    nameKana: "さとう よしこ",
    initial: "佐",
    color: "#e8bbb5",
    initialCompletedSteps: 18,
    joinedAt: "2026年4月12日",
    phone: "090-****-1284",
    area: "東京都 世田谷区",
    nextGoal: "LINEで写真を送る",
  },
  {
    id: "tanaka",
    name: "田中 一郎",
    nameKana: "たなか いちろう",
    initial: "田",
    color: "#bad5e6",
    initialCompletedSteps: 36,
    joinedAt: "2026年3月3日",
    phone: "080-****-5301",
    area: "東京都 杉並区",
    nextGoal: "地図で行き先を調べる",
  },
  {
    id: "suzuki",
    name: "鈴木 はる",
    nameKana: "すずき はる",
    initial: "鈴",
    color: "#b8cbb5",
    initialCompletedSteps: 9,
    joinedAt: "2026年6月21日",
    phone: "070-****-4168",
    area: "東京都 練馬区",
    nextGoal: "文字を大きくする",
  },
  {
    id: "yamada",
    name: "山田 正夫",
    nameKana: "やまだ まさお",
    initial: "山",
    color: "#f1ca68",
    initialCompletedSteps: 62,
    joinedAt: "2025年11月18日",
    phone: "090-****-9072",
    area: "東京都 中野区",
    nextGoal: "家族とビデオ通話をする",
  },
];

export const STUDENT_DEMO_USERS: StudentDemoUser[] = [
  {
    id: "aoki",
    name: "青木 颯太",
    nameKana: "あおき そうた",
    initial: "青",
    color: "#bad5e6",
    school: "東京未来大学",
    grade: "3年生",
    teachingGroupIds: ["1-30", "31-60"],
  },
  {
    id: "kobayashi",
    name: "小林 美咲",
    nameKana: "こばやし みさき",
    initial: "小",
    color: "#e8bbb5",
    school: "明星デジタル大学",
    grade: "2年生",
    teachingGroupIds: ["1-30", "31-60", "61-90"],
  },
  {
    id: "ito",
    name: "伊藤 悠真",
    nameKana: "いとう ゆうま",
    initial: "伊",
    color: "#b8cbb5",
    school: "東京工科大学",
    grade: "4年生",
    teachingGroupIds: ["31-60", "61-90"],
  },
];
