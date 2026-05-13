import { NextResponse } from "next/server";
import type { MemoriesPayload } from "@/lib/memories";
import memoriesPayload from "@/data/memories/payload.json";

const data = memoriesPayload as MemoriesPayload;

export async function GET() {
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
