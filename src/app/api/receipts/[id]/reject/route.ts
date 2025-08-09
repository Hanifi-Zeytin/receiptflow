import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(_, { params }) {
  const { id } = await params;
  const receipt = await prisma.receipt.update({
    where: { id },
    data: { status: "REJECTED" },
  });
  return NextResponse.json({ receipt });
}


