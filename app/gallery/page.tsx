'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Image from 'next/image';

interface Photo {
  id: number;
  filename: string;
  original_name: string;
  tags: string;
  caption: string;
  created_at: string;
}

const PRESET_TAGS = ['春', '夏', '秋', '冬', '開花', '収穫', '剪定', '施肥', '苗木', '岩木山', '農機具'];

export default function GalleryPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedTag, setSelectedTag] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [lightbox, setLightbox] = useState<Photo | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [editCaption, setEditCaption] = useState('');
  const [editTags, setEditTags] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPhotos = useCallback(async () => {
    const url = selectedTag ? `/api/photos?tag=${encodeURIComponent(selectedTag)}` : '/api/photos';
    const res = await fetch(url);
    if (res.ok) setPhotos(await res.json());
  }, [selectedTag]);

  useEffect(() => { fetchPhotos(); }, [fetchPhotos]);

  const uploadFiles = async (files: FileList | File[]) => {
    setUploadError('');
    const fileArray = Array.from(files);
    if (!fileArray.length) return;
    setUploading(true);
    try {
      for (const file of fileArray) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('tags', '');
        fd.append('caption', '');
        const res = await fetch('/api/photos', { method: 'POST', body: fd });
        if (!res.ok) {
          const err = await res.json();
          setUploadError(err.error ?? 'アップロードに失敗しました');
        }
      }
      await fetchPhotos();
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (photo: Photo) => {
    if (!confirm(`「${photo.original_name}」を削除しますか？`)) return;
    await fetch(`/api/photos/${photo.id}`, { method: 'DELETE' });
    setPhotos((p) => p.filter((x) => x.id !== photo.id));
    if (lightbox?.id === photo.id) setLightbox(null);
  };

  const handleSaveEdit = async () => {
    if (editId === null) return;
    await fetch(`/api/photos/${editId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caption: editCaption, tags: editTags }),
    });
    setEditId(null);
    await fetchPhotos();
  };

  const allTags = Array.from(
    new Set(photos.flatMap((p) => p.tags.split(',').map((t) => t.trim()).filter(Boolean)))
  );

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-green-800 to-green-600 text-white px-8 py-6">
        <h1 className="text-2xl font-bold">🖼️ フォトギャラリー</h1>
        <p className="text-green-200 text-sm mt-1">
          向野ヘーゼルナッツ農園 ／ 農園の記録・成長の軌跡
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* アップロードエリア */}
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center mb-6 cursor-pointer transition-all ${
            dragOver
              ? 'border-green-500 bg-green-50'
              : 'border-gray-300 bg-white hover:border-green-400 hover:bg-green-50'
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            uploadFiles(e.dataTransfer.files);
          }}
        >
          <div className="text-4xl mb-3">{uploading ? '⏳' : '📷'}</div>
          <p className="font-semibold text-gray-700">
            {uploading ? 'アップロード中...' : 'クリックまたはドラッグ＆ドロップで写真を追加'}
          </p>
          <p className="text-sm text-gray-400 mt-1">JPG・PNG・WEBP・GIF対応 ／ 複数ファイル同時選択可</p>
          {uploadError && <p className="text-red-500 text-sm mt-2">{uploadError}</p>}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && uploadFiles(e.target.files)}
          />
        </div>

        {/* タグフィルター */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setSelectedTag('')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedTag === ''
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-green-400'
            }`}
          >
            すべて ({photos.length})
          </button>
          {[...new Set([...PRESET_TAGS, ...allTags])].map((tag) => {
            const count = photos.filter((p) =>
              p.tags.split(',').map((t) => t.trim()).includes(tag)
            ).length;
            if (selectedTag === '' && count === 0) return null;
            return (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag === selectedTag ? '' : tag)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedTag === tag
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-green-400'
                }`}
              >
                {tag} {count > 0 && <span className="opacity-70">({count})</span>}
              </button>
            );
          })}
        </div>

        {/* フォトグリッド（3列） */}
        {photos.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-lg">{selectedTag ? `「${selectedTag}」の写真はありません` : '写真がまだありません'}</p>
            <p className="text-sm mt-2">上のエリアから写真をアップロードしてください</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow group"
              >
                {/* サムネイル */}
                <div
                  className="relative aspect-video bg-gray-100 cursor-pointer overflow-hidden"
                  onClick={() => setLightbox(photo)}
                >
                  <Image
                    src={photo.filename}
                    alt={photo.caption || photo.original_name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                </div>

                {/* 情報エリア */}
                {editId === photo.id ? (
                  <div className="p-3 space-y-2">
                    <input
                      className="w-full text-sm border border-gray-200 rounded px-2 py-1"
                      placeholder="キャプション"
                      value={editCaption}
                      onChange={(e) => setEditCaption(e.target.value)}
                    />
                    <input
                      className="w-full text-sm border border-gray-200 rounded px-2 py-1"
                      placeholder="タグ（カンマ区切り）例: 春,収穫"
                      value={editTags}
                      onChange={(e) => setEditTags(e.target.value)}
                    />
                    <div className="flex flex-wrap gap-1 mb-1">
                      {PRESET_TAGS.map((t) => (
                        <button
                          key={t}
                          className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                            editTags.split(',').map(x=>x.trim()).includes(t)
                              ? 'bg-green-100 border-green-400 text-green-700'
                              : 'border-gray-200 text-gray-500 hover:border-green-300'
                          }`}
                          onClick={() => {
                            const current = editTags.split(',').map(x=>x.trim()).filter(Boolean);
                            const next = current.includes(t) ? current.filter(x=>x!==t) : [...current, t];
                            setEditTags(next.join(', '));
                          }}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleSaveEdit} className="flex-1 bg-green-600 text-white text-xs py-1.5 rounded font-semibold hover:bg-green-700">保存</button>
                      <button onClick={() => setEditId(null)} className="flex-1 bg-gray-100 text-gray-600 text-xs py-1.5 rounded hover:bg-gray-200">キャンセル</button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {photo.caption || photo.original_name}
                    </p>
                    {photo.tags && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {photo.tags.split(',').map(t=>t.trim()).filter(Boolean).map((tag) => (
                          <span key={tag} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-1.5">{photo.created_at.slice(0, 10)}</p>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => { setEditId(photo.id); setEditCaption(photo.caption); setEditTags(photo.tags); }}
                        className="flex-1 text-xs border border-amber-300 text-amber-700 py-1 rounded hover:bg-amber-50 transition-colors"
                      >
                        ✏️ 編集
                      </button>
                      <button
                        onClick={() => handleDelete(photo)}
                        className="flex-1 text-xs border border-red-300 text-red-600 py-1 rounded hover:bg-red-50 transition-colors"
                      >
                        🗑️ 削除
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ライトボックス */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-w-4xl w-full max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setLightbox(null)}
              className="absolute -top-10 right-0 text-white text-xl font-bold hover:text-gray-300 z-10"
            >
              ✕ 閉じる
            </button>
            <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
              <Image
                src={lightbox.filename}
                alt={lightbox.caption || lightbox.original_name}
                fill
                className="object-contain rounded-lg"
                sizes="90vw"
              />
            </div>
            <div className="bg-black/60 text-white px-4 py-3 rounded-b-lg mt-1">
              <p className="font-semibold">{lightbox.caption || lightbox.original_name}</p>
              <div className="flex gap-2 mt-1 flex-wrap">
                {lightbox.tags.split(',').map(t=>t.trim()).filter(Boolean).map((tag) => (
                  <span key={tag} className="text-xs bg-green-700 px-2 py-0.5 rounded-full">{tag}</span>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">{lightbox.created_at.slice(0, 10)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
