'use client';

import { useState, useEffect } from 'react';
import { Tree } from '@/lib/db';

interface TreeModalProps {
  isOpen: boolean;
  tree: Tree | null;
  initialFx?: number;
  initialFy?: number;
  onSave: (data: TreeFormData) => void;
  onDelete?: (id: number) => void;
  onClose: () => void;
}

export interface TreeFormData {
  species: string;
  species_name: string;
  plant_year: number;
  age_at_plant: number;
  note: string;
  fx: number;
  fy: number;
}

const SPECIES_OPTIONS = [
  { value: 'european', label: 'ヨーロッパヘーゼル' },
  { value: 'american', label: 'アメリカヘーゼル' },
  { value: 'hybrid', label: 'ハイブリッド' },
];

const CURRENT_YEAR = new Date().getFullYear();

export default function TreeModal({
  isOpen,
  tree,
  initialFx,
  initialFy,
  onSave,
  onDelete,
  onClose,
}: TreeModalProps) {
  const [species, setSpecies] = useState('european');
  const [speciesName, setSpeciesName] = useState('');
  const [plantYear, setPlantYear] = useState(CURRENT_YEAR);
  const [ageAtPlant, setAgeAtPlant] = useState(1);
  const [note, setNote] = useState('');
  const [fx, setFx] = useState(0.5);
  const [fy, setFy] = useState(0.5);

  useEffect(() => {
    if (!isOpen) return;
    if (tree) {
      setSpecies(tree.species);
      setSpeciesName(tree.species_name ?? '');
      setPlantYear(tree.plant_year);
      setAgeAtPlant(tree.age_at_plant);
      setNote(tree.note ?? '');
      setFx(tree.fx);
      setFy(tree.fy);
    } else {
      setSpecies('european');
      setSpeciesName('');
      setPlantYear(CURRENT_YEAR);
      setAgeAtPlant(1);
      setNote('');
      setFx(initialFx ?? 0.5);
      setFy(initialFy ?? 0.5);
    }
  }, [isOpen, tree, initialFx, initialFy]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      species,
      species_name: speciesName,
      plant_year: plantYear,
      age_at_plant: ageAtPlant,
      note,
      fx,
      fy,
    });
  };

  const handleDelete = () => {
    if (tree && onDelete) {
      if (confirm(`樹木 #${tree.id} を削除しますか？`)) {
        onDelete(tree.id);
      }
    }
  };

  if (!isOpen) return null;

  const estimatedAge = CURRENT_YEAR - plantYear + ageAtPlant;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-green-700 text-white px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">
            {tree ? `樹木編集 #${tree.id}` : '新規樹木登録'}
          </h2>
          <button
            onClick={onClose}
            className="text-green-100 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Species */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              品種 <span className="text-red-500">*</span>
            </label>
            <select
              value={species}
              onChange={e => setSpecies(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {SPECIES_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Species Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              品種名（任意）
            </label>
            <input
              type="text"
              value={speciesName}
              onChange={e => setSpeciesName(e.target.value)}
              placeholder="例: ポンタベッキオ"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Plant Year and Age */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                植付年 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={plantYear}
                onChange={e => setPlantYear(parseInt(e.target.value, 10))}
                required
                min={1900}
                max={CURRENT_YEAR + 5}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                植付時樹齢
              </label>
              <input
                type="number"
                value={ageAtPlant}
                onChange={e => setAgeAtPlant(parseInt(e.target.value, 10))}
                min={0}
                max={100}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {/* Estimated age info */}
          <div className="text-xs text-green-700 bg-green-50 rounded px-3 py-1">
            現在の推定樹齢: 約 {Math.max(0, estimatedAge)} 年
          </div>

          {/* Position */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                位置 X (0〜1)
              </label>
              <input
                type="number"
                value={fx.toFixed(4)}
                onChange={e => setFx(parseFloat(e.target.value))}
                min={0}
                max={1}
                step={0.0001}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                位置 Y (0〜1)
              </label>
              <input
                type="number"
                value={fy.toFixed(4)}
                onChange={e => setFy(parseFloat(e.target.value))}
                min={0}
                max={1}
                step={0.0001}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              メモ
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="樹木に関するメモ..."
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="flex-1 bg-green-700 hover:bg-green-800 text-white font-semibold py-2 rounded-lg transition-colors"
            >
              保存
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 rounded-lg transition-colors"
            >
              キャンセル
            </button>
            {tree && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                className="bg-red-500 hover:bg-red-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                削除
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
