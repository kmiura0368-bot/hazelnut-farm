'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_LINKS = [
  { href: '/', label: 'ホーム', exact: true },
  { href: '/map', label: '🗺️ 農園マップ' },
  { href: '/accounting', label: '📒 会計帳簿' },
  { href: '/calendar', label: '📅 カレンダー' },
  { href: '/plan', label: '📋 作業計画' },
  { href: '/gallery', label: '🖼️ ギャラリー' },
  { href: '/farmbook', label: '📋 農園台帳' },
  { href: '/karte', label: '🌳 樹木カルテ' },
];

export default function TopNav() {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <div
      className="flex items-center gap-0 px-4 h-10 flex-shrink-0 overflow-x-auto border-b"
      style={{ background: 'var(--ink)', color: 'var(--paper)', borderColor: 'rgba(0,0,0,0.3)' }}
    >
      <span
        className="text-sm font-bold mr-4 whitespace-nowrap tracking-wide"
        style={{ fontFamily: 'var(--font-mincho)', color: 'var(--ochre)' }}
      >
        🌰 向野農園
      </span>
      {NAV_LINKS.map(({ href, label, exact }) => (
        <Link
          key={href}
          href={href}
          className="px-3 py-2 text-sm whitespace-nowrap transition-colors"
          style={
            isActive(href, exact)
              ? { background: 'rgba(194,135,47,0.22)', color: '#fff', fontWeight: 600 }
              : { color: 'rgba(243,236,221,0.75)' }
          }
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
