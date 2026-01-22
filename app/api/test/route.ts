import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ 
    status: "ok",
    timestamp: new Date().toISOString(),
    message: "API is working"
  });
}

export async function POST() {
  return NextResponse.json({ 
    status: "ok",
    timestamp: new Date().toISOString(),
    message: "POST is working"
  });
}
