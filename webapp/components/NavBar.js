'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'DASHBOARD' },
  { href: '/today', label: 'TODAY' },
  { href: '/trends', label: 'TREND RADAR' },
  { href: '/concepts', label: 'CONCEPT LAB' },
  { href: '/production', label: 'PRODUCTION' },
  { href: '/channel-dna', label: 'CHANNEL DNA' },
  { href: '/settings', label: 'SETTINGS' },
];

export default function NavBar() {
  const pathname = usePathname();
  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center gap-2">
        <span className="font-bold text-lg mr-4">VIRAL STUDIO</span>
        <nav className="flex flex-wrap gap-1">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  active ? 'bg-accent text-white' : 'text-neutral-600 hover:bg-neutral-100'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
