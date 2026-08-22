import {
  appendMessageOnBoard,
  getBoardRecord,
} from "./board";
import type { ConsultationParty } from "./types";

export type ChatMessage = {
  id: string;
  bookingId: string;
  sender: ConsultationParty;
  body: string;
};

export type ChatView = {
  bookingId: string;
  stepTitle: string;
  messages: ChatMessage[];
  hasMedia: false;
  requiresAccount: false;
  hasNextScreen: false;
};

function requireRecord(bookingId: string) {
  const record = getBoardRecord(bookingId);
  if (!record) {
    throw new Error("予約が見つかりません");
  }
  return record;
}

function newMessageId(): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `msg-${random}`;
}

export function getChat(bookingId: string): ChatView {
  const record = requireRecord(bookingId);
  return {
    bookingId: record.id,
    stepTitle: record.stepTitle,
    messages: [...record.messages],
    hasMedia: false,
    requiresAccount: false,
    hasNextScreen: false,
  };
}

export function sendMessage(
  bookingId: string,
  sender: ConsultationParty,
  body: string,
): ChatMessage {
  const record = requireRecord(bookingId);
  const trimmed = body.trim();
  if (trimmed.length === 0) {
    throw new Error("空の本文は送れません");
  }
  if (sender === "student" && !record.claimed) {
    throw new Error("まだ受けていない予約です");
  }
  const message: ChatMessage = {
    id: newMessageId(),
    bookingId: record.id,
    sender,
    body: trimmed,
  };
  appendMessageOnBoard(bookingId, message);
  return message;
}
