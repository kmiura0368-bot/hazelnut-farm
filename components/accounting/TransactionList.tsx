'use client';

import { useState, useEffect, useCallback } from 'react';
import { CATEGORIES, catLabel, ALL_CATS } from '@/lib/categories';
import { fmt } from '@/lib/accounting-utils';
import { Transaction } from '@/lib/types';

const PAGE_SIZE = 20;

export default function TransactionList() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Transaction>>({});
  const [toast, setToast] = useState<string | null>(null);

  // Filters
  const currentYear = String(new Date().getFullYear());
  const [filterYear, setFilterYear] = useState(currentYear);
  const [filterMonth, setFilterMonth] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterKeyword, setFilterKeyword] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const buildQuery = useCallback(() => {
    const p = new URLSearchParams();
    if (filterYear) p.set('year', filterYear);
    if (filterMonth) p.set('month', filterMonth);
    if (filterType) p.set('type', filterType);
    if (filterCategory) p.set('category', filterCategory);
    if (filterKeyword) p.set('keyword', filterKeyword);
    return p.toString();
  }, [filterYear, filterMonth, filterType, filterCategory, filterKeyword]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/transactions?' + buildQuery());
      if (res.ok) setTransactions(await res.json());
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => {
    fetchData();
    setPage(1);
  }, [fetchData]);

  const handleDelete = async (id: string) => {
    if (!confirm('この取引を削除しますか？')) return;
    const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setTransactions(prev => prev.filter(t => t.id !== id));
      showToast('削除しました');
    } else {
      showToast('削除に失敗しました');
    }
  };

  const startEdit = (t: Transaction) => {
    setEditId(t.id);
    setEditData({ type: t.type, date: t.date, category: t.category, amount: t.amount, memo: t.memo });
  };

  const handleSaveEdit = async () => {
    if (!editId) return;
    const res = await fetch(`/api/transactions/${editId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editData),
    });
    if (res.ok) {
      const updated: Transaction = await res.json();
      setTransactions(prev => prev.map(t => t.id === editId ? updated : t));
      setEditId(null);
      showToast('更新しました');
    } else {
      showToast('更新に失敗しました');
    }
  };

  const handleRemoveSample = async () => {
    if (!confirm('サンプルデータを削除しますか？')) return;
    const res = await fetch('/api/sample', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove' }),
    });
    if (res.ok) { fetchData(); showToast('サンプルデータを削除しました'); }
    else showToast('削除に失敗しました');
  };

  const handleExportCsv = () => {
    const url = '/api/transactions/csv?' + buildQuery();
    window.open(url, '_blank');
  };

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const paged = transactions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(transactions.length / PAGE_SIZE);

  const years = Array.from({ length: 6 }, (_, i) => String(new Date().getFullYear() - i));
  const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));

  const editCats = editData.type ? CATEGORIES[editData.type] : ALL_CATS;

  return (
    <div className="p-4">
      {toast && (
        <div className="fixed top-14 right-4 bg-green-700 text-white px-4 py-2 rounded shadow-lg z-50 text-sm">
          {toast}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
        <div className="flex flex-wrap gap-2 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">年</label>
            <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm">
              <option value="">全年</option>
              {years.map(y => <option key={y} value={y}>{y}年</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">月</label>
            <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm">
              <option value="">全月</option>
              {months.map(m => <option key={m} value={m}>{Number(m)}月</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">種別</label>
            <select value={filterType} onChange={e => setFilterType(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm">
              <option value="">全種別</option>
              <option value="income">収入</option>
              <option value="expense">支出</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">カテゴリ</label>
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm">
              <option value="">全カテゴリ</option>
              {ALL_CATS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">キーワード</label>
            <input type="text" value={filterKeyword} onChange={e => setFilterKeyword(e.target.value)}
              placeholder="メモ検索..."
              className="border border-gray-300 rounded px-2 py-1.5 text-sm w-32" />
          </div>
          <button onClick={fetchData}
            className="bg-green-700 text-white px-3 py-1.5 rounded text-sm hover:bg-green-600">
            検索
          </button>
          <div className="flex-1" />
          <button onClick={handleExportCsv}
            className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-500">
            CSVエクスポート
          </button>
          <button onClick={handleRemoveSample}
            className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded text-sm hover:bg-gray-300">
            サンプル削除
          </button>
        </div>
      </div>

      {/* Summary row */}
      <div className="flex gap-4 mb-3 text-sm">
        <span className="text-gray-600">{transactions.length} 件</span>
        <span className="text-green-700 font-medium">収入: ¥{fmt(totalIncome)}</span>
        <span className="text-red-600 font-medium">支出: ¥{fmt(totalExpense)}</span>
        <span className={`font-medium ${totalIncome - totalExpense >= 0 ? 'text-blue-700' : 'text-orange-600'}`}>
          差引: ¥{fmt(totalIncome - totalExpense)}
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 text-sm">読み込み中...</div>
        ) : paged.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">データがありません</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs">
              <tr>
                <th className="px-3 py-2 text-left">日付</th>
                <th className="px-3 py-2 text-left">種別</th>
                <th className="px-3 py-2 text-left">カテゴリ</th>
                <th className="px-3 py-2 text-right">金額</th>
                <th className="px-3 py-2 text-left">メモ</th>
                <th className="px-3 py-2 text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {paged.map(t => (
                editId === t.id ? (
                  <tr key={t.id} className="bg-yellow-50 border-t border-gray-100">
                    <td className="px-3 py-1.5">
                      <input type="date" value={editData.date ?? ''} onChange={e => setEditData(p => ({ ...p, date: e.target.value }))}
                        className="border rounded px-1 py-0.5 text-xs w-32" />
                    </td>
                    <td className="px-3 py-1.5">
                      <select value={editData.type ?? ''} onChange={e => setEditData(p => ({ ...p, type: e.target.value as 'income' | 'expense', category: '' }))}
                        className="border rounded px-1 py-0.5 text-xs">
                        <option value="income">収入</option>
                        <option value="expense">支出</option>
                      </select>
                    </td>
                    <td className="px-3 py-1.5">
                      <select value={editData.category ?? ''} onChange={e => setEditData(p => ({ ...p, category: e.target.value }))}
                        className="border rounded px-1 py-0.5 text-xs">
                        {editCats.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-1.5">
                      <input type="number" value={editData.amount ?? ''} onChange={e => setEditData(p => ({ ...p, amount: Number(e.target.value) }))}
                        className="border rounded px-1 py-0.5 text-xs w-24 text-right" />
                    </td>
                    <td className="px-3 py-1.5">
                      <input type="text" value={editData.memo ?? ''} onChange={e => setEditData(p => ({ ...p, memo: e.target.value }))}
                        className="border rounded px-1 py-0.5 text-xs w-full" />
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      <button onClick={handleSaveEdit} className="text-green-700 hover:underline mr-2 text-xs">保存</button>
                      <button onClick={() => setEditId(null)} className="text-gray-500 hover:underline text-xs">キャンセル</button>
                    </td>
                  </tr>
                ) : (
                  <tr key={t.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-600">{t.date}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        t.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {t.type === 'income' ? '収入' : '支出'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-700">{catLabel(t.category)}</td>
                    <td className="px-3 py-2 text-right font-medium">
                      <span className={t.type === 'income' ? 'text-green-700' : 'text-red-600'}>
                        ¥{fmt(t.amount)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-500 max-w-xs truncate">{t.memo}</td>
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => startEdit(t)} className="text-blue-600 hover:underline mr-3 text-xs">編集</button>
                      <button onClick={() => handleDelete(t.id)} className="text-red-500 hover:underline text-xs">削除</button>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center gap-2 mt-4 justify-center">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1 border rounded text-sm disabled:opacity-50 hover:bg-gray-50">
            前へ
          </button>
          <span className="text-sm text-gray-600">{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-3 py-1 border rounded text-sm disabled:opacity-50 hover:bg-gray-50">
            次へ
          </button>
        </div>
      )}
    </div>
  );
}
