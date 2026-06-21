import { NextRequest, NextResponse } from 'next/server';
import { all } from '@/lib/turso';
import { catLabel } from '@/lib/categories';
import { Transaction } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const year = searchParams.get('year');
    const month = searchParams.get('month');
    const type = searchParams.get('type');
    const category = searchParams.get('category');
    const keyword = searchParams.get('keyword');

    let sql = 'SELECT * FROM transactions WHERE 1=1';
    const params: (string | number)[] = [];

    if (year) { sql += ' AND strftime(\'%Y\', date) = ?'; params.push(year); }
    if (month) { sql += ' AND strftime(\'%m\', date) = ?'; params.push(month.padStart(2, '0')); }
    if (type) { sql += ' AND type = ?'; params.push(type); }
    if (category) { sql += ' AND category = ?'; params.push(category); }
    if (keyword) { sql += ' AND memo LIKE ?'; params.push(`%${keyword}%`); }

    sql += ' ORDER BY date ASC';

    const rows = await all<Transaction>(sql, params);

    const BOM = '﻿';
    const header = '日付,種別,カテゴリ,金額（円）,メモ\n';
    const lines = rows.map(r => {
      const typeLabel = r.type === 'income' ? '収入' : '支出';
      const memo = (r.memo ?? '').replace(/"/g, '""');
      return `${r.date},${typeLabel},"${catLabel(r.category)}",${r.amount},"${memo}"`;
    });

    const csv = BOM + header + lines.join('\n');
    const filename = year ? `accounting_${year}.csv` : 'accounting.csv';

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'CSVエクスポートに失敗しました' }, { status: 500 });
  }
}
