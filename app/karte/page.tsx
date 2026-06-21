'use client';

import { useEffect, useState, useCallback } from 'react';

interface KarteTree {
  tree_no: number;
  variety: string;
  nickname: string;
  note: string;
}

interface KarteEntry {
  id: number;
  tree_no: number;
  date: string;
  body: string;
  photo_filename: string;
  height_cm: number | null;
  ai_feedback: string;
  created_at: string;
}

const CIRCLED = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫'];

const VARIETY_PRESETS = ['ジェファーソン', 'ヤムヒル', 'ルイスバーガー', 'ロードゼラヌート', 'その他'];

function fmt(d: string) {
  const [y, m, day] = d.split('-');
  return `${y}年${Number(m)}月${Number(day)}日`;
}

export default function KartePage() {
  const [trees, setTrees] = useState<KarteTree[]>([]);
  const [entries, setEntries] = useState<KarteEntry[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const [tRes, eRes] = await Promise.all([fetch('/api/karte/trees'), fetch('/api/karte/entries')]);
    if (tRes.ok) setTrees(await tRes.json());
    if (eRes.ok) setEntries(await eRes.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const latestPhoto = (no: number) =>
    entries.find((e) => e.tree_no === no && e.photo_filename)?.photo_filename ?? '';
  const entryCount = (no: number) => entries.filter((e) => e.tree_no === no).length;

  if (selected !== null) {
    const tree = trees.find((t) => t.tree_no === selected);
    return (
      <TreeDetail
        tree={tree!}
        entries={entries.filter((e) => e.tree_no === selected)}
        onBack={() => setSelected(null)}
        onChanged={fetchAll}
      />
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="bg-gradient-to-b from-green-700 to-green-900 text-white px-6 py-8 text-center">
        <div className="text-3xl mb-2">🌳</div>
        <h1 className="text-2xl font-bold tracking-wide">樹木カルテ</h1>
        <p className="text-green-200 text-sm mt-1">12本の個別生育記録 — ①〜⑫</p>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {loading ? (
          <p className="text-gray-400 text-sm">読み込み中...</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {trees.map((t) => {
              const photo = latestPhoto(t.tree_no);
              const count = entryCount(t.tree_no);
              return (
                <button
                  key={t.tree_no}
                  onClick={() => setSelected(t.tree_no)}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden text-left hover:shadow-md hover:-translate-y-0.5 transition group"
                >
                  <div className="aspect-square bg-gray-100 relative overflow-hidden">
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photo} alt="" className="w-full h-full object-cover group-hover:scale-105 transition" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl">🌱</div>
                    )}
                    <span className="absolute top-2 left-2 bg-green-700 text-white text-sm font-bold w-7 h-7 rounded-full flex items-center justify-center shadow">
                      {CIRCLED[t.tree_no - 1]}
                    </span>
                    {count > 0 && (
                      <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                        記録{count}件
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="font-semibold text-sm text-gray-800 truncate">
                      {t.variety || <span className="text-gray-300">品種未設定</span>}
                    </p>
                    {t.nickname && <p className="text-xs text-gray-400 truncate">{t.nickname}</p>}
                  </div>
                </button>
              );
            })}
          </div>
        )}
        <p className="text-xs text-gray-400 mt-6 text-center">
          各カードをタップすると、その樹の観察記録・写真・私のフィードバックが見られます
        </p>
      </div>
    </div>
  );
}

function TreeDetail({
  tree,
  entries,
  onBack,
  onChanged,
}: {
  tree: KarteTree;
  entries: KarteEntry[];
  onBack: () => void;
  onChanged: () => void;
}) {
  const [variety, setVariety] = useState(tree.variety);
  const [nickname, setNickname] = useState(tree.nickname);
  const [editingMeta, setEditingMeta] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [body, setBody] = useState('');
  const [height, setHeight] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [saving, setSaving] = useState(false);

  // AI相談（記録ごとに手動で発火）
  const [consultingId, setConsultingId] = useState<number | null>(null);

  async function consult(id: number) {
    setConsultingId(id);
    try {
      const res = await fetch('/api/karte/consult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry_id: id }),
      });
      if (res.ok) {
        onChanged();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? 'AI相談に失敗しました');
      }
    } finally {
      setConsultingId(null);
    }
  }

  async function saveMeta() {
    setSavingMeta(true);
    await fetch('/api/karte/trees', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tree_no: tree.tree_no, variety, nickname, note: tree.note }),
    });
    setSavingMeta(false);
    setEditingMeta(false);
    onChanged();
  }

  function onFile(f: File | null) {
    setFile(f);
    if (f) setPreview(URL.createObjectURL(f));
    else setPreview('');
  }

  async function submitEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() && !file && !height) return;
    setSaving(true);
    const fd = new FormData();
    fd.append('tree_no', String(tree.tree_no));
    fd.append('date', date);
    fd.append('body', body);
    if (height) fd.append('height_cm', height);
    if (file) fd.append('file', file);
    const res = await fetch('/api/karte/entries', { method: 'POST', body: fd });
    if (res.ok) {
      setBody('');
      setHeight('');
      onFile(null);
      setDate(new Date().toISOString().slice(0, 10));
      onChanged();
    }
    setSaving(false);
  }

  async function deleteEntry(id: number) {
    if (!confirm('この記録を削除しますか？')) return;
    await fetch(`/api/karte/entries/${id}`, { method: 'DELETE' });
    onChanged();
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="bg-gradient-to-b from-green-700 to-green-900 text-white px-6 py-6">
        <button onClick={onBack} className="text-green-200 text-sm hover:text-white mb-3">← 一覧に戻る</button>
        <div className="flex items-center gap-3">
          <span className="bg-white text-green-800 text-xl font-bold w-11 h-11 rounded-full flex items-center justify-center shadow">
            {CIRCLED[tree.tree_no - 1]}
          </span>
          <div>
            <h1 className="text-xl font-bold">{tree.variety || '品種未設定'}</h1>
            {tree.nickname && <p className="text-green-200 text-sm">{tree.nickname}</p>}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* 品種設定 */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          {editingMeta ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">品種</label>
                <input
                  list="variety-list"
                  value={variety}
                  onChange={(e) => setVariety(e.target.value)}
                  placeholder="品種名を入力または選択"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
                <datalist id="variety-list">
                  {VARIETY_PRESETS.map((v) => <option key={v} value={v} />)}
                </datalist>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">メモ（位置・目印など任意）</label>
                <input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="例：北側手前、点滴チューブあり"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={saveMeta} disabled={savingMeta} className="bg-green-700 hover:bg-green-800 text-white text-sm rounded-lg px-4 py-1.5 disabled:opacity-50">
                  {savingMeta ? '保存中...' : '保存'}
                </button>
                <button onClick={() => setEditingMeta(false)} className="text-gray-500 text-sm px-3">キャンセル</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                品種: <span className="font-semibold text-gray-800">{tree.variety || '未設定'}</span>
                {tree.nickname && <span className="text-gray-400 ml-2">／ {tree.nickname}</span>}
              </div>
              <button onClick={() => setEditingMeta(true)} className="text-green-700 text-xs hover:underline">編集</button>
            </div>
          )}
        </section>

        {/* 記録入力フォーム（Google Form風） */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-sm font-bold text-green-700 mb-4">📝 観察を記録する</h2>
          <form onSubmit={submitEntry} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">日付</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">樹高 cm（任意）</label>
                <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="例: 85"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">写真</label>
              <input type="file" accept="image/*,.heic,.heif" onChange={(e) => onFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-green-50 file:text-green-700 file:text-sm" />
              {preview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="プレビュー" className="mt-2 h-32 rounded-lg object-cover" />
              )}
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">観察コメント</label>
              <textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)}
                placeholder="葉の様子、新芽、気になった点など自由に"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none" />
            </div>
            <button type="submit" disabled={saving}
              className="w-full bg-green-700 hover:bg-green-800 disabled:opacity-50 text-white font-semibold rounded-lg py-2 text-sm transition">
              {saving ? '保存中...' : 'この樹に記録を追加'}
            </button>
          </form>
        </section>

        {/* タイムライン */}
        <section>
          <h2 className="text-sm font-bold text-green-700 mb-3">📅 観察履歴（{entries.length}件）</h2>
          <div className="space-y-3">
            {entries.map((e) => (
              <div key={e.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {e.photo_filename && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={e.photo_filename} alt="" className="w-full max-h-72 object-cover" />
                )}
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">{fmt(e.date)}</span>
                    <button onClick={() => deleteEntry(e.id)} className="text-gray-300 hover:text-red-400 text-lg">×</button>
                  </div>
                  {e.height_cm != null && (
                    <p className="text-sm text-green-700 font-semibold mt-1">📏 樹高 {e.height_cm} cm</p>
                  )}
                  {e.body && <p className="text-sm text-gray-700 mt-1 whitespace-pre-line">{e.body}</p>}
                  {e.ai_feedback ? (
                    <div className="mt-3 bg-green-50 border-l-2 border-green-400 rounded-r-lg p-3">
                      <p className="text-xs font-bold text-green-700 mb-1">🤖 Claudeのフィードバック</p>
                      <p className="text-sm text-gray-700 whitespace-pre-line">{e.ai_feedback}</p>
                    </div>
                  ) : (
                    <button
                      onClick={() => consult(e.id)}
                      disabled={consultingId === e.id}
                      className="mt-3 w-full border border-green-200 text-green-700 hover:bg-green-50 disabled:opacity-50 rounded-lg py-2 text-sm font-medium transition"
                    >
                      {consultingId === e.id ? '🤖 過去の記録を照合中...' : '🤖 この記録をAIに相談する'}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {entries.length === 0 && <p className="text-gray-400 text-sm">まだ記録がありません。上のフォームから追加してください。</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
