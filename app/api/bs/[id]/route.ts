import { NextRequest, NextResponse } from 'next/server';
import { run } from '@/lib/turso';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // id here is the date string
    await run('DELETE FROM bs_snapshots WHERE date = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: '貸借対照表の削除に失敗しました' }, { status: 500 });
  }
}
