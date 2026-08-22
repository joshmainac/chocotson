"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  getBoardRecord,
  listBookingsForElderly,
  subscribeBoard,
} from "@/lib/chocotson/board";
import {
  confirmBooking,
  createBookingSession,
  goToGroups,
  goToSlots,
  openGroup,
  reselectGroup,
  selectSlot,
  selectStep,
} from "@/lib/chocotson/booking";
import { getStepGroups, getStepsInGroup } from "@/lib/chocotson/catalog";
import {
  endConsultation,
  startConsultation,
} from "@/lib/chocotson/consultation";
import { getConsultationDurationMinutes, getLandingCopy } from "@/lib/chocotson/copy";
import { getAvailableSlots } from "@/lib/chocotson/slots";
import { ELDERLY_DEMO_USERS } from "@/lib/chocotson/demo-users";
import {
  ACTIVE_ELDERLY_USER_KEY,
  createLocalElderlyUser,
  getElderlyUsersSnapshot,
  getLocalValue,
  getProgressSnapshot,
  initializeLocalDemoData,
  parseCompletedStepIds,
  parseElderlyUsers,
  setActiveDemoUser,
  subscribeLocalDemo,
} from "@/lib/chocotson/local-demo-store";
import type {
  BookingAvailability,
  BookingSession,
  Confirmation,
  Step,
  StepGroupId,
  TimeSlot,
} from "@/lib/chocotson/types";
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

function tokyoDayKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function groupSlotsByDay(slots: TimeSlot[]) {
  const grouped = new Map<string, TimeSlot[]>();
  for (const slot of slots) {
    const key = tokyoDayKey(slot.start);
    grouped.set(key, [...(grouped.get(key) ?? []), slot]);
  }
  return [...grouped.entries()];
}

function getStepDescription(title: string) {
  if (/LINE|メッセージ|写真.*送|ビデオ通話/.test(title)) {
    return `${title}ときの、基本の操作と安心して使うコツを学びます。`;
  }
  if (/写真|動画|カメラ/.test(title)) {
    return `${title}ための手順を、画面を見ながらゆっくり確認します。`;
  }
  if (/地図|乗換|道順|行き先/.test(title)) {
    return `${title}ときに迷わないよう、検索から確認までを練習します。`;
  }
  if (/予約|買い物|支払|決済/.test(title)) {
    return `${title}ときの流れと、間違えないための確認ポイントを学びます。`;
  }
  if (/詐欺|安全|パスワード|セキュリティ/.test(title)) {
    return `${title}ために、見分け方と安全な操作を一緒に確認します。`;
  }
  return `${title}ための基本操作を、実際の画面に沿って分かりやすく学びます。`;
}

