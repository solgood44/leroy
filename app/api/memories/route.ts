import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import { buildMemories } from "@/lib/memories";

const getMemories = unstable_cache(
  async () => buildMemories(),
  ["leroy-memories-local-v5"],
  { revalidate: 300 },
);

export async function GET() {
  try {
    const data = await getMemories();
    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
