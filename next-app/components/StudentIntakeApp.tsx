"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  getBoardRecord,
  listOpenBookings,
  listBookingsForStudent,
  subscribeBoard,
} from "@/lib/chocotson/board";
import { getStepGroups } from "@/lib/chocotson/catalog";
import { endConsultation, getConsultation, startConsultation } from "@/lib/chocotson/consultation";
import { STUDENT_DEMO_USERS } from "@/lib/chocotson/demo-users";
import {
  ACTIVE_STUDENT_USER_KEY,
  getLocalValue,
  getStudentSettings,
  initializeLocalDemoData,
  saveStudentSettings,
  setActiveDemoUser,
  subscribeLocalDemo,
} from "@/lib/chocotson/local-demo-store";
import type { StudentItLevel, StudentSettings } from "@/lib/chocotson/local-demo-store";
import {
  claimBooking,
  createStudentSession,
  getClaimReceipt,
  getStudentCopy,
  getVisibleBookings,
  goToBookingList,
  selectTeachingGroups,
} from "@/lib/chocotson/student";
import type { StepGroupId, StudentSession } from "@/lib/chocotson/types";
import BookingChat from "./BookingChat";

const GROUP_TONES: Record<StepGroupId, string> = {
  "1-30": "bg-[#f3e7de]",
  "31-60": "bg-[#dceaf3]",
  "61-90": "bg-[#e4efe4]",
};

function formatSlot(start: Date) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(start);
}

function toggleGroup(selected: StepGroupId[], groupId: StepGroupId): StepGroupId[] {
  return selected.includes(groupId)
    ? selected.filter((id) => id !== groupId)
    : [...selected, groupId];
}

const IT_LEVELS: Array<{ id: StudentItLevel; label: string; note: string }> = [
  { id: "beginner", label: "ベーシック", note: "基本操作を一緒に確認できる" },
  { id: "intermediate", label: "スタンダード", note: "アプリ設定やトラブルに対応" },
  { id: "advanced", label: "アドバンス", note: "幅広い相談や応用操作に対応" },
];

const SKILL_OPTIONS = ["スマホ基本操作", "LINE", "写真・動画", "地図・乗換", "ネット予約", "セキュリティ"];

function upcomingDates() {
  return Array.from({ length: 5 }, (_, offset) => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return {
      key: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).format(date),
      label: new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", month: "long", day: "numeric", weekday: "short" }).format(date),
    };
  });
}

