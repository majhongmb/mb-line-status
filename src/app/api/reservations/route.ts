import { NextResponse } from "next/server";
import { assertReservationCapacity } from "@/lib/reservationAvailability";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

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

async function handleReservationAccepted(_reservation: ReturnType<typeof parseReservation>) {
  // Later notification hooks live here: email, LINE, SMS, or webhook fan-out.
}
