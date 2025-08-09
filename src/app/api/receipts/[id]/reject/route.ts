import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const receipt = await prisma.receipt.update({
    where: { id: params.id },
    data: { status: "REJECTED" },
  });
  return NextResponse.json({ receipt });
}


