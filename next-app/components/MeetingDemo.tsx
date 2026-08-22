"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import {
  getBoardRecord,
  getBoardSnapshot,
  subscribeBoard,
} from "@/lib/chocotson/board";
import { endConsultation, startConsultation } from "@/lib/chocotson/consultation";

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

export default function MeetingDemo({ bookingId }: { bookingId: string }) {
  useSyncExternalStore(subscribeBoard, getBoardSnapshot, () => "[]");
  const booking = getBoardRecord(bookingId);

  if (!booking) {
    return <main className="meeting-room missing"><div className="meeting-room-card"><p className="elder-kicker">DEMO ROOM</p><h1>相談予定が見つかりません</h1><p>このURLを発行したブラウザで開いてください。</p></div></main>;
  }

  return (
    <main className="meeting-room">
      <div className="meeting-room-card">
        <div className="meeting-room-brand"><span>C</span><b>CHOCOTSON</b><em>DEMO MEETING</em></div>
        <p className="meeting-room-status">{booking.consultationStatus === "idle" ? "開始前" : booking.consultationStatus === "active" ? "相談中" : "終了しました"}</p>
        <h1>{booking.stepTitle}</h1>
        <p className="meeting-room-time">{formatSlot(booking.slotStart)}・{booking.durationMinutes}分</p>
        <div className="meeting-participants"><div><span>{booking.elderlyUserName?.slice(0, 1) ?? "高"}</span><b>{booking.elderlyUserName ?? "高齢者ユーザー"}</b></div><i>×</i><div><span>{booking.studentUserName?.slice(0, 1) ?? "学"}</span><b>{booking.studentUserName ?? "学生ユーザー"}</b></div></div>
        {booking.consultationStatus === "idle" ? <button type="button" onClick={() => startConsultation(booking.id, "student")}>デモ相談を始める</button> : null}
        {booking.consultationStatus === "active" ? <button type="button" onClick={() => endConsultation(booking.id, "student")}>相談を終了する</button> : null}
        {booking.consultationStatus === "ended" ? <Link href="/">高齢者マイページへ戻る</Link> : null}
        <small>映像や音声には接続しないデモルームです</small>
      </div>
    </main>
  );
}
