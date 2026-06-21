import { NextRequest, NextResponse } from 'next/server';
import { get, run } from '@/lib/turso';
import { deleteImage } from '@/lib/storage';

// 私（Claude）のフィードバックを記録に追記する
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { ai_feedback } = await req.json();
    const result = await run('UPDATE karte_entries SET ai_feedback = ? WHERE id = ?', [ai_feedback ?? '', Number(id)]);
    if (result.rowsAffected === 0) {
      return NextResponse.json({ error: '記録が見つかりません' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'フィードバックの保存に失敗しました' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await get<{ photo_filename: string }>(
      'SELECT photo_filename FROM karte_entries WHERE id = ?',
      [Number(id)]
    );
    const result = await run('DELETE FROM karte_entries WHERE id = ?', [Number(id)]);
    if (result.rowsAffected === 0) {
      return NextResponse.json({ error: '記録が見つかりません' }, { status: 404 });
    }
    if (existing?.photo_filename) await deleteImage(existing.photo_filename);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 });
  }
}
