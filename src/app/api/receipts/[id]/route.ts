import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req, { params }) {
  const { id } = await params;
  const receipt = await prisma.receipt.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!receipt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ receipt });
}

export async function PATCH(req, { params }) {
  const { id } = await params;
  const body = await req.json();
  const receipt = await prisma.receipt.update({
    where: { id },
    data: body,
  });
  return NextResponse.json({ receipt });
}


