"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import {
  getBoardSnapshot,
  listAllBoardRecords,
  subscribeBoard,
} from "@/lib/chocotson/board";

const ROUTES = [
  { href: "/", label: "高齢者" },
  { href: "/student", label: "学生" },
  { href: "/opendata", label: "オープンデータ" },
] as const;

function linkClass(active: boolean) {
  return active
    ? "rounded-full bg-white px-3 py-1.5 text-xs font-medium text-[#2b2b2b]"
    : "rounded-full px-3 py-1.5 text-xs text-white/90 hover:bg-white/10";
}

export default function DemoNavigator() {
  const pathname = usePathname();
  useSyncExternalStore(subscribeBoard, getBoardSnapshot, () => "[]");
  const meetingUrl =
    listAllBoardRecords().findLast((record) => record.meetingUrl)?.meetingUrl ??
    null;
  const onMeetingPage =
    pathname.startsWith("/meeting/") || pathname === meetingUrl;

  return (
    <nav
      aria-label="デモ画面ナビ"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#2b2b2b]/95 px-4 py-2 backdrop-blur-sm"
    >
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-2">
        <span className="mr-1 text-[10px] tracking-wider text-white/50">
          DEMO
        </span>
        {ROUTES.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={linkClass(pathname === href)}
            aria-current={pathname === href ? "page" : undefined}
          >
            {label}
          </Link>
        ))}
        {meetingUrl ? (
          <Link
            href={meetingUrl}
            className={linkClass(onMeetingPage)}
            aria-current={onMeetingPage ? "page" : undefined}
          >
            最新相談URL
          </Link>
        ) : (
          <span className="rounded-full px-3 py-1.5 text-xs text-white/40">
            最新相談URL（予約後）
          </span>
        )}
      </div>
    </nav>
  );
}
