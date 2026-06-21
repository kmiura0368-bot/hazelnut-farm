'use client';

import { useState, useEffect, useCallback } from 'react';
import { fmt } from '@/lib/accounting-utils';
import { BSSnapshot } from '@/lib/types';

const CURRENT_ASSETS = [
  { key: 'cash', label: '現金・預金' },
  { key: 'ar', label: '売掛金' },
  { key: 'inventory', label: '棚卸資産（収穫物）' },
  { key: 'prepaid', label: '前払費用' },
  { key: 'other_current_asset', label: 'その他流動資産' },
];
const FIXED_ASSETS = [
  { key: 'land', label: '土地' },
  { key: 'building', label: '建物・施設' },
  { key: 'machinery', label: '農業機械' },
  { key: 'tool', label: '農具・備品' },
  { key: 'other_fixed_asset', label: 'その他固定資産' },
];
const CURRENT_LIAB = [
  { key: 'ap', label: '買掛金' },
  { key: 'short_loan', label: '短期借入金' },
  { key: 'other_current_liab', label: 'その他流動負債' },
];
const FIXED_LIAB = [
  { key: 'long_loan', label: '長期借入金' },
  { key: 'agri_loan', label: '農業近代化資金' },
  { key: 'other_fixed_liab', label: 'その他固定負債' },
];

const today = () => new Date().toISOString().slice(0, 10);

type BSData = Record<string, number>;

