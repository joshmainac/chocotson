import {
  ELDERLY_PROGRESS_KEY,
  ELDERLY_USERS_KEY,
  createLocalElderlyUser,
  getElderlyUsersSnapshot,
  getProgressSnapshot,
  markCompletedStep,
  parseCompletedStepIds,
  parseElderlyUsers,
} from "@/lib/chocotson/local-demo-store";

describe("local elderly progress", () => {
  const values = new Map<string, string>();

  beforeEach(() => {
    values.clear();
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
      },
    });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { dispatchEvent: jest.fn() },
    });
    localStorage.setItem(ELDERLY_PROGRESS_KEY, JSON.stringify({ sato: [1] }));
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, "localStorage");
    Reflect.deleteProperty(globalThis, "window");
  });

  it("相談終了による完了記録は同じ段差へ一度だけ付く", () => {
    markCompletedStep("sato", 20);
    markCompletedStep("sato", 20);

    expect(parseCompletedStepIds(getProgressSnapshot(), "sato")).toEqual([
      1,
      20,
    ]);
  });

  it("別の高齢者の達成状況には影響しない", () => {
    markCompletedStep("tanaka", 31);

    expect(parseCompletedStepIds(getProgressSnapshot(), "sato")).toEqual([1]);
    expect(parseCompletedStepIds(getProgressSnapshot(), "tanaka")).toEqual([
      31,
    ]);
  });

  it("自分の名前だけで利用者を作成し、同じ名前なら以前の利用者へ戻る", () => {
    localStorage.setItem(ELDERLY_USERS_KEY, "[]");
    const created = createLocalElderlyUser("高橋 みどり");
    const loggedInAgain = createLocalElderlyUser("高橋みどり");
    const users = parseElderlyUsers(getElderlyUsersSnapshot());

    expect(created.name).toBe("高橋 みどり");
    expect(loggedInAgain.id).toBe(created.id);
    expect(users).toHaveLength(1);
    expect(parseCompletedStepIds(getProgressSnapshot(), created.id)).toEqual([]);
  });
});
