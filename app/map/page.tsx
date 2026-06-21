'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Sidebar from '@/components/Sidebar';
import TreeModal, { TreeFormData } from '@/components/TreeModal';
import { Tree } from '@/lib/db';

// Dynamic import for Canvas-based components to avoid SSR issues
const FarmMap = dynamic(() => import('@/components/FarmMap'), { ssr: false });
const IsometricView = dynamic(() => import('@/components/IsometricView'), { ssr: false });

interface ModalState {
  isOpen: boolean;
  tree: Tree | null;
  initialFx: number;
  initialFy: number;
}

export default function HomePage() {
  const [trees, setTrees] = useState<Tree[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    tree: null,
    initialFx: 0.5,
    initialFy: 0.5,
  });

  // Fetch all trees on mount
  const fetchTrees = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/trees');
      if (!res.ok) throw new Error('Failed to fetch trees');
      const data = await res.json() as Tree[];
      setTrees(data);
      setError(null);
    } catch (e) {
      setError('樹木データの取得に失敗しました');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrees();
  }, [fetchTrees]);

  // Map click: open modal for new tree
  const handleMapClick = useCallback((fx: number, fy: number) => {
    setModalState({
      isOpen: true,
      tree: null,
      initialFx: fx,
      initialFy: fy,
    });
  }, []);

  // Tree click: open modal for edit
  const handleTreeClick = useCallback((tree: Tree) => {
    setSelectedId(tree.id);
    setModalState({
      isOpen: true,
      tree,
      initialFx: tree.fx,
      initialFy: tree.fy,
    });
  }, []);

  // Sidebar tree select: highlight on map
  const handleTreeSelect = useCallback((id: number) => {
    setSelectedId(prev => prev === id ? null : id);
  }, []);

  // Save (create or update)
  const handleSave = useCallback(async (data: TreeFormData) => {
    try {
      if (modalState.tree) {
        // Update
        const res = await fetch(`/api/trees/${modalState.tree.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Update failed');
        const updated = await res.json() as Tree;
        setTrees(prev => prev.map(t => t.id === updated.id ? updated : t));
        setSelectedId(updated.id);
      } else {
        // Create
        const res = await fetch('/api/trees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Create failed');
        const created = await res.json() as Tree;
        setTrees(prev => [...prev, created]);
        setSelectedId(created.id);
      }
      setModalState(s => ({ ...s, isOpen: false }));
    } catch (e) {
      console.error('Save failed:', e);
      alert('保存に失敗しました');
    }
  }, [modalState.tree]);

  // Delete
  const handleDelete = useCallback(async (id: number) => {
    try {
      const res = await fetch(`/api/trees/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setTrees(prev => prev.filter(t => t.id !== id));
      setSelectedId(null);
      setModalState(s => ({ ...s, isOpen: false }));
    } catch (e) {
      console.error('Delete failed:', e);
      alert('削除に失敗しました');
    }
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalState(s => ({ ...s, isOpen: false }));
  }, []);

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        trees={trees}
        selectedId={selectedId}
        onTreeSelect={handleTreeSelect}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Top bar */}
        <div className="bg-green-700 text-white px-6 py-3 flex items-center justify-between shadow-md flex-shrink-0">
          <div>
            <h1 className="text-lg font-bold">ヘーゼルナッツ農園マップ</h1>
            <p className="text-green-200 text-xs">
              空き地をクリックして樹木を登録 · 樹木をクリックして編集
            </p>
          </div>
          <div className="flex items-center gap-4">
            {loading && (
              <span className="text-green-200 text-sm animate-pulse">読み込み中...</span>
            )}
            {error && (
              <span className="text-red-200 text-sm">{error}</span>
            )}
            <div className="text-sm text-green-200">
              <span className="font-semibold text-white">{trees.length}</span> 本登録済み
            </div>
            <button
              onClick={() => setModalState({ isOpen: true, tree: null, initialFx: 0.5, initialFy: 0.5 })}
              className="bg-green-600 hover:bg-green-500 border border-green-500 text-white text-sm px-4 py-1.5 rounded-lg font-semibold transition-colors"
            >
              + 新規登録
            </button>
          </div>
        </div>

        {/* Map area */}
        <div className="flex-shrink-0 p-4" style={{ height: '440px' }}>
          <div className="w-full h-full rounded-xl overflow-hidden shadow-lg border border-green-200">
            <FarmMap
              trees={trees}
              selectedId={selectedId}
              onMapClick={handleMapClick}
              onTreeClick={handleTreeClick}
            />
          </div>
        </div>

        {/* Isometric preview */}
        <div className="px-4 pb-6">
          <IsometricView trees={trees} />
        </div>
      </div>

      {/* Tree Modal */}
      <TreeModal
        isOpen={modalState.isOpen}
        tree={modalState.tree}
        initialFx={modalState.initialFx}
        initialFy={modalState.initialFy}
        onSave={handleSave}
        onDelete={handleDelete}
        onClose={handleCloseModal}
      />
    </div>
  );
}
