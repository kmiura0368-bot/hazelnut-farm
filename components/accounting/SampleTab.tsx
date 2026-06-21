'use client';

import { fmt } from '@/lib/accounting-utils';
import { catLabel } from '@/lib/categories';

const y = new Date().getFullYear();

const SAMPLE = [
  { type: 'income', date: `${y}-03-15`, category: 'hazelnut_sales', amount: 180000, memo: '道の駅・直売所 春出荷' },
  { type: 'income', date: `${y}-09-10`, category: 'hazelnut_sales', amount: 420000, memo: 'JA出荷 秋収穫分' },
  { type: 'income', date: `${y}-10-05`, category: 'processed_sales', amount: 85000, memo: 'ペースト・ナッツオイル直販' },
  { type: 'income', date: `${y}-04-01`, category: 'subsidy', amount: 150000, memo: '農業経営強化補助金' },
  { type: 'expense', date: `${y}-01-15`, category: 'utility', amount: 25000, memo: '電気・水道代（農業用）' },
  { type: 'expense', date: `${y}-02-20`, category: 'fertilizer', amount: 38000, memo: '有機肥料 春季施肥' },
  { type: 'expense', date: `${y}-03-05`, category: 'pesticide', amount: 22000, memo: '殺菌剤・除草剤' },
  { type: 'expense', date: `${y}-03-20`, category: 'insurance', amount: 35000, memo: '農業共済掛金' },
  { type: 'expense', date: `${y}-04-15`, category: 'seedling', amount: 95000, memo: '新規苗木50本' },
  { type: 'expense', date: `${y}-05-10`, category: 'tools', amount: 65000, memo: '剪定機・収穫用網' },
  { type: 'expense', date: `${y}-06-01`, category: 'labor', amount: 120000, memo: 'アルバイト3名（草刈り）' },
  { type: 'expense', date: `${y}-07-20`, category: 'fuel', amount: 18000, memo: '農機具燃料費' },
  { type: 'expense', date: `${y}-08-05`, category: 'repair', amount: 45000, memo: 'トラクター修繕' },
  { type: 'expense', date: `${y}-08-20`, category: 'fertilizer', amount: 42000, memo: '追肥 夏季' },
  { type: 'expense', date: `${y}-09-01`, category: 'labor', amount: 180000, memo: '収穫期アルバイト' },
  { type: 'expense', date: `${y}-09-20`, category: 'shipping', amount: 32000, memo: 'JA出荷運賃' },
  { type: 'expense', date: `${y}-11-10`, category: 'rent', amount: 60000, memo: '農地賃借料（年額）' },
  { type: 'expense', date: `${y}-12-01`, category: 'depreciation', amount: 80000, memo: '農業機械減価償却費' },
];

export default function SampleTab() {
  const totalIncome = SAMPLE.filter(s => s.type === 'income').reduce((a, s) => a + s.amount, 0);
  const totalExpense = SAMPLE.filter(s => s.type === 'expense').reduce((a, s) => a + s.amount, 0);

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <h3 className="text-sm font-semibold text-blue-800 mb-2">使い方ガイド</h3>
        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li>「設定」タブでサンプルデータを追加すると、各タブの機能を試すことができます</li>
          <li>「取引入力」タブで新しい取引を登録できます</li>
          <li>「レシート読取」タブでレシート画像をAIで自動解析できます（APIキー要）</li>
          <li>「月次グラフ」タブで収支の推移をグラフで確認できます</li>
          <li>「確定申告」タブで農業所得の収支内訳を確認・印刷できます</li>
          <li>「貸借対照表」タブで資産・負債の状況を管理できます</li>
          <li>「損益計算書」タブで詳細な損益分析ができます</li>
        </ul>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h3 className="text-sm font-bold text-gray-700 mb-3">サンプルデータ一覧（{y}年分 · 18件）</h3>
        <div className="flex gap-4 mb-3 text-xs text-gray-500">
          <span>収入合計: <strong className="text-green-700">¥{fmt(totalIncome)}</strong></span>
          <span>支出合計: <strong className="text-red-600">¥{fmt(totalExpense)}</strong></span>
          <span>利益: <strong className="text-blue-700">¥{fmt(totalIncome - totalExpense)}</strong></span>
        </div>

        <table className="w-full text-sm">
          <thead className="text-xs text-gray-500 bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">日付</th>
              <th className="px-3 py-2 text-left">種別</th>
              <th className="px-3 py-2 text-left">カテゴリ</th>
              <th className="px-3 py-2 text-right">金額</th>
              <th className="px-3 py-2 text-left">メモ</th>
            </tr>
          </thead>
          <tbody>
            {SAMPLE.map((s, i) => (
              <tr key={i} className="border-t border-gray-50">
                <td className="px-3 py-1.5 text-gray-600">{s.date}</td>
                <td className="px-3 py-1.5">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    s.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {s.type === 'income' ? '収入' : '支出'}
                  </span>
                </td>
                <td className="px-3 py-1.5 text-gray-700">{catLabel(s.category)}</td>
                <td className={`px-3 py-1.5 text-right font-medium ${s.type === 'income' ? 'text-green-700' : 'text-red-600'}`}>
                  ¥{fmt(s.amount)}
                </td>
                <td className="px-3 py-1.5 text-gray-500">{s.memo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
