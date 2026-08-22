"use client";

import { useMemo, useState } from "react";
import {
  getOpenDataChecklist,
  getOpenDataView,
  type RatingCounts,
} from "@/lib/chocotson/opendata";

const RATING_LABELS: Array<{ key: keyof RatingCounts; label: string }> = [
  { key: 1, label: "とてもつまずいた" },
  { key: 2, label: "つまずいた" },
  { key: 3, label: "どちらとも言えない" },
  { key: 4, label: "できた" },
  { key: 5, label: "とてもできた" },
  { key: "unanswered", label: "未回答" },
];

function RatingBars({ ratings, chatCount }: { ratings: RatingCounts; chatCount: number }) {
  const max = Math.max(chatCount, 1);
  return (
    <div className="mt-4 flex flex-col gap-2">
      {RATING_LABELS.map(({ key, label }) => {
        const count = ratings[key];
        const width = `${Math.round((count / max) * 100)}%`;
        return (
          <div key={key} className="grid grid-cols-[8rem_1fr_2rem] items-center gap-3 text-sm">
            <span className="text-[#5c574f]">{label}</span>
            <div className="h-3 rounded-full bg-[#ece7de]">
              <div
                className="h-3 rounded-full bg-[#2b2b2b]"
                style={{ width: count > 0 ? width : "0%" }}
              />
            </div>
            <span className="text-right tabular-nums">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function OpenDataPage() {
  const checklist = useMemo(() => getOpenDataChecklist(), []);
  const [selectedStepIds, setSelectedStepIds] = useState<number[]>(() =>
    getOpenDataChecklist().map((item) => item.stepId),
  );
  const view = useMemo(
    () => getOpenDataView(selectedStepIds),
    [selectedStepIds],
  );

  function toggleStep(stepId: number) {
    setSelectedStepIds((current) =>
      current.includes(stepId)
        ? current.filter((id) => id !== stepId)
        : [...current, stepId].sort((a, b) => a - b),
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f3ee] text-[#2b2b2b]">
      <header className="border-b border-[#e4dfd6] bg-white px-6 py-5 sm:px-10">
        <p className="text-xs tracking-[0.28em] text-[#8a847c]">OPEN DATA</p>
        <h1 className="mt-2 text-3xl font-semibold">段差オープンデータ</h1>
        <p className="mt-2 max-w-2xl text-[#5c574f]">
          高齢者の段差感想を集計しています。はじめは全90段を表示します。比較したい段差だけに絞る場合はチェックを外してください。
        </p>
      </header>

      <main className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[18rem_1fr] sm:px-10">
        <section aria-label="段差を選ぶ">
          <h2 className="text-lg font-semibold">段差を選ぶ</h2>
          <p className="mt-1 text-sm text-[#6f6a63]">
            {selectedStepIds.length}件 選択中
          </p>
          <div className="mt-4 max-h-[28rem] overflow-y-auto rounded-md border border-[#d9d3c9] bg-white">
            <ul className="divide-y divide-[#ece7de]">
              {checklist.map((item) => {
                const checked = selectedStepIds.includes(item.stepId);
                return (
                  <li key={item.stepId}>
                    <label className="flex cursor-pointer items-start gap-3 px-4 py-3 text-sm hover:bg-[#faf8f4]">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleStep(item.stepId)}
                        className="mt-1"
                      />
                      <span>
                        <span className="mr-2 text-[#8a847c]">
                          {String(item.stepId).padStart(2, "0")}
                        </span>
                        {item.stepTitle}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section aria-label="集計結果">
          {!view.hasChart ? (
            <div className="rounded-md border border-dashed border-[#d9d3c9] bg-white px-6 py-16 text-center">
              <p className="text-lg text-[#5c574f]">{view.promptMessage}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              {view.rows.map((row) => (
                <article
                  key={row.stepId}
                  className="rounded-md border border-[#d9d3c9] bg-white p-6"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <h2 className="text-xl font-semibold">
                      <span className="mr-2 text-[#8a847c]">
                        {String(row.stepId).padStart(2, "0")}
                      </span>
                      {row.stepTitle}
                    </h2>
                    <p className="text-sm text-[#5c574f]">
                      チャット {row.chatCount}件
                    </p>
                  </div>
                  <RatingBars ratings={row.ratings} chatCount={row.chatCount} />
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
