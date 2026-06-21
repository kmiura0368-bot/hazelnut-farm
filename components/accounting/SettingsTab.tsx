'use client';

import { useState, useEffect } from 'react';
import { Transaction } from '@/lib/types';
import { BSSnapshot } from '@/lib/types';
import { fmt } from '@/lib/accounting-utils';

export default function SettingsTab() {
  const [apiKey, setApiKey] = useState('');
  const [apiKeyStatus, setApiKeyStatus] = useState<'unknown' | 'set' | 'unset'>('unknown');
  const [farmName, setFarmName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [address, setAddress] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [stats, setStats] = useState({ count: 0, income: 0, expense: 0 });
  const [saving, setSaving] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchSettings = async () => {
    const res = await fetch('/api/settings');
    if (!res.ok) return;
    const data = await res.json();
    setApiKeyStatus(data.apikey ? 'set' : 'unset');
    setFarmName(data.farmname ?? '');
    setOwnerName(data.ownername ?? '');
    setAddress(data.address ?? '');
  };

  const fetchStats = async () => {
    const res = await fetch('/api/transactions');
    if (!res.ok) return;
    const data: Transaction[] = await res.json();
    const income = data.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = data.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    setStats({ count: data.length, income, expense });
  };

  useEffect(() => {
    fetchSettings();
    fetchStats();
  }, []);

  const handleSaveApiKey = async () => {
    if (apiKey && !apiKey.startsWith('sk-ant-')) {
      showToast('APIキーは sk-ant- で始まる必要があります');
      return;
    }
    setSaving('apikey');
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'apikey', value: apiKey }),
    });
    setSaving(null);
    if (res.ok) {
      setApiKeyStatus(apiKey ? 'set' : 'unset');
      setApiKey('');
      showToast('APIキーを保存しました');
    } else {
      showToast('保存に失敗しました');
    }
  };

  const handleDeleteApiKey = async () => {
    if (!confirm('APIキーを削除しますか？')) return;
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'apikey', value: '' }),
    });
    setApiKeyStatus('unset');
    showToast('APIキーを削除しました');
  };

  const handleSaveFarm = async () => {
    setSaving('farm');
    try {
      await Promise.all([
        fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'farmname', value: farmName }) }),
        fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'ownername', value: ownerName }) }),
        fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'address', value: address }) }),
      ]);
      showToast('農園情報を保存しました');
    } finally {
      setSaving(null);
    }
  };

  const handleExportJson = async () => {
    const [txRes, bsRes] = await Promise.all([
      fetch('/api/transactions'),
      fetch('/api/bs'),
    ]);
    const transactions: Transaction[] = await txRes.json();
    const bsSnapshots: BSSnapshot[] = await bsRes.json();
    const json = JSON.stringify({ transactions, bsSnapshots, exportedAt: new Date().toISOString() }, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `hazelnut_accounting_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const { transactions } = JSON.parse(text) as { transactions: Transaction[] };
      if (!Array.isArray(transactions)) throw new Error('invalid format');
      let ok = 0;
      for (const t of transactions) {
        const res = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(t),
        });
        if (res.ok) ok++;
      }
      showToast(`${ok}件インポートしました`);
      fetchStats();
    } catch {
      showToast('インポートに失敗しました。ファイル形式を確認してください。');
    }
  };

  const handleDeleteAll = async () => {
    const confirm1 = confirm('すべてのデータを削除します。この操作は取り消せません。よろしいですか？');
    if (!confirm1) return;
    const confirm2 = confirm('本当に削除しますか？（再確認）');
    if (!confirm2) return;
    // Delete all transactions via sample removal + a manual approach
    // We'll use a workaround: fetch all and delete one by one
    const res = await fetch('/api/transactions');
    const txs: Transaction[] = await res.json();
    for (const t of txs) {
      await fetch(`/api/transactions/${t.id}`, { method: 'DELETE' });
    }
    showToast('すべてのデータを削除しました');
    fetchStats();
  };

  const handleAddSample = async () => {
    const res = await fetch('/api/sample', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add' }),
    });
    const data = await res.json();
    if (res.ok) {
      showToast(`サンプルデータを${data.count}件追加しました`);
      fetchStats();
    } else {
      showToast(data.error || 'エラーが発生しました');
    }
  };

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      {toast && (
        <div className="fixed top-14 right-4 bg-green-700 text-white px-4 py-2 rounded shadow-lg z-50 text-sm">
          {toast}
        </div>
      )}

      {/* API Key */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h3 className="text-sm font-bold text-gray-700 mb-3">Anthropic APIキー（レシートAI読取用）</h3>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs">状態:</span>
          {apiKeyStatus === 'set' ? (
            <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">設定済み（sk-ant-***）</span>
          ) : apiKeyStatus === 'unset' ? (
            <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">未設定</span>
          ) : (
            <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">確認中...</span>
          )}
        </div>
        <div className="flex gap-2">
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="sk-ant-..."
            className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-400"
          />
          <button onClick={handleSaveApiKey} disabled={saving === 'apikey'}
            className="bg-green-700 text-white px-4 py-1.5 rounded text-sm hover:bg-green-600 disabled:opacity-50">
            保存
          </button>
          {apiKeyStatus === 'set' && (
            <button onClick={handleDeleteApiKey}
              className="bg-red-100 text-red-600 border border-red-200 px-3 py-1.5 rounded text-sm hover:bg-red-200">
              削除
            </button>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-2">APIキーはサーバー側のDBに保存されます。Anthropic Consoleから取得してください。</p>
      </div>

      {/* Farm Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h3 className="text-sm font-bold text-gray-700 mb-3">農園情報</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">農園名</label>
            <input type="text" value={farmName} onChange={e => setFarmName(e.target.value)}
              placeholder="例: ○○ヘーゼルナッツ農園"
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-400" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">代表者名</label>
            <input type="text" value={ownerName} onChange={e => setOwnerName(e.target.value)}
              placeholder="例: 山田 太郎"
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-400" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">住所</label>
            <input type="text" value={address} onChange={e => setAddress(e.target.value)}
              placeholder="例: 長野県○○市..."
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-400" />
          </div>
          <button onClick={handleSaveFarm} disabled={saving === 'farm'}
            className="bg-green-700 text-white px-4 py-1.5 rounded text-sm hover:bg-green-600 disabled:opacity-50">
            {saving === 'farm' ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      {/* Data Stats */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h3 className="text-sm font-bold text-gray-700 mb-3">データ統計</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-gray-700">{stats.count}</div>
            <div className="text-xs text-gray-500">取引件数</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <div className="text-sm font-bold text-green-700">¥{fmt(stats.income)}</div>
            <div className="text-xs text-gray-500">総収入</div>
          </div>
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <div className="text-sm font-bold text-red-600">¥{fmt(stats.expense)}</div>
            <div className="text-xs text-gray-500">総支出</div>
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h3 className="text-sm font-bold text-gray-700 mb-3">データ管理</h3>
        <div className="space-y-2">
          <div className="flex gap-2 flex-wrap">
            <button onClick={handleAddSample}
              className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-500">
              サンプルデータ追加
            </button>
            <button onClick={handleExportJson}
              className="bg-gray-700 text-white px-4 py-1.5 rounded text-sm hover:bg-gray-600">
              全データをJSONエクスポート
            </button>
            <label className="bg-gray-100 text-gray-700 border border-gray-300 px-4 py-1.5 rounded text-sm cursor-pointer hover:bg-gray-200">
              JSONインポート
              <input type="file" accept=".json" className="hidden" onChange={handleImportJson} />
            </label>
          </div>
          <div className="pt-2 border-t border-gray-100">
            <button onClick={handleDeleteAll}
              className="bg-red-600 text-white px-4 py-1.5 rounded text-sm hover:bg-red-500">
              全データを削除
            </button>
            <p className="text-xs text-red-400 mt-1">この操作は取り消せません</p>
          </div>
        </div>
      </div>
    </div>
  );
}
