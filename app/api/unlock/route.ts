import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { password } = await req.json()
  return NextResponse.json({ ok: password === process.env.DP_PASSWORD })
}
