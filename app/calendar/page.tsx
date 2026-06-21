'use client';

const MONTHS: {
  month: number;
  name: string;
  season: string;
  tasks: string[];
  color: string;
  bgColor: string;
}[] = [
  {
    month: 1, name: '1月', season: '冬',
    tasks: ['剪定（不要枝・枯れ枝除去）', '樹形チェック・記録'],
    color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200',
  },
  {
    month: 2, name: '2月', season: '冬',
    tasks: ['剪定（仕上げ）', '施肥（基肥・有機肥料）', '資材・苗木の発注'],
    color: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-200',
  },
  {
    month: 3, name: '3月', season: '春',
    tasks: ['雪解け確認・倒木チェック', '土壌準備・耕起', '防草シート点検'],
    color: 'text-green-600', bgColor: 'bg-green-50 border-green-200',
  },
  {
    month: 4, name: '4月', season: '春',
    tasks: ['施肥（追肥・窒素系）', '除草（1回目）', '苗木補植・定植'],
    color: 'text-green-600', bgColor: 'bg-green-50 border-green-200',
  },
  {
    month: 5, name: '5月', season: '春',
    tasks: ['開花確認・授粉促進', '受粉樹との配置確認', '病害虫の初期防除'],
    color: 'text-emerald-600', bgColor: 'bg-emerald-50 border-emerald-200',
  },
  {
    month: 6, name: '6月', season: '夏',
    tasks: ['除草（2回目）', '防虫・殺菌剤散布', '施設・機械のメンテナンス'],
    color: 'text-teal-600', bgColor: 'bg-teal-50 border-teal-200',
  },
  {
    month: 7, name: '7月', season: '夏',
    tasks: ['除草（3回目）', '摘果確認・着果状況調査', '水管理・かん水確認'],
    color: 'text-teal-600', bgColor: 'bg-teal-50 border-teal-200',
  },
  {
    month: 8, name: '8月', season: '夏',
    tasks: ['収穫準備（ネット・コンテナ整備）', '収穫時期の見極め', '販売先・出荷計画確認'],
    color: 'text-orange-600', bgColor: 'bg-orange-50 border-orange-200',
  },
  {
    month: 9, name: '9月', season: '秋',
    tasks: ['収穫メイン（落果収集）', 'JA・直売所への出荷', '収量記録・品質確認'],
    color: 'text-orange-700', bgColor: 'bg-orange-50 border-orange-200',
  },
  {
    month: 10, name: '10月', season: '秋',
    tasks: ['収穫（後期・拾い残し）', '農場の片付け・清掃', '収穫量・売上の集計'],
    color: 'text-amber-700', bgColor: 'bg-amber-50 border-amber-200',
  },
  {
    month: 11, name: '11月', season: '秋',
    tasks: ['施肥（お礼肥・リン酸系）', '防寒準備（幼木の霜よけ）', '来年の計画立案'],
    color: 'text-yellow-700', bgColor: 'bg-yellow-50 border-yellow-200',
  },
  {
    month: 12, name: '12月', season: '冬',
    tasks: ['防寒対策（マルチング・敷き藁）', '年間記録の整理', '農機具の格納・点検'],
    color: 'text-blue-800', bgColor: 'bg-blue-50 border-blue-200',
  },
];

const SEASON_ICONS: Record<string, string> = {
  春: '🌸', 夏: '🌿', 秋: '🍂', 冬: '❄️',
};

const currentMonth = new Date().getMonth() + 1;

export default function CalendarPage() {
  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-green-800 to-green-600 text-white px-8 py-6">
        <h1 className="text-2xl font-bold">📅 栽培カレンダー</h1>
        <p className="text-green-200 text-sm mt-1">
          向野ヘーゼルナッツ農園 ／ 年間作業スケジュール
        </p>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* 凡例 */}
        <div className="flex flex-wrap gap-4 mb-8 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          {(['春', '夏', '秋', '冬'] as const).map((s) => (
            <span key={s} className="flex items-center gap-1.5 text-sm text-gray-600">
              <span className="text-base">{SEASON_ICONS[s]}</span> {s}
            </span>
          ))}
          <span className="ml-auto flex items-center gap-1.5 text-sm">
            <span className="inline-block w-3 h-3 rounded-full bg-green-500" />
            今月
          </span>
        </div>

        {/* 月別カード 3列グリッド */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {MONTHS.map(({ month, name, season, tasks, color, bgColor }) => {
            const isCurrent = month === currentMonth;
            return (
              <div
                key={month}
                className={`rounded-xl border-2 p-5 shadow-sm transition-shadow hover:shadow-md ${bgColor} ${
                  isCurrent ? 'ring-2 ring-green-500 ring-offset-2' : ''
                }`}
              >
                {/* 月ヘッダー */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-2xl font-bold ${color}`}>{name}</span>
                    {isCurrent && (
                      <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        今月
                      </span>
                    )}
                  </div>
                  <span className="text-xl" title={season}>
                    {SEASON_ICONS[season]}
                  </span>
                </div>

                {/* 作業リスト */}
                <ul className="space-y-1.5">
                  {tasks.map((task) => (
                    <li key={task} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className={`mt-0.5 flex-shrink-0 ${color}`}>✓</span>
                      {task}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* フッターノート */}
        <p className="text-center text-xs text-gray-400 mt-10">
          ※ 作業時期は青森県弘前市の気候・岩木山麓の標高を考慮した目安です。実際の状況に合わせて調整してください。
        </p>
      </div>
    </div>
  );
}
