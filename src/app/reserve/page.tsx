"use client";

import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";

type Availability = {
  available: boolean;
  ledgerSetTableCount: number;
  maxTableCount: number;
  remainingTableCount: number;
  reservedTableCount: number;
  usedTableCount: number;
};

type FormState = {
  contact: string;
  date: string;
  duration_minutes: string;
  email: string;
  game_type: "sanma" | "yonma" | "other";
  notes: string;
  people_count: "" | "4" | "5" | "6";
  customer_name: string;
  start_time: string;
  table_count: "1" | "2";
};

const startTimeOptions = buildStartTimeOptions();

const initialForm: FormState = {
  contact: "",
  date: todayInputValue(),
  duration_minutes: "",
  email: "",
  game_type: "yonma",
  notes: "",
  people_count: "",
  customer_name: "",
  start_time: "",
  table_count: "1",
};

export default function ReservePage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");

  const requestedTableCount = Number(form.table_count);
  const cannotReserve =
    availabilityLoading ||
    Boolean(availabilityError) ||
    Boolean(availability && requestedTableCount > availability.remainingTableCount);

  useEffect(() => {
    if (!form.date) return;
    const controller = new AbortController();
    setAvailabilityLoading(true);
    setAvailabilityError("");

    fetch(`/api/reservation-availability?date=${encodeURIComponent(form.date)}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error ?? "空き状況を確認できませんでした。");
        setAvailability(data as Availability);
      })
      .catch((caught) => {
        if (controller.signal.aborted) return;
        setAvailability(null);
        setAvailabilityError(caught instanceof Error ? caught.message : "空き状況を確認できませんでした。");
      })
      .finally(() => {
        if (!controller.signal.aborted) setAvailabilityLoading(false);
      });

    return () => controller.abort();
  }, [form.date]);

  async function submitReservation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/reservations", {
        body: JSON.stringify({
          ...form,
          duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : null,
          people_count: form.people_count ? Number(form.people_count) : null,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? "予約フォームを送信できませんでした。");
      setSubmitted(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "予約フォームを送信できませんでした。");
    } finally {
      setSubmitting(false);
    }
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <main className="reserve-page">
      <section className="reserve-shell">
        <a className="reserve-back" href="/">戻る</a>
        <header className="reserve-header">
          <p>MB セット予約</p>
          <h1>予約フォーム</h1>
        </header>

        <p className="reserve-notice">予約確定のご連絡をメールでお送りします。メールアドレスを入力できない場合は、お電話でご予約ください。</p>

        {submitted ? (
          <div className="reserve-complete" role="status">
            <strong>予約リクエストを受け付けました。</strong>
            <span>確定連絡をお待ちください。</span>
          </div>
        ) : (
          <form className="reserve-form" onSubmit={submitReservation}>
            <label>
              <FieldLabel required>利用日</FieldLabel>
              <input required type="date" value={form.date} onChange={(event) => update("date", event.target.value)} />
            </label>

            <label>
              <FieldLabel required>開始時間</FieldLabel>
              <select required value={form.start_time} onChange={(event) => update("start_time", event.target.value)}>
                <option value="">選択してください</option>
                {startTimeOptions.map((time) => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </label>

            <label>
              <FieldLabel required>種目</FieldLabel>
              <select required value={form.game_type} onChange={(event) => update("game_type", event.target.value as FormState["game_type"])}>
                <option value="sanma">三麻</option>
                <option value="yonma">四麻</option>
                <option value="other">その他</option>
              </select>
            </label>

            <label>
              <FieldLabel>利用時間</FieldLabel>
              <select value={form.duration_minutes} onChange={(event) => update("duration_minutes", event.target.value)}>
                <option value="">未定</option>
                <option value="180">3時間</option>
                <option value="240">4時間</option>
                <option value="300">5時間</option>
              </select>
            </label>

            <label>
              <FieldLabel>人数</FieldLabel>
              <select value={form.people_count} onChange={(event) => update("people_count", event.target.value as FormState["people_count"])}>
                <option value="">未定</option>
                <option value="4">4人</option>
                <option value="5">5人</option>
                <option value="6">6人以上</option>
              </select>
            </label>

            <label>
              <FieldLabel required>卓数</FieldLabel>
              <select required value={form.table_count} onChange={(event) => update("table_count", event.target.value as FormState["table_count"])}>
                <option value="1">1卓</option>
                <option value="2">2卓</option>
              </select>
            </label>

            <div className={`reserve-availability reserve-full ${availabilityStatusClass(availability, availabilityLoading, availabilityError, requestedTableCount)}`}>
              {availabilityLoading ? (
                "空き状況を確認中です。"
              ) : availabilityError ? (
                availabilityError
              ) : availability ? (
                availability.remainingTableCount > 0 && requestedTableCount <= availability.remainingTableCount
                  ? `この日は予約可能です。残り${availability.remainingTableCount}卓です。`
                  : "この日は満席です。別日または卓数を変更してください。"
              ) : (
                "利用日を選ぶと空き状況を確認できます。"
              )}
            </div>

            <label>
              <FieldLabel required>お名前</FieldLabel>
              <input required autoComplete="name" value={form.customer_name} onChange={(event) => update("customer_name", event.target.value)} />
            </label>

            <label>
              <FieldLabel required>電話番号</FieldLabel>
              <input required autoComplete="tel" inputMode="tel" value={form.contact} onChange={(event) => update("contact", event.target.value)} />
            </label>

            <label>
              <FieldLabel required>メールアドレス</FieldLabel>
              <input required autoComplete="email" inputMode="email" type="email" value={form.email} onChange={(event) => update("email", event.target.value)} />
            </label>

            <label className="reserve-full">
              <FieldLabel>備考</FieldLabel>
              <span className="reserve-help-text">赤の枚数や持ち点などご希望ございましたらご記入ください。</span>
              <textarea rows={4} value={form.notes} onChange={(event) => update("notes", event.target.value)} />
            </label>

            {error ? <div className="reserve-error">{error}</div> : null}

            <button className="reserve-submit" disabled={submitting || cannotReserve} type="submit">
              {submitting ? "送信中..." : "予約リクエストを送る"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}

function FieldLabel({ children, required = false }: { children: ReactNode; required?: boolean }) {
  return (
    <span className="reserve-label-text">
      <span>{children}</span>
      <span className={required ? "reserve-required" : "reserve-optional"}>{required ? "※必須" : "※任意"}</span>
    </span>
  );
}

function availabilityStatusClass(availability: Availability | null, loading: boolean, error: string, requestedTableCount: number) {
  if (loading) return "reserve-availability-checking";
  if (error) return "reserve-availability-error";
  if (!availability) return "reserve-availability-checking";
  return availability.remainingTableCount > 0 && requestedTableCount <= availability.remainingTableCount
    ? "reserve-availability-ok"
    : "reserve-availability-full";
}

function buildStartTimeOptions() {
  const options: string[] = [];
  for (let minutes = 15 * 60; minutes <= 22 * 60; minutes += 15) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    options.push(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
  }
  return options;
}

function todayInputValue() {
  const now = new Date();
  const japanDate = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Tokyo",
    year: "numeric",
  }).format(now);
  return japanDate;
}
