import { NextRequest, NextResponse } from 'next/server';
import { run } from '@/lib/turso';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await run('DELETE FROM growth_logs WHERE id = ?', [Number(id)]);
    if (result.rowsAffected === 0) {
      return NextResponse.json({ error: '記録が見つかりません' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 });
  }
}
