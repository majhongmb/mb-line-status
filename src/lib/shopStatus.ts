export type Customer = {
  id: string;
  name: string;
  is_staff: boolean;
  staff_key: string | null;
};

export type LedgerTable = {
  id: string;
  date: string;
  table_no: number;
  game_type: 3 | 4;
};

export type HanchanLog = {
  id: string;
  table_id: string;
  seq_no: number;
  game_type: 3 | 4;
  started_at: string | null;
  winner_customer_id: string | null;
  notes: string | null;
};

export type HanchanSeat = {
  id: string;
  hanchan_id: string;
  customer_id: string;
  customer?: Customer;
};

export type TableBundle = LedgerTable & {
  logs: Array<HanchanLog & { seats: HanchanSeat[] }>;
};

export type PublicStatus = {
  asOf: string;
  date: string;
  free: {
    level: "available" | "possible" | "ask";
    title: string;
    message: string;
    activeSanmaTables: number;
    activeTables: number;
  };
  isOpen: boolean;
  set: {
    level: "ask" | "available" | "full";
    title: string;
    message: string;
  };
};

const japanTimeZone = "Asia/Tokyo";
const interruptedLogNote = "interrupted";
const tableBreakLogNote = "table_break";

export function buildPublicStatus(tables: TableBundle[], now = new Date()): PublicStatus {
  const date = todayLedgerDate(now);
  const asOf = new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: japanTimeZone,
  }).format(now);
  const isOpen = isWithinBusinessHours(now);

  if (!isOpen) {
    return {
      asOf,
      date,
      free: {
        activeSanmaTables: 0,
        activeTables: 0,
        level: "ask",
        message: "現在は営業時間外です。営業時間中にあらためてご確認ください。",
        title: "営業時間外です",
      },
      isOpen,
      set: {
        level: "ask",
        message: "現在は営業時間外です。ご予約・お問い合わせはLINEトークからお願いします。",
        title: "営業時間外です",
      },
    };
  }

  const activeTables = tables.filter(isActiveTable);
  const activeSanmaTables = activeTables.filter((table) => table.game_type === 3);
  const availableSanmaTable = activeSanmaTables.find((table) => staffCountInLatestLog(table) === 1);

  let free: PublicStatus["free"];

  if (availableSanmaTable) {
    free = {
      activeSanmaTables: activeSanmaTables.length,
      activeTables: activeTables.length,
      level: "available",
      message: "三麻1卓、すぐご案内できる可能性があります。来店前にLINEで一言いただけると確実です。",
      title: "フリー案内できます",
    };
  } else if (activeTables.length === 0) {
    free = {
      activeSanmaTables: 0,
      activeTables: 0,
      level: "possible",
      message: "現在フリー卓は立っていません。メンバー2入りで立卓できる場合があります。",
      title: "立卓できる場合あり",
    };
  } else {
    free = {
      activeSanmaTables: activeSanmaTables.length,
      activeTables: activeTables.length,
      level: "ask",
      message: "現在のご案内は要確認です。このLINEトークからお問い合わせください。",
      title: "要確認です",
    };
  }

  return {
    asOf,
    date,
    free,
    isOpen,
    set: {
      level: "ask",
      message: "セットの空き状況は現在確認中です。ご予約はこのLINEトークからお願いします。",
      title: "LINEで確認してください",
    },
  };
}

export function todayLedgerDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    month: "2-digit",
    timeZone: japanTimeZone,
    year: "numeric",
  }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const hour = Number(value("hour"));
  const date = new Date(Date.UTC(Number(value("year")), Number(value("month")) - 1, Number(value("day"))));
  if (hour < 12) date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function isWithinBusinessHours(now: Date) {
  const minutes = currentJapanMinutes(now);
  const open = Number(process.env.SHOP_OPEN_MINUTES ?? 720);
  const close = Number(process.env.SHOP_CLOSE_MINUTES ?? 1500);

  if (close > 1440) {
    return minutes >= open || minutes < close - 1440;
  }

  return minutes >= open && minutes < close;
}

function currentJapanMinutes(now: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    timeZone: japanTimeZone,
  }).formatToParts(now);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return value("hour") * 60 + value("minute");
}

function isActiveTable(table: TableBundle) {
  return table.logs.length > 0 && !isTableBroken(table);
}

function isTableBroken(table: TableBundle) {
  const note = table.logs.at(-1)?.notes;
  if (note === tableBreakLogNote || note === interruptedLogNote) return true;
  if (!note) return false;

  try {
    return (JSON.parse(note) as { status?: string }).status === tableBreakLogNote;
  } catch {
    return false;
  }
}

function staffCountInLatestLog(table: TableBundle) {
  const latestLog = [...table.logs].reverse().find((log) => log.started_at);
  if (!latestLog) return 0;
  return latestLog.seats.filter((seat) => seat.customer?.is_staff).length;
}
