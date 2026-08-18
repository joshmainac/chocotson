import {
  createStudentSession,
  getStudentCopy,
  goToBookingList,
  selectTeachingGroups,
} from "@/lib/chocotson/student";
import type { StepGroupId } from "@/lib/chocotson/types";

const GROUP_IDS: StepGroupId[] = ["1-30", "31-60", "61-90"];

describe("Phase 2 student intake", () => {
  it("アカウントなしで学生向けの入口から始められる", () => {
    const session = createStudentSession();
    expect(session.requiresAccount).toBe(false);
    expect(session.phase).toBe("groups");
  });

  it("教えられるグループとして 1-30 / 31-60 / 61-90 を一つ以上選べる", () => {
    const session = selectTeachingGroups(createStudentSession(), [
      "1-30",
      "31-60",
    ]);
    expect(session.teachingGroupIds).toEqual(["1-30", "31-60"]);
    expect(GROUP_IDS).toEqual(expect.arrayContaining(session.teachingGroupIds));
  });

  it("グループを選ぶまでは予約一覧に進まない", () => {
    const session = createStudentSession();
    expect(session.phase).toBe("groups");
    expect(session.teachingGroupIds).toHaveLength(0);
    expect(() => goToBookingList(session)).toThrow(/group|グループ/);
  });

  it("学生向けの案内は日本語で急かさず責めない", () => {
    const copy = getStudentCopy();
    expect(copy.language).toBe("ja");
    expect(copy.claimLabel).toMatch(/これを受ける/);
    const blob = `${copy.claimLabel}${copy.emptyList}`;
    expect(blob).toMatch(/[\u3040-\u30ff\u4e00-\u9faf]/);
    expect(blob).not.toMatch(/急いで|急げ|ダメ|失敗|できない人/);
  });

  it("ログインや報酬の案内で今回の終わりを越えない", () => {
    const copy = getStudentCopy();
    const blob = `${copy.claimLabel}${copy.emptyList}`;
    expect(blob).not.toMatch(/ログイン|会員登録|報酬|500円/);
  });
});