export default function BalanceSheet() {
  const [date, setDate] = useState(today());
  const [data, setData] = useState<BSData>({});
  const [snapshots, setSnapshots] = useState<BSSnapshot[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchSnapshots = useCallback(async () => {
    const res = await fetch('/api/bs');
    if (res.ok) setSnapshots(await res.json());
  }, []);

  useEffect(() => { fetchSnapshots(); }, [fetchSnapshots]);

  const getVal = (key: string) => data[key] || 0;
  const setVal = (key: string, val: number) => setData(prev => ({ ...prev, [key]: val }));

  const totalCurrentAssets = CURRENT_ASSETS.reduce((s, f) => s + getVal(f.key), 0);
  const totalFixedAssets = FIXED_ASSETS.reduce((s, f) => s + getVal(f.key), 0);
  const totalAssets = totalCurrentAssets + totalFixedAssets;

  const totalCurrentLiab = CURRENT_LIAB.reduce((s, f) => s + getVal(f.key), 0);
  const totalFixedLiab = FIXED_LIAB.reduce((s, f) => s + getVal(f.key), 0);
  const totalLiab = totalCurrentLiab + totalFixedLiab;
  const netAssets = totalAssets - totalLiab;

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/bs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, data }),
      });
      if (res.ok) {
        showToast('保存しました');
        fetchSnapshots();
      } else {
        showToast('保存に失敗しました');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleLoadSnapshot = (d: string) => {
    const snap = snapshots.find(s => s.date === d);
    if (!snap) return;
    setSelectedDate(d);
    setDate(d);
    try {
      setData(JSON.parse(snap.data));
    } catch { /* ignore */ }
  };

  const handleDeleteSnapshot = async () => {
    if (!selectedDate || !confirm(`${selectedDate}のスナップショットを削除しますか？`)) return;
    const res = await fetch(`/api/bs/${encodeURIComponent(selectedDate)}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('削除しました');
      setSelectedDate('');
      setData({});
      fetchSnapshots();
    } else {
      showToast('削除に失敗しました');
    }
  };

  const NumInput = ({ field }: { field: string }) => (
    <input
      type="number"
      value={getVal(field) || ''}
      onChange={e => setVal(field, Number(e.target.value))}
      min="0"
      className="w-32 border border-gray-300 rounded px-2 py-0.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-green-400"
    />
  );

  return (
    <div className="p-4 max-w-5xl mx-auto">
      {toast && (
        <div className="fixed top-14 right-4 bg-green-700 text-white px-4 py-2 rounded shadow-lg z-50 text-sm">
          {toast}
        </div>
      )}

      {/* Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">日付</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm" />
          </div>
          <button onClick={handleSave} disabled={saving}
            className="bg-green-700 text-white px-4 py-1.5 rounded text-sm hover:bg-green-600 disabled:opacity-50">
            {saving ? '保存中...' : '保存'}
          </button>
          <div className="border-l border-gray-200 pl-3">
            <label className="block text-xs text-gray-500 mb-1">履歴から読込</label>
            <select value={selectedDate} onChange={e => handleLoadSnapshot(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm">
              <option value="">-- 選択 --</option>
              {snapshots.map(s => <option key={s.date} value={s.date}>{s.date}</option>)}
            </select>
          </div>
          {selectedDate && (
            <button onClick={handleDeleteSnapshot}
              className="bg-red-100 text-red-600 border border-red-200 px-3 py-1.5 rounded text-sm hover:bg-red-200">
              削除
            </button>
          )}
        </div>
      </div>

      {/* BS Table */}
      <div className="grid grid-cols-2 gap-4">
        {/* Assets */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3 pb-2 border-b">資産の部</h3>

          <div className="mb-4">
            <h4 className="text-xs font-semibold text-gray-600 mb-2">流動資産</h4>
            {CURRENT_ASSETS.map(f => (
              <div key={f.key} className="flex items-center justify-between mb-1.5">
                <label className="text-sm text-gray-600">{f.label}</label>
                <NumInput field={f.key} />
              </div>
            ))}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 font-medium">
              <span className="text-sm text-gray-700">流動資産合計</span>
              <span className="text-sm text-blue-700">¥{fmt(totalCurrentAssets)}</span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-gray-600 mb-2">固定資産</h4>
            {FIXED_ASSETS.map(f => (
              <div key={f.key} className="flex items-center justify-between mb-1.5">
                <label className="text-sm text-gray-600">{f.label}</label>
                <NumInput field={f.key} />
              </div>
            ))}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 font-medium">
              <span className="text-sm text-gray-700">固定資産合計</span>
              <span className="text-sm text-blue-700">¥{fmt(totalFixedAssets)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t-2 border-gray-300 font-bold">
            <span className="text-sm text-gray-800">資産合計</span>
            <span className="text-sm text-blue-800">¥{fmt(totalAssets)}</span>
          </div>
        </div>

        {/* Liabilities & Net Assets */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3 pb-2 border-b">負債・純資産の部</h3>

          <div className="mb-4">
            <h4 className="text-xs font-semibold text-gray-600 mb-2">流動負債</h4>
            {CURRENT_LIAB.map(f => (
              <div key={f.key} className="flex items-center justify-between mb-1.5">
                <label className="text-sm text-gray-600">{f.label}</label>
                <NumInput field={f.key} />
              </div>
            ))}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 font-medium">
              <span className="text-sm text-gray-700">流動負債合計</span>
              <span className="text-sm text-red-600">¥{fmt(totalCurrentLiab)}</span>
            </div>
          </div>

          <div className="mb-4">
            <h4 className="text-xs font-semibold text-gray-600 mb-2">固定負債</h4>
            {FIXED_LIAB.map(f => (
              <div key={f.key} className="flex items-center justify-between mb-1.5">
                <label className="text-sm text-gray-600">{f.label}</label>
                <NumInput field={f.key} />
              </div>
            ))}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 font-medium">
              <span className="text-sm text-gray-700">固定負債合計</span>
              <span className="text-sm text-red-600">¥{fmt(totalFixedLiab)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 font-medium">
            <span className="text-sm text-gray-700">負債合計</span>
            <span className="text-sm text-red-700">¥{fmt(totalLiab)}</span>
          </div>

          <div className="mt-3 p-3 bg-green-50 rounded-lg">
            <div className="flex items-center justify-between font-bold">
              <span className="text-sm text-gray-800">純資産（自動計算）</span>
              <span className={`text-sm ${netAssets >= 0 ? 'text-green-700' : 'text-red-600'}`}>¥{fmt(netAssets)}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">= 資産合計 − 負債合計</p>
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t-2 border-gray-300 font-bold">
            <span className="text-sm text-gray-800">負債・純資産合計</span>
            <span className="text-sm text-blue-800">¥{fmt(totalAssets)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
