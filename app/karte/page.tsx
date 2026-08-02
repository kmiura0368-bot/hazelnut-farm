'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';

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
  tags: string;
  photo_filename: string;
  height_cm: number | null;
  ai_feedback: string;
  created_at: string;
}

const CIRCLED = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫'];

const VARIETY_PRESETS = ['ジェファーソン', 'ヤムヒル', 'ルイスバーガー', 'ロードゼラヌート', 'その他'];

// 畑で立ったまま指1本で選べるように、観察も作業もタップ式にする。
// 白紙のテキスト欄が「記録が続かない」最大の原因なので、文章は任意扱い。
const TAG_GROUPS = [
  {
    label: 'ようす',
    hint: '見て気づいたこと',
    tags: ['元気', '新芽', '葉が茂る', '背が伸びた', 'つぼみ・花', '実つき'],
    tone: 'good' as const,
  },
  {
    label: '気になる',
    hint: '心配なところ',
    tags: ['葉が黄色い', '葉先が枯れる', '虫食い', '病斑・カビ', 'しおれ（水切れ）', 'ひこばえ'],
    tone: 'warn' as const,
  },
  {
    label: 'やったこと',
    hint: '今日の作業',
    tags: ['水やり', '施肥', '草刈り', '剪定', 'ひこばえ除去', '支柱直し', 'マルチ補修', '防除'],
    tone: 'work' as const,
  },
];

// 「気になる」タグが付いた記録は、AI相談をすすめる対象にする
const WARN_TAGS = new Set(TAG_GROUPS.find((g) => g.tone === 'warn')!.tags);

const TONE_STYLE = {
  good: { on: 'bg-green-600 text-white border-green-600', off: 'bg-white text-green-800 border-green-200' },
  warn: { on: 'bg-amber-500 text-white border-amber-500', off: 'bg-white text-amber-700 border-amber-200' },
  work: { on: 'bg-stone-600 text-white border-stone-600', off: 'bg-white text-stone-600 border-stone-200' },
};

// --- 日付ユーティリティ ---
// toISOString() はUTCになるため、日本時間の朝9時前に記録すると前日扱いになってしまう。
// 端末のローカル日付をそのまま使う。
function todayLocal() {
  const d = new Date();
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
}

function fmt(d: string) {
  const [y, m, day] = d.split('-');
  return `${y}年${Number(m)}月${Number(day)}日`;
}

// アップロード前にスマホ内で写真を縮小・JPEG化する。
// 畑の弱い電波でも確実に送れるよう、送信量を数百KBまで落とす。
// iPhoneのHEICも <img> で描画→JPEG化できる（iOS Safari対応）。失敗時は元ファイルを返す。
async function compressImage(file: File): Promise<File> {
  try {
    const url = URL.createObjectURL(file);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = reject;
      im.src = url;
    });
    const maxDim = 1600;
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    const scale = Math.min(1, maxDim / Math.max(w, h));
    const cw = Math.max(1, Math.round(w * scale));
    const ch = Math.max(1, Math.round(h * scale));
    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      URL.revokeObjectURL(url);
      return file;
    }
    ctx.drawImage(img, 0, 0, cw, ch);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.7));
    URL.revokeObjectURL(url);
    if (!blob || blob.size === 0) return file;
    const base = file.name.replace(/\.[^.]+$/, '');
    return new File([blob], `${base}.jpg`, { type: 'image/jpeg' });
  } catch {
    return file; // 変換できなければ元のファイルを送る（サーバー側でも縮小する）
  }
}

// 弱い電波向け: 失敗しても短い間隔で数回まで再送する。
async function postWithRetry(url: string, fd: FormData, tries = 3): Promise<Response> {
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { method: 'POST', body: fd });
      if (res.ok || (res.status >= 400 && res.status < 500)) return res;
      lastErr = new Error(`status ${res.status}`);
    } catch (e) {
      lastErr = e;
    }
    await new Promise((r) => setTimeout(r, 1200 * (i + 1)));
  }
  throw lastErr;
}

function daysSince(d: string): number {
  const then = new Date(`${d}T00:00:00`);
  const now = new Date(`${todayLocal()}T00:00:00`);
  return Math.round((now.getTime() - then.getTime()) / 86400000);
}

function agoLabel(d: string): string {
  const n = daysSince(d);
  if (n <= 0) return '今日';
  if (n === 1) return '昨日';
  return `${n}日前`;
}

