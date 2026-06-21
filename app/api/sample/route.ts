import { NextRequest, NextResponse } from 'next/server';
import { get, run, batch } from '@/lib/turso';
import { generateId } from '@/lib/accounting-utils';

function getSampleData(y: number) {
  return [
    { type: 'income', date: `${y}-03-15`, category: 'hazelnut_sales', amount: 180000, memo: '道の駅・直売所 春出荷' },
    { type: 'income', date: `${y}-09-10`, category: 'hazelnut_sales', amount: 420000, memo: 'JA出荷 秋収穫分' },
    { type: 'income', date: `${y}-10-05`, category: 'processed_sales', amount: 85000, memo: 'ペースト・ナッツオイル直販' },
    { type: 'income', date: `${y}-04-01`, category: 'subsidy', amount: 150000, memo: '農業経営強化補助金' },
    { type: 'expense', date: `${y}-01-15`, category: 'utility', amount: 25000, memo: '電気・水道代（農業用）' },
    { type: 'expense', date: `${y}-02-20`, category: 'fertilizer', amount: 38000, memo: '有機肥料 春季施肥' },
    { type: 'expense', date: `${y}-03-05`, category: 'pesticide', amount: 22000, memo: '殺菌剤・除草剤' },
    { type: 'expense', date: `${y}-03-20`, category: 'insurance', amount: 35000, memo: '農業共済掛金' },
    { type: 'expense', date: `${y}-04-15`, category: 'seedling', amount: 95000, memo: '新規苗木50本' },
    { type: 'expense', date: `${y}-05-10`, category: 'tools', amount: 65000, memo: '剪定機・収穫用網' },
    { type: 'expense', date: `${y}-06-01`, category: 'labor', amount: 120000, memo: 'アルバイト3名（草刈り）' },
    { type: 'expense', date: `${y}-07-20`, category: 'fuel', amount: 18000, memo: '農機具燃料費' },
    { type: 'expense', date: `${y}-08-05`, category: 'repair', amount: 45000, memo: 'トラクター修繕' },
    { type: 'expense', date: `${y}-08-20`, category: 'fertilizer', amount: 42000, memo: '追肥 夏季' },
    { type: 'expense', date: `${y}-09-01`, category: 'labor', amount: 180000, memo: '収穫期アルバイト' },
    { type: 'expense', date: `${y}-09-20`, category: 'shipping', amount: 32000, memo: 'JA出荷運賃' },
    { type: 'expense', date: `${y}-11-10`, category: 'rent', amount: 60000, memo: '農地賃借料（年額）' },
    { type: 'expense', date: `${y}-12-01`, category: 'depreciation', amount: 80000, memo: '農業機械減価償却費' },
  ];
}

export async function POST(req: NextRequest) {
  try {
    const { action } = await req.json();

    if (action === 'remove') {
      await run('DELETE FROM transactions WHERE is_sample = 1');
      return NextResponse.json({ success: true });
    }

    if (action === 'add') {
      const countRow = await get<{ cnt: number }>('SELECT COUNT(*) as cnt FROM transactions');
      if ((countRow?.cnt ?? 0) > 0) {
        return NextResponse.json({ error: 'すでにデータが存在します。サンプルデータは取引が0件のときのみ追加できます。' }, { status: 400 });
      }

      const y = new Date().getFullYear();
      const samples = getSampleData(y);
      await batch(
        samples.map((s) => ({
          sql: `INSERT INTO transactions (id, type, date, category, amount, memo, is_sample)
                VALUES (?, ?, ?, ?, ?, ?, 1)`,
          args: [generateId(), s.type, s.date, s.category, s.amount, s.memo],
        }))
      );
      return NextResponse.json({ success: true, count: samples.length });
    }

    return NextResponse.json({ error: '不明なアクション' }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'サンプルデータの操作に失敗しました' }, { status: 500 });
  }
}
