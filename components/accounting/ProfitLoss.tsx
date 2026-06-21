'use client';

import { useState, useEffect, useCallback } from 'react';
import { fmt } from '@/lib/accounting-utils';
import { catLabel } from '@/lib/categories';
import { Transaction } from '@/lib/types';

type Period = 'annual' | 'q1' | 'q2' | 'q3' | 'q4';

const PERIOD_MONTHS: Record<Period, string[]> = {
  annual: ['01','02','03','04','05','06','07','08','09','10','11','12'],
  q1: ['01','02','03'],
  q2: ['04','05','06'],
  q3: ['07','08','09'],
  q4: ['10','11','12'],
};

const PERIOD_LABELS: Record<Period, string> = {
  annual: '年間', q1: 'Q1（1-3月）', q2: 'Q2（4-6月）', q3: 'Q3（7-9月）', q4: 'Q4（10-12月）',
};

// PL category groups
const SALES_CATS = ['hazelnut_sales', 'processed_sales', 'contract_farming'];
const COGS_CATS = ['seedling', 'fertilizer', 'pesticide'];
const SGA_CATS = ['tools', 'fuel', 'utility', 'labor', 'repair', 'shipping', 'communication', 'insurance', 'other_expense'];
const NON_OP_INCOME_CATS = ['subsidy', 'other_income'];
const NON_OP_EXPENSE_CATS = ['rent', 'depreciation'];

export default function ProfitLoss() {
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [period, setPeriod] = useState<Period>('annual');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  const years = Array.from({ length: 6 }, (_, i) => String(new Date().getFullYear() - i));

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/transactions?year=${year}`);
      if (res.ok) setTransactions(await res.json());
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const months = PERIOD_MONTHS[period];
  const filtered = transactions.filter(t => months.includes(t.date.slice(5, 7)));

  const sumCat = (cats: string[], type: 'income' | 'expense') =>
    filtered.filter(t => t.type === type && cats.includes(t.category)).reduce((s, t) => s + t.amount, 0);

  const catAmounts = (cats: string[], type: 'income' | 'expense') =>
    cats.map(id => ({ id, amount: filtered.filter(t => t.type === type && t.category === id).reduce((s, t) => s + t.amount, 0) }));

  const sales = sumCat(SALES_CATS, 'income');
  const cogs = sumCat(COGS_CATS, 'expense');
  const grossProfit = sales - cogs;
  const sga = sumCat(SGA_CATS, 'expense');
  const opProfit = grossProfit - sga;
  const nonOpIncome = sumCat(NON_OP_INCOME_CATS, 'income');
  const nonOpExpense = sumCat(NON_OP_EXPENSE_CATS, 'expense');
  const netProfit = opProfit + nonOpIncome - nonOpExpense;

  const Row = ({ label, amount, indent = false, bold = false, sign = 1 }: {
    label: string; amount: number; indent?: boolean; bold?: boolean; sign?: number;
  }) => (
    <tr className={`border-t ${bold ? 'border-gray-300 font-semibold' : 'border-gray-50'}`}>
      <td className={`py-1.5 text-sm ${indent ? 'pl-6' : ''} ${bold ? 'text-gray-800' : 'text-gray-600'}`}>{label}</td>
      <td className={`py-1.5 text-right text-sm ${
        bold
          ? (amount * sign >= 0 ? 'text-blue-700' : 'text-red-600')
          : 'text-gray-700'
      }`}>
        {amount > 0 ? `¥${fmt(amount)}` : (bold && amount < 0 ? `▲¥${fmt(-amount)}` : '-')}
      </td>
    </tr>
  );

  const SubtotalRow = ({ label, amount, positive = true }: { label: string; amount: number; positive?: boolean }) => (
    <tr className="border-t-2 border-gray-300">
      <td className="py-2 font-bold text-sm text-gray-800">{label}</td>
      <td className={`py-2 text-right font-bold text-sm ${
        (positive ? amount >= 0 : amount <= 0) ? 'text-blue-700' : 'text-red-600'
      }`}>
        {amount >= 0 ? `¥${fmt(amount)}` : `▲¥${fmt(-amount)}`}
      </td>
    </tr>
  );

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <label className="text-sm font-medium text-gray-700">年度:</label>
        <select value={year} onChange={e => setYear(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm">
          {years.map(y => <option key={y} value={y}>{y}年</option>)}
        </select>

        <div className="flex gap-1">
          {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                period === p ? 'bg-green-700 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}>
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
        {loading && <span className="text-sm text-gray-400 animate-pulse">読み込み中...</span>}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-base font-bold text-center text-gray-800 mb-1">損益計算書</h2>
        <p className="text-center text-sm text-gray-500 mb-4">{year}年 {PERIOD_LABELS[period]}</p>

        <table className="w-full">
          <thead className="text-xs text-gray-500">
            <tr>
              <th className="text-left pb-2">科目</th>
              <th className="text-right pb-2">金額（円）</th>
            </tr>
          </thead>
          <tbody>
            {/* Sales */}
            <tr className="border-t border-gray-200">
              <td colSpan={2} className="pt-2 pb-1 text-xs font-semibold text-gray-500">売上高</td>
            </tr>
            {catAmounts(SALES_CATS, 'income').map(c => (
              <Row key={c.id} label={catLabel(c.id)} amount={c.amount} indent />
            ))}
            <SubtotalRow label="売上高合計" amount={sales} />

            {/* COGS */}
            <tr className="border-t border-gray-200">
              <td colSpan={2} className="pt-2 pb-1 text-xs font-semibold text-gray-500">売上原価</td>
            </tr>
            {catAmounts(COGS_CATS, 'expense').map(c => (
              <Row key={c.id} label={catLabel(c.id)} amount={c.amount} indent />
            ))}
            <SubtotalRow label="売上原価合計" amount={cogs} />

            <SubtotalRow label="売上総利益" amount={grossProfit} />

            {/* SG&A */}
            <tr className="border-t border-gray-200">
              <td colSpan={2} className="pt-2 pb-1 text-xs font-semibold text-gray-500">販売費及び一般管理費</td>
            </tr>
            {catAmounts(SGA_CATS, 'expense').map(c => (
              <Row key={c.id} label={catLabel(c.id)} amount={c.amount} indent />
            ))}
            <SubtotalRow label="販管費合計" amount={sga} />

            <SubtotalRow label="営業利益" amount={opProfit} />

            {/* Non-op income */}
            <tr className="border-t border-gray-200">
              <td colSpan={2} className="pt-2 pb-1 text-xs font-semibold text-gray-500">営業外収益</td>
            </tr>
            {catAmounts(NON_OP_INCOME_CATS, 'income').map(c => (
              <Row key={c.id} label={catLabel(c.id)} amount={c.amount} indent />
            ))}

            {/* Non-op expense */}
            <tr className="border-t border-gray-200">
              <td colSpan={2} className="pt-2 pb-1 text-xs font-semibold text-gray-500">営業外費用</td>
            </tr>
            {catAmounts(NON_OP_EXPENSE_CATS, 'expense').map(c => (
              <Row key={c.id} label={catLabel(c.id)} amount={c.amount} indent />
            ))}

            <tr className="border-t-2 border-gray-400">
              <td className="py-2 font-bold text-gray-800">純利益</td>
              <td className={`py-2 text-right font-bold text-lg ${netProfit >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
                {netProfit >= 0 ? `¥${fmt(netProfit)}` : `▲¥${fmt(-netProfit)}`}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