function parseTags(s: string): string[] {
  return (s ?? '').split(',').map((t) => t.trim()).filter(Boolean);
}

function toneOf(tag: string): 'good' | 'warn' | 'work' {
  for (const g of TAG_GROUPS) if (g.tags.includes(tag)) return g.tone;
  return 'good';
}

export default function KartePage() {
  const [trees, setTrees] = useState<KarteTree[]>([]);
  const [entries, setEntries] = useState<KarteEntry[]>([]);
  const [view, setView] = useState<{ mode: 'list' } | { mode: 'detail'; no: number } | { mode: 'patrol'; idx: number }>({
    mode: 'list',
  });
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

  const entriesOf = useCallback((no: number) => entries.filter((e) => e.tree_no === no), [entries]);
  const recordedToday = useCallback(
    (no: number) => entries.some((e) => e.tree_no === no && e.date === todayLocal()),
    [entries]
  );

  if (view.mode === 'patrol') {
    return (
      <Patrol
        trees={trees}
        idx={view.idx}
        entriesOf={entriesOf}
        recordedToday={recordedToday}
        onMove={(idx) => setView({ mode: 'patrol', idx })}
        onExit={() => setView({ mode: 'list' })}
        onChanged={fetchAll}
      />
    );
  }

  if (view.mode === 'detail') {
    const tree = trees.find((t) => t.tree_no === view.no);
    if (!tree) return null;
    return (
      <TreeDetail
        tree={tree}
        entries={entriesOf(view.no)}
        onBack={() => setView({ mode: 'list' })}
        onChanged={fetchAll}
      />
    );
  }

  return (
    <TreeList
      trees={trees}
      entriesOf={entriesOf}
      recordedToday={recordedToday}
      loading={loading}
      onOpen={(no) => setView({ mode: 'detail', no })}
      onPatrol={(idx) => setView({ mode: 'patrol', idx })}
    />
  );
}

/* ============================ 一覧 ============================ */

