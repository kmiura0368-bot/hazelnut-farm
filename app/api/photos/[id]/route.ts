import { NextRequest, NextResponse } from 'next/server';
import { get, run } from '@/lib/turso';
import { deleteImage } from '@/lib/storage';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const photo = await get<{ filename: string }>('SELECT * FROM photos WHERE id = ?', [id]);
    if (!photo) return NextResponse.json({ error: '見つかりません' }, { status: 404 });

    await deleteImage(photo.filename);
    await run('DELETE FROM photos WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    await run('UPDATE photos SET tags = ?, caption = ? WHERE id = ?', [
      body.tags ?? '',
      body.caption ?? '',
      id,
    ]);
    const photo = await get('SELECT * FROM photos WHERE id = ?', [id]);
    return NextResponse.json(photo);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