export default function ElderlyBookingApp() {
  const copy = getLandingCopy();
  const groups = getStepGroups();
  const duration = getConsultationDurationMinutes();
  const [session, setSession] = useState<BookingSession>(() =>
    createBookingSession(),
  );
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [showAllSteps, setShowAllSteps] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showNameEntry, setShowNameEntry] = useState(false);
  const [enteredName, setEnteredName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [availabilityMode, setAvailabilityMode] = useState<BookingAvailability["mode"]>("specific");
  const [selectedSlotKeys, setSelectedSlotKeys] = useState<string[]>([]);
  const [selectedDay, setSelectedDay] = useState("");
  const [rangeStart, setRangeStart] = useState("09:00");
  const [rangeEnd, setRangeEnd] = useState("17:00");
  const [availabilityLabel, setAvailabilityLabel] = useState("");
  const [slotError, setSlotError] = useState<string | null>(null);
  const [guideStep, setGuideStep] = useState<Step | null>(null);
  const activeUserId = useSyncExternalStore(
    subscribeLocalDemo,
    () => getLocalValue(ACTIVE_ELDERLY_USER_KEY),
    () => null,
  );
  const progressSnapshot = useSyncExternalStore(
    subscribeLocalDemo,
    getProgressSnapshot,
    () => "",
  );
  const elderlyUsersSnapshot = useSyncExternalStore(
    subscribeLocalDemo,
    getElderlyUsersSnapshot,
    () => "",
  );
  const elderlyUsers = useMemo(
    () => parseElderlyUsers(elderlyUsersSnapshot),
    [elderlyUsersSnapshot],
  );
  const currentUser = elderlyUsers.find((user) => user.id === activeUserId) ?? null;
  const completedStepIds = useMemo(
    () => parseCompletedStepIds(progressSnapshot, activeUserId ?? ""),
    [activeUserId, progressSnapshot],
  );
  const [, setBoardTick] = useState(0);
  const slots = useMemo(() => getAvailableSlots(new Date()), []);
  const slotsByDay = useMemo(() => groupSlotsByDay(slots), [slots]);
  const activeDay = selectedDay || slotsByDay[0]?.[0] || "";
  const activeDaySlots = slotsByDay.find(([day]) => day === activeDay)?.[1] ?? [];

  const steps = session.selectedGroupId
    ? getStepsInGroup(session.selectedGroupId)
    : [];

  useEffect(() => {
    initializeLocalDemoData();
    return subscribeBoard(() => setBoardTick((tick) => tick + 1));
  }, []);

  const boardRecord = confirmation
    ? getBoardRecord(confirmation.bookingId)
    : undefined;

  if (!currentUser) {
    return (
      <div className="elder-login">
        <header className="elder-brandbar">
          <div className="elder-brand"><span>C</span> CHOCOTSON</div>
          <p>はじめ方メニュー</p>
        </header>
        <main className="elder-login-main">
          <p className="elder-kicker">WELCOME</p>
          <h1>チョコットソンを始める</h1>
          <p className="elder-login-help">ご本人のお名前で始めるか、デモ画面を選べます。</p>

          <section className="elder-own-name">
            {!showNameEntry ? (
              <button type="button" onClick={() => setShowNameEntry(true)}>
                <span className="elder-own-name-icon">名</span>
                <span><b>自分のお名前で始める</b><small>お名前だけでマイページを作れます</small></span>
                <b>→</b>
              </button>
            ) : (
              <form onSubmit={(event) => {
                event.preventDefault();
                try {
                  setNameError(null);
                  createLocalElderlyUser(enteredName);
                } catch (error) {
                  setNameError(error instanceof Error ? error.message : "お名前を確認してください");
                }
              }}>
                <label htmlFor="elder-name">あなたのお名前</label>
                <div><input id="elder-name" value={enteredName} onChange={(event) => setEnteredName(event.target.value)} placeholder="例：佐藤 よし子" autoComplete="name" autoFocus /><button type="submit">この名前で始める →</button></div>
                {nameError ? <p role="alert">{nameError}</p> : null}
              </form>
            )}
          </section>

          <div className="elder-demo-divider"><span>または</span></div>
          <div className="elder-demo-heading"><b>デモ画面を試す</b><span>サンプルのお名前を選んでください</span></div>
          <div className="elder-user-grid">
            {ELDERLY_DEMO_USERS.map((user) => (
              <button key={user.id} type="button" onClick={() => setActiveDemoUser(ACTIVE_ELDERLY_USER_KEY, user.id)}>
                <span className="elder-avatar" style={{ backgroundColor: user.color }}>
                  {user.initial}
                </span>
                <span className="elder-user-name">{user.name}</span>
                <span className="elder-user-kana">{user.nameKana}</span>
                <span className="elder-enter">デモを開く <b>→</b></span>
              </button>
            ))}
          </div>
          <p className="elder-demo-note">※ デモ利用者の情報はサンプルです</p>
        </main>
      </div>
    );
  }

  if (session.phase === "landing" && !confirmation) {
    const completed = completedStepIds.length;
    const progress = Math.round((completed / 90) * 100);
    const scheduledBookings = listBookingsForElderly(currentUser.id);
    const allSteps = groups.flatMap((group) => group.steps);
    return (
      <div className="elder-dashboard">
        <header className="elder-brandbar">
          <div className="elder-brand"><span>C</span> CHOCOTSON</div>
          <div className="elder-header-actions">
            <button type="button" aria-expanded={showProfile} onClick={() => setShowProfile((shown) => !shown)}>登録情報</button>
            <button type="button" onClick={() => setActiveDemoUser(ACTIVE_ELDERLY_USER_KEY, null)}>名前を選び直す</button>
          </div>
        </header>
        {showProfile ? (
          <aside className="header-profile-panel" aria-label="登録情報">
            <dl>
              <div><dt>お名前</dt><dd>{currentUser.name}</dd></div>
              <div><dt>お住まい</dt><dd>{currentUser.area}</dd></div>
              <div><dt>電話番号</dt><dd>{currentUser.phone}</dd></div>
              <div><dt>利用開始日</dt><dd>{currentUser.joinedAt}</dd></div>
            </dl>
          </aside>
        ) : null}
        <main className="elder-dashboard-main">
          <section className="elder-welcome">
            <div>
              <p className="elder-kicker">MY CHOCOTSON</p>
              <h1>{currentUser.name}さん、<br />こんにちは。</h1>
              <p>今日もちょこっと、一緒に進めましょう。</p>
            </div>
            <button type="button" onClick={() => setSession((current) => goToGroups(current))}>
              <span>＋</span><span><b>新しく相談する</b><small>{copy.durationMinutesLabel}でひとつ解決</small></span><b>→</b>
            </button>
          </section>

          <section className="elder-meetings" aria-labelledby="elder-meetings-title">
            <div className="elder-section-title">
              <div>
                <p className="elder-card-label">SCHEDULE</p>
                <h2 id="elder-meetings-title">予定しているチョコットソン</h2>
              </div>
              <span>{scheduledBookings.length}件</span>
            </div>
            {scheduledBookings.length === 0 ? (
              <p className="elder-empty">現在、予定されている相談はありません。</p>
            ) : (
              <div className="meeting-list">
                {scheduledBookings.map((booking) => (
                  <article key={booking.id}>
                    <div className="meeting-date"><b>{formatSlot(booking.slotStart)}</b><span>{booking.durationMinutes}分</span></div>
                    <div className="meeting-detail"><b>{booking.stepTitle}</b><span>{booking.studentUserName ? `${booking.studentUserName}さんとマッチング済み` : "学生の受付を待っています"}</span></div>
                    {booking.meetingUrl ? <a href={booking.meetingUrl}>相談URLを開く →</a> : <span className="meeting-waiting">URL発行待ち</span>}
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="elder-steps-section" aria-labelledby="elder-steps-title">
            <div className="elder-section-title">
              <div><p className="elder-card-label">90 STEPS</p><h2 id="elder-steps-title">90段の受講状況</h2></div>
              <button type="button" onClick={() => setShowAllSteps((shown) => !shown)}>{showAllSteps ? "閉じる" : "90段を見る"}</button>
            </div>
            <p className="elder-steps-help">相談が終わった段差には、自動で完了マークが付きます。</p>
            {showAllSteps ? (
              <div className="elder-step-groups">
                {groups.map((group) => (
                  <div key={group.id}>
                    <h3>{group.label}</h3>
                    <ul>
                      {group.steps.map((step) => {
                        const checked = completedStepIds.includes(step.id);
                        return <li key={step.id} className={checked ? "completed" : ""}><div><span className="step-checkmark">✓</span><div className="step-theme-copy"><span><small>{String(step.id).padStart(2, "0")}</small>{step.title}</span><p>{getStepDescription(step.title)}</p><button type="button" onClick={() => setGuideStep(step)}>講義ガイドへ <b>→</b></button></div></div></li>;
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <div className="elder-steps-summary">{allSteps.slice(0, 6).map((step) => <span key={step.id} className={completedStepIds.includes(step.id) ? "done" : ""}>{completedStepIds.includes(step.id) ? "✓" : step.id}</span>)}<b>… 残り84項目</b></div>
            )}
          </section>

          <section className="elder-dashboard-grid" aria-label="進捗と登録情報">
            <article className="elder-progress-card">
              <p className="elder-card-label">これまでの進み具合</p>
              <div className="elder-progress-heading">
                <div><strong>{completed}</strong><span> / 90 段</span></div>
                <em>{progress}%</em>
              </div>
              <div className="elder-progress-track" aria-label={`全90段のうち${completed}段完了`}>
                <span style={{ width: `${progress}%` }} />
              </div>
              <p className="elder-progress-message">{completed < 30 ? "最初の30段を、一歩ずつ進んでいます。" : completed < 60 ? "できることが、着実に増えています。" : "ゴールまであと少しです。"}</p>
              <div className="elder-next-goal">
                <span>次の目標</span><b>{currentUser.nextGoal}</b>
              </div>
            </article>

          </section>
        </main>
        {guideStep ? (
          <div className="lecture-guide-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setGuideStep(null); }}>
            <section className="lecture-guide-modal" role="dialog" aria-modal="true" aria-labelledby="lecture-guide-title">
              <button type="button" className="lecture-guide-close" aria-label="講義ガイドを閉じる" onClick={() => setGuideStep(null)}>×</button>
              <p className="elder-card-label">LESSON GUIDE / {String(guideStep.id).padStart(2, "0")}</p>
              <h2 id="lecture-guide-title">{guideStep.title}</h2>
              <p className="lecture-guide-description">{getStepDescription(guideStep.title)}</p>
              <div className="lecture-guide-goal"><span>この講義のゴール</span><b>自分のスマートフォンで、一度操作をやってみる</b></div>
              <ol>
                <li><span>1</span><div><b>困っているところを確認</b><p>うまく説明できなくても大丈夫。画面を一緒に見ます。</p></div></li>
                <li><span>2</span><div><b>学生と一緒に操作</b><p>ひとつずつ、ゆっくり実際の操作を試します。</p></div></li>
                <li><span>3</span><div><b>もう一度やってみる</b><p>最後にご自身で操作して、覚え方を確認します。</p></div></li>
              </ol>
              <div className="lecture-guide-actions"><button type="button" onClick={() => { const next = goToSlots(selectStep(openGroup(goToGroups(createBookingSession()), guideStep.groupId), guideStep)); setSession(next); setGuideStep(null); }}>このテーマを相談する <span>→</span></button><small>相談時間の目安：15分</small></div>
            </section>
          </div>
        ) : null}
        <footer><span>チョコットソン</span><span>小さな段差を、いっしょに。</span></footer>
      </div>
    );
  }

  return (
    <div className="elder-booking-flow min-h-full bg-[#f6f3ee] text-[#2b2b2b]">
      <header className="elder-brandbar">
        <div className="elder-brand"><span>C</span> CHOCOTSON</div>
        <button type="button" onClick={() => {
          setSession(createBookingSession());
          setConfirmation(null);
          setSelectedSlotKeys([]);
          setAvailabilityLabel("");
        }}>マイページへ戻る</button>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-10 sm:px-10">
        {session.phase === "groups" && !confirmation ? (
          <section className="flex flex-col gap-10">
            <header className="space-y-3 text-center">
              <p className="text-xs tracking-[0.28em] text-[#8a847c]">
                TODAY&apos;S LITTLE TROUBLE
              </p>
              <h1 className="text-3xl font-semibold sm:text-4xl">
                今日は、どれを聞きますか？
              </h1>
              <p className="text-lg text-[#5c574f]">{copy.oneAtATime}</p>
            </header>
            <div className="grid gap-6 md:grid-cols-3">
              {groups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  className={`min-h-64 rounded-sm p-8 text-left ${GROUP_TONES[group.id]}`}
                  onClick={() =>
                    setSession((current) => openGroup(current, group.id))
                  }
                >
                  <p className="font-serif text-4xl">{group.id.split("-")[0]}</p>
                  <h2 className="mt-8 text-2xl leading-snug">{group.label}</h2>
                  <p className="mt-16 border-t border-black/20 pt-4 text-sm">
                    このなかから選ぶ →
                  </p>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {session.phase === "steps" && !confirmation ? (
          <section className="flex flex-col gap-8">
            <button
              type="button"
              className="self-start text-sm text-[#5c574f]"
              onClick={() => setSession((current) => goToGroups(current))}
            >
              ← グループに戻る
            </button>
            <header className="space-y-2">
              <h1 className="text-3xl font-semibold">どれが近いですか？</h1>
              <p className="text-[#5c574f]">
                うまく説明できなくても、大丈夫です。近いものを一つ選んでください。
              </p>
            </header>
            <ul className="grid gap-4 sm:grid-cols-2">
              {steps.map((step) => (
                <li key={step.id}>
                  <button
                    type="button"
                    className="flex h-full w-full flex-col justify-between rounded-sm bg-white p-6 text-left shadow-sm"
                    onClick={() =>
                      setSession((current) =>
                        goToSlots(selectStep(current, step)),
                      )
                    }
                  >
                    <span className="flex items-center justify-between gap-3 text-xs text-[#8a847c]">
                      <span>{String(step.id).padStart(2, "0")}</span>
                      {completedStepIds.includes(step.id) ? (
                        <span className="step-complete-badge">✓ 完了</span>
                      ) : null}
                    </span>
                    <span className="mt-4 text-xl leading-snug">{step.title}</span>
                    <span className="mt-6 border-t border-black/10 pt-3 text-sm">
                      これを相談する →
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {session.phase === "slots" && !confirmation ? (
          <section className="elder-availability flex flex-col gap-8">
            <button
              type="button"
              className="self-start text-sm text-[#5c574f]"
              onClick={() =>
                setSession((current) =>
                  current.selectedGroupId
                    ? reselectGroup(current, current.selectedGroupId)
                    : goToGroups(current),
                )
              }
            >
              ← 別の段差を選ぶ
            </button>
            <header className="space-y-2">
              <p className="text-xs tracking-[0.28em] text-[#8a847c]">
                ONE QUESTION / {duration} MINUTES
              </p>
              <h1 className="text-3xl font-semibold">相談しやすい時間を教えてください</h1>
              <p className="text-lg text-[#5c574f]">
                「{session.selectedStep?.title}」について、{copy.durationMinutesLabel}
                の候補をいくつ選んでも大丈夫です。
              </p>
            </header>
            <div className="availability-mode-tabs" role="group" aria-label="時間の選び方">
              {([
                ["specific", "時間を複数選ぶ", "○をいくつでも"],
                ["range", "時間帯で選ぶ", "学生が時間を決めます"],
                ["all-day", "一日中OK", "9:00〜17:00"],
              ] as const).map(([mode, title, note]) => (
                <button key={mode} type="button" aria-pressed={availabilityMode === mode} onClick={() => { setAvailabilityMode(mode); setSlotError(null); }}>
                  <b>{mode === "all-day" ? "◎ " : ""}{title}</b><small>{note}</small>
                </button>
              ))}
            </div>

            <div className="availability-picker">
              <h2>日にちを選ぶ</h2>
              <div className="availability-days">
                {slotsByDay.map(([day, daySlots]) => (
                  <button key={day} type="button" aria-pressed={activeDay === day} onClick={() => setSelectedDay(day)}>
                    <b>{new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric" }).format(daySlots[0].start)}</b>
                    <span>{new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", weekday: "short" }).format(daySlots[0].start)}</span>
                    {selectedSlotKeys.some((key) => key.startsWith(day)) ? <em>選択あり</em> : null}
                  </button>
                ))}
              </div>

              {availabilityMode === "specific" ? (
                <div className="specific-time-panel">
                  <div className="picker-heading"><h2>空いている時間をすべて選ぶ</h2><span>{selectedSlotKeys.length}個 選択中</span></div>
                  <div className="availability-times">
                    {activeDaySlots.map((slot) => {
                      const key = `${activeDay}:${slot.start.toISOString()}`;
                      const selected = selectedSlotKeys.includes(key);
                      return <button key={key} type="button" aria-pressed={selected} onClick={() => setSelectedSlotKeys((current) => selected ? current.filter((item) => item !== key) : [...current, key])}>
                        {selected ? "✓ " : ""}{new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit" }).format(slot.start)}
                      </button>;
                    })}
                  </div>
                </div>
              ) : availabilityMode === "range" ? (
                <div className="range-time-panel">
                  <div><span>この日の</span><select aria-label="開始時間" value={rangeStart} onChange={(event) => setRangeStart(event.target.value)}>{[9,10,11,12,13,14,15,16].map((hour) => <option key={hour} value={`${String(hour).padStart(2, "0")}:00`}>{hour}:00</option>)}</select><span>から</span><select aria-label="終了時間" value={rangeEnd} onChange={(event) => setRangeEnd(event.target.value)}>{[10,11,12,13,14,15,16,17].map((hour) => <option key={hour} value={`${String(hour).padStart(2, "0")}:00`}>{hour}:00</option>)}</select><span>までOK</span></div>
                  <p>この範囲の中から、学生が相談開始時間を決められます。</p>
                </div>
              ) : (
                <div className="all-day-panel"><span>◎</span><div><b>この日は一日中いつでもOK</b><p>9:00〜17:00の間で学生が時間を決められます。</p></div></div>
              )}
            </div>
            {slotError ? <p className="availability-error" role="alert">{slotError}</p> : null}
            <div className="availability-submit"><button type="button" onClick={() => {
              let candidates: TimeSlot[] = [];
              let label = "";
              if (availabilityMode === "specific") {
                candidates = slots.filter((slot) => selectedSlotKeys.some((key) => key.endsWith(slot.start.toISOString())));
                label = `${candidates.length}つの候補時間`;
              } else if (availabilityMode === "all-day") {
                candidates = activeDaySlots;
                label = `${formatSlot(activeDaySlots[0]?.start).replace(/\s.+$/, "")}・一日中OK`;
              } else {
                const startMinutes = Number(rangeStart.slice(0, 2)) * 60;
                const endMinutes = Number(rangeEnd.slice(0, 2)) * 60;
                candidates = activeDaySlots.filter((slot) => {
                  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(slot.start);
                  const minutes = Number(parts.find((part) => part.type === "hour")?.value) * 60 + Number(parts.find((part) => part.type === "minute")?.value);
                  return minutes >= startMinutes && minutes < endMinutes;
                });
                label = `${formatSlot(activeDaySlots[0]?.start).replace(/\s.+$/, "")}・${rangeStart}〜${rangeEnd}の間`;
              }
              if (!candidates.length) { setSlotError("相談できる時間を1つ以上選んでください"); return; }
              const next = selectSlot(session, candidates[0]);
              setSession(next);
              setAvailabilityLabel(label);
              setConfirmation(confirmBooking(next, { id: currentUser.id, name: currentUser.name }, { mode: availabilityMode, label, candidateSlotStarts: candidates.map((slot) => slot.start) }));
            }}>この候補で依頼を送る <span>→</span></button><p>学生が受けるまで、日時は確定しません。</p></div>
          </section>
        ) : null}

        {confirmation ? (
          <section className="flex flex-1 flex-col items-center gap-6 py-16 text-center">
            <p className="text-xs tracking-[0.28em] text-[#8a847c]">
              {copy.durationMinutesLabel.toUpperCase()}
            </p>
            <h1 className="text-4xl font-semibold">予約を受け付けました</h1>
            <p className="max-w-xl text-lg leading-8 text-[#5c574f]">
              {confirmation.stepTitle}
              <br />
              {availabilityLabel || formatSlot(confirmation.slotStart)}
            </p>
            <p className="text-[#5c574f]">
              一度にひとつ。短い時間だけで大丈夫です。
            </p>
            {boardRecord && !boardRecord.claimed ? (
              <p className="max-w-md text-base text-[#5c574f]">
                学生が受けたら、ここから相談を始められます。
              </p>
            ) : null}
            {boardRecord?.claimed && boardRecord.consultationStatus === "idle" ? (
              <>
                {boardRecord.meetingUrl ? <a href={boardRecord.meetingUrl} className="meeting-url">発行された相談URLを開く →</a> : null}
                <button
                  type="button"
                  className="mt-2 inline-flex items-center rounded-md bg-[#2b2b2b] px-8 py-4 text-lg text-white shadow-[4px_4px_0_0_#c4a35a]"
                  onClick={() => startConsultation(confirmation.bookingId, "elderly")}
                >
                  相談を始める
                </button>
              </>
            ) : null}
            {boardRecord?.consultationStatus === "active" ? (
              <>
                <p className="text-lg text-[#5c574f]">相談中です</p>
                <button
                  type="button"
                  className="mt-2 inline-flex items-center rounded-md bg-[#2b2b2b] px-8 py-4 text-lg text-white shadow-[4px_4px_0_0_#c4a35a]"
                  onClick={() => endConsultation(confirmation.bookingId, "elderly")}
                >
                  終わりました
                </button>
              </>
            ) : null}
            {boardRecord?.consultationStatus === "ended" ? (
              <p className="text-lg text-[#5c574f]">相談が終わりました</p>
            ) : null}
            {boardRecord ? (
              <BookingChat bookingId={confirmation.bookingId} party="elderly" />
            ) : null}
          </section>
        ) : null}
      </main>
      <footer className="mt-auto flex items-center justify-between bg-[#2b2b2b] px-6 py-4 text-sm text-white sm:px-10">
        <span>チョコットソン</span>
        <span>小さな段差を、いっしょに。</span>
      </footer>
    </div>
  );
}
