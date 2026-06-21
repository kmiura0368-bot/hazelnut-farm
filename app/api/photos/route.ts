import { NextRequest, NextResponse } from 'next/server';
import { all, get, run } from '@/lib/turso';
import { saveImage } from '@/lib/storage';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tag = searchParams.get('tag') ?? '';
    let rows;
    if (tag) {
      rows = await all(
        "SELECT * FROM photos WHERE (',' || tags || ',') LIKE ? ORDER BY created_at DESC",
        [`%,${tag},%`]
      );
    } else {
      rows = await all('SELECT * FROM photos ORDER BY created_at DESC');
    }
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const tags = (formData.get('tags') as string) ?? '';
    const caption = (formData.get('caption') as string) ?? '';

    if (!file) return NextResponse.json({ error: 'ファイルがありません' }, { status: 400 });

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const allowed = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif'];
    if (!allowed.includes(ext)) {
      return NextResponse.json({ error: '画像ファイル（JPG/PNG/WEBP/GIF/HEIC）のみ対応しています' }, { status: 400 });
    }

    const saved = await saveImage(file, 'photo');

    const result = await run(
      'INSERT INTO photos (filename, original_name, tags, caption) VALUES (?, ?, ?, ?)',
      [saved.url, file.name, tags, caption]
    );

    const photo = await get('SELECT * FROM photos WHERE id = ?', [result.lastInsertRowid]);
    return NextResponse.json(photo, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
