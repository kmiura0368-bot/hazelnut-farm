import path from 'path';
import fs from 'fs/promises';

const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

/**
 * 画像を保存して、表示用のURL（またはパス）を返す。
 * - 本番(Vercel Blob あり): クラウドに保存し https://... のURLを返す
 * - ローカル: public/gallery に保存し /gallery/xxx を返す
 * HEIC/HEIF は自動でJPEGに変換する。
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

  const storedName = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const contentType =
    ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'gif' ? 'image/gif' : 'image/jpeg';

  if (BLOB_TOKEN) {
    const { put } = await import('@vercel/blob');
    const blob = await put(storedName, buffer, {
      access: 'public',
      contentType,
      token: BLOB_TOKEN,
    });
    return { url: blob.url, storedName };
  }

  // ローカル保存
  const galleryDir = path.join(process.cwd(), 'public', 'gallery');
  await fs.mkdir(galleryDir, { recursive: true });
  await fs.writeFile(path.join(galleryDir, storedName), buffer);
  return { url: `/gallery/${storedName}`, storedName };
}

/**
 * 保存した画像を削除する。url は saveImage が返したもの。
 */
export async function deleteImage(url: string): Promise<void> {
  if (!url) return;
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
  // ローカル: /gallery/xxx
  const name = url.replace(/^\/gallery\//, '');
  if (!name) return;
  await fs.unlink(path.join(process.cwd(), 'public', 'gallery', name)).catch(() => {});
}
