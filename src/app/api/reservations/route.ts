import { NextResponse } from "next/server";
import { assertReservationCapacity } from "@/lib/reservationAvailability";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";

type ReservationRequest = {
  contact?: unknown;
  date?: unknown;
  duration_minutes?: unknown;
  email?: unknown;
  game_type?: unknown;
  notes?: unknown;
  people_count?: unknown;
  customer_name?: unknown;
  start_time?: unknown;
  table_count?: unknown;
};

const gameTypes = new Set(["sanma", "yonma", "other"]);
const durations = new Set([180, 240, 300]);
const peopleCounts = new Set([4, 5, 6]);
const tableCounts = new Set([1, 2]);

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ReservationRequest;
    const values = parseReservation(body);

    const supabase = createSupabaseServerClient();
    await assertReservationCapacity(supabase, values.date, values.table_count);
    const { error } = await supabase.from("set_reservations").insert(values);

    if (error) throw error;

    await handleReservationAccepted(values);

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "予約フォームを送信できませんでした。";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

function parseReservation(body: ReservationRequest) {
  const date = text(body.date);
  const startTime = text(body.start_time);
  const gameType = text(body.game_type);
  const durationMinutes = body.duration_minutes === null || body.duration_minutes === "" ? null : Number(body.duration_minutes);
  const peopleCount = body.people_count === null || body.people_count === "" ? null : Number(body.people_count);
  const customerName = text(body.customer_name);
  const contact = text(body.contact);
  const email = text(body.email);
  const notes = text(body.notes);
  const tableCount = Number(body.table_count);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("利用日を入力してください。");
  if (!isValidStartTime(startTime)) throw new Error("開始時間を選択してください。");
  if (!gameTypes.has(gameType)) throw new Error("種目を選択してください。");
  if (durationMinutes !== null && !durations.has(durationMinutes)) throw new Error("利用時間を選択してください。");
  if (peopleCount !== null && !peopleCounts.has(peopleCount)) throw new Error("人数を選択してください。");
  if (!tableCounts.has(tableCount)) throw new Error("卓数を選択してください。");
  if (!customerName) throw new Error("お名前を入力してください。");
  if (!contact) throw new Error("電話番号を入力してください。");
  if (!email) throw new Error("メールアドレスを入力してください。");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("メールアドレスを確認してください。");

  return {
    contact,
    date,
    duration_minutes: durationMinutes,
    email,
    game_type: gameType,
    notes: notes || null,
    people_count: peopleCount,
    customer_name: customerName,
    start_time: startTime,
    status: "pending",
    source: "web",
    table_count: tableCount,
  };
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isValidStartTime(value: string) {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [hour, minute] = value.split(":").map(Number);
  const totalMinutes = hour * 60 + minute;
  return totalMinutes >= 15 * 60 && totalMinutes <= 22 * 60 && minute % 15 === 0;
}

async function handleReservationAccepted(reservation: ReturnType<typeof parseReservation>) {
  try {
    await sendShopNotificationEmail(reservation);
  } catch (caught) {
    console.error("Failed to send shop reservation notification", caught);
  }
}

async function sendShopNotificationEmail(reservation: ReturnType<typeof parseReservation>) {
  const user = process.env.GMAIL_USER;
  const appPassword = process.env.GMAIL_APP_PASSWORD;
  const to = process.env.SHOP_RESERVATION_NOTIFICATION_EMAIL || "hiroki.university.f.edu@gmail.com";
  if (!user || !appPassword) throw new Error("Gmail notification settings are missing.");

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { pass: appPassword, user },
  });
  const content = shopNotificationContent(reservation);
  await transporter.sendMail({
    from: process.env.RESERVATION_FROM_EMAIL || `麻雀MB <${user}>`,
    html: content.html,
    subject: content.subject,
    text: content.text,
    to,
  });
}

function shopNotificationContent(reservation: ReturnType<typeof parseReservation>) {
  const subject = "【麻雀MB】新しい予約リクエストがあります";
  const rows = [
    ["利用日", formatDate(reservation.date)],
    ["開始時間", reservation.start_time],
    ["種目", gameTypeLabel(reservation.game_type)],
    ["卓数", `${reservation.table_count}卓`],
    ["人数", peopleLabel(reservation.people_count)],
    ["利用時間", durationLabel(reservation.duration_minutes)],
    ["名前", reservation.customer_name],
    ["電話", reservation.contact],
    ["メール", reservation.email],
    ["備考", reservation.notes || "なし"],
  ];
  const text = [
    "新しい予約リクエストが入りました。",
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
    "",
    "帳簿アプリの予約タブで確認してください。",
  ].join("\n");
  const html = `<!doctype html>
<html lang="ja">
  <body style="margin:0;padding:0;background:#f6f7f9;color:#1f2937;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.7;">
    <div style="max-width:640px;margin:0 auto;padding:24px 16px;">
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;padding:24px;">
        <h1 style="margin:0 0 16px;font-size:20px;">新しい予約リクエスト</h1>
        <table style="width:100%;border-collapse:collapse;background:#f9fafb;border-radius:8px;overflow:hidden;">
          <tbody>${rows.map(([label, value]) => `<tr><th style="width:120px;text-align:left;padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#4b5563;font-weight:700;">${escapeHtml(label)}</th><td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-weight:700;">${escapeHtml(value)}</td></tr>`).join("")}</tbody>
        </table>
        <p style="margin:18px 0 0;">帳簿アプリの予約タブで確認してください。</p>
      </div>
    </div>
  </body>
</html>`;
  return { html, subject, text };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${value}T00:00:00.000Z`));
}

function gameTypeLabel(value: string) {
  if (value === "sanma") return "三麻";
  if (value === "yonma") return "四麻";
  return "その他";
}

function peopleLabel(value: number | null) {
  if (!value) return "未定";
  return value >= 6 ? "6人以上" : `${value}人`;
}

function durationLabel(value: number | null) {
  if (!value) return "未定";
  return `${value / 60}時間`;
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
