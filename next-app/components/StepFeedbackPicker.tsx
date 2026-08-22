"use client";

import { useState } from "react";
import {
  STEP_FEEDBACK_QUESTION,
  getStepFeedback,
  setStepFeedback,
  type StepRating,
} from "@/lib/chocotson/step-feedback";

const RATING_OPTIONS: Array<{ value: StepRating | null; label: string }> = [
  { value: 1, label: "とてもつまずいた" },
  { value: 2, label: "つまずいた" },
  { value: 3, label: "どちらとも言えない" },
  { value: 4, label: "できた" },
  { value: 5, label: "とてもできた" },
  { value: null, label: "未回答" },
];

type StepFeedbackPickerProps = {
  bookingId: string;
};

export default function StepFeedbackPicker({ bookingId }: StepFeedbackPickerProps) {
  const [feedback, setFeedback] = useState(() => getStepFeedback(bookingId));

  function handleSelect(rating: StepRating | null) {
    const next = setStepFeedback(bookingId, rating);
    setFeedback(next);
  }

  return (
    <div className="mb-8 w-full max-w-xl text-left">
      <p className="text-xs tracking-[0.2em] text-[#8a847c]">段差の感想</p>
      <p className="mt-2 text-base font-medium">{feedback.stepTitle}</p>
      <p className="mt-2 text-sm text-[#5c574f]">{STEP_FEEDBACK_QUESTION}</p>
      <div
        className="mt-4 flex flex-col gap-2"
        role="radiogroup"
        aria-label={STEP_FEEDBACK_QUESTION}
      >
        {RATING_OPTIONS.map((option) => {
          const selected = feedback.rating === option.value;
          return (
            <button
              key={option.label}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => handleSelect(option.value)}
              className={`rounded-md border px-4 py-3 text-left text-base transition ${
                selected
                  ? "border-[#2b2b2b] bg-[#2b2b2b] text-white"
                  : "border-[#d9d3c9] bg-white text-[#2b2b2b] hover:border-[#8a847c]"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
