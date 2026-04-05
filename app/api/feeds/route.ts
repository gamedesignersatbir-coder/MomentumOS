import { NextResponse } from "next/server";
import { aggregateFeed } from "@/lib/pulse/aggregator";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const disabledParam = url.searchParams.get("disabled");
    const disabledIds = new Set(disabledParam ? disabledParam.split(",") : []);

    const items = await aggregateFeed(disabledIds);

    return NextResponse.json({
      items,
      meta: {
        total: items.length,
        fetchedAt: new Date().toISOString(),
        breakingCount: items.filter((i) => i.isBreaking).length,
        dramaCount: items.filter((i) => i.dramaScore >= 35).length,
      },
    });
  } catch (error) {
    console.error("Feed aggregation error:", error);
    return NextResponse.json(
      { error: "Failed to fetch feeds", items: [], meta: {} },
      { status: 500 }
    );
  }
}
