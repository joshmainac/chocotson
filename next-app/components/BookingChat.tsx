"use client";

import { useState } from "react";
import { getChat, sendMessage } from "@/lib/chocotson/chat";
import type { ConsultationParty } from "@/lib/chocotson/types";
import StepFeedbackPicker from "./StepFeedbackPicker";

type BookingChatProps = {
  bookingId: string;
  party: ConsultationParty;
};

export default function BookingChat({ bookingId, party }: BookingChatProps) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const chat = getChat(bookingId);

  function handleSend() {
    try {
      setError(null);
      sendMessage(bookingId, party, draft);
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "送れませんでした");
    }
  }

  return (
    <div className="mt-10 w-full max-w-xl text-left">
      {party === "elderly" ? (
        <StepFeedbackPicker bookingId={bookingId} />
      ) : null}
      <p className="text-xs tracking-[0.2em] text-[#8a847c]">やりとり</p>
      <p className="mt-1 text-sm text-[#6f6a63]">{chat.stepTitle}</p>
      <div className="mt-3 h-px w-full bg-[#e4dfd6]" />

      <ul className="mt-6 flex flex-col gap-3">
        {chat.messages.length === 0 ? (
          <li className="text-sm text-[#8a847c]">まだメッセージはありません</li>
        ) : (
          chat.messages.map((message) => (
            <li
              key={message.id}
              className={`rounded-xl px-4 py-3 text-base leading-relaxed ${
                message.sender === party
                  ? "ml-8 bg-[#2b2b2b] text-white"
                  : "mr-8 bg-white text-[#2b2b2b]"
              }`}
            >
              <p className="mb-1 text-xs opacity-70">
                {message.sender === "elderly" ? "高齢者" : "学生"}
              </p>
              <p>{message.body}</p>
            </li>
          ))
        )}
      </ul>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleSend();
            }
          }}
          placeholder="メッセージを書く"
          className="min-h-12 flex-1 rounded-md border border-[#d9d3c9] bg-white px-4 text-base outline-none focus:border-[#2b2b2b]"
        />
        <button
          type="button"
          onClick={handleSend}
          className="rounded-md bg-[#2b2b2b] px-6 py-3 text-base text-white"
        >
          送る
        </button>
      </div>
      {error ? <p className="mt-2 text-sm text-[#a33]">{error}</p> : null}
    </div>
  );
}
