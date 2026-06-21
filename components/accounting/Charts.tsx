'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Transaction } from '@/lib/types';
import { CATEGORIES, catLabel } from '@/lib/categories';
import { fmt } from '@/lib/accounting-utils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

const EXPENSE_COLORS = [
  '#3a7d44', '#c0392b', '#2980b9', '#8e44ad', '#e67e22',
  '#1abc9c', '#f39c12', '#d35400', '#27ae60', '#2c3e50',
  '#e74c3c', '#16a085', '#8e44ad', '#f1c40f',
];

export default function Charts() {
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

  // Monthly data
  const monthlyData = Array.from({ length: 12 }, (_, m) => {
    const month = String(m + 1).padStart(2, '0');
    const mTx = transactions.filter(t => t.date.slice(5, 7) === month);
    const income = mTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = mTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { income, expense, profit: income - expense };
  });

  // Category totals for expense
  const expenseByCat = CATEGORIES.expense.map(c => {
    const total = transactions.filter(t => t.type === 'expense' && t.category === c.id).reduce((s, t) => s + t.amount, 0);
    return { id: c.id, label: c.label, total };
  }).filter(c => c.total > 0);

  const barData = {
    labels: MONTHS,
    datasets: [
      {
        label: '収入',
        data: monthlyData.map(d => d.income),
        backgroundColor: 'rgba(58, 125, 68, 0.8)',
        borderRadius: 3,
      },
      {
        label: '支出',
        data: monthlyData.map(d => d.expense),
        backgroundColor: 'rgba(192, 57, 43, 0.8)',
        borderRadius: 3,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const },
      title: { display: true, text: `${year}年 月次収支` },
      tooltip: {
        callbacks: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label: (ctx: any) => `${ctx.dataset.label}: ¥${fmt(ctx.parsed.y ?? 0)}`,
        },
      },
    },
    scales: {
      y: {
        ticks: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          callback: (v: any) => `¥${fmt(Number(v))}`,
        },
      },
    },
  };

  const doughnutData = {
    labels: expenseByCat.map(c => c.label),
    datasets: [{
      data: expenseByCat.map(c => c.total),
      backgroundColor: EXPENSE_COLORS.slice(0, expenseByCat.length),
      borderWidth: 1,
    }],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: true, text: `${year}年 支出カテゴリ別` },
      tooltip: {
        callbacks: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label: (ctx: any) => `${ctx.label}: ¥${fmt(ctx.parsed ?? 0)}`,
        },
      },
    },
  };

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  return (
    <div className="p-4">
      {/* Year selector */}
      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm font-medium text-gray-700">年度:</label>
        <select value={year} onChange={e => setYear(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm">
          {years.map(y => <option key={y} value={y}>{y}年</option>)}
        </select>
        {loading && <span className="text-sm text-gray-400 animate-pulse">読み込み中...</span>}
      </div>

      {transactions.length === 0 && !loading ? (
        <div className="text-center text-gray-400 py-16 text-sm">
          {year}年のデータがありません
        </div>
      ) : (
        <>
          {/* Bar chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
            <div style={{ height: 300 }}>
              <Bar data={barData} options={barOptions} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Doughnut chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div style={{ height: 220 }}>
                {expenseByCat.length > 0 ? (
                  <Doughnut data={doughnutData} options={doughnutOptions} />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm">支出データなし</div>
                )}
              </div>
              {/* Custom legend */}
              <div className="mt-3 space-y-1">
                {expenseByCat.map((c, i) => (
                  <div key={c.id} className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: EXPENSE_COLORS[i] }} />
                    <span className="text-gray-600 flex-1">{c.label}</span>
                    <span className="font-medium">¥{fmt(c.total)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">月次サマリー</h3>
              <table className="w-full text-xs">
                <thead className="text-gray-500">
                  <tr>
                    <th className="text-left pb-1">月</th>
                    <th className="text-right pb-1">収入</th>
                    <th className="text-right pb-1">支出</th>
                    <th className="text-right pb-1">損益</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyData.map((d, i) => (
                    <tr key={i} className="border-t border-gray-50">
                      <td className="py-0.5 text-gray-600">{i + 1}月</td>
                      <td className="py-0.5 text-right text-green-700">{d.income > 0 ? `¥${fmt(d.income)}` : '-'}</td>
                      <td className="py-0.5 text-right text-red-600">{d.expense > 0 ? `¥${fmt(d.expense)}` : '-'}</td>
                      <td className={`py-0.5 text-right font-medium ${d.profit >= 0 ? 'text-blue-700' : 'text-orange-600'}`}>
                        {(d.income > 0 || d.expense > 0) ? `¥${fmt(d.profit)}` : '-'}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-gray-200 font-semibold">
                    <td className="py-1 text-gray-700">合計</td>
                    <td className="py-1 text-right text-green-700">¥{fmt(totalIncome)}</td>
                    <td className="py-1 text-right text-red-600">¥{fmt(totalExpense)}</td>
                    <td className={`py-1 text-right ${totalIncome - totalExpense >= 0 ? 'text-blue-700' : 'text-orange-600'}`}>
                      ¥{fmt(totalIncome - totalExpense)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
