import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { password } = await req.json()
  if (password === process.env.DP_PASSWORD) return NextResponse.json({ ok: true, level: 'full' })
  if (password === process.env.PARTH_PASSWORD) return NextResponse.json({ ok: true, level: 'parth' })
  return NextResponse.json({ ok: false })
}
