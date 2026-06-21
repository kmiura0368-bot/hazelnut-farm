import { NextRequest, NextResponse } from 'next/server';
import { get, run } from '@/lib/turso';
import { Transaction } from '@/lib/types';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { type, date, category, amount, memo } = body;

    const existing = await get<Transaction>('SELECT * FROM transactions WHERE id = ?', [id]);
    if (!existing) {
      return NextResponse.json({ error: '取引が見つかりません' }, { status: 404 });
    }

    await run(
      `UPDATE transactions SET type = ?, date = ?, category = ?, amount = ?, memo = ? WHERE id = ?`,
      [
        type ?? existing.type,
        date ?? existing.date,
        category ?? existing.category,
        amount !== undefined ? Number(amount) : existing.amount,
        memo !== undefined ? memo : existing.memo,
        id,
      ]
    );

    const updated = await get<Transaction>('SELECT * FROM transactions WHERE id = ?', [id]);
    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: '取引の更新に失敗しました' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await run('DELETE FROM transactions WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: '取引の削除に失敗しました' }, { status: 500 });
  }
}
