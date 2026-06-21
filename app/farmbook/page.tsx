'use client';

import { useEffect, useState } from 'react';

interface GrowthLog {
  id: number;
  date: string;
  type: 'milestone' | 'task' | 'observation' | 'measurement';
  title: string;
  body: string;
  created_at: string;
}

const TYPE_META: Record<GrowthLog['type'], { label: string; color: string; icon: string }> = {
  milestone: { label: 'マイルストーン', color: 'bg-amber-500', icon: '★' },
  task: { label: '作業', color: 'bg-green-600', icon: '✓' },
  observation: { label: '観察', color: 'bg-blue-500', icon: '👁' },
  measurement: { label: '計測', color: 'bg-purple-500', icon: '📏' },
};

const VARIETIES = [
  {
    name: 'ヤムヒル (Yamhill)',
    origin: 'オレゴン州立大学 / 2009年',
    ripening: '早生（9〜10月頃）',
    traits: ['コンパクトな樹形', '安定した収量', '中粒ナッツ', '白化品質優秀'],
    color: 'from-amber-600 to-amber-800',
  },
  {
    name: 'ジェファーソン (Jefferson)',
    origin: 'オレゴン州立大学 / 2009年',
    ripening: '中生（10月頃）',
    traits: ['大粒ナッツ', '高い油脂含量', '東部灰色かび病抵抗性', '生食・加工両用'],
    color: 'from-green-700 to-green-900',
  },
];

const MILESTONES = [
  { year: '2026年', label: '定植（現在）', note: '12本植樹・定着期' },
  { year: '2028年', label: '2年目', note: '樹形形成・剪定開始' },
  { year: '2030〜31年', label: '4〜5年目', note: '初収穫の見込み' },
  { year: '2033〜36年', label: '7〜10年目', note: '本格収量期' },
];

function fmt(d: string) {
  const [y, m, day] = d.split('-');
  return `${y}年${Number(m)}月${Number(day)}日`;
}

