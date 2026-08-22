import {
  ELDERLY_DEMO_USERS,
  STUDENT_DEMO_USERS,
} from "./demo-users";
import type { ElderlyDemoUser } from "./demo-users";

export const ELDERLY_USERS_KEY = "chocotson.elderly-users";
export const STUDENT_USERS_KEY = "chocotson.student-users";
export const ACTIVE_ELDERLY_USER_KEY = "chocotson.active-elderly-user";
export const ACTIVE_STUDENT_USER_KEY = "chocotson.active-student-user";
export const ELDERLY_PROGRESS_KEY = "chocotson.elderly-progress";
export const STUDENT_SETTINGS_KEY = "chocotson.student-settings";
export const LOCAL_DEMO_EVENT = "chocotson-local-demo-change";

type ProgressMap = Record<string, number[]>;

export type StudentItLevel = "beginner" | "intermediate" | "advanced";

export type StudentShift = {
  date: string;
  allDay: boolean;
  start: string;
  end: string;
};

export type StudentSettings = {
  itLevel: StudentItLevel;
  skills: string[];
  shifts: StudentShift[];
};

function canUseStorage() {
  try {
    return typeof localStorage !== "undefined";
  } catch {
    return false;
  }
}

export function initializeLocalDemoData() {
  if (!canUseStorage()) return;
  let changed = false;
  if (!localStorage.getItem(ELDERLY_USERS_KEY)) {
    localStorage.setItem(ELDERLY_USERS_KEY, JSON.stringify(ELDERLY_DEMO_USERS));
    changed = true;
  }
  if (!localStorage.getItem(STUDENT_USERS_KEY)) {
    localStorage.setItem(STUDENT_USERS_KEY, JSON.stringify(STUDENT_DEMO_USERS));
    changed = true;
  }
  if (!localStorage.getItem(ELDERLY_PROGRESS_KEY)) {
    const progress = Object.fromEntries(
      ELDERLY_DEMO_USERS.map((user) => [
        user.id,
        Array.from({ length: user.initialCompletedSteps }, (_, index) => index + 1),
      ]),
    );
    localStorage.setItem(ELDERLY_PROGRESS_KEY, JSON.stringify(progress));
    changed = true;
  }
  if (changed) window.dispatchEvent(new Event(LOCAL_DEMO_EVENT));
}

export function subscribeLocalDemo(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key?.startsWith("chocotson.") || event.key === null) listener();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(LOCAL_DEMO_EVENT, listener);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(LOCAL_DEMO_EVENT, listener);
  };
}

export function getLocalValue(key: string) {
  if (!canUseStorage()) return null;
  return localStorage.getItem(key);
}

export function setActiveDemoUser(key: string, userId: string | null) {
  if (!canUseStorage()) return;
  if (userId) localStorage.setItem(key, userId);
  else localStorage.removeItem(key);
  window.dispatchEvent(new Event(LOCAL_DEMO_EVENT));
}

export function getProgressSnapshot() {
  return getLocalValue(ELDERLY_PROGRESS_KEY) ?? "";
}

export function getElderlyUsersSnapshot() {
  return getLocalValue(ELDERLY_USERS_KEY) ?? "";
}

export function parseElderlyUsers(raw: string): ElderlyDemoUser[] {
  try {
    const rows = JSON.parse(raw) as Array<
      Partial<ElderlyDemoUser> & { completedSteps?: number }
    >;
    if (!Array.isArray(rows)) return ELDERLY_DEMO_USERS;
    return rows
      .filter((row) => typeof row.id === "string" && typeof row.name === "string")
      .map((row) => ({
        id: row.id as string,
        name: row.name as string,
        nameKana: row.nameKana ?? "",
        initial: row.initial ?? (row.name as string).slice(0, 1),
        color: row.color ?? "#f1ca68",
        initialCompletedSteps:
          row.initialCompletedSteps ?? row.completedSteps ?? 0,
        joinedAt: row.joinedAt ?? "未登録",
        phone: row.phone ?? "未登録",
        area: row.area ?? "未登録",
        nextGoal: row.nextGoal ?? "最初の段差を相談する",
      }));
  } catch {
    return ELDERLY_DEMO_USERS;
  }
}

