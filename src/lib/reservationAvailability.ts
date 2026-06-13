import { todayLedgerDate } from "@/lib/shopStatus";
import type { createSupabaseServerClient } from "@/lib/supabaseServer";

const maxSetTableCount = 2;
const activeReservationStatuses = ["pending", "confirmed"];

export type ReservationAvailability = {
  available: boolean;
  date: string;
  ledgerSetTableCount: number;
  maxTableCount: number;
  remainingTableCount: number;
  reservedTableCount: number;
  usedTableCount: number;
};

type SupabaseServerClient = ReturnType<typeof createSupabaseServerClient>;

export async function loadReservationAvailability(supabase: SupabaseServerClient, date: string): Promise<ReservationAvailability> {
  const { data: reservations, error: reservationError } = await supabase
    .from("set_reservations")
    .select("table_count, status")
    .eq("date", date)
    .in("status", activeReservationStatuses);

  if (reservationError) throw reservationError;

  const reservedTableCount = (reservations ?? []).reduce((sum, reservation) => sum + reservationTableCount(reservation.table_count), 0);
  const ledgerSetTableCount = date === todayLedgerDate() ? await loadLedgerSetTableCount(supabase, date) : 0;
  const usedTableCount = Math.min(maxSetTableCount, Math.max(reservedTableCount, ledgerSetTableCount));
  const remainingTableCount = Math.max(0, maxSetTableCount - usedTableCount);

  return {
    available: remainingTableCount > 0,
    date,
    ledgerSetTableCount,
    maxTableCount: maxSetTableCount,
    remainingTableCount,
    reservedTableCount,
    usedTableCount,
  };
}

export async function assertReservationCapacity(supabase: SupabaseServerClient, date: string, requestedTableCount: number) {
  const availability = await loadReservationAvailability(supabase, date);
  if (requestedTableCount > availability.remainingTableCount) {
    throw new Error("選択された日は予約可能な卓がありません。別日または卓数を変更してください。");
  }
  return availability;
}

function reservationTableCount(value: unknown) {
  const count = Number(value);
  return count === 2 ? 2 : 1;
}

async function loadLedgerSetTableCount(supabase: SupabaseServerClient, date: string) {
  const { data, error } = await supabase
    .from("daily_records")
    .select("set_table_count")
    .eq("date", date)
    .maybeSingle();

  if (error) throw error;
  return Math.max(0, Math.min(maxSetTableCount, Number(data?.set_table_count ?? 0)));
}
