"use client";

import { useState } from "react";

type FormState = {
  contact: string;
  date: string;
  duration_minutes: string;
  game_type: "sanma" | "yonma" | "other";
  notes: string;
  people_count: "4" | "5" | "6";
  customer_name: string;
  start_time: string;
};

const initialForm: FormState = {
  contact: "",
  date: todayInputValue(),
  duration_minutes: "180",
  game_type: "yonma",
  notes: "",
  people_count: "4",
  customer_name: "",
  start_time: "",
};

export default function ReservePage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function submitReservation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/reservations", {
        body: JSON.stringify({
          ...form,
          duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : null,
          people_count: Number(form.people_count),
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? "予約リクエストを送信できませんでした。");
      setSubmitted(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "予約リクエストを送信できませんでした。");
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
        <a className="reserve-back" href="/">空き状況へ戻る</a>
        <header className="reserve-header">
          <p>MB セット予約</p>
          <h1>予約リクエスト</h1>
        </header>

        {submitted ? (
          <div className="reserve-complete" role="status">
            <strong>予約リクエストを受け付けました。</strong>
            <span>確定連絡をお待ちください。</span>
          </div>
        ) : (
          <form className="reserve-form" onSubmit={submitReservation}>
            <label>
              利用日
              <input required type="date" value={form.date} onChange={(event) => update("date", event.target.value)} />
            </label>

            <label>
              開始時間
              <input required type="time" value={form.start_time} onChange={(event) => update("start_time", event.target.value)} />
            </label>

            <label>
              種目
              <select value={form.game_type} onChange={(event) => update("game_type", event.target.value as FormState["game_type"])}>
                <option value="sanma">三麻</option>
                <option value="yonma">四麻</option>
                <option value="other">その他</option>
              </select>
            </label>

            <label>
              利用時間
              <select value={form.duration_minutes} onChange={(event) => update("duration_minutes", event.target.value)}>
                <option value="180">3時間</option>
                <option value="240">4時間</option>
                <option value="300">5時間</option>
                <option value="">未定</option>
              </select>
            </label>

            <label>
              人数
              <select value={form.people_count} onChange={(event) => update("people_count", event.target.value as FormState["people_count"])}>
                <option value="4">4人</option>
                <option value="5">5人</option>
                <option value="6">6人以上</option>
              </select>
            </label>

            <label>
              お名前
              <input required autoComplete="name" value={form.customer_name} onChange={(event) => update("customer_name", event.target.value)} />
            </label>

            <label>
              電話番号 or LINE名
              <input required autoComplete="tel" value={form.contact} onChange={(event) => update("contact", event.target.value)} />
            </label>

            <label className="reserve-full">
              備考
              <textarea rows={4} value={form.notes} onChange={(event) => update("notes", event.target.value)} />
            </label>

            {error ? <div className="reserve-error">{error}</div> : null}

            <button className="reserve-submit" disabled={submitting} type="submit">
              {submitting ? "送信中..." : "予約リクエストを送る"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
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
