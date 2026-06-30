import { NextRequest, NextResponse } from 'next/server'

const SCOPES: Record<string, string | undefined> = {
  all:   process.env.DP_PASSWORD,
  parth: process.env.PARTH_PASSWORD,
  mom:   process.env.MOM_PASSWORD,
  yaash: process.env.YAASH_PASSWORD,
  dad:   process.env.DAD_PASSWORD,
}

export async function POST(req: NextRequest) {
  const { password } = await req.json()
  const scope = Object.entries(SCOPES).find(([, pw]) => pw && pw === password)?.[0] ?? null
  return NextResponse.json({ ok: !!scope, scope })
}
