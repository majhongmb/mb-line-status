import crypto from "crypto";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type LineWebhookBody = {
  events?: LineWebhookEvent[];
};

type LineWebhookEvent = {
  replyToken?: string;
  source?: {
    groupId?: string;
    roomId?: string;
    type?: string;
    userId?: string;
  };
  type?: string;
};

export async function POST(request: Request) {
  const bodyText = await request.text();
  if (!isValidLineSignature(bodyText, request.headers.get("x-line-signature"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const body = JSON.parse(bodyText || "{}") as LineWebhookBody;
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  for (const event of body.events ?? []) {
    const sourceId = event.source?.groupId || event.source?.roomId || event.source?.userId;
    if (!sourceId) continue;

    console.log("LINE webhook source", {
      sourceId,
      sourceType: event.source?.type,
      userId: event.source?.userId,
    });

    if (shouldReplyWithLineSourceId() && token && event.replyToken && event.replyToken !== "00000000000000000000000000000000") {
      await replyLineMessage(token, event.replyToken, [
        "麻雀MBの予約通知先IDです。",
        "",
        sourceId,
        "",
        "Vercelの環境変数 LINE_RESERVATION_NOTIFY_TO にこのIDを入れてください。",
      ].join("\n"));
    }
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, message: "LINE webhook endpoint is ready." });
}

function isValidLineSignature(bodyText: string, signature: string | null) {
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  if (!channelSecret) return true;
  if (!signature) return false;

  const digest = crypto.createHmac("sha256", channelSecret).update(bodyText).digest("base64");
  const expected = Buffer.from(digest);
  const actual = Buffer.from(signature);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function shouldReplyWithLineSourceId() {
  return process.env.LINE_WEBHOOK_SETUP_REPLY_ENABLED === "true";
}

async function replyLineMessage(token: string, replyToken: string, text: string) {
  const response = await fetch("https://api.line.me/v2/bot/message/reply", {
    body: JSON.stringify({
      messages: [{ text, type: "text" }],
      replyToken,
    }),
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    const body = await response.text();
    console.error("LINE reply failed", response.status, body);
  }
}
