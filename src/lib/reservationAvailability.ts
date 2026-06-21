import { todayLedgerDate } from "@/lib/shopStatus";
import type { createSupabaseServerClient } from "@/lib/supabaseServer";

const maxSetTableCount = 2;
const activeReservationStatuses = ["pending", "confirmed"];

export type ReservationAvailability = {
  available: boolean;
  date: string;
  ledgerSetTableCount: number;
  maxTableCount: number;
  message: string;
  remainingTableCount: number;
  reservedTableCount: number;
  reservableDate: boolean;
  usedTableCount: number;
};

type SupabaseServerClient = ReturnType<typeof createSupabaseServerClient>;

export async function loadReservationAvailability(supabase: SupabaseServerClient, date: string): Promise<ReservationAvailability> {
  if (!isFutureReservationDate(date)) {
    return {
      available: false,
      date,
      ledgerSetTableCount: 0,
      maxTableCount: maxSetTableCount,
      message: "当日のご予約はお電話またはLINEでお問い合わせください。",
      remainingTableCount: 0,
      reservedTableCount: 0,
      reservableDate: false,
      usedTableCount: maxSetTableCount,
    };
  }

  const { data: blockedDate, error: blockedDateError } = await supabase
    .from("set_reservation_blocked_dates")
    .select("reason")
    .eq("date", date)
    .maybeSingle();

  if (blockedDateError) throw blockedDateError;

  if (blockedDate) {
    const reason = typeof blockedDate.reason === "string" ? blockedDate.reason.trim() : "";
    return {
      available: false,
      date,
      ledgerSetTableCount: 0,
      maxTableCount: maxSetTableCount,
      message: reason ? `この日は予約受付を停止しています。${reason}` : "この日は予約受付を停止しています。別日をお選びください。",
      remainingTableCount: 0,
      reservedTableCount: 0,
      reservableDate: false,
      usedTableCount: maxSetTableCount,
    };
  }

  const { data: reservations, error: reservationError } = await supabase
    .from("set_reservations")
    .select("table_count, status")
    .eq("date", date)
    .in("status", activeReservationStatuses);

  if (reservationError) throw reservationError;

  const reservedTableCount = (reservations ?? []).reduce((sum, reservation) => sum + reservationTableCount(reservation.table_count), 0);
  const usedTableCount = Math.min(maxSetTableCount, reservedTableCount);
  const remainingTableCount = Math.max(0, maxSetTableCount - usedTableCount);

  return {
    available: remainingTableCount > 0,
    date,
    ledgerSetTableCount: 0,
    maxTableCount: maxSetTableCount,
    message: remainingTableCount > 0 ? `この日は予約可能です。残り${remainingTableCount}卓です。` : "この日は満席です。別日をお選びください。",
    remainingTableCount,
    reservedTableCount,
    reservableDate: true,
    usedTableCount,
  };
}

export async function assertReservationCapacity(supabase: SupabaseServerClient, date: string, requestedTableCount: number) {
  const availability = await loadReservationAvailability(supabase, date);
  if (!availability.reservableDate) {
    throw new Error(availability.message);
  }
  if (requestedTableCount > availability.remainingTableCount) {
    throw new Error("選択された日は予約可能な卓がありません。別日または卓数を変更してください。");
  }
  return availability;
}

function isFutureReservationDate(date: string) {
  return date > todayLedgerDate();
}

function reservationTableCount(value: unknown) {
  const count = Number(value);
  return count === 2 ? 2 : 1;
}