export default function FarmbookPage() {
  const [logs, setLogs] = useState<GrowthLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), type: 'observation' as GrowthLog['type'], title: '', body: '' });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  async function fetchLogs() {
    const res = await fetch('/api/growthlog');
    if (res.ok) setLogs(await res.json());
    setLoading(false);
  }

  useEffect(() => { fetchLogs(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    const res = await fetch('/api/growthlog', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    if (res.ok) {
      setForm({ date: new Date().toISOString().slice(0, 10), type: 'observation', title: '', body: '' });
      await fetchLogs();
    }
    setSaving(false);
  }

  async function handleDelete(id: number) {
    if (!confirm('この記録を削除しますか？')) return;
    setDeleting(id);
    await fetch(`/api/growthlog/${id}`, { method: 'DELETE' });
    await fetchLogs();
    setDeleting(null);
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 print:bg-white">
      {/* ヘッダー */}
      <div className="bg-gradient-to-b from-green-700 to-green-900 text-white px-6 py-8 text-center print:bg-none print:text-green-900 print:border-b-2 print:border-green-700">
        <div className="text-3xl mb-2">📋</div>
        <h1 className="text-2xl font-bold tracking-wide">農園台帳</h1>
        <p className="text-green-200 text-sm mt-1 print:text-green-700">向野ヘーゼルナッツ農園 — 事業記録・生育履歴</p>
        <button
          onClick={() => window.print()}
          className="mt-4 px-4 py-1.5 bg-white/20 hover:bg-white/30 text-white text-sm rounded-full transition print:hidden"
        >
          🖨 印刷 / PDF保存
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

        {/* 農園基本情報 */}
        <section>
          <h2 className="section-title">農園基本情報</h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 grid grid-cols-2 md:grid-cols-3 gap-4">
            <InfoRow icon="📍" label="所在地" value="青森県弘前市船沢地区（岩木山麓）" />
            <InfoRow icon="🌿" label="面積" value="約0.5 ha" />
            <InfoRow icon="🌳" label="植樹本数" value="12本（2026年3月）" />
            <InfoRow icon="🏷" label="品種" value="ヤムヒル・ジェファーソン 他" />
            <InfoRow icon="🌱" label="栽培方式" value="高畝式 / バーグたい肥" />
            <InfoRow icon="📅" label="開園年" value="2026年（令和8年）" />
          </div>
        </section>

        {/* 品種情報 */}
        <section>
          <h2 className="section-title">栽培品種</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {VARIETIES.map((v) => (
              <div key={v.name} className={`bg-gradient-to-br ${v.color} text-white rounded-xl p-5 shadow-sm`}>
                <h3 className="font-bold text-lg mb-1">{v.name}</h3>
                <p className="text-white/70 text-xs mb-3">{v.origin}</p>
                <p className="text-sm mb-2 font-medium">収穫時期: {v.ripening}</p>
                <ul className="text-sm text-white/80 space-y-0.5">
                  {v.traits.map((t) => <li key={t}>・{t}</li>)}
                </ul>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">※ ヤムヒルとジェファーソンは相互授粉が可能なため、混植による収量増加が期待できます</p>
        </section>

        {/* 収穫見通し */}
        <section>
          <h2 className="section-title">収穫見通し（ロードマップ）</h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex flex-col md:flex-row gap-0">
              {MILESTONES.map((m, i) => (
                <div key={i} className="flex-1 flex flex-col items-center text-center p-3 relative">
                  {i < MILESTONES.length - 1 && (
                    <div className="hidden md:block absolute right-0 top-5 w-px h-8 bg-gray-200" />
                  )}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow ${i === 0 ? 'bg-green-600' : 'bg-gray-300'}`}>
                    {i + 1}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{m.year}</p>
                  <p className="font-semibold text-sm text-gray-800">{m.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{m.note}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 生育記録タイムライン */}
        <section>
          <h2 className="section-title">生育記録・作業履歴</h2>

          {loading ? (
            <p className="text-gray-400 text-sm">読み込み中...</p>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => {
                const meta = TYPE_META[log.type];
                return (
                  <div key={log.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex gap-3">
                    <div className="flex-shrink-0 flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full ${meta.color} text-white flex items-center justify-center text-xs font-bold shadow`}>
                        {meta.icon}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-400">{fmt(log.date)}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full text-white ${meta.color}`}>{meta.label}</span>
                      </div>
                      <p className="font-semibold text-gray-800 mt-0.5">{log.title}</p>
                      {log.body && <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{log.body}</p>}
                    </div>
                    <button
                      onClick={() => handleDelete(log.id)}
                      disabled={deleting === log.id}
                      className="flex-shrink-0 text-gray-300 hover:text-red-400 transition text-lg print:hidden"
                      title="削除"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
              {logs.length === 0 && <p className="text-gray-400 text-sm">記録がまだありません</p>}
            </div>
          )}
        </section>

        {/* 記録追加フォーム */}
        <section className="print:hidden">
          <h2 className="section-title">新しい記録を追加</h2>
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">日付</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">種別</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as GrowthLog['type'] })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                >
                  <option value="observation">観察</option>
                  <option value="task">作業</option>
                  <option value="milestone">マイルストーン</option>
                  <option value="measurement">計測</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">タイトル</label>
              <input
                type="text"
                placeholder="例：全樹の樹高計測、施肥作業完了"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                required
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">詳細・メモ（任意）</label>
              <textarea
                rows={3}
                placeholder="観察内容、樹高・幹径の数値、気づきなどを自由に記入"
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={saving || !form.title.trim()}
              className="w-full bg-green-700 hover:bg-green-800 disabled:opacity-50 text-white font-semibold rounded-lg py-2 text-sm transition"
            >
              {saving ? '保存中...' : '記録を追加'}
            </button>
          </form>
        </section>

        {/* フッター（印刷用） */}
        <footer className="hidden print:block text-center text-xs text-gray-400 border-t pt-4 mt-8">
          向野ヘーゼルナッツ農園 農園台帳 — 青森県弘前市船沢地区 — 出力日: {new Date().toLocaleDateString('ja-JP')}
        </footer>
      </div>

      <style jsx global>{`
        .section-title {
          font-size: 0.75rem;
          font-weight: 700;
          color: #15803d;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 0.75rem;
        }
        @media print {
          body { font-size: 11px; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex gap-2 items-start">
      <span className="text-lg">{icon}</span>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-semibold text-gray-800">{value}</p>
      </div>
    </div>
  );
}
