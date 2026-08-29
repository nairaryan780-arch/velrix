"use client";

import { useRouter } from "next/navigation";
import { patchJson } from "@/lib/client";

export function MarkAllRead({ hasUnread }: { hasUnread: boolean }) {
  const router = useRouter();
  async function markAll() {
    await patchJson("/api/v1/notifications", {});
    router.refresh();
  }
  if (!hasUnread) return null;
  return (
    <button className="btn btn-sm" onClick={markAll}>
      Mark all read
    </button>
  );
}