export default function StudentIntakeApp() {
  const copy = getStudentCopy();
  const groups = getStepGroups();
  const [session, setSession] = useState<StudentSession>(() => createStudentSession());
  const [showDashboard, setShowDashboard] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [showIncoming, setShowIncoming] = useState(true);
  const [showAvailability, setShowAvailability] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [selectedBookingTimes, setSelectedBookingTimes] = useState<Record<string, string>>({});
  const [settings, setSettings] = useState<StudentSettings>(() => {
    const storedUserId = getLocalValue(ACTIVE_STUDENT_USER_KEY);
    return storedUserId
      ? getStudentSettings(storedUserId)
      : { itLevel: "intermediate", skills: ["スマホ基本操作", "LINE"], shifts: [] };
  });
  const [, setBoardTick] = useState(0);
  const activeUserId = useSyncExternalStore(
    subscribeLocalDemo,
    () => getLocalValue(ACTIVE_STUDENT_USER_KEY),
    () => null,
  );
  const currentUser =
    STUDENT_DEMO_USERS.find((user) => user.id === activeUserId) ?? null;

  useEffect(() => {
    initializeLocalDemoData();
    return subscribeBoard(() => setBoardTick((tick) => tick + 1));
  }, []);

  const bookings = session.phase === "list" || session.phase === "receipt"
    ? getVisibleBookings(session)
    : [];
  const receipt = session.phase === "receipt" ? getClaimReceipt(session) : null;
  const matchedBooking = session.claimedBookingId
    ? getBoardRecord(session.claimedBookingId)
    : null;
  const consultation = session.phase === "receipt" && session.claimedBookingId
    ? getConsultation(session.claimedBookingId)
    : null;

  if (!currentUser) {
    return (
      <div className="elder-login student-portal">
        <header className="elder-brandbar">
          <div className="elder-brand"><span>C</span> CHOCOTSON</div>
          <p>学生デモログイン</p>
        </header>
        <main className="elder-login-main">
          <p className="elder-kicker">STUDENT CREW</p>
          <h1>お名前を選んでください</h1>
          <p className="elder-login-help">担当する学生のお名前を押して始めます。</p>
          <div className="elder-user-grid student-user-grid">
            {STUDENT_DEMO_USERS.map((user) => (
              <button key={user.id} type="button" onClick={() => { setSettings(getStudentSettings(user.id)); setShowIncoming(true); setActiveDemoUser(ACTIVE_STUDENT_USER_KEY, user.id); }}>
                <span className="elder-avatar" style={{ backgroundColor: user.color }}>{user.initial}</span>
                <span className="elder-user-name">{user.name}</span>
                <span className="elder-user-kana">{user.nameKana}</span>
                <span className="elder-enter">この名前で入る <b>→</b></span>
              </button>
            ))}
          </div>
          <p className="elder-demo-note">※ デモ画面のため、パスワードは必要ありません</p>
        </main>
      </div>
    );
  }

  if (showDashboard) {
    const scheduledBookings = listBookingsForStudent(currentUser.id);
    const incomingBookings = listOpenBookings().filter((booking) => currentUser.teachingGroupIds.includes(booking.groupId)).slice(0, 2);
    const dates = upcomingDates();
    const levelLabel = IT_LEVELS.find((level) => level.id === settings.itLevel)?.label;
    return (
      <div className="elder-dashboard student-portal">
        <header className="elder-brandbar">
          <div className="elder-brand"><span>C</span> CHOCOTSON <small>STUDENT</small></div>
          <div className="elder-header-actions">
            <button type="button" className="student-request-badge" onClick={() => setShowIncoming(true)}>届いた依頼 <b>{Math.max(2, incomingBookings.length)}</b></button>
            <button type="button" aria-expanded={showProfile} onClick={() => setShowProfile((shown) => !shown)}>登録情報</button>
            <button type="button" onClick={() => setActiveDemoUser(ACTIVE_STUDENT_USER_KEY, null)}>名前を選び直す</button>
          </div>
        </header>
        {showProfile ? (
          <aside className="header-profile-panel" aria-label="登録情報">
            <dl>
              <div><dt>お名前</dt><dd>{currentUser.name}</dd></div>
              <div><dt>学校</dt><dd>{currentUser.school}</dd></div>
              <div><dt>学年</dt><dd>{currentUser.grade}</dd></div>
              <div><dt>対応できる段差</dt><dd>{currentUser.teachingGroupIds.join(" / ")}</dd></div>
              <div><dt>ITレベル</dt><dd>{levelLabel}</dd></div>
            </dl>
          </aside>
        ) : null}
        <main className="elder-dashboard-main">
          <section className="elder-welcome student-welcome">
            <div>
              <p className="elder-kicker">MY CHOCOTSON</p>
              <h1>{currentUser.name}さん、<br />こんにちは。</h1>
              <p>今日も小さな「わからない」を一緒に越えましょう。</p>
            </div>
            <button type="button" onClick={() => {
              setSession(selectTeachingGroups(createStudentSession(), currentUser.teachingGroupIds));
              setShowDashboard(false);
            }}>
              <span>＋</span><span><b>予約を探す</b><small>教えられる相談を確認</small></span><b>→</b>
            </button>
          </section>

          <section className="student-dashboard-grid">
            <article className="student-summary-card">
              <p className="elder-card-label">ACTIVITY</p>
              <strong>{scheduledBookings.length}</strong><span>件の予定</span>
              <p>マッチングした相談はこちらにまとまります。</p>
            </article>
            <article className="student-shift-summary">
              <p className="elder-card-label">YOUR AVAILABILITY</p>
              <h2>相談できる時間</h2>
              <p>{settings.shifts.length ? `${settings.shifts.length}日分を提出済み` : "まだシフトを提出していません"}</p>
              <button type="button" onClick={() => setShowAvailability(true)}>シフト・ITレベルを設定 →</button>
            </article>
          </section>

          {showAvailability ? (
            <section className="student-availability-editor" aria-labelledby="student-availability-title">
              <div className="student-editor-heading"><div><p className="elder-card-label">PROFILE & SHIFT</p><h2 id="student-availability-title">得意なことと相談できる時間</h2></div><button type="button" onClick={() => setShowAvailability(false)} aria-label="設定を閉じる">×</button></div>
              <div className="student-level-editor">
                <h3>あなたのITレベル</h3><p>背伸びせず、今の自分に近いものを選んでください。</p>
                <div>{IT_LEVELS.map((level) => <button type="button" key={level.id} aria-pressed={settings.itLevel === level.id} onClick={() => setSettings((current) => ({ ...current, itLevel: level.id }))}><b>{level.label}</b><span>{level.note}</span></button>)}</div>
              </div>
              <div className="student-skill-editor"><h3>対応できること</h3><div>{SKILL_OPTIONS.map((skill) => { const active = settings.skills.includes(skill); return <button key={skill} type="button" aria-pressed={active} onClick={() => setSettings((current) => ({ ...current, skills: active ? current.skills.filter((item) => item !== skill) : [...current.skills, skill] }))}>{active ? "✓ " : "＋ "}{skill}</button>; })}</div></div>
              <div className="student-shift-editor"><div><h3>相談できる日を提出</h3><p>「この日ならいつでも」も選べます。</p></div>{dates.map((date) => { const shift = settings.shifts.find((item) => item.date === date.key); const enabled = Boolean(shift); return <div className="student-shift-row" key={date.key}><label><input type="checkbox" checked={enabled} onChange={(event) => setSettings((current) => ({ ...current, shifts: event.target.checked ? [...current.shifts, { date: date.key, allDay: true, start: "09:00", end: "17:00" }] : current.shifts.filter((item) => item.date !== date.key) }))} /><b>{date.label}</b></label>{enabled ? <><button type="button" className={shift?.allDay ? "active" : ""} onClick={() => setSettings((current) => ({ ...current, shifts: current.shifts.map((item) => item.date === date.key ? { ...item, allDay: !item.allDay } : item) }))}>◎ この日ならいつでも</button>{!shift?.allDay ? <div className="shift-range"><input type="time" value={shift?.start} onChange={(event) => setSettings((current) => ({ ...current, shifts: current.shifts.map((item) => item.date === date.key ? { ...item, start: event.target.value } : item) }))} /><span>〜</span><input type="time" value={shift?.end} onChange={(event) => setSettings((current) => ({ ...current, shifts: current.shifts.map((item) => item.date === date.key ? { ...item, end: event.target.value } : item) }))} /></div> : null}</> : <span className="shift-off">お休み</span>}</div>; })}</div>
              <div className="student-settings-save"><button type="button" onClick={() => { saveStudentSettings(currentUser.id, settings); setSavedNotice(true); window.setTimeout(() => setSavedNotice(false), 2500); }}>この内容で提出する</button>{savedNotice ? <span role="status">✓ 保存しました</span> : null}</div>
            </section>
          ) : null}

          <section className="elder-meetings" aria-labelledby="student-meetings-title">
            <div className="elder-section-title">
              <div><p className="elder-card-label">SCHEDULE</p><h2 id="student-meetings-title">予定しているチョコットソン</h2></div>
              <span>{scheduledBookings.length}件</span>
            </div>
            {scheduledBookings.length === 0 ? (
              <p className="elder-empty">現在、予定されている相談はありません。「予約を探す」から受付できます。</p>
            ) : (
              <div className="meeting-list">
                {scheduledBookings.map((booking) => (
                  <article key={booking.id}>
                    <div className="meeting-date"><b>{formatSlot(booking.slotStart)}</b><span>{booking.durationMinutes}分</span></div>
                    <div className="meeting-detail"><b>{booking.stepTitle}</b><span>{booking.elderlyUserName ? `${booking.elderlyUserName}さんとの相談` : "高齢者との相談"}</span></div>
                    {booking.meetingUrl ? <a href={booking.meetingUrl}>相談URLを開く →</a> : null}
                  </article>
                ))}
              </div>
            )}
          </section>
        </main>
        {showIncoming ? (
          <div className="incoming-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowIncoming(false); }}>
            <section className="incoming-modal" role="dialog" aria-modal="true" aria-labelledby="incoming-title">
              <button className="incoming-close" type="button" onClick={() => setShowIncoming(false)} aria-label="閉じる">×</button>
              <p className="elder-card-label">NEW REQUESTS</p><h2 id="incoming-title">新しいご依頼が<br />2件届いています</h2><p className="incoming-lead">あなたの得意分野に近い相談です。</p>
              <div className="incoming-card-stack">{(incomingBookings.length ? incomingBookings : [
                { id: "demo-line", stepTitle: "LINEで写真を送りたい", elderlyUserName: "佐藤 よし子", availabilityLabel: "8月24日・10:00〜12:00の間", groupId: "1-30" as const },
                { id: "demo-map", stepTitle: "地図で行き先を調べたい", elderlyUserName: "田中 一郎", availabilityLabel: "8月25日・一日中OK", groupId: "31-60" as const },
              ]).slice(0, 2).map((booking, index) => <article key={booking.id} style={{ transform: `rotate(${index === 0 ? -1 : 1.5}deg)` }}><div><span>{index + 1}</span><small>{booking.groupId}段</small></div><h3>{booking.stepTitle}</h3><p>{booking.elderlyUserName ?? "利用者"}さん</p><b>◷ {booking.availabilityLabel ?? formatSlot("slotStart" in booking ? booking.slotStart : new Date())}</b></article>)}</div>
              <button type="button" className="incoming-primary" onClick={() => { setSession(goToBookingList(selectTeachingGroups(createStudentSession(), currentUser.teachingGroupIds))); setShowIncoming(false); setShowDashboard(false); }}>依頼を詳しく見る <span>→</span></button><button type="button" className="incoming-later" onClick={() => setShowIncoming(false)}>あとで見る</button>
            </section>
          </div>
        ) : null}
        <footer><span>チョコットソン 学生クルー</span><span>小さな段差を、いっしょに。</span></footer>
      </div>
    );
  }

  return (
    <div className="student-flow min-h-full bg-[#f6f3ee] text-[#2b2b2b]">
      <header className="elder-brandbar">
        <div className="elder-brand"><span>C</span> CHOCOTSON <small>STUDENT</small></div>
        <button type="button" onClick={() => setShowDashboard(true)}>マイページへ戻る</button>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-10 sm:px-10">
        {session.phase === "groups" && (
          <section className="flex flex-1 flex-col gap-8">
            <header className="space-y-3 text-center">
              <p className="text-xs tracking-[0.28em] text-[#8a847c]">CHOCOTSON</p>
              <h1 className="text-2xl font-medium sm:text-3xl">教えられる段差を選んでください</h1>
              <p className="text-sm text-[#6f6a63]">複数選んでも大丈夫です。選んだあと、予約一覧へ進みます。</p>
            </header>
            <div className="grid gap-4 sm:grid-cols-3">
              {groups.map((group) => {
                const selected = session.teachingGroupIds.includes(group.id);
                return (
                  <button key={group.id} type="button" aria-pressed={selected} onClick={() => {
                    setListError(null);
                    setSession((current) => selectTeachingGroups(current, toggleGroup(current.teachingGroupIds, group.id)));
                  }} className={`rounded-2xl border px-5 py-6 text-left transition ${selected ? "border-[#2b2b2b] shadow-sm" : "border-transparent hover:border-[#d8d2c8]"} ${GROUP_TONES[group.id]}`}>
                    <p className="text-sm font-medium leading-relaxed">{group.label}</p>
                  </button>
                );
              })}
            </div>
            {listError ? <p className="text-center text-sm text-[#9a4d4d]">{listError}</p> : null}
            <div className="flex justify-center pt-2"><button type="button" onClick={() => {
              try { setListError(null); setSession(goToBookingList(session)); }
              catch (error) { setListError(error instanceof Error ? error.message : "グループを選んでください"); }
            }} className="rounded-full bg-[#2b2b2b] px-8 py-3 text-sm text-white">予約一覧を見る</button></div>
          </section>
        )}

        {session.phase === "list" && (
          <section className="flex flex-1 flex-col gap-8">
            <header className="space-y-3 text-center"><p className="text-xs tracking-[0.28em] text-[#8a847c]">MATCHING</p><h1 className="text-2xl font-medium sm:text-3xl">予約一覧</h1><p className="text-sm text-[#6f6a63]">受けたい予約を1つ選んでください。</p></header>
            {bookings.length === 0 ? <p className="text-center text-sm text-[#6f6a63]">{copy.emptyList}</p> : (
              <ul className="mx-auto flex w-full max-w-2xl flex-col gap-4">{bookings.map((booking) => (
                <li key={booking.id} className="rounded-2xl border border-[#e4dfd6] bg-white px-6 py-5"><div className="flex flex-col gap-4"><div className="space-y-1"><p className="text-base font-medium">{booking.stepTitle}</p><p className="text-sm text-[#6f6a63]">{booking.elderlyUserName ? `${booking.elderlyUserName}さん・` : ""}{booking.availabilityLabel ?? `${formatSlot(booking.slotStart)}（${booking.durationMinutes}分）`}</p></div>{booking.candidateSlotStarts && booking.candidateSlotStarts.length > 1 ? <label className="student-time-choice"><span>相談する時間を選ぶ</span><select value={selectedBookingTimes[booking.id] ?? booking.candidateSlotStarts[0].toISOString()} onChange={(event) => setSelectedBookingTimes((current) => ({ ...current, [booking.id]: event.target.value }))}>{booking.candidateSlotStarts.map((start) => <option key={start.toISOString()} value={start.toISOString()}>{formatSlot(start)}</option>)}</select></label> : null}<button type="button" onClick={() => setSession(claimBooking(session, booking.id, { id: currentUser.id, name: currentUser.name }, selectedBookingTimes[booking.id] ? new Date(selectedBookingTimes[booking.id]) : booking.candidateSlotStarts?.[0]))} className="self-end rounded-full bg-[#2b2b2b] px-6 py-2.5 text-sm text-white">{copy.claimLabel}</button></div></li>
              ))}</ul>
            )}
            <div className="flex justify-center"><button type="button" onClick={() => setSession((current) => ({ ...current, phase: "groups" }))} className="text-sm text-[#6f6a63] underline">グループを選び直す</button></div>
          </section>
        )}

        {session.phase === "receipt" && receipt && (
          <section className="flex flex-1 flex-col items-center justify-center gap-7 py-12 text-center">
            <header className="space-y-3"><p className="text-xs tracking-[0.28em] text-[#8a847c]">MATCHED</p><h1 className="text-2xl font-medium sm:text-3xl">マッチングしました</h1><p className="text-sm text-[#6f6a63]">両方のマイページに予定と相談URLを追加しました。</p></header>
            <div className="w-full max-w-lg rounded-2xl border border-[#e4dfd6] bg-white px-8 py-8 text-left"><p className="text-xs tracking-[0.2em] text-[#8a847c]">相談内容</p><p className="mt-2 text-lg font-medium">{receipt.stepTitle}</p><p className="mt-6 text-xs tracking-[0.2em] text-[#8a847c]">日時</p><p className="mt-2 text-base">{formatSlot(receipt.slotStart)}</p>{matchedBooking?.meetingUrl ? <><p className="mt-6 text-xs tracking-[0.2em] text-[#8a847c]">デモ相談URL</p><a className="meeting-url" href={matchedBooking.meetingUrl}>{matchedBooking.meetingUrl}</a></> : null}</div>
            {consultation?.status === "idle" && matchedBooking?.meetingUrl ? <a href={matchedBooking.meetingUrl} className="rounded-full bg-[#2b2b2b] px-8 py-3 text-sm text-white">相談URLを開く</a> : null}
            {consultation?.status === "active" ? <><p className="text-sm text-[#6f6a63]">相談中です。短い時間だけで大丈夫です。</p><button type="button" onClick={() => session.claimedBookingId && endConsultation(session.claimedBookingId, "student")} className="rounded-full bg-[#2b2b2b] px-8 py-3 text-sm text-white">終わりました</button></> : null}
            {consultation?.status === "ended" ? <p className="text-sm text-[#6f6a63]">相談が終わりました</p> : null}
            {consultation?.status === "idle" && session.claimedBookingId ? <button type="button" onClick={() => session.claimedBookingId && startConsultation(session.claimedBookingId, "student")} className="text-sm text-[#6f6a63] underline">この画面から相談を開始する</button> : null}
            {session.claimedBookingId ? (
              <BookingChat bookingId={session.claimedBookingId} party="student" />
            ) : null}
          </section>
        )}
      </main>
    </div>
  );
}
