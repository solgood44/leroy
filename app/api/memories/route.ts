import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import { buildMemories } from "@/lib/memories";

const getMemories = unstable_cache(
  async () => buildMemories(),
  ["leroy-memories-local-v24"],
  { revalidate: 60 },
);

export async function GET() {
  try {
    const data = await getMemories();
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
