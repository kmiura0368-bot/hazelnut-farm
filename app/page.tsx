'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface DashboardStats {
  treeCount: number;
  income: number;
  expense: number;
  profit: number;
}

const NAV_CARDS = [
  {
    href: '/map',
    no: '01',
    title: '農園マップ',
    desc: '樹木の位置管理・登録・編集',
    badge: '利用可能',
  },
  {
    href: '/accounting',
    no: '02',
    title: '会計帳簿',
    desc: '収支記録・グラフ・確定申告',
    badge: '利用可能',
  },
  {
    href: '/farmbook',
    no: '03',
    title: '農園台帳',
    desc: '生育記録・作業履歴・事業資料',
    badge: '利用可能',
  },
  {
    href: '/calendar',
    no: '04',
    title: '栽培カレンダー',
    desc: '作業スケジュール・収穫予定',
    badge: '準備中',
  },
  {
    href: '/plan',
    no: '05',
    title: '作業計画',
    desc: '年間計画・タスク管理',
    badge: '準備中',
  },
  {
    href: '/gallery',
    no: '06',
    title: 'フォトギャラリー',
    desc: '農園の写真・成長記録',
    badge: '準備中',
  },
  {
    href: '/karte',
    no: '07',
    title: '樹木カルテ',
    desc: '①〜⑫ 樹木別の写真・観察記録',
    badge: '利用可能',
  },
];

function fmt(n: number) {
  return (n || 0).toLocaleString('ja-JP');
}

