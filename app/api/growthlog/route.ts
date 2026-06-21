import { NextRequest, NextResponse } from 'next/server';
import { all, get, run } from '@/lib/turso';

export interface GrowthLog {
  id: number;
  date: string;
  type: 'milestone' | 'task' | 'observation' | 'measurement';
  title: string;
  body: string;
  created_at: string;
}

export async function GET() {
  try {
    const rows = await all<GrowthLog>('SELECT * FROM growth_logs ORDER BY date DESC, id DESC');
    return NextResponse.json(rows);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: '記録の取得に失敗しました' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { date, type, title, body: logBody } = body;

    if (!date || !type || !title) {
      return NextResponse.json({ error: '日付・種別・タイトルは必須です' }, { status: 400 });
    }

    const result = await run('INSERT INTO growth_logs (date, type, title, body) VALUES (?, ?, ?, ?)', [
      date,
      type,
      title,
      logBody ?? '',
    ]);
    const row = await get<GrowthLog>('SELECT * FROM growth_logs WHERE id = ?', [result.lastInsertRowid]);
    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: '記録の保存に失敗しました' }, { status: 500 });
  }
}