function TreeList({
  trees,
  entriesOf,
  recordedToday,
  loading,
  onOpen,
  onPatrol,
}: {
  trees: KarteTree[];
  entriesOf: (no: number) => KarteEntry[];
  recordedToday: (no: number) => boolean;
  loading: boolean;
  onOpen: (no: number) => void;
  onPatrol: (idx: number) => void;
}) {
  const doneToday = trees.filter((t) => recordedToday(t.tree_no)).length;

  // 巡回は「今日まだ記録していない最初の樹」から始める
  const startIdx = Math.max(0, trees.findIndex((t) => !recordedToday(t.tree_no)));

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="bg-gradient-to-b from-green-700 to-green-900 text-white px-6 pt-7 pb-6 text-center">
        <div className="text-3xl mb-1">🌳</div>
        <h1 className="text-2xl font-bold tracking-wide">樹木カルテ</h1>
        <p className="text-green-200 text-sm mt-1">12本の個別生育記録 — ①〜⑫</p>

        {!loading && (
          <div className="max-w-md mx-auto mt-5">
            <button
              onClick={() => onPatrol(startIdx)}
              className="w-full bg-white text-green-800 font-bold rounded-xl py-3.5 shadow-lg active:scale-[0.98] transition"
            >
              🚶 巡回して記録する
            </button>
            <p className="text-green-200 text-xs mt-2">
              {doneToday === 0
                ? '①から順に、タップだけで12本ぶん記録できます'
                : doneToday >= trees.length
                  ? '✓ 今日は12本すべて記録ずみです'
                  : `今日は ${doneToday}/${trees.length} 本を記録ずみ — 続きから始めます`}
            </p>
          </div>
        )}
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {loading ? (
          <p className="text-gray-400 text-sm">読み込み中...</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {trees.map((t) => {
              const es = entriesOf(t.tree_no);
              const photo = es.find((e) => e.photo_filename)?.photo_filename ?? '';
              const last = es[0]; // APIが新しい順で返す
              const height = es.find((e) => e.height_cm != null)?.height_cm ?? null;
              const stale = !last ? 'none' : daysSince(last.date) <= 7 ? 'fresh' : daysSince(last.date) <= 21 ? 'mid' : 'old';

              return (
                <button
                  key={t.tree_no}
                  onClick={() => onOpen(t.tree_no)}
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
                    {recordedToday(t.tree_no) && (
                      <span className="absolute top-2 right-2 bg-green-600 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow">
                        ✓ 今日
                      </span>
                    )}
                    {height != null && (
                      <span className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                        📏 {height}cm
                      </span>
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="font-semibold text-sm text-gray-800 truncate">
                      {t.variety || <span className="text-gray-300">品種未設定</span>}
                    </p>
                    <p
                      className={
                        'text-xs mt-0.5 font-medium ' +
                        (stale === 'none'
                          ? 'text-gray-300'
                          : stale === 'fresh'
                            ? 'text-green-600'
                            : stale === 'mid'
                              ? 'text-amber-600'
                              : 'text-red-500')
                      }
                    >
                      {last ? `記録 ${agoLabel(last.date)}・${es.length}件` : 'まだ記録なし'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================ 巡回モード ============================ */

function Patrol({
  trees,
  idx,
  entriesOf,
  recordedToday,
  onMove,
  onExit,
  onChanged,
}: {
  trees: KarteTree[];
  idx: number;
  entriesOf: (no: number) => KarteEntry[];
  recordedToday: (no: number) => boolean;
  onMove: (idx: number) => void;
  onExit: () => void;
  onChanged: () => void;
}) {
  const tree = trees[idx];
  const isLast = idx >= trees.length - 1;

  if (!tree) return null;

  const past = entriesOf(tree.tree_no);
  const lastEntry = past[0];
  const lastHeight = past.find((e) => e.height_cm != null)?.height_cm ?? null;

  const next = () => (isLast ? onExit() : onMove(idx + 1));

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      {/* ヘッダー：進み具合 */}
      <div className="bg-green-800 text-white px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between text-sm">
          <button onClick={onExit} className="text-green-200 hover:text-white">✕ やめる</button>
          <span className="font-semibold">巡回 {idx + 1} / {trees.length}</span>
          <button onClick={next} className="text-green-200 hover:text-white">とばす →</button>
        </div>
        <div className="mt-2 h-1.5 bg-green-950/40 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-300 rounded-full transition-all"
            style={{ width: `${((idx + 1) / trees.length) * 100}%` }}
          />
        </div>
      </div>

      {/* 対象の樹 */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <span className="bg-green-700 text-white text-xl font-bold w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0">
          {CIRCLED[tree.tree_no - 1]}
        </span>
        <div className="min-w-0">
          <p className="font-bold text-gray-800 truncate">{tree.variety || '品種未設定'}</p>
          <p className="text-xs text-gray-500 truncate">
            {lastEntry ? `前回 ${agoLabel(lastEntry.date)}` : 'まだ記録なし'}
            {lastHeight != null && ` ・ 樹高 ${lastHeight}cm`}
            {recordedToday(tree.tree_no) && ' ・ ✓今日記録ずみ'}
          </p>
        </div>
      </div>

      <EntryForm
        key={tree.tree_no}
        treeNo={tree.tree_no}
        lastHeight={lastHeight}
        onSaved={() => {
          onChanged();
          next();
        }}
        submitLabel={isLast ? '記録して終わる' : '記録して次へ →'}
        emptyLabel={isLast ? '異常なし として終わる' : '異常なし として次へ →'}
      />
    </div>
  );
}

/* ============================ 記録フォーム ============================ */
/* 巡回モードで使う。下部のボタンは親指で押せるよう画面下に固定する。 */

function EntryForm({
  treeNo,
  lastHeight,
  onSaved,
  submitLabel,
  emptyLabel,
}: {
  treeNo: number;
  lastHeight: number | null;
  onSaved: () => void;
  submitLabel: string;
  emptyLabel: string;
}) {
  const [tags, setTags] = useState<string[]>([]);
  const [height, setHeight] = useState('');
  const [body, setBody] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [showMemo, setShowMemo] = useState(false);

  const isEmpty = tags.length === 0 && !height && !body.trim() && !file;

  function toggle(tag: string) {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  function onFile(f: File | null) {
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : '');
  }

  async function save() {
    setSaving(true);
    // 何も入力せずに進んだ場合は「異常なし」＝元気として1件残す。
    // 「見回ったが問題なかった」という事実も立派な記録なので空振りにしない。
    const finalTags = isEmpty ? ['元気'] : tags;
    const fd = new FormData();
    fd.append('tree_no', String(treeNo));
    fd.append('date', todayLocal());
    fd.append('body', body);
    fd.append('tags', finalTags.join(','));
    if (height) fd.append('height_cm', height);
    if (file) {
      // 送信前にスマホ内で縮小（畑の弱い電波でも送れるよう軽くする）
      const small = await compressImage(file);
      fd.append('file', small);
    }
    try {
      const res = await postWithRetry('/api/karte/entries', fd);
      setSaving(false);
      if (res.ok) onSaved();
      else alert('保存に失敗しました');
    } catch {
      setSaving(false);
      alert('電波が弱いようです。写真は保存されていません。もう一度お試しください。');
    }
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* 写真：スマホで押すとすぐ背面カメラが立ち上がる */}
        <div>
          {preview ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="" className="w-full h-48 object-cover rounded-xl" />
              <button
                onClick={() => onFile(null)}
                className="absolute top-2 right-2 bg-black/60 text-white w-8 h-8 rounded-full text-lg leading-none"
              >
                ×
              </button>
            </div>
          ) : (
            <label className="flex items-center justify-center gap-2 border-2 border-dashed border-green-300 bg-green-50/50 text-green-700 font-semibold rounded-xl py-4 cursor-pointer active:bg-green-100">
              📷 写真をとる
              <input
                type="file"
                accept="image/*,.heic,.heif"
                capture="environment"
                onChange={(e) => onFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
            </label>
          )}
        </div>

        {/* タグ */}
        {TAG_GROUPS.map((g) => (
          <div key={g.label}>
            <div className="flex items-baseline gap-2 mb-2">
              <h3 className="text-sm font-bold text-gray-700">{g.label}</h3>
              <span className="text-xs text-gray-400">{g.hint}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {g.tags.map((tag) => {
                const on = tags.includes(tag);
                const s = TONE_STYLE[g.tone];
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggle(tag)}
                    className={`px-3.5 py-2 rounded-full border text-sm font-medium transition active:scale-95 ${on ? s.on : s.off}`}
                  >
                    {on && '✓ '}
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* 樹高 */}
        <div>
          <h3 className="text-sm font-bold text-gray-700 mb-2">
            樹高 <span className="text-xs font-normal text-gray-400">はかった時だけ</span>
          </h3>
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder={lastHeight != null ? String(lastHeight) : '例: 85'}
              className="w-28 border border-gray-200 rounded-lg px-3 py-2.5 text-lg focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            <span className="text-gray-500">cm</span>
            {lastHeight != null && <span className="text-xs text-gray-400 ml-1">前回 {lastHeight}cm</span>}
          </div>
        </div>

        {/* メモ（任意・最初は畳んでおく） */}
        {showMemo ? (
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-2">メモ</h3>
            <textarea
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="タグで足りないことがあれば"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
            />
          </div>
        ) : (
          <button onClick={() => setShowMemo(true)} className="text-green-700 text-sm hover:underline">
            ＋ 文章のメモを足す（任意）
          </button>
        )}

        <div className="h-2" />
      </div>

      {/* 画面下に固定：親指で押せる位置 */}
      <div className="flex-shrink-0 border-t border-gray-200 bg-white px-4 py-3">
        <button
          onClick={save}
          disabled={saving}
          className="w-full bg-green-700 hover:bg-green-800 disabled:opacity-50 text-white font-bold rounded-xl py-3.5 text-base active:scale-[0.98] transition"
        >
          {saving ? '保存中...' : isEmpty ? emptyLabel : submitLabel}
        </button>
      </div>
    </>
  );
}

/* ============================ 樹高グラフ ============================ */

function Sparkline({ points }: { points: { date: string; h: number }[] }) {
  if (points.length < 2) return null;

  const W = 300;
  const H = 70;
  const P = 6;
  const hs = points.map((p) => p.h);
  const min = Math.min(...hs);
  const max = Math.max(...hs);
  const span = max - min || 1;

  const xy = points.map((p, i) => {
    const x = P + (i / (points.length - 1)) * (W - P * 2);
    const y = H - P - ((p.h - min) / span) * (H - P * 2);
    return [x, y] as const;
  });

  const line = xy.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${xy[xy.length - 1][0].toFixed(1)},${H} L${xy[0][0].toFixed(1)},${H} Z`;

  const grew = points[points.length - 1].h - points[0].h;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="text-sm font-bold text-green-700">📈 背くらべ</h2>
        <span className="text-xs text-gray-500">
          {points[0].h}cm → <span className="font-bold text-green-700">{points[points.length - 1].h}cm</span>
          {grew > 0 && <span className="text-green-600 ml-1">（+{grew}cm）</span>}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 70 }} preserveAspectRatio="none">
        <path d={area} fill="rgb(22 163 74 / 0.12)" />
        <path d={line} fill="none" stroke="rgb(21 128 61)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {xy.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={2.5} fill="rgb(21 128 61)" />
        ))}
      </svg>
      <div className="flex justify-between text-[10px] text-gray-400 mt-1">
        <span>{fmt(points[0].date)}</span>
        <span>{fmt(points[points.length - 1].date)}</span>
      </div>
    </div>
  );
}

/* ============================ 詳細（履歴を見る） ============================ */

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
  const [editingMeta, setEditingMeta] = useState(!tree.variety);
  const [savingMeta, setSavingMeta] = useState(false);
  const [adding, setAdding] = useState(false);
  const [consultingId, setConsultingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const lastHeight = entries.find((e) => e.height_cm != null)?.height_cm ?? null;

  // 樹高グラフ用（古い順）
  const points = useMemo(
    () =>
      entries
        .filter((e) => e.height_cm != null)
        .map((e) => ({ date: e.date, h: e.height_cm as number }))
        .reverse(),
    [entries]
  );

  async function consult(id: number) {
    setConsultingId(id);
    try {
      const res = await fetch('/api/karte/consult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry_id: id }),
      });
      if (res.ok) onChanged();
      else {
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

  async function deleteEntry(id: number) {
    if (!confirm('この記録を削除しますか？')) return;
    await fetch(`/api/karte/entries/${id}`, { method: 'DELETE' });
    onChanged();
  }

  if (adding) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
        <div className="bg-green-800 text-white px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <button onClick={() => setAdding(false)} className="text-green-200 hover:text-white text-sm">✕ やめる</button>
          <span className="font-semibold text-sm">
            {CIRCLED[tree.tree_no - 1]} {tree.variety || '品種未設定'} に記録する
          </span>
        </div>
        <EntryForm
          treeNo={tree.tree_no}
          lastHeight={lastHeight}
          onSaved={() => {
            setAdding(false);
            onChanged();
          }}
          submitLabel="記録する"
          emptyLabel="異常なし として記録する"
        />
      </div>
    );
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

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">
        <button
          onClick={() => setAdding(true)}
          className="w-full bg-green-700 hover:bg-green-800 text-white font-bold rounded-xl py-3.5 shadow active:scale-[0.98] transition"
        >
          ＋ この樹に記録する
        </button>

        {points.length >= 2 && <Sparkline points={points} />}

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
                  {savingMeta ? '保存中...' : '品種を保存'}
                </button>
                {tree.variety && (
                  <button onClick={() => setEditingMeta(false)} className="text-gray-500 text-sm px-3">キャンセル</button>
                )}
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

        {/* タイムライン */}
        <section>
          <h2 className="text-sm font-bold text-green-700 mb-3">📅 観察履歴（{entries.length}件）</h2>
          <div className="space-y-3">
            {entries.map((e) =>
              editingId === e.id ? (
                <EditEntry
                  key={e.id}
                  entry={e}
                  onCancel={() => setEditingId(null)}
                  onSaved={() => {
                    setEditingId(null);
                    onChanged();
                  }}
                />
              ) : (
                <EntryCard
                  key={e.id}
                  entry={e}
                  consulting={consultingId === e.id}
                  onConsult={() => consult(e.id)}
                  onEdit={() => setEditingId(e.id)}
                  onDelete={() => deleteEntry(e.id)}
                />
              )
            )}
            {entries.length === 0 && (
              <p className="text-gray-400 text-sm">まだ記録がありません。上のボタンから追加してください。</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function TagChips({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      {tags.map((t) => {
        const tone = toneOf(t);
        const cls =
          tone === 'warn'
            ? 'bg-amber-50 text-amber-700 border-amber-200'
            : tone === 'work'
              ? 'bg-stone-50 text-stone-600 border-stone-200'
              : 'bg-green-50 text-green-700 border-green-200';
        return (
          <span key={t} className={`text-xs px-2 py-0.5 rounded-full border ${cls}`}>
            {t}
          </span>
        );
      })}
    </div>
  );
}

function EntryCard({
  entry: e,
  consulting,
  onConsult,
  onEdit,
  onDelete,
}: {
  entry: KarteEntry;
  consulting: boolean;
  onConsult: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const tags = parseTags(e.tags);
  const hasWarn = tags.some((t) => WARN_TAGS.has(t));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {e.photo_filename && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={e.photo_filename} alt="" className="w-full max-h-72 object-cover" />
      )}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">
            {fmt(e.date)} <span className="text-gray-300">・{agoLabel(e.date)}</span>
          </span>
          <div className="flex items-center gap-2">
            <button onClick={onEdit} className="text-gray-400 hover:text-green-700 text-xs">編集</button>
            <button onClick={onDelete} className="text-gray-300 hover:text-red-400 text-lg leading-none">×</button>
          </div>
        </div>

        <TagChips tags={tags} />

        {e.height_cm != null && <p className="text-sm text-green-700 font-semibold mt-2">📏 樹高 {e.height_cm} cm</p>}
        {e.body && <p className="text-sm text-gray-700 mt-1.5 whitespace-pre-line">{e.body}</p>}

        {e.ai_feedback ? (
          <div className="mt-3 bg-green-50 border-l-2 border-green-400 rounded-r-lg p-3">
            <p className="text-xs font-bold text-green-700 mb-1">🤖 Claudeのフィードバック</p>
            <p className="text-sm text-gray-700 whitespace-pre-line">{e.ai_feedback}</p>
          </div>
        ) : (
          <button
            onClick={onConsult}
            disabled={consulting}
            className={
              'mt-3 w-full rounded-lg py-2 text-sm font-medium transition disabled:opacity-50 border ' +
              (hasWarn
                ? 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100'
                : 'border-green-200 text-green-700 hover:bg-green-50')
            }
          >
            {consulting ? '🤖 過去の記録を照合中...' : hasWarn ? '🤖 気になる点をAIに相談する' : '🤖 この記録をAIに相談する'}
          </button>
        )}
      </div>
    </div>
  );
}

function EditEntry({
  entry,
  onCancel,
  onSaved,
}: {
  entry: KarteEntry;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [date, setDate] = useState(entry.date);
  const [tags, setTags] = useState<string[]>(parseTags(entry.tags));
  const [height, setHeight] = useState(entry.height_cm != null ? String(entry.height_cm) : '');
  const [body, setBody] = useState(entry.body ?? '');
  const [saving, setSaving] = useState(false);

  function toggle(tag: string) {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/karte/entries/${entry.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date,
        body,
        tags: tags.join(','),
        height_cm: height ? Number(height) : null,
      }),
    });
    setSaving(false);
    if (res.ok) onSaved();
    else alert('更新に失敗しました');
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border-2 border-green-300 p-4 space-y-3">
      <div>
        <label className="text-xs text-gray-500 font-medium block mb-1">日付</label>
        <input
          type="date"
          value={date}
          onChange={(ev) => setDate(ev.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
        />
      </div>

      {TAG_GROUPS.map((g) => (
        <div key={g.label}>
          <p className="text-xs text-gray-500 font-medium mb-1.5">{g.label}</p>
          <div className="flex flex-wrap gap-1.5">
            {g.tags.map((tag) => {
              const on = tags.includes(tag);
              const s = TONE_STYLE[g.tone];
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggle(tag)}
                  className={`px-2.5 py-1.5 rounded-full border text-xs font-medium ${on ? s.on : s.off}`}
                >
                  {on && '✓ '}
                  {tag}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div>
        <label className="text-xs text-gray-500 font-medium block mb-1">樹高 cm</label>
        <input
          type="number"
          inputMode="numeric"
          value={height}
          onChange={(ev) => setHeight(ev.target.value)}
          className="w-28 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
        />
      </div>

      <div>
        <label className="text-xs text-gray-500 font-medium block mb-1">メモ</label>
        <textarea
          rows={3}
          value={body}
          onChange={(ev) => setBody(ev.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="bg-green-700 hover:bg-green-800 text-white text-sm rounded-lg px-4 py-2 disabled:opacity-50"
        >
          {saving ? '保存中...' : '変更を保存'}
        </button>
        <button onClick={onCancel} className="text-gray-500 text-sm px-3">キャンセル</button>
      </div>
    </div>
  );
}
