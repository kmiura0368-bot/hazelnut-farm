import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { all, get, run } from '@/lib/turso';

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

// 今回の写真を Claude Vision に渡せる形（url or base64）に変換する。
// - 本番(Vercel Blob): https://... → そのまま url 指定
// - ローカル: /gallery/xxx → ファイルを読んで base64 化
async function buildImageSource(photo: string) {
  if (!photo) return null;
  if (photo.startsWith('http')) {
    return { type: 'url' as const, url: photo };
  }
  if (photo.startsWith('/gallery/')) {
    try {
      const name = photo.replace(/^\/gallery\//, '');
      const buf = await fs.readFile(path.join(process.cwd(), 'public', 'gallery', name));
      const ext = (name.split('.').pop() ?? 'jpg').toLowerCase();
      const media_type =
        ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
      return { type: 'base64' as const, media_type, data: buf.toString('base64') };
    } catch (e) {
      console.error('カルテ写真の読み込みに失敗しました', e);
      return null;
    }
  }
  return null;
}

function fmt(d: string) {
  const [y, m, day] = d.split('-');
  return `${y}年${Number(m)}月${Number(day)}日`;
}

// 過去の記録を、Claudeに渡すテキスト履歴に整形する。
function buildHistoryText(tree: KarteTree, past: KarteEntry[], current: KarteEntry): string {
  const no = CIRCLED[tree.tree_no - 1] ?? `${tree.tree_no}番`;
  const head = `対象の樹: ${no}（品種: ${tree.variety || '未設定'}${tree.nickname ? ` / ${tree.nickname}` : ''}）`;

  const cur = [
    `■ 今回の記録（${fmt(current.date)}）`,
    current.height_cm != null ? `樹高: ${current.height_cm}cm` : null,
    current.body ? `観察: ${current.body}` : '観察コメントなし',
    current.photo_filename ? '※今回の写真を添付しています。' : null,
  ]
    .filter(Boolean)
    .join('\n');

  if (past.length === 0) {
    return `${head}\n\n${cur}\n\n■ この樹の過去の記録\nまだ過去の記録はありません（今回が最初の記録です）。`;
  }

  const lines = past
    .map((e) => {
      const parts = [
        `・${fmt(e.date)}`,
        e.height_cm != null ? `樹高${e.height_cm}cm` : null,
        e.body ? e.body : '（コメントなし）',
      ].filter(Boolean);
      return parts.join(' / ');
    })
    .join('\n');

  return `${head}\n\n${cur}\n\n■ この樹の過去の記録（新しい順）\n${lines}`;
}

const SYSTEM_PROMPT = `あなたはヘーゼルナッツ農園の栽培をサポートする、経験豊富で実直なアドバイザーです。
青森県弘前市の耕作放棄地を改良した畑で、2026年春に植えたばかりの若いヘーゼルナッツ12本を、農家本人が個別に観察記録しています。

渡される情報は「今回の観察記録（写真つきの場合あり）」と「同じ樹の過去の記録」です。
過去の記録の中から今回と似た状況を探し当て、農家が次の一手を判断できるよう助けてください。

必ず次の3項目の見出しで、簡潔な日本語で答えてください（各項目2〜3文まで）:

【似た過去】
過去の記録に今回と似た状況があれば、いつ・どんな様子だったかを引用する。
似た記録が無ければ、見栄を張らず「過去の記録には似た状況は見当たりません。今回が初めての症状のようです」と正直に書く。決して過去の記録をでっち上げないこと。

【考えられること】
今回の観察（と写真）から考えられる原因や状態を、断定しすぎず挙げる。

【次の一手】
農家が今日〜数日で実際にできる具体的な行動を1〜2個。専門用語は避け、平易に。

注意:
- 過去の記録に無い事実を、あったかのように書かないこと。
- 若木なので大げさに不安を煽らないこと。観察を続ける価値がある点は前向きに伝える。`;

export async function POST(req: NextRequest) {
  try {
    const { entry_id } = await req.json();
    if (!entry_id) {
      return NextResponse.json({ error: '記録IDが指定されていません' }, { status: 400 });
    }

    const apiKeyRow = await get<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['apikey']);
    if (!apiKeyRow || !apiKeyRow.value) {
      return NextResponse.json({ error: 'APIキーが設定されていません（設定タブで登録してください）' }, { status: 400 });
    }

    const current = await get<KarteEntry>('SELECT * FROM karte_entries WHERE id = ?', [entry_id]);
    if (!current) {
      return NextResponse.json({ error: '対象の記録が見つかりません' }, { status: 404 });
    }

    const tree =
      (await get<KarteTree>('SELECT * FROM karte_trees WHERE tree_no = ?', [current.tree_no])) ??
      ({ tree_no: current.tree_no, variety: '', nickname: '', note: '' } as KarteTree);

    // 同じ樹の、今回より前の記録を新しい順で取得（＝過去照合の対象）
    const past = await all<KarteEntry>(
      'SELECT * FROM karte_entries WHERE tree_no = ? AND id != ? AND date <= ? ORDER BY date DESC, id DESC',
      [current.tree_no, current.id, current.date]
    );

    const historyText = buildHistoryText(tree, past, current);

    const content: unknown[] = [];
    const img = await buildImageSource(current.photo_filename);
    if (img) {
      content.push({ type: 'image', source: img });
    }
    content.push({ type: 'text', text: historyText });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKeyRow.value,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic API error:', errText);
      return NextResponse.json({ error: 'AIへの相談に失敗しました' }, { status: 500 });
    }

    const data = await response.json();
    const feedback = (data.content?.[0]?.text ?? '').trim();
    if (!feedback) {
      return NextResponse.json({ error: 'AIから回答を得られませんでした' }, { status: 500 });
    }

    await run('UPDATE karte_entries SET ai_feedback = ? WHERE id = ?', [feedback, current.id]);

    return NextResponse.json({ id: current.id, ai_feedback: feedback });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'AI相談の処理に失敗しました' }, { status: 500 });
  }
}