export function createLocalElderlyUser(name: string): ElderlyDemoUser {
  if (!canUseStorage()) throw new Error("このブラウザでは保存できません");
  const trimmedName = name.trim();
  if (!trimmedName) throw new Error("お名前を入力してください");
  const users = parseElderlyUsers(
    localStorage.getItem(ELDERLY_USERS_KEY) ?? JSON.stringify(ELDERLY_DEMO_USERS),
  );
  const existing = users.find(
    (user) => user.name.replaceAll(" ", "") === trimmedName.replaceAll(" ", ""),
  );
  if (existing) {
    localStorage.setItem(ACTIVE_ELDERLY_USER_KEY, existing.id);
    window.dispatchEvent(new Event(LOCAL_DEMO_EVENT));
    return existing;
  }
  const user: ElderlyDemoUser = {
    id: `elder-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: trimmedName,
    nameKana: "",
    initial: trimmedName.slice(0, 1),
    color: "#f1ca68",
    initialCompletedSteps: 0,
    joinedAt: new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date()),
    phone: "未登録",
    area: "未登録",
    nextGoal: "最初の段差を相談する",
  };
  localStorage.setItem(ELDERLY_USERS_KEY, JSON.stringify([...users, user]));

  let progress: ProgressMap = {};
  try {
    progress = JSON.parse(localStorage.getItem(ELDERLY_PROGRESS_KEY) ?? "{}") as ProgressMap;
  } catch {
    progress = {};
  }
  progress[user.id] = [];
  localStorage.setItem(ELDERLY_PROGRESS_KEY, JSON.stringify(progress));
  localStorage.setItem(ACTIVE_ELDERLY_USER_KEY, user.id);
  window.dispatchEvent(new Event(LOCAL_DEMO_EVENT));
  return user;
}

export function parseCompletedStepIds(raw: string, userId: string): number[] {
  try {
    const parsed = JSON.parse(raw) as ProgressMap;
    return parsed[userId]?.filter(
      (stepId) => Number.isInteger(stepId) && stepId >= 1 && stepId <= 90,
    ) ?? [];
  } catch {
    return [];
  }
}

export function markCompletedStep(userId: string, stepId: number) {
  if (!canUseStorage()) return;
  let progress: ProgressMap = {};
  try {
    progress = JSON.parse(localStorage.getItem(ELDERLY_PROGRESS_KEY) ?? "{}") as ProgressMap;
  } catch {
    progress = {};
  }
  const current = new Set(progress[userId] ?? []);
  current.add(stepId);
  progress[userId] = [...current].sort((a, b) => a - b);
  localStorage.setItem(ELDERLY_PROGRESS_KEY, JSON.stringify(progress));
  window.dispatchEvent(new Event(LOCAL_DEMO_EVENT));
}

export function getStudentSettings(userId: string): StudentSettings {
  const fallback: StudentSettings = {
    itLevel: "intermediate",
    skills: ["スマホ基本操作", "LINE"],
    shifts: [],
  };
  if (!canUseStorage()) return fallback;
  try {
    const map = JSON.parse(
      localStorage.getItem(STUDENT_SETTINGS_KEY) ?? "{}",
    ) as Record<string, StudentSettings>;
    return map[userId] ?? fallback;
  } catch {
    return fallback;
  }
}

export function saveStudentSettings(userId: string, settings: StudentSettings) {
  if (!canUseStorage()) return;
  let map: Record<string, StudentSettings> = {};
  try {
    map = JSON.parse(
      localStorage.getItem(STUDENT_SETTINGS_KEY) ?? "{}",
    ) as Record<string, StudentSettings>;
  } catch {
    map = {};
  }
  localStorage.setItem(STUDENT_SETTINGS_KEY, JSON.stringify({ ...map, [userId]: settings }));
  window.dispatchEvent(new Event(LOCAL_DEMO_EVENT));
}