export default function PortalPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [treesRes, txRes] = await Promise.all([
          fetch('/api/trees'),
          fetch(`/api/transactions?year=${currentYear}`),
        ]);
        const trees = treesRes.ok ? await treesRes.json() : [];
        const txs = txRes.ok ? await txRes.json() : [];
        const income = txs
          .filter((t: { type: string; amount: number }) => t.type === 'income')
          .reduce((s: number, t: { amount: number }) => s + t.amount, 0);
        const expense = txs
          .filter((t: { type: string; amount: number }) => t.type === 'expense')
          .reduce((s: number, t: { amount: number }) => s + t.amount, 0);
        setStats({
          treeCount: trees.length,
          income,
          expense,
          profit: income - expense,
        });
      } catch {
        setStats({ treeCount: 0, income: 0, expense: 0, profit: 0 });
      }
    };
    fetchStats();
  }, [currentYear]);

  return (
    <div
      className="flex-1 overflow-y-auto relative"
      style={{ background: 'var(--paper)' }}
    >
      {/* atmospheric layers: contour lines + paper grain */}
      <ContourField />
      <GrainOverlay />

      <div className="relative max-w-5xl mx-auto px-6 sm:px-8">
        {/* ===== HERO ===== */}
        <header className="pt-14 pb-12 border-b" style={{ borderColor: 'var(--line)' }}>
          <div
            className="rise flex items-center gap-3 text-[11px] tracking-[0.34em] uppercase mb-7"
            style={{ color: 'var(--hazel)', animationDelay: '0.05s' }}
          >
            <Seedling />
            <span>Aomori · Iwaki</span>
            <span style={{ color: 'var(--line)' }}>—</span>
            <span>Est. R7</span>
          </div>

          <h1
            className="rise leading-[1.04] tracking-tight"
            style={{
              fontFamily: 'var(--font-mincho)',
              fontWeight: 800,
              color: 'var(--ink)',
              fontSize: 'clamp(2.4rem, 6vw, 4.1rem)',
              animationDelay: '0.12s',
            }}
          >
            向野ヘーゼル
            <br className="sm:hidden" />
            ナッツ農園
          </h1>

          <div
            className="rise flex flex-wrap items-baseline gap-x-5 gap-y-2 mt-5"
            style={{ animationDelay: '0.2s' }}
          >
            <span
              className="text-sm tracking-[0.4em]"
              style={{ fontFamily: 'var(--font-mincho)', color: 'var(--moss)' }}
            >
              管 理 シ ス テ ム
            </span>
            <span
              className="text-[13px]"
              style={{ color: 'var(--ink-mute)' }}
            >
              青森県弘前市 ／ 岩木山麓
            </span>
          </div>
        </header>

        {/* ===== LEDGER STATS ===== */}
        <section className="py-10">
          <SectionHeading roman="I" en="Ledger" jp={`${currentYear}年 経営の概況`} />
          <div
            className="rise grid grid-cols-2 lg:grid-cols-4 mt-6 rounded-lg overflow-hidden"
            style={{
              background: 'var(--paper-card)',
              border: '1px solid var(--line)',
              animationDelay: '0.28s',
            }}
          >
            <Stat label="登録樹木数" value={stats ? fmt(stats.treeCount) : '—'} unit="本" />
            <Stat
              label={`${currentYear}年 収入`}
              value={stats ? fmt(stats.income) : '—'}
              unit="円"
              accent="var(--moss)"
            />
            <Stat
              label={`${currentYear}年 支出`}
              value={stats ? fmt(stats.expense) : '—'}
              unit="円"
              accent="var(--hazel)"
            />
            <Stat
              label={`${currentYear}年 利益`}
              value={stats ? fmt(stats.profit) : '—'}
              unit="円"
              accent={stats && stats.profit < 0 ? '#b0472a' : 'var(--ochre)'}
              emphasize
            />
          </div>
        </section>

        {/* ===== MENU INDEX ===== */}
        <section className="pb-20">
          <SectionHeading roman="II" en="Index" jp="メニュー" />
          <nav className="mt-3">
            {NAV_CARDS.map((card, i) => (
              <IndexRow key={card.href} {...card} delay={0.34 + i * 0.05} />
            ))}
          </nav>
        </section>
      </div>

      {/* ===== FOOTER ===== */}
      <footer
        className="relative border-t"
        style={{ borderColor: 'var(--line)', background: 'var(--paper-deep)' }}
      >
        <div className="max-w-5xl mx-auto px-6 sm:px-8 py-8 flex flex-wrap items-center justify-between gap-3">
          <div
            style={{ fontFamily: 'var(--font-mincho)', color: 'var(--ink)' }}
            className="text-sm font-bold"
          >
            向野ヘーゼルナッツ農園 <span style={{ color: 'var(--hazel)' }}>管理システム</span>
          </div>
          <div className="text-[12px] tracking-wide" style={{ color: 'var(--ink-mute)' }}>
            登録年月日 R7.4.15 ／ 青森県弘前市 岩木山麓
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ---------- components ---------- */

function SectionHeading({ roman, en, jp }: { roman: string; en: string; jp: string }) {
  return (
    <div className="rise flex items-baseline gap-3" style={{ animationDelay: '0.22s' }}>
      <span
        style={{ fontFamily: 'var(--font-mincho)', color: 'var(--ochre)' }}
        className="text-lg font-bold"
      >
        {roman}.
      </span>
      <h2
        style={{ fontFamily: 'var(--font-mincho)', color: 'var(--ink)' }}
        className="text-xl font-bold tracking-wide"
      >
        {jp}
      </h2>
      <span
        className="text-[10px] uppercase tracking-[0.3em] pb-0.5"
        style={{ color: 'var(--hazel)' }}
      >
        {en}
      </span>
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
  accent = 'var(--ink)',
  emphasize = false,
}: {
  label: string;
  value: string;
  unit: string;
  accent?: string;
  emphasize?: boolean;
}) {
  return (
    <div
      className="px-5 py-5 border-b border-r last:border-r-0"
      style={{ borderColor: 'var(--line-soft)' }}
    >
      <div
        className="text-[11px] tracking-widest mb-2"
        style={{ color: 'var(--ink-mute)' }}
      >
        {label}
      </div>
      <div className="flex items-baseline gap-1">
        <span
          style={{
            fontFamily: 'var(--font-mincho)',
            color: emphasize ? accent : 'var(--ink)',
            fontVariantNumeric: 'tabular-nums',
          }}
          className="text-[1.7rem] font-bold leading-none"
        >
          {value}
        </span>
        <span className="text-[11px]" style={{ color: 'var(--ink-mute)' }}>
          {unit}
        </span>
      </div>
      <div
        className="mt-3 h-[2px] w-8 origin-left"
        style={{ background: accent, opacity: emphasize ? 1 : 0.5 }}
      />
    </div>
  );
}

function IndexRow({
  href,
  no,
  title,
  desc,
  badge,
  delay,
}: (typeof NAV_CARDS)[number] & { delay: number }) {
  const available = badge === '利用可能';
  return (
    <Link
      href={available ? href : '#'}
      className={`rise group relative flex items-center gap-4 sm:gap-6 py-5 border-b transition-colors duration-300 ${
        available ? '' : 'pointer-events-none'
      }`}
      style={{
        borderColor: 'var(--line)',
        animationDelay: `${delay}s`,
        opacity: available ? undefined : 0.45,
      }}
    >
      {/* hover accent bar */}
      <span
        className="absolute left-0 top-0 bottom-0 w-[3px] origin-top scale-y-0 group-hover:scale-y-100 transition-transform duration-300"
        style={{ background: 'var(--ochre)' }}
      />
      <span
        className="text-sm tabular-nums w-7 transition-transform duration-300 group-hover:translate-x-1"
        style={{ fontFamily: 'var(--font-mincho)', color: 'var(--hazel)' }}
      >
        {no}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <h3
            className="text-lg font-bold transition-colors duration-300 group-hover:text-[var(--hazel-deep)]"
            style={{ fontFamily: 'var(--font-mincho)', color: 'var(--ink)' }}
          >
            {title}
          </h3>
          {!available && (
            <span
              className="text-[10px] tracking-widest px-2 py-0.5 rounded-full"
              style={{ background: 'var(--paper-deep)', color: 'var(--ink-mute)' }}
            >
              準備中
            </span>
          )}
        </div>
        <p className="text-[13px] mt-0.5" style={{ color: 'var(--ink-mute)' }}>
          {desc}
        </p>
      </div>
      {available && (
        <span
          className="text-lg pr-1 transition-transform duration-300 group-hover:translate-x-1.5"
          style={{ color: 'var(--hazel)' }}
        >
          →
        </span>
      )}
    </Link>
  );
}

/* ---------- atmosphere ---------- */

function ContourField() {
  return (
    <svg
      className="pointer-events-none absolute inset-x-0 top-0 w-full"
      style={{ height: 460, opacity: 0.5 }}
      viewBox="0 0 1000 460"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <g fill="none" stroke="var(--hazel)" strokeOpacity="0.16" strokeWidth="1">
        {Array.from({ length: 9 }).map((_, i) => (
          <path
            key={i}
            d={`M -50 ${120 + i * 40} C 200 ${70 + i * 40}, 380 ${
              190 + i * 38
            }, 560 ${150 + i * 40} S 880 ${90 + i * 40}, 1050 ${140 + i * 40}`}
          />
        ))}
      </g>
    </svg>
  );
}

function GrainOverlay() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 mix-blend-multiply"
      style={{
        opacity: 0.05,
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
      }}
      aria-hidden
    />
  );
}

function Seedling() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 22V11M12 11C12 8 9 6 5 6c0 4 3 5 7 5Zm0 0c0-3 3-5 7-5 0 4-3 5-7 5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
