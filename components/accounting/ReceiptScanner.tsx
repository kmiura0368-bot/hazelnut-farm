'use client';

import { useState, useRef, useCallback } from 'react';
import { CATEGORIES, catLabel } from '@/lib/categories';
import { fmt } from '@/lib/accounting-utils';

interface ReceiptItem {
  id: string;
  file: File;
  dataUrl: string;
  status: 'pending' | 'scanning' | 'done' | 'error' | 'saved';
  result?: {
    date: string;
    amount: number;
    type: 'income' | 'expense';
    category: string;
    memo: string;
  };
  error?: string;
}

export default function ReceiptScanner({ onSwitchToSettings }: { onSwitchToSettings?: () => void }) {
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [bulkProgress, setBulkProgress] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const newItems: ReceiptItem[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      const reader = new FileReader();
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
      reader.onload = e => {
        const dataUrl = e.target?.result as string;
        setItems(prev => [...prev, { id, file, dataUrl, status: 'pending' }]);
      };
      reader.readAsDataURL(file);
      newItems.push({ id, file, dataUrl: '', status: 'pending' });
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }, []);

  const scanItem = async (item: ReceiptItem): Promise<ReceiptItem> => {
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'scanning' } : i));
    try {
      const base64 = item.dataUrl.split(',')[1];
      const mediaType = item.file.type;
      const res = await fetch('/api/receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mediaType }),
      });
      const data = await res.json();
      if (!res.ok) {
        const updated = { ...item, status: 'error' as const, error: data.error };
        setItems(prev => prev.map(i => i.id === item.id ? updated : i));
        return updated;
      }
      const updated = { ...item, status: 'done' as const, result: data };
      setItems(prev => prev.map(i => i.id === item.id ? updated : i));
      return updated;
    } catch {
      const updated = { ...item, status: 'error' as const, error: 'スキャン失敗' };
      setItems(prev => prev.map(i => i.id === item.id ? updated : i));
      return updated;
    }
  };

  const handleBulkScan = async () => {
    const pending = items.filter(i => i.status === 'pending');
    if (pending.length === 0) return;
    setBulkProgress(0);
    for (let i = 0; i < pending.length; i++) {
      await scanItem(pending[i]);
      setBulkProgress(Math.round((i + 1) / pending.length * 100));
    }
    setBulkProgress(null);
  };

  const handleSaveItem = async (item: ReceiptItem) => {
    if (!item.result) return;
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item.result),
    });
    if (res.ok) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'saved' } : i));
      showToast('取引を保存しました');
    } else {
      showToast('保存に失敗しました');
    }
  };

  const updateResult = (id: string, key: string, value: string | number) => {
    setItems(prev => prev.map(i => {
      if (i.id !== id || !i.result) return i;
      return { ...i, result: { ...i.result, [key]: value } };
    }));
  };

  const statusBadge = (status: ReceiptItem['status']) => {
    const map = {
      pending: { label: '待機中', cls: 'bg-gray-100 text-gray-600' },
      scanning: { label: 'スキャン中', cls: 'bg-blue-100 text-blue-700 animate-pulse' },
      done: { label: '読取完了', cls: 'bg-green-100 text-green-700' },
      error: { label: 'エラー', cls: 'bg-red-100 text-red-700' },
      saved: { label: '保存済み', cls: 'bg-purple-100 text-purple-700' },
    };
    const b = map[status];
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${b.cls}`}>{b.label}</span>;
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      {toast && (
        <div className="fixed top-14 right-4 bg-green-700 text-white px-4 py-2 rounded shadow-lg z-50 text-sm">
          {toast}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm text-blue-800">
        レシートや領収書の画像をアップロードすると、AIが内容を読み取って自動入力します。
        使用にはAPIキーの設定が必要です。
        {onSwitchToSettings && (
          <button onClick={onSwitchToSettings} className="ml-2 underline text-blue-700 hover:text-blue-900">
            設定へ
          </button>
        )}
      </div>

      {/* Drop zone */}
      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer mb-4 transition-colors ${
          dragging ? 'border-green-500 bg-green-50' : 'border-gray-300 bg-white hover:border-green-400 hover:bg-green-50'
        }`}
      >
        <div className="text-3xl mb-2">📷</div>
        <div className="text-gray-600 text-sm">クリックまたはドラッグ＆ドロップで画像を追加</div>
        <div className="text-gray-400 text-xs mt-1">JPEG・PNG・WebP対応</div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => addFiles(e.target.files)}
        />
      </div>

      {items.length > 0 && (
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={handleBulkScan}
            disabled={bulkProgress !== null}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-500 disabled:opacity-50"
          >
            全件スキャン
          </button>
          {bulkProgress !== null && (
            <div className="flex-1">
              <div className="text-xs text-gray-500 mb-1">スキャン中... {bulkProgress}%</div>
              <div className="bg-gray-200 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${bulkProgress}%` }} />
              </div>
            </div>
          )}
          <button
            onClick={() => setItems([])}
            className="text-red-500 text-sm hover:underline ml-auto"
          >
            全件クリア
          </button>
        </div>
      )}

      {/* Cards */}
      <div className="space-y-4">
        {items.map(item => (
          <div key={item.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex gap-4 p-4">
              {/* Thumbnail */}
              <div className="flex-shrink-0">
                {item.dataUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.dataUrl} alt="receipt" className="w-24 h-32 object-cover rounded border border-gray-200" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-medium text-gray-700 truncate max-w-xs">{item.file.name}</span>
                  {statusBadge(item.status)}
                </div>

                {item.status === 'error' && (
                  <div className="text-red-600 text-sm mb-2">{item.error}</div>
                )}

                {(item.status === 'done' || item.status === 'saved') && item.result && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-500">種別</label>
                      <select
                        value={item.result.type}
                        onChange={e => updateResult(item.id, 'type', e.target.value)}
                        disabled={item.status === 'saved'}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm mt-0.5"
                      >
                        <option value="income">収入</option>
                        <option value="expense">支出</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">日付</label>
                      <input
                        type="date"
                        value={item.result.date}
                        onChange={e => updateResult(item.id, 'date', e.target.value)}
                        disabled={item.status === 'saved'}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm mt-0.5"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">カテゴリ</label>
                      <select
                        value={item.result.category}
                        onChange={e => updateResult(item.id, 'category', e.target.value)}
                        disabled={item.status === 'saved'}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm mt-0.5"
                      >
                        <optgroup label="収入">
                          {CATEGORIES.income.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                        </optgroup>
                        <optgroup label="支出">
                          {CATEGORIES.expense.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                        </optgroup>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">金額（円）</label>
                      <input
                        type="number"
                        value={item.result.amount}
                        onChange={e => updateResult(item.id, 'amount', Number(e.target.value))}
                        disabled={item.status === 'saved'}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm mt-0.5"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs text-gray-500">メモ</label>
                      <input
                        type="text"
                        value={item.result.memo}
                        onChange={e => updateResult(item.id, 'memo', e.target.value)}
                        disabled={item.status === 'saved'}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm mt-0.5"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="border-t border-gray-50 px-4 py-2 bg-gray-50 flex gap-2 justify-end">
              {item.status === 'pending' && (
                <button onClick={() => scanItem(item)} className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-500">
                  AIスキャン
                </button>
              )}
              {item.status === 'done' && (
                <button onClick={() => handleSaveItem(item)} className="bg-green-700 text-white px-3 py-1 rounded text-xs hover:bg-green-600">
                  取引に保存
                </button>
              )}
              {item.status === 'error' && (
                <button onClick={() => scanItem(item)} className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-500">
                  再スキャン
                </button>
              )}
              <button
                onClick={() => setItems(prev => prev.filter(i => i.id !== item.id))}
                className="text-red-500 border border-red-200 px-3 py-1 rounded text-xs hover:bg-red-50"
              >
                削除
              </button>
            </div>
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <div className="text-center text-gray-400 text-sm py-8">
          画像を追加してください
        </div>
      )}
    </div>
  );
}
