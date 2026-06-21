import { NextRequest, NextResponse } from 'next/server';
import { all, get, run } from '@/lib/turso';

export interface KarteTree {
  tree_no: number;
  variety: string;
  nickname: string;
  note: string;
}

export async function GET() {
  try {
    const rows = await all<KarteTree>('SELECT * FROM karte_trees ORDER BY tree_no ASC');
    return NextResponse.json(rows);
  } catch (e) {
    console.error(e);
    // 一時的な診断: 実際のエラー内容を返す（原因特定後に削除する）
    return NextResponse.json(
      { error: 'カルテ一覧の取得に失敗しました', detail: String(e) },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { tree_no, variety, nickname, note } = await req.json();
    if (!tree_no) {
      return NextResponse.json({ error: 'tree_noが必要です' }, { status: 400 });
    }
    await run('UPDATE karte_trees SET variety = ?, nickname = ?, note = ? WHERE tree_no = ?', [
      variety ?? '',
      nickname ?? '',
      note ?? '',
      tree_no,
    ]);
    const row = await get<KarteTree>('SELECT * FROM karte_trees WHERE tree_no = ?', [tree_no]);
    return NextResponse.json(row);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'カルテの更新に失敗しました' }, { status: 500 });
  }
}
