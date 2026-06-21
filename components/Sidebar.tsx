'use client';

import { Tree } from '@/lib/db';
import { FARM_CONFIG } from '@/lib/config';

interface SidebarProps {
  trees: Tree[];
  selectedId: number | null;
  onTreeSelect: (id: number) => void;
}

const SPECIES_LABELS: Record<string, string> = {
  european: 'ヨーロッパ',
  american: 'アメリカ',
  hybrid: 'ハイブリッド',
};

const SPECIES_COLORS: Record<string, string> = {
  european: '#2d6a4f',
  american: '#40916c',
  hybrid: '#52b788',
};

export default function Sidebar({ trees, selectedId, onTreeSelect }: SidebarProps) {
  const currentYear = new Date().getFullYear();

  // Statistics
  const speciesCount = trees.reduce<Record<string, number>>((acc, t) => {
    acc[t.species] = (acc[t.species] ?? 0) + 1;
    return acc;
  }, {});

  const avgAge = trees.length > 0
    ? Math.round(trees.reduce((sum, t) => sum + (currentYear - t.plant_year + t.age_at_plant), 0) / trees.length)
    : 0;

  return (
    <div className="w-64 flex-shrink-0 h-full bg-green-800 text-white flex flex-col overflow-hidden">
      {/* Title */}
      <div className="px-4 py-4 bg-green-900 border-b border-green-700">
        <h1 className="text-base font-bold leading-tight">🌰 樹木管理</h1>
        <p className="text-green-300 text-xs mt-0.5">ヘーゼルナッツ農園</p>
      </div>

      {/* Farm stats */}
      <div className="px-4 py-3 bg-green-700 border-b border-green-600">
        <h2 className="text-xs font-bold text-green-200 uppercase tracking-wide mb-2">農園情報</h2>
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-green-300">総面積</span>
            <span className="font-semibold">{FARM_CONFIG.AREA_SQM.toLocaleString()}㎡</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-green-300">総本数</span>
            <span className="font-semibold">{trees.length}本</span>
          </div>
          {trees.length > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-green-300">平均樹齢</span>
              <span className="font-semibold">約{avgAge}年</span>
            </div>
          )}
        </div>
      </div>

      {/* Species breakdown */}
      {Object.keys(speciesCount).length > 0 && (
        <div className="px-4 py-3 bg-green-700 border-b border-green-600">
          <h2 className="text-xs font-bold text-green-200 uppercase tracking-wide mb-2">品種内訳</h2>
          <div className="space-y-1">
            {Object.entries(speciesCount).map(([sp, count]) => (
              <div key={sp} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full inline-block flex-shrink-0"
                    style={{ backgroundColor: SPECIES_COLORS[sp] ?? '#52b788' }}
                  />
                  <span className="text-green-200">{SPECIES_LABELS[sp] ?? sp}</span>
                </div>
                <span className="font-semibold">{count}本</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tree list */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-2 sticky top-0 bg-green-800 border-b border-green-700">
          <h2 className="text-xs font-bold text-green-200 uppercase tracking-wide">
            樹木一覧 ({trees.length}本)
          </h2>
        </div>

        {trees.length === 0 ? (
          <div className="px-4 py-8 text-center text-green-400 text-sm">
            <div className="text-3xl mb-2">🌱</div>
            <div>マップをクリックして</div>
            <div>樹木を追加してください</div>
          </div>
        ) : (
          <ul className="py-1">
            {trees.map(tree => {
              const age = currentYear - tree.plant_year + tree.age_at_plant;
              const isSelected = tree.id === selectedId;
              return (
                <li key={tree.id}>
                  <button
                    onClick={() => onTreeSelect(tree.id)}
                    className={`w-full text-left px-4 py-2.5 flex items-start gap-2.5 hover:bg-green-700 transition-colors ${
                      isSelected ? 'bg-green-600 border-l-4 border-orange-400' : 'border-l-4 border-transparent'
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full flex-shrink-0 mt-0.5 border-2 border-white border-opacity-30"
                      style={{ backgroundColor: isSelected ? '#f4a261' : (SPECIES_COLORS[tree.species] ?? '#52b788') }}
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">
                        #{tree.id} {SPECIES_LABELS[tree.species] ?? tree.species}
                      </div>
                      {tree.species_name && (
                        <div className="text-xs text-green-300 truncate">{tree.species_name}</div>
                      )}
                      <div className="text-xs text-green-400">
                        {tree.plant_year}年植付 · 約{Math.max(0, age)}年
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Footer hint */}
      <div className="px-4 py-3 bg-green-900 border-t border-green-700">
        <p className="text-xs text-green-400 leading-relaxed">
          マップの空き地をクリック → 新規登録<br />
          既存の樹木をクリック → 編集
        </p>
      </div>
    </div>
  );
}
