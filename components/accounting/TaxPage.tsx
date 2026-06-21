'use client';

import { useState, useEffect, useCallback } from 'react';
import { CATEGORIES, catLabel } from '@/lib/categories';
import { fmt } from '@/lib/accounting-utils';
import { Transaction } from '@/lib/types';

const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

export default function TaxPage() {
  const [year, setYear] = useState(String(new Date().getFullYear()));
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

  const income = transactions.filter(t => t.type === 'income');
  const expense = transactions.filter(t => t.type === 'expense');

  const incomeBycat = CATEGORIES.income.map(c => ({
    ...c,
    total: income.filter(t => t.category === c.id).reduce((s, t) => s + t.amount, 0),
  }));
  const expenseBycat = CATEGORIES.expense.map(c => ({
    ...c,
    total: expense.filter(t => t.category === c.id).reduce((s, t) => s + t.amount, 0),
  }));

  const totalIncome = incomeBycat.reduce((s, c) => s + c.total, 0);
  const totalExpense = expenseBycat.reduce((s, c) => s + c.total, 0);
  const netProfit = totalIncome - totalExpense;

  const monthlyIncome = Array.from({ length: 12 }, (_, m) => {
    const month = String(m + 1).padStart(2, '0');
    return income.filter(t => t.date.slice(5, 7) === month).reduce((s, t) => s + t.amount, 0);
  });

  const handlePrint = () => window.print();

  const handleTaxCsv = () => {
    const BOM = '\uFEFF';
    const rows = [
      ['区分', 'カテゴリ', '金額（円）'],
      ...incomeBycat.filter(c => c.total > 0).map(c => ['収入', c.label, String(c.total)]),
      ['収入合計', '', String(totalIncome)],
      ...expenseBycat.filter(c => c.total > 0).map(c => ['経費', c.label, String(c.total)]),
      ['経費合計', '', String(totalExpense)],
      ['農業所得', '', String(netProfit)],
    ];
    const csv = BOM + rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `tax_${year}.csv`;
    a.click();
  };

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-4 no-print">
        <label className="text-sm font-medium text-gray-700">年度:</label>
        <select value={year} onChange={e => setYear(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm">
          {years.map(y => <option key={y} value={y}>{y}年</option>)}
        </select>
        <button onClick={handlePrint}
          className="bg-gray-700 text-white px-4 py-1.5 rounded text-sm hover:bg-gray-600">
          印刷
        </button>
        <button onClick={handleTaxCsv}
          className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-500">
          CSVエクスポート
        </button>
        {loading && <span className="text-sm text-gray-400 animate-pulse">読み込み中...</span>}
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-xs text-yellow-800 no-print">
        ※ この画面は確定申告の参考資料です。正式な申告書ではありません。申告の際は税務署または税理士にご相談ください。
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-base font-bold text-center text-gray-800 mb-1">農業所得収支内訳書（参考）</h2>
        <p className="text-center text-sm text-gray-500 mb-6">{year}年分</p>

        {/* Income section */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-1 mb-3">収入の部</h3>
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-500">
              <tr>
                <th className="text-left pb-1">区分</th>
                <th className="text-right pb-1">金額（円）</th>
              </tr>
            </thead>
            <tbody>
              {incomeBycat.map(c => (
                <tr key={c.id} className="border-t border-gray-50">
                  <td className="py-1 text-gray-700">{c.label}</td>
                  <td className="py-1 text-right">{c.total > 0 ? `¥${fmt(c.total)}` : '-'}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-gray-300 font-semibold">
                <td className="py-1.5 text-gray-800">収入合計</td>
                <td className="py-1.5 text-right text-green-700">¥{fmt(totalIncome)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Expense section */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-1 mb-3">必要経費の部</h3>
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-500">
              <tr>
                <th className="text-left pb-1">区分</th>
                <th className="text-right pb-1">金額（円）</th>
              </tr>
            </thead>
            <tbody>
              {expenseBycat.map(c => (
                <tr key={c.id} className="border-t border-gray-50">
                  <td className="py-1 text-gray-700">{c.label}</td>
                  <td className="py-1 text-right">{c.total > 0 ? `¥${fmt(c.total)}` : '-'}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-gray-300 font-semibold">
                <td className="py-1.5 text-gray-800">経費合計</td>
                <td className="py-1.5 text-right text-red-600">¥{fmt(totalExpense)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Profit calculation */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-1 mb-3">損益計算</h3>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-t border-gray-50">
                <td className="py-1 text-gray-700">収入合計</td>
                <td className="py-1 text-right">¥{fmt(totalIncome)}</td>
              </tr>
              <tr className="border-t border-gray-50">
                <td className="py-1 text-gray-700">必要経費合計</td>
                <td className="py-1 text-right">¥{fmt(totalExpense)}</td>
              </tr>
              <tr className="border-t-2 border-gray-300 font-bold">
                <td className="py-1.5 text-gray-800">農業所得（参考）</td>
                <td className={`py-1.5 text-right text-lg ${netProfit >= 0 ? 'text-blue-700' : 'text-orange-600'}`}>
                  ¥{fmt(netProfit)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Monthly income breakdown */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-1 mb-3">月次収入内訳</h3>
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-500">
              <tr>
                {MONTHS.map(m => <th key={m} className="text-right pb-1">{m}</th>)}
                <th className="text-right pb-1">合計</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                {monthlyIncome.map((v, i) => (
                  <td key={i} className="text-right py-1 text-xs">{v > 0 ? `¥${fmt(v)}` : '-'}</td>
                ))}
                <td className="text-right py-1 font-semibold text-green-700 text-xs">¥{fmt(totalIncome)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
