import { NextRequest, NextResponse } from 'next/server';
import { get } from '@/lib/turso';

// DBに保存した画像を配信する。/api/image/{id}
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const row = await get<{ mime: string; data: ArrayBuffer | Uint8Array }>(
      'SELECT mime, data FROM image_store WHERE id = ?',
      [Number(id)]
    );
    if (!row) {
      return new NextResponse('Not found', { status: 404 });
    }
    const bytes =
      row.data instanceof Uint8Array ? row.data : new Uint8Array(row.data as ArrayBuffer);
    const mime = row.mime || 'image/jpeg';
    return new NextResponse(bytes as unknown as BodyInit, {
      headers: {
        'Content-Type': mime,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (e) {
    console.error(e);
    return new NextResponse('Error', { status: 500 });
  }
}
