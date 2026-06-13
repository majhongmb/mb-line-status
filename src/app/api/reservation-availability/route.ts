import { NextResponse } from "next/server";
import { loadReservationAvailability } from "@/lib/reservationAvailability";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const date = url.searchParams.get("date") ?? "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("利用日を選択してください。");

    const supabase = createSupabaseServerClient();
    const availability = await loadReservationAvailability(supabase, date);

    return NextResponse.json(availability, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "空き状況を確認できませんでした。";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
