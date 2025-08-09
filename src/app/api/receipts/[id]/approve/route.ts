import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const receipt = await prisma.receipt.update({
    where: { id },
    data: { status: "APPROVED" },
  });
  return NextResponse.json({ receipt });
}


