"use client";

import { useState } from "react";

type Mode = "free" | "set";
type StatusLevel = "available" | "possible" | "ask" | "full";
type Status = {
  asOf: string;
  date: string;
  free: {
    activeSanmaTables: number;
    activeTables: number;
    level: "available" | "possible" | "ask";
    message: string;
    title: string;
  };
  isOpen: boolean;
  set: {
    level: "ask" | "available" | "full";
    message: string;
    tableCount: number | null;
    title: string;
  };
};

const fallbackError = "状況を確認できませんでした。LINEトークからお問い合わせください。";
const shopPhoneHref = "tel:07090223436";

export default function Home() {
  const [mode, setMode] = useState<Mode | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selected = mode && status ? status[mode] : null;
  const overlayOpen = loading || Boolean(selected) || Boolean(error);

  async function check(nextMode: Mode) {
    setMode(nextMode);
    setLoading(true);
    setError("");
    setStatus(null);

    try {
      const response = await fetch("/api/status", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? fallbackError);
      setStatus(data as Status);
    } catch {
      setError(fallbackError);
    } finally {
      setLoading(false);
    }
  }

  function closeOverlay() {
    if (loading) return;
    setMode(null);
    setStatus(null);
    setError("");
  }

  return (
    <main className="status-page">
      <header className="brand-header">
        <span className="brand-mark">MB</span>
        <span className="brand-copy">
          <span className="brand-name">麻雀MB</span>
          <span className="brand-sub">卓状況</span>
        </span>
      </header>

      <section className="button-stack" aria-label="卓状況の確認">
        <button className="choice-button choice-button-free" disabled={loading} onClick={() => check("free")} type="button">
          <span className="choice-text">
            <span className="choice-main">フリー</span>
            <span className="choice-sub">おひとり様から参加OK</span>
          </span>
        </button>

        <button className="choice-button choice-button-set" disabled={loading} onClick={() => check("set")} type="button">
          <span className="choice-text">
            <span className="choice-main">セット</span>
            <span className="choice-sub">グループ利用の空きを確認</span>
          </span>
        </button>

        <a className="reserve-entry-button" href="/reserve">
          <span className="reserve-entry-text">
            <span className="reserve-entry-main">予約リクエスト</span>
            <span className="reserve-entry-sub">セット利用の希望日時を送る</span>
          </span>
        </a>
      </section>

      <footer className="page-footer">フリー・セットの受付状況を確認できます</footer>

      {overlayOpen ? (
        <div className="result-overlay" role="dialog" aria-modal="true" aria-live="polite" onClick={closeOverlay}>
          <section className="result-card" onClick={(event) => event.stopPropagation()}>
            {loading ? (
              <div className="result-loading">確認中...</div>
            ) : error ? (
              <>
                <div className="result-badge result-badge-ask">要確認</div>
                <h1>確認できませんでした</h1>
                <p>{error}</p>
                <button className="close-button" onClick={closeOverlay} type="button">
                  閉じる
                </button>
              </>
            ) : selected ? (
              <>
                <div className={`result-badge result-badge-${selected.level}`}>{badgeLabel(selected.level)}</div>
                <h1>{selected.title}</h1>
                <p>{selected.message}</p>
                <div className="updated">更新 {status?.asOf}</div>
                {mode === "set" && selected.level === "available" ? (
                  <a className="reserve-link-button" href={shopPhoneHref}>
                    電話で問い合わせる
                  </a>
                ) : null}
                <button className="close-button" onClick={closeOverlay} type="button">
                  閉じる
                </button>
              </>
            ) : null}
          </section>
        </div>
      ) : null}
    </main>
  );
}

function badgeLabel(level: StatusLevel) {
  if (level === "available") return "案内可";
  if (level === "possible") return "立卓可";
  if (level === "full") return "満席";
  return "要確認";
}
