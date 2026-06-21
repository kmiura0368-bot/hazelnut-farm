import { NextRequest, NextResponse } from 'next/server';
import { all, run } from '@/lib/turso';

export async function GET() {
  try {
    const rows = await all<{ key: string; value: string }>('SELECT key, value FROM settings');
    const result: Record<string, string> = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: '設定の取得に失敗しました' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { key, value } = body;

    if (!key) {
      return NextResponse.json({ error: 'keyが必要です' }, { status: 400 });
    }

    if (value === '' || value === null || value === undefined) {
      await run('DELETE FROM settings WHERE key = ?', [key]);
    } else {
      await run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, String(value)]);
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: '設定の保存に失敗しました' }, { status: 500 });
  }
}
