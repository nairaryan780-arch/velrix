"use client";

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; code?: string };

export async function postJson<T = unknown>(url: string, body: unknown): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: json?.error?.message ?? "Request failed", code: json?.error?.code };
    }
    return { ok: true, data: json as T };
  } catch {
    return { ok: false, error: "Network error — please try again" };
  }
}

export async function patchJson<T = unknown>(url: string, body: unknown): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: json?.error?.message ?? "Request failed", code: json?.error?.code };
    return { ok: true, data: json as T };
  } catch {
    return { ok: false, error: "Network error — please try again" };
  }
}

export async function del<T = unknown>(url: string): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: json?.error?.message ?? "Request failed", code: json?.error?.code };
    return { ok: true, data: json as T };
  } catch {
    return { ok: false, error: "Network error — please try again" };
  }
}
