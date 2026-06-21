import { NextRequest, NextResponse } from 'next/server';
import { all, get, run } from '@/lib/turso';
import { saveImage } from '@/lib/storage';

export interface KarteEntry {
  id: number;
  tree_no: number;
  date: string;
  body: string;
  photo_filename: string;
  height_cm: number | null;
  ai_feedback: string;
  created_at: string;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const treeNo = searchParams.get('tree_no');
    let rows;
    if (treeNo) {
      rows = await all<KarteEntry>(
        'SELECT * FROM karte_entries WHERE tree_no = ? ORDER BY date DESC, id DESC',
        [Number(treeNo)]
      );
    } else {
      rows = await all<KarteEntry>('SELECT * FROM karte_entries ORDER BY date DESC, id DESC');
    }
    return NextResponse.json(rows);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: '記録の取得に失敗しました' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const treeNo = Number(formData.get('tree_no'));
    const date = formData.get('date') as string;
    const body = (formData.get('body') as string) ?? '';
    const heightRaw = formData.get('height_cm') as string | null;
    const height_cm = heightRaw && heightRaw !== '' ? Number(heightRaw) : null;
    const file = formData.get('file') as File | null;

    if (!treeNo || !date) {
      return NextResponse.json({ error: '樹木番号と日付は必須です' }, { status: 400 });
    }

    let photo_filename = '';
    if (file && file.size > 0) {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
      const allowed = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif'];
      if (!allowed.includes(ext)) {
        return NextResponse.json({ error: '画像ファイルのみ対応しています' }, { status: 400 });
      }
      const saved = await saveImage(file, `karte-${treeNo}`);
      photo_filename = saved.url;
    }

    const result = await run(
      'INSERT INTO karte_entries (tree_no, date, body, photo_filename, height_cm) VALUES (?, ?, ?, ?, ?)',
      [treeNo, date, body, photo_filename, height_cm]
    );
    const row = await get<KarteEntry>('SELECT * FROM karte_entries WHERE id = ?', [result.lastInsertRowid]);
    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: '記録の保存に失敗しました' }, { status: 500 });
  }
}
