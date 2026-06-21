'use client';

import { useState, useEffect, useCallback } from 'react';
import { CATEGORIES } from '@/lib/categories';
import { fmt } from '@/lib/accounting-utils';
import { Transaction } from '@/lib/types';

const today = () => new Date().toISOString().slice(0, 10);

interface SummaryCards {
  income: number;
  expense: number;
  profit: number;
  count: number;
}

export default function TransactionForm() {
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [date, setDate] = useState(today());
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [summary, setSummary] = useState<SummaryCards>({ income: 0, expense: 0, profit: 0, count: 0 });

  const cats = CATEGORIES[type];

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchSummary = useCallback(async () => {
    const year = new Date().getFullYear();
    const res = await fetch(`/api/transactions?year=${year}`);
    if (!res.ok) return;
    const data: Transaction[] = await res.json();
    let income = 0, expense = 0;
    for (const t of data) {
      if (t.type === 'income') income += t.amount;
      else expense += t.amount;
    }
    setSummary({ income, expense, profit: income - expense, count: data.length });
  }, []);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  const handleTypeChange = (t: 'income' | 'expense') => {
    setType(t);
    setCategory('');
  };

  const handleSave = async () => {
    if (!date || !category || !amount) {
      showToast('日付・カテゴリ・金額は必須です');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, date, category, amount: Number(amount), memo }),
      });
      if (!res.ok) throw new Error('保存失敗');
      showToast('取引を保存しました');
      setDate(today());
      setCategory('');
      setAmount('');
      setMemo('');
      fetchSummary();
    } catch {
      showToast('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setType('expense');
    setDate(today());
    setCategory('');
    setAmount('');
    setMemo('');
  };

  const year = new Date().getFullYear();

  return (
    <div className="p-4 max-w-2xl mx-auto">
      {toast && (
        <div className="fixed top-14 right-4 bg-green-700 text-white px-4 py-2 rounded shadow-lg z-50 text-sm">
          {toast}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-lg p-3 shadow-sm border border-green-100">
          <div className="text-xs text-gray-500">{year}年 収入</div>
          <div className="text-lg font-bold text-green-700">¥{fmt(summary.income)}</div>
        </div>
        <div className="bg-white rounded-lg p-3 shadow-sm border border-red-100">
          <div className="text-xs text-gray-500">{year}年 支出</div>
          <div className="text-lg font-bold text-red-600">¥{fmt(summary.expense)}</div>
        </div>
        <div className={`bg-white rounded-lg p-3 shadow-sm border ${summary.profit >= 0 ? 'border-blue-100' : 'border-orange-100'}`}>
          <div className="text-xs text-gray-500">{year}年 利益</div>
          <div className={`text-lg font-bold ${summary.profit >= 0 ? 'text-blue-700' : 'text-orange-600'}`}>
            ¥{fmt(summary.profit)}
          </div>
        </div>
        <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
          <div className="text-xs text-gray-500">{year}年 件数</div>
          <div className="text-lg font-bold text-gray-700">{summary.count} 件</div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-base font-bold text-gray-700 mb-4">取引を入力</h2>

        {/* Type toggle */}
        <div className="flex mb-4 rounded-lg overflow-hidden border border-gray-200 w-fit">
          <button
            onClick={() => handleTypeChange('income')}
            className={`px-6 py-2 text-sm font-medium transition-colors ${
              type === 'income' ? 'bg-green-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            収入
          </button>
          <button
            onClick={() => handleTypeChange('expense')}
            className={`px-6 py-2 text-sm font-medium transition-colors ${
              type === 'expense' ? 'bg-red-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            支出
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">日付 <span className="text-red-500">*</span></label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">カテゴリ <span className="text-red-500">*</span></label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              <option value="">-- カテゴリを選択 --</option>
              {cats.map(c => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">金額（円） <span className="text-red-500">*</span></label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              min="0"
              placeholder="例: 50000"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">メモ</label>
            <input
              type="text"
              value={memo}
              onChange={e => setMemo(e.target.value)}
              placeholder="例: JAマート 肥料購入"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-green-700 hover:bg-green-600 disabled:bg-green-400 text-white font-medium py-2 rounded-lg text-sm transition-colors"
            >
              {saving ? '保存中...' : '保存'}
            </button>
            <button
              onClick={handleReset}
              className="px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 rounded-lg text-sm transition-colors"
            >
              リセット
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
