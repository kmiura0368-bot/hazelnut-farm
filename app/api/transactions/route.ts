import { NextRequest, NextResponse } from 'next/server';
import { all, get, run } from '@/lib/turso';
import { generateId } from '@/lib/accounting-utils';
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

    sql += ' ORDER BY date DESC, created_at DESC';

    const rows = await all<Transaction>(sql, params);
    return NextResponse.json(rows);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: '取引一覧の取得に失敗しました' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, date, category, amount, memo, is_sample } = body;

    if (!type || !date || !category || amount === undefined || amount === null) {
      return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 });
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date) || isNaN(new Date(date).getTime())) {
      return NextResponse.json({ error: '日付の形式が正しくありません' }, { status: 400 });
    }

    if (Number(amount) <= 0) {
      return NextResponse.json({ error: '金額は1以上の数値を入力してください' }, { status: 400 });
    }

    const id = generateId();
    await run(
      `INSERT INTO transactions (id, type, date, category, amount, memo, is_sample)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, type, date, category, Number(amount), memo ?? '', is_sample ? 1 : 0]
    );

    const created = await get<Transaction>('SELECT * FROM transactions WHERE id = ?', [id]);
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: '取引の保存に失敗しました' }, { status: 500 });
  }
}
