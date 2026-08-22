"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import BookingChat from "@/components/BookingChat";
import {
  getBoardRecord,
  getBoardSnapshot,
  subscribeBoard,
} from "@/lib/chocotson/board";
import {
  endConsultation,
  startConsultation,
} from "@/lib/chocotson/consultation";
import {
  ACTIVE_ELDERLY_USER_KEY,
  ACTIVE_STUDENT_USER_KEY,
  getLocalValue,
  subscribeLocalDemo,
} from "@/lib/chocotson/local-demo-store";
import {
  getMeetingRoomView,
  resolveMeetingRoomParty,
} from "@/lib/chocotson/meeting-room";
import type { ConsultationParty } from "@/lib/chocotson/types";

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

function chatParty(party: ReturnType<typeof resolveMeetingRoomParty>): ConsultationParty {
  return party === "elderly" ? "elderly" : "student";
}

function consultationParty(
  party: ReturnType<typeof resolveMeetingRoomParty>,
): ConsultationParty {
  return party === "elderly" ? "elderly" : "student";
}

export default function MeetingDemo({ bookingId }: { bookingId: string }) {
  useSyncExternalStore(subscribeBoard, getBoardSnapshot, () => "[]");
  const activeElderlyUserId = useSyncExternalStore(
    subscribeLocalDemo,
    () => getLocalValue(ACTIVE_ELDERLY_USER_KEY),
    () => null,
  );
  const activeStudentUserId = useSyncExternalStore(
    subscribeLocalDemo,
    () => getLocalValue(ACTIVE_STUDENT_USER_KEY),
    () => null,
  );

  const party = resolveMeetingRoomParty(
    bookingId,
    activeElderlyUserId,
    activeStudentUserId,
  );
  const view = getMeetingRoomView(bookingId, party);
  const booking = getBoardRecord(bookingId);

  if (!view.found || !booking) {
    return (
      <main className="min-h-screen bg-[#f6f3ee] px-6 py-16 text-[#2b2b2b]">
        <div className="mx-auto max-w-xl rounded-md border border-[#d9d3c9] bg-white px-8 py-12 text-center">
          <p className="text-xs tracking-[0.28em] text-[#8a847c]">MEETING</p>
          <h1 className="mt-4 text-2xl font-semibold">相談予定が見つかりません</h1>
          <p className="mt-4 text-[#5c574f]">{view.promptMessage}</p>
        </div>
      </main>
    );
  }

  const statusLabel =
    booking.consultationStatus === "idle"
      ? "開始前"
      : booking.consultationStatus === "active"
        ? "相談中"
        : "終了しました";

  return (
    <div className="elder-booking-flow min-h-screen bg-[#f6f3ee] text-[#2b2b2b]">
      <header className="elder-brandbar">
        <div className="elder-brand">
          <span>C</span> CHOCOTSON
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center px-6 py-10 sm:px-10">
        <section className="flex w-full flex-col items-center gap-6 text-center">
          <p className="text-xs tracking-[0.28em] text-[#8a847c]">{statusLabel}</p>
          <h1 className="max-w-xl text-3xl font-semibold sm:text-4xl">
            {booking.stepTitle}
          </h1>
          <p className="text-lg text-[#5c574f]">
            {formatSlot(booking.slotStart)}・{booking.durationMinutes}分
          </p>
          {!booking.claimed ? (
            <p className="max-w-md text-base text-[#5c574f]">
              学生が受けたら、ここから相談を始められます。
            </p>
          ) : null}
          {view.canStartConsultation ? (
            <button
              type="button"
              className="inline-flex items-center rounded-md bg-[#2b2b2b] px-8 py-4 text-lg text-white shadow-[4px_4px_0_0_#c4a35a]"
              onClick={() =>
                startConsultation(bookingId, consultationParty(party))
              }
            >
              相談を始める
            </button>
          ) : null}
          {view.canEndConsultation ? (
            <>
              <p className="text-lg text-[#5c574f]">相談中です</p>
              <button
                type="button"
                className="inline-flex items-center rounded-md bg-[#2b2b2b] px-8 py-4 text-lg text-white shadow-[4px_4px_0_0_#c4a35a]"
                onClick={() =>
                  endConsultation(bookingId, consultationParty(party))
                }
              >
                終わりました
              </button>
            </>
          ) : null}
          {booking.consultationStatus === "ended" ? (
            <p className="text-lg text-[#5c574f]">相談が終わりました</p>
          ) : null}
          {view.homePath ? (
            <Link
              href={view.homePath}
              className="text-base text-[#2b2b2b] underline"
            >
              {party === "student" ? "学生マイページへ戻る" : "高齢者マイページへ戻る"}
            </Link>
          ) : null}
          {view.showChat ? (
            <BookingChat
              bookingId={bookingId}
              party={chatParty(party)}
              canSendChat={view.canSendChat}
            />
          ) : null}
        </section>
      </main>
      <footer className="mt-auto flex items-center justify-between bg-[#2b2b2b] px-6 py-4 text-sm text-white sm:px-10">
        <span>チョコットソン</span>
        <span>小さな段差を、いっしょに。</span>
      </footer>
    </div>
  );
}
