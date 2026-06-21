'use client';

import { useEffect, useState, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

interface YearSummary {
  year: string;
  income: number;
  expense: number;
}

interface TreeStats {
  total: number;
  bySpecies: { european: number; american: number; hybrid: number };
  avgAge: number;
}

const FARM_STRENGTHS = [
  {
    icon: '🏔️',
    title: '岩木山の眺望',
    desc: '津軽富士と呼ばれる岩木山を望む絶好のロケーション。観光農園としての潜在価値が高く、農業体験・直売との相乗効果が期待できます。',
  },
  {
    icon: '💧',
    title: '豊富な井戸水',
    desc: '農園内に自家井戸を保有。水道代を抑えながら安定した水源を確保でき、品質の良い農業用水を通年利用可能です。',
  },
  {
    icon: '🏠',
    title: '農業用倉庫',
    desc: '農機具・収穫資材・肥料を一括保管できる倉庫を完備。作業効率の向上と資材の適切な管理を実現しています。',
  },
  {
    icon: '🌆',
    title: '弘前市近郊立地',
    desc: '弘前市街地に近く、直売所・JA・飲食店への出荷アクセスが良好。観光客向けの加工品販売も展開しやすい立地です。',
  },
];

const GROWTH_TABLE = [
  { year: '植付後1〜2年', height: '〜0.5m', yield: '結実なし', notes: '根張り・樹形形成期' },
  { year: '植付後3〜4年', height: '0.5〜1.5m', yield: '試験的結実', notes: '初期剪定が重要' },
  { year: '植付後5〜7年', height: '1.5〜2.5m', yield: '1〜3 kg/本', notes: '収量増加期' },
  { year: '植付後8〜12年', height: '2.5〜3.5m', yield: '3〜6 kg/本', notes: '安定収穫期' },
  { year: '植付後13年以降', height: '3.5m以上', yield: '5〜10 kg/本', notes: '最盛期・管理継続' },
];

function fmt(n: number) {
  return (n || 0).toLocaleString('ja-JP');
}

export default function PlanPage() {
  const [yearSummaries, setYearSummaries] = useState<YearSummary[]>([]);
  const [treeStats, setTreeStats] = useState<TreeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const load = async () => {
      try {
        const [treesRes] = await Promise.all([fetch('/api/trees')]);
        const trees = treesRes.ok ? await treesRes.json() : [];

        // tree stats
        const bySpecies = { european: 0, american: 0, hybrid: 0 };
        let totalAge = 0;
        for (const t of trees) {
          if (t.species in bySpecies) bySpecies[t.species as keyof typeof bySpecies]++;
          totalAge += currentYear - t.plant_year + t.age_at_plant;
        }
        setTreeStats({
          total: trees.length,
          bySpecies,
          avgAge: trees.length > 0 ? Math.round(totalAge / trees.length) : 0,
        });

        // year summaries for last 3 years + next 2 projected
        const years = [currentYear - 2, currentYear - 1, currentYear];
        const results: YearSummary[] = [];
        for (const y of years) {
          const r = await fetch(`/api/transactions?year=${y}`);
          const txs = r.ok ? await r.json() : [];
          const income = txs.filter((t: {type:string;amount:number}) => t.type === 'income').reduce((s: number, t: {amount:number}) => s + t.amount, 0);
          const expense = txs.filter((t: {type:string;amount:number}) => t.type === 'expense').reduce((s: number, t: {amount:number}) => s + t.amount, 0);
          results.push({ year: `${y}年`, income, expense });
        }
        // Simple linear projection for next 2 years
        const lastIncome = results[results.length - 1]?.income ?? 0;
        const lastExpense = results[results.length - 1]?.expense ?? 0;
        results.push({ year: `${currentYear + 1}年（予測）`, income: Math.round(lastIncome * 1.1), expense: Math.round(lastExpense * 1.05) });
        results.push({ year: `${currentYear + 2}年（予測）`, income: Math.round(lastIncome * 1.2), expense: Math.round(lastExpense * 1.08) });
        setYearSummaries(results);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentYear]);

  const chartData = {
    labels: yearSummaries.map((y) => y.year),
    datasets: [
      {
        type: 'bar' as const,
        label: '収入',
        data: yearSummaries.map((y) => y.income),
        backgroundColor: 'rgba(58,125,68,0.75)',
        borderColor: '#3a7d44',
        borderWidth: 1,
      },
      {
        type: 'bar' as const,
        label: '支出',
        data: yearSummaries.map((y) => y.expense),
        backgroundColor: 'rgba(192,57,43,0.75)',
        borderColor: '#c0392b',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const },
      tooltip: { callbacks: { label: (ctx: { dataset: { label?: string }; raw: unknown }) => `${ctx.dataset.label ?? ''}: ¥${fmt(ctx.raw as number)}` } },
    },
    scales: { y: { ticks: { callback: (v: unknown) => '¥' + fmt(v as number) } } },
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-green-800 to-green-600 text-white px-8 py-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">📋 作業計画・農園プラン</h1>
          <p className="text-green-200 text-sm mt-1">
            向野ヘーゼルナッツ農園 ／ 経営計画・成長予測
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="bg-white text-green-800 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-50 transition-colors shadow no-print"
        >
          🖨️ 印刷
        </button>
      </div>

      <div ref={printRef} className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* 農園概要 */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-green-800 border-l-4 border-green-600 pl-3 mb-4">
            🏡 農園概要
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: '農園名', value: '向野ヘーゼルナッツ農園' },
              { label: '所在地', value: '青森県弘前市岩木山麓' },
              { label: '面積', value: '5,017 ㎡（約1.5反）' },
              { label: '区画', value: '120m × 45m' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-green-50 rounded-lg p-3">
                <div className="text-xs text-green-600 font-semibold mb-1">{label}</div>
                <div className="text-sm font-bold text-gray-800">{value}</div>
              </div>
            ))}
          </div>
          {treeStats && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-emerald-50 rounded-lg p-3">
                <div className="text-xs text-emerald-600 font-semibold mb-1">登録樹木数</div>
                <div className="text-2xl font-bold text-gray-800">{treeStats.total} <span className="text-sm">本</span></div>
              </div>
              <div className="bg-emerald-50 rounded-lg p-3">
                <div className="text-xs text-emerald-600 font-semibold mb-1">平均樹齢</div>
                <div className="text-2xl font-bold text-gray-800">{treeStats.avgAge} <span className="text-sm">年</span></div>
              </div>
              <div className="bg-emerald-50 rounded-lg p-3">
                <div className="text-xs text-emerald-600 font-semibold mb-1">ヨーロッパ種</div>
                <div className="text-2xl font-bold text-gray-800">{treeStats.bySpecies.european} <span className="text-sm">本</span></div>
              </div>
              <div className="bg-emerald-50 rounded-lg p-3">
                <div className="text-xs text-emerald-600 font-semibold mb-1">アメリカ種・ハイブリッド</div>
                <div className="text-2xl font-bold text-gray-800">
                  {treeStats.bySpecies.american + treeStats.bySpecies.hybrid} <span className="text-sm">本</span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 収支予測グラフ */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-green-800 border-l-4 border-green-600 pl-3 mb-4">
            📊 収支推移・予測
          </h2>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-gray-400">読み込み中...</div>
          ) : (
            <>
              <div style={{ height: '280px' }}>
                <Bar data={chartData} options={chartOptions} />
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-green-50">
                      <th className="text-left p-2 border border-gray-200 text-green-700">年度</th>
                      <th className="text-right p-2 border border-gray-200 text-green-700">収入</th>
                      <th className="text-right p-2 border border-gray-200 text-red-600">支出</th>
                      <th className="text-right p-2 border border-gray-200 text-gray-700">損益</th>
                    </tr>
                  </thead>
                  <tbody>
                    {yearSummaries.map((y) => {
                      const profit = y.income - y.expense;
                      return (
                        <tr key={y.year} className="hover:bg-gray-50">
                          <td className="p-2 border border-gray-200">{y.year}</td>
                          <td className="p-2 border border-gray-200 text-right text-green-700 font-medium">¥{fmt(y.income)}</td>
                          <td className="p-2 border border-gray-200 text-right text-red-600 font-medium">¥{fmt(y.expense)}</td>
                          <td className={`p-2 border border-gray-200 text-right font-bold ${profit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                            ¥{fmt(profit)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-400 mt-2">※ 予測値は直近実績の10〜20%成長を仮定した参考値です。</p>
            </>
          )}
        </section>

        {/* 樹木成長予測 */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-green-800 border-l-4 border-green-600 pl-3 mb-4">
            🌳 ヘーゼルナッツ成長ステージ
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-green-50">
                  {['成長段階', '樹高目安', '収量目安（1本）', '管理ポイント'].map((h) => (
                    <th key={h} className="text-left p-3 border border-gray-200 text-green-700 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {GROWTH_TABLE.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="p-3 border border-gray-200 font-medium">{row.year}</td>
                    <td className="p-3 border border-gray-200">{row.height}</td>
                    <td className="p-3 border border-gray-200 text-green-700 font-semibold">{row.yield}</td>
                    <td className="p-3 border border-gray-200 text-gray-500 text-xs">{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 農園の強み */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-green-800 border-l-4 border-green-600 pl-3 mb-4">
            ⭐ 農園の強み
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FARM_STRENGTHS.map(({ icon, title, desc }) => (
              <div key={title} className="flex gap-4 p-4 bg-green-50 rounded-xl border border-green-100">
                <span className="text-3xl flex-shrink-0">{icon}</span>
                <div>
                  <h3 className="font-bold text-green-800 mb-1">{title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
        }
      `}</style>
    </div>
  );
}
