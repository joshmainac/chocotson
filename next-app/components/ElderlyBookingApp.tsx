"use client";

import { useMemo, useState } from "react";
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
import { getConsultationDurationMinutes, getLandingCopy } from "@/lib/chocotson/copy";
import { getAvailableSlots } from "@/lib/chocotson/slots";
import type {
  BookingSession,
  Confirmation,
  StepGroupId,
  TimeSlot,
} from "@/lib/chocotson/types";

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

export default function ElderlyBookingApp() {
  const copy = getLandingCopy();
  const groups = getStepGroups();
  const duration = getConsultationDurationMinutes();
  const [session, setSession] = useState<BookingSession>(() =>
    createBookingSession(),
  );
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const slots = useMemo(() => getAvailableSlots(new Date()), []);
  const slotsByDay = useMemo(() => groupSlotsByDay(slots), [slots]);

  const steps = session.selectedGroupId
    ? getStepsInGroup(session.selectedGroupId)
    : [];

  return (
    <div className="min-h-full bg-[#f6f3ee] text-[#2b2b2b]">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-10 sm:px-10">
        {session.phase === "landing" && !confirmation ? (
          <section className="flex flex-1 flex-col items-center justify-center gap-8 py-16 text-center">
            <p className="text-xs tracking-[0.28em] text-[#8a847c]">
              ONE QUESTION / {duration} MINUTES
            </p>
            <h1 className="max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">
              話すことは、ひとつだけ。
            </h1>
            <p className="max-w-xl text-lg leading-8 text-[#5c574f]">
              {copy.notFamily}
              <br />
              {copy.oneAtATime}
            </p>
            <p className="text-base text-[#5c574f]">{copy.shortTime}</p>
            <button
              type="button"
              className="mt-4 inline-flex items-center gap-4 rounded-md bg-[#2b2b2b] px-8 py-4 text-lg text-white shadow-[4px_4px_0_0_#c4a35a]"
              onClick={() => setSession((current) => goToGroups(current))}
            >
              困っていることを選ぶ
              <span aria-hidden="true">→</span>
            </button>
          </section>
        ) : null}

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
                    <span className="text-xs text-[#8a847c]">
                      {String(step.id).padStart(2, "0")}
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
          <section className="flex flex-col gap-8">
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
              <h1 className="text-3xl font-semibold">話すことは、ひとつだけ。</h1>
              <p className="text-lg text-[#5c574f]">
                「{session.selectedStep?.title}」について、{copy.durationMinutesLabel}
                の空き時間を選んでください。
              </p>
            </header>
            <div className="flex flex-col gap-8">
              {slotsByDay.map(([day, daySlots]) => (
                <div key={day} className="space-y-3">
                  <h2 className="text-lg font-medium">
                    {formatSlot(daySlots[0].start).replace(/\s.+$/, "")}
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {daySlots.map((slot) => (
                      <button
                        key={slot.start.toISOString()}
                        type="button"
                        className="rounded-md bg-white px-4 py-3 text-base shadow-sm"
                        onClick={() => {
                          const next = selectSlot(session, slot);
                          setSession(next);
                          setConfirmation(confirmBooking(next));
                        }}
                      >
                        {new Intl.DateTimeFormat("ja-JP", {
                          timeZone: "Asia/Tokyo",
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(slot.start)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {confirmation ? (
          <section className="flex flex-1 flex-col items-center justify-center gap-6 py-20 text-center">
            <p className="text-xs tracking-[0.28em] text-[#8a847c]">
              {copy.durationMinutesLabel.toUpperCase()}
            </p>
            <h1 className="text-4xl font-semibold">予約を受け付けました</h1>
            <p className="max-w-xl text-lg leading-8 text-[#5c574f]">
              {confirmation.stepTitle}
              <br />
              {formatSlot(confirmation.slotStart)}
            </p>
            <p className="text-[#5c574f]">
              一度にひとつ。短い時間だけで大丈夫です。
            </p>
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
