import { createClient, type Client, type InValue } from '@libsql/client';
import path from 'path';
import fs from 'fs';

// 本番(Vercel)では Turso、ローカルでは data/farm.db を使う。
// 同じコードでどちらにも対応する。
const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

let _client: Client | null = null;

function getClient(): Client {
  if (_client) return _client;
  if (TURSO_URL) {
    _client = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
  } else {
    // ローカル開発: ファイルDB
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    _client = createClient({ url: `file:${path.join(dataDir, 'farm.db')}` });
  }
  return _client;
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS trees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    species TEXT NOT NULL,
    species_name TEXT,
    plant_year INTEGER NOT NULL,
    age_at_plant INTEGER NOT NULL DEFAULT 1,
    note TEXT,
    fx REAL NOT NULL,
    fy REAL NOT NULL,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );
  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
    date TEXT NOT NULL,
    category TEXT NOT NULL,
    amount INTEGER NOT NULL,
    memo TEXT DEFAULT '',
    is_sample INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );
  CREATE TABLE IF NOT EXISTS bs_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    data TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    tags TEXT DEFAULT '',
    caption TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );
  CREATE TABLE IF NOT EXISTS growth_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('milestone', 'task', 'observation', 'measurement')),
    title TEXT NOT NULL,
    body TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );
  CREATE TABLE IF NOT EXISTS karte_trees (
    tree_no INTEGER PRIMARY KEY,
    variety TEXT DEFAULT '',
    nickname TEXT DEFAULT '',
    note TEXT DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS karte_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tree_no INTEGER NOT NULL,
    date TEXT NOT NULL,
    body TEXT DEFAULT '',
    photo_filename TEXT DEFAULT '',
    height_cm INTEGER,
    ai_feedback TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );
`;

// 固定IDを付与し、何度実行しても重複しない（INSERT OR IGNORE）初期データ。
// 本番では複数サーバーが同時に初期化を走らせるため、冪等(idempotent)であることが必須。
const GROWTH_SEED = [
  { id: 1, date: '2026-03-15', type: 'milestone', title: '事業開始・新規就農申請', body: '土地購入手続きと新規就農の申請手続きを開始。青森県弘前市船沢地区の耕作放棄地を取得予定。' },
  { id: 2, date: '2026-03-22', type: 'task', title: '土壌改良・高畝造成', body: 'バーグたい肥を土と混合し、高畝式の植え付け準備を実施。耕作放棄地の土壌を改良。' },
  { id: 3, date: '2026-03-25', type: 'milestone', title: '苗木12本の植樹完了', body: 'ヤムヒル・ジェファーソン他の品種を含む計12本を高畝式で定植。苗木はそれぞれ30cm〜1mの高さ。' },
  { id: 4, date: '2026-04-01', type: 'task', title: '定期管理作業開始', body: '定期的な水やりを開始。並行して耕作放棄地の雑草刈りと周辺木の剪定による景観回復作業を継続。' },
  { id: 5, date: '2026-05-26', type: 'observation', title: '全12本の芽吹きを確認', body: '植樹から約2ヶ月。全12本において葉の芽吹きを確認。樹高はそれぞれ異なり30cm〜1mの範囲。順調な定着を確認。' },
];

let _schemaReady: Promise<void> | null = null;

async function ensureSchema(): Promise<void> {
  if (_schemaReady) return _schemaReady;
  _schemaReady = (async () => {
    try {
      const client = getClient();
      // CREATE TABLE 群を順に実行
      const statements = SCHEMA.split(';').map((s) => s.trim()).filter(Boolean);
      for (const stmt of statements) {
        await client.execute(stmt);
      }
      // 12本のカルテを初期生成（tree_noは主キー → OR IGNORE で冪等）
      for (let i = 1; i <= 12; i++) {
        await client.execute({
          sql: 'INSERT OR IGNORE INTO karte_trees (tree_no, variety) VALUES (?, ?)',
          args: [i, ''],
        });
      }
      // 生育記録の初期データ（固定id + OR IGNORE で冪等）
      for (const log of GROWTH_SEED) {
        await client.execute({
          sql: 'INSERT OR IGNORE INTO growth_logs (id, date, type, title, body) VALUES (?, ?, ?, ?, ?)',
          args: [log.id, log.date, log.type, log.title, log.body],
        });
      }
      // デフォルト写真（岩木山）— public/gallery/iwaki.jpg は静的配信される
      await client.execute({
        sql: 'INSERT OR IGNORE INTO photos (id, filename, original_name, tags, caption, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        args: [1, '/gallery/iwaki.jpg', '岩木山と農園.jpg', '岩木山,農園', '岩木山と農園', '2026-04-01'],
      });
    } catch (e) {
      // 失敗したら次回リトライできるようキャッシュをクリア
      _schemaReady = null;
      throw e;
    }
  })();
  return _schemaReady;
}

function sanitize(args: unknown[]): InValue[] {
  return args.map((a) => {
    if (a === undefined || a === null) return null;
    if (typeof a === 'boolean') return a ? 1 : 0;
    return a as InValue;
  });
}

// --- クエリヘルパー（呼び出し側を簡潔にする） ---

export async function all<T = Record<string, unknown>>(sql: string, args: unknown[] = []): Promise<T[]> {
  await ensureSchema();
  const res = await getClient().execute({ sql, args: sanitize(args) });
  return res.rows as unknown as T[];
}

export async function get<T = Record<string, unknown>>(sql: string, args: unknown[] = []): Promise<T | undefined> {
  await ensureSchema();
  const res = await getClient().execute({ sql, args: sanitize(args) });
  return (res.rows[0] as unknown as T) ?? undefined;
}

export async function run(
  sql: string,
  args: unknown[] = []
): Promise<{ lastInsertRowid: number | null; rowsAffected: number }> {
  await ensureSchema();
  const res = await getClient().execute({ sql, args: sanitize(args) });
  return {
    lastInsertRowid: res.lastInsertRowid != null ? Number(res.lastInsertRowid) : null,
    rowsAffected: res.rowsAffected,
  };
}

// 複数文をまとめて実行（サンプル投入などで使用）
export async function batch(items: { sql: string; args?: unknown[] }[]): Promise<void> {
  await ensureSchema();
  await getClient().batch(
    items.map((it) => ({ sql: it.sql, args: sanitize(it.args ?? []) })),
    'write'
  );
}
