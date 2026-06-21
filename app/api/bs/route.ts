import { NextRequest, NextResponse } from 'next/server';
import { all, get, run } from '@/lib/turso';
import { BSSnapshot } from '@/lib/types';

export async function GET() {
  try {
    const rows = await all<BSSnapshot>('SELECT * FROM bs_snapshots ORDER BY date DESC');
    return NextResponse.json(rows);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: '貸借対照表の取得に失敗しました' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { date, data } = body;

    if (!date || !data) {
      return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 });
    }

    const dataStr = typeof data === 'string' ? data : JSON.stringify(data);

    await run('INSERT OR REPLACE INTO bs_snapshots (date, data) VALUES (?, ?)', [date, dataStr]);

    const created = await get<BSSnapshot>('SELECT * FROM bs_snapshots WHERE date = ?', [date]);
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: '貸借対照表の保存に失敗しました' }, { status: 500 });
  }
}
