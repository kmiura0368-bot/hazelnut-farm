import path from 'path';
import fs from 'fs/promises';
import { run } from './turso';

const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

/**
 * 画像を保存して、表示用のURL（またはパス）を返す。
 * 保存先の優先順位:
 *   1. Vercel Blob（BLOB_READ_WRITE_TOKEN があれば）
 *   2. データベース（image_store テーブル）← 設定不要。/api/image/{id} で配信
 *   3. ローカルの public/gallery（開発時のフォールバック）
 * HEIC/HEIF は自動でJPEGに変換し、大きな写真は縮小・圧縮してから保存する。
 */
export async function saveImage(
  file: File,
  prefix = 'photo'
): Promise<{ url: string; storedName: string }> {
  let buffer = Buffer.from(await file.arrayBuffer());
  let ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase();

  // HEIC/HEIF → JPEG 変換（iPhone写真をブラウザで表示可能にする）
  if (ext === 'heic' || ext === 'heif') {
    try {
      const heicConvert = (await import('heic-convert')).default;
      const out = await heicConvert({ buffer: new Uint8Array(buffer), format: 'JPEG', quality: 0.85 });
      buffer = Buffer.from(out);
      ext = 'jpg';
    } catch (e) {
      console.error('HEIC変換に失敗しました。元の形式で保存します。', e);
    }
  }

  // 縮小・再圧縮（DBに収まるサイズにする。長辺1600px・JPEG品質72）
  let mime = 'image/jpeg';
  try {
    const sharp = (await import('sharp')).default;
    buffer = await sharp(buffer)
      .rotate() // EXIFの向きを反映
      .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 72 })
      .toBuffer();
    ext = 'jpg';
    mime = 'image/jpeg';
  } catch (e) {
    console.error('画像の縮小に失敗しました。元データで保存します。', e);
    mime =
      ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
  }

  const storedName = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  // 1. Vercel Blob
  if (BLOB_TOKEN) {
    const { put } = await import('@vercel/blob');
    const blob = await put(storedName, buffer, { access: 'public', contentType: mime, token: BLOB_TOKEN });
    return { url: blob.url, storedName };
  }

  // 2. データベース保存（設定不要・本番/ローカル共通）
  const result = await run('INSERT INTO image_store (mime, data) VALUES (?, ?)', [mime, new Uint8Array(buffer)]);
  return { url: `/api/image/${result.lastInsertRowid}`, storedName };
}

/**
 * 保存した画像を削除する。url は saveImage が返したもの。
 */
export async function deleteImage(url: string): Promise<void> {
  if (!url) return;

  // Vercel Blob
  if (url.startsWith('http')) {
    if (BLOB_TOKEN) {
      try {
        const { del } = await import('@vercel/blob');
        await del(url, { token: BLOB_TOKEN });
      } catch (e) {
        console.error('Blob削除に失敗', e);
      }
    }
    return;
  }

  // データベース保存分
  const m = url.match(/^\/api\/image\/(\d+)/);
  if (m) {
    await run('DELETE FROM image_store WHERE id = ?', [Number(m[1])]);
    return;
  }

  // ローカル: /gallery/xxx
  const name = url.replace(/^\/gallery\//, '');
  if (!name) return;
  await fs.unlink(path.join(process.cwd(), 'public', 'gallery', name)).catch(() => {});
}
