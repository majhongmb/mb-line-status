import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

type ReservationRequest = {
  contact?: unknown;
  date?: unknown;
  duration_minutes?: unknown;
  game_type?: unknown;
  notes?: unknown;
  people_count?: unknown;
  customer_name?: unknown;
  start_time?: unknown;
};

const gameTypes = new Set(["sanma", "yonma", "other"]);
const durations = new Set([180, 240, 300]);
const peopleCounts = new Set([4, 5, 6]);

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ReservationRequest;
    const values = parseReservation(body);

    const supabase = createSupabaseServerClient();
    const { error } = await supabase.from("set_reservations").insert(values);

    if (error) throw error;

    await handleReservationAccepted(values);

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "予約リクエストを送信できませんでした。";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

function parseReservation(body: ReservationRequest) {
  const date = text(body.date);
  const startTime = text(body.start_time);
  const gameType = text(body.game_type);
  const durationMinutes = body.duration_minutes === null || body.duration_minutes === "" ? null : Number(body.duration_minutes);
  const peopleCount = Number(body.people_count);
  const customerName = text(body.customer_name);
  const contact = text(body.contact);
  const notes = text(body.notes);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("利用日を入力してください。");
  if (!/^\d{2}:\d{2}$/.test(startTime)) throw new Error("開始時間を入力してください。");
  if (!gameTypes.has(gameType)) throw new Error("種目を選択してください。");
  if (durationMinutes !== null && !durations.has(durationMinutes)) throw new Error("利用時間を選択してください。");
  if (!peopleCounts.has(peopleCount)) throw new Error("人数を選択してください。");
  if (!customerName) throw new Error("お名前を入力してください。");
  if (!contact) throw new Error("電話番号またはLINE名を入力してください。");

  return {
    contact,
    date,
    duration_minutes: durationMinutes,
    game_type: gameType,
    notes: notes || null,
    people_count: peopleCount,
    customer_name: customerName,
    start_time: startTime,
    status: "pending",
  };
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function handleReservationAccepted(_reservation: ReturnType<typeof parseReservation>) {
  // Later notification hooks live here: email, LINE, or webhook fan-out.
}
