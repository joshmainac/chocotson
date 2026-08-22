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

/** RED 用スキャフォールド。本体は後続コミットで埋める。 */
export function getChat(_bookingId: string): ChatView {
  throw new Error("not implemented");
}

/** RED 用スキャフォールド。本体は後続コミットで埋める。 */
export function sendMessage(
  _bookingId: string,
  _sender: ConsultationParty,
  _body: string,
): ChatMessage {
  throw new Error("not implemented");
}
