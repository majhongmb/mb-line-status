import { NextResponse } from "next/server";
import { buildPublicStatus, todayLedgerDate, type HanchanLog, type HanchanSeat, type LedgerTable, type PublicStatus, type TableBundle } from "@/lib/shopStatus";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createSupabaseServerClient();
    const date = todayLedgerDate();

    const { data: tableRows, error: tableError } = await supabase
      .from("tables")
      .select("id, date, table_no, game_type")
      .eq("date", date)
      .order("table_no", { ascending: true });

    if (tableError) throw tableError;

    const dailyRecord = await loadDailyRecord(supabase, date);
    const tables = (tableRows ?? []) as LedgerTable[];
    const tableIds = tables.map((table) => table.id);
    const logRows = await loadLogs(supabase, tableIds);
    const seatRows = await loadSeats(supabase, logRows.map((log) => log.id));
    const bundles = buildBundles(tables, logRows, seatRows);

    return NextResponse.json(buildPublicStatus(bundles, new Date(), dailyRecord?.set_table_count ?? null), {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (caught) {
    console.error("Failed to load public shop status", caught);
    return NextResponse.json(buildFallbackStatus(), {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }
}

async function loadDailyRecord(supabase: ReturnType<typeof createSupabaseServerClient>, date: string) {
  const { data, error } = await supabase
    .from("daily_records")
    .select("set_table_count")
    .eq("date", date)
    .maybeSingle();

  if (error) {
    console.warn("Failed to load daily set table count", error);
    return null;
  }

  return { set_table_count: data?.set_table_count ?? 0 };
}

async function loadLogs(supabase: ReturnType<typeof createSupabaseServerClient>, tableIds: string[]) {
  if (!tableIds.length) return [];

  const { data, error } = await supabase
    .from("hanchan_logs")
    .select("id, table_id, seq_no, game_type, started_at, winner_customer_id, notes")
    .in("table_id", tableIds)
    .order("table_id", { ascending: true })
    .order("seq_no", { ascending: true });

  if (error) throw error;
  return (data ?? []) as HanchanLog[];
}

async function loadSeats(supabase: ReturnType<typeof createSupabaseServerClient>, logIds: string[]) {
  if (!logIds.length) return [];

  const { data, error } = await supabase
    .from("hanchan_seats")
    .select("id, hanchan_id, customer_id, customer:customers(id, name, is_staff, staff_key)")
    .in("hanchan_id", logIds);

  if (error) throw error;
  return ((data ?? []) as Array<HanchanSeat & { customer?: HanchanSeat["customer"] | HanchanSeat["customer"][] }>).map((seat) => ({
    ...seat,
    customer: Array.isArray(seat.customer) ? seat.customer[0] : seat.customer,
  }));
}

function buildBundles(tables: LedgerTable[], logs: HanchanLog[], seats: HanchanSeat[]): TableBundle[] {
  return tables.map((table) => ({
    ...table,
    logs: logs
      .filter((log) => log.table_id === table.id)
      .map((log) => ({
        ...log,
        seats: seats.filter((seat) => seat.hanchan_id === log.id),
      })),
  }));
}

function buildFallbackStatus(): PublicStatus {
  const now = new Date();
  return {
    ...buildPublicStatus([], now),
    free: {
      activeSanmaTables: 0,
      activeTables: 0,
      level: "ask",
      message: "現在の卓状況を自動確認できませんでした。このLINEトークからお問い合わせください。",
      title: "要確認です",
    },
    set: {
      level: "ask",
      message: "セットの空き状況は、このLINEトークからお問い合わせください。",
      tableCount: null,
      title: "LINEで確認してください",
    },
  };
}
