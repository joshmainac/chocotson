"use client";

import { useState } from "react";
import { getStepGroups } from "@/lib/chocotson/catalog";
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

export default function StudentIntakeApp() {
  const copy = getStudentCopy();
  const groups = getStepGroups();
  const [session, setSession] = useState<StudentSession>(() => createStudentSession());
  const [listError, setListError] = useState<string | null>(null);

  const bookings = session.phase === "list" || session.phase === "receipt"
    ? getVisibleBookings(session)
    : [];

  const receipt =
    session.phase === "receipt" ? getClaimReceipt(session) : null;

  return (
    <div className="min-h-full bg-[#f6f3ee] text-[#2b2b2b]">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-10 sm:px-10">
        {session.phase === "groups" && (
          <section className="flex flex-1 flex-col gap-8">
            <header className="space-y-3 text-center">
              <p className="text-xs tracking-[0.28em] text-[#8a847c]">CHOCOTSON</p>
              <h1 className="text-2xl font-medium sm:text-3xl">
                教えられる段差を選んでください
              </h1>
              <p className="text-sm text-[#6f6a63]">
                複数選んでも大丈夫です。選んだあと、予約一覧へ進みます。
              </p>
            </header>

            <div className="grid gap-4 sm:grid-cols-3">
              {groups.map((group) => {
                const selected = session.teachingGroupIds.includes(group.id);
                return (
                  <button
                    key={group.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      setListError(null);
                      setSession((current) =>
                        selectTeachingGroups(
                          current,
                          toggleGroup(current.teachingGroupIds, group.id),
                        ),
                      );
                    }}
                    className={`rounded-2xl border px-5 py-6 text-left transition ${
                      selected
                        ? "border-[#2b2b2b] shadow-sm"
                        : "border-transparent hover:border-[#d8d2c8]"
                    } ${GROUP_TONES[group.id]}`}
                  >
                    <p className="text-sm font-medium leading-relaxed">{group.label}</p>
                  </button>
                );
              })}
            </div>

            {listError ? (
              <p className="text-center text-sm text-[#9a4d4d]">{listError}</p>
            ) : null}

            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => {
                  try {
                    setListError(null);
                    setSession((current) => goToBookingList(current));
                  } catch (error) {
                    setListError(
                      error instanceof Error ? error.message : "グループを選んでください",
                    );
                  }
                }}
                className="rounded-full bg-[#2b2b2b] px-8 py-3 text-sm text-white transition hover:bg-[#444]"
              >
                予約一覧を見る
              </button>
            </div>
          </section>
        )}

        {session.phase === "list" && (
          <section className="flex flex-1 flex-col gap-8">
            <header className="space-y-3 text-center">
              <p className="text-xs tracking-[0.28em] text-[#8a847c]">CHOCOTSON</p>
              <h1 className="text-2xl font-medium sm:text-3xl">予約一覧</h1>
              <p className="text-sm text-[#6f6a63]">
                受けたい予約を1つ選んでください。
              </p>
            </header>

            {bookings.length === 0 ? (
              <p className="text-center text-sm text-[#6f6a63]">{copy.emptyList}</p>
            ) : (
              <ul className="mx-auto flex w-full max-w-2xl flex-col gap-4">
                {bookings.map((booking) => (
                  <li
                    key={booking.id}
                    className={`rounded-2xl border border-[#e4dfd6] bg-white px-6 py-5 ${
                      booking.taken ? "opacity-60" : ""
                    }`}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-1">
                        <p className="text-base font-medium">{booking.stepTitle}</p>
                        <p className="text-sm text-[#6f6a63]">
                          {formatSlot(booking.slotStart)}（{booking.durationMinutes}分）
                        </p>
                        {booking.taken ? (
                          <p className="text-xs text-[#8a847c]">受け済み</p>
                        ) : null}
                      </div>
                      {!booking.taken ? (
                        <button
                          type="button"
                          onClick={() =>
                            setSession((current) => claimBooking(current, booking.id))
                          }
                          className="rounded-full bg-[#2b2b2b] px-6 py-2.5 text-sm text-white transition hover:bg-[#444]"
                        >
                          {copy.claimLabel}
                        </button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex justify-center">
              <button
                type="button"
                onClick={() =>
                  setSession((current) => ({
                    ...selectTeachingGroups(current, []),
                    phase: "groups",
                  }))
                }
                className="text-sm text-[#6f6a63] underline-offset-4 hover:underline"
              >
                グループを選び直す
              </button>
            </div>
          </section>
        )}

        {session.phase === "receipt" && receipt && (
          <section className="flex flex-1 flex-col items-center justify-center gap-8 py-16 text-center">
            <header className="space-y-3">
              <p className="text-xs tracking-[0.28em] text-[#8a847c]">CHOCOTSON</p>
              <h1 className="text-2xl font-medium sm:text-3xl">受付が完了しました</h1>
            </header>

            <div className="w-full max-w-md rounded-2xl border border-[#e4dfd6] bg-white px-8 py-8 text-left">
              <p className="text-xs tracking-[0.2em] text-[#8a847c]">段差</p>
              <p className="mt-2 text-lg font-medium">{receipt.stepTitle}</p>
              <p className="mt-6 text-xs tracking-[0.2em] text-[#8a847c]">日時</p>
              <p className="mt-2 text-base">{formatSlot(receipt.slotStart)}</p>
            </div>

            <p className="max-w-md text-sm leading-relaxed text-[#6f6a63]">
              この画面で終了です。あとは予約の時間までお待ちください。
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
