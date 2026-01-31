import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { fundWithFriendbot } from "@aethera/stellar";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's stellar address from request body
    const { stellarAddress } = await req.json();

    if (!stellarAddress) {
      return NextResponse.json(
        { error: "Stellar address is required" },
        { status: 400 },
      );
    }

    // Fund account with friendbot
    const result = await fundWithFriendbot(stellarAddress);

    if (!result) {
      return NextResponse.json(
        { error: "Failed to fund account with friendbot" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Account funded with 10,000 XLM successfully",
      transactionHash: result,
    });
  } catch (error: any) {
    console.error("Friendbot funding error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fund account" },
      { status: 500 },
    );
  }
}
