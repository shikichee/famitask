'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

const NAV_ITEMS = [
  { href: '/', label: 'ボード', icon: '📋', childLabel: 'ボード' },
  { href: '/stats', label: 'がんばり', icon: '💪', childLabel: 'がんばり' },
  { href: '/history', label: 'りれき', icon: '📜', childLabel: 'りれき' },
];

interface BottomNavProps {
  isChild: boolean;
  unreadCount?: number;
}

export function BottomNav({ isChild, unreadCount = 0 }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-t">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex flex-col items-center gap-0.5 px-4 py-2 rounded-lg transition-colors
                ${isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}
              `}
            >
              <span className="relative">
                <span className={`text-xl ${isChild ? 'text-2xl' : ''}`}>{item.icon}</span>
                {item.href === '/history' && unreadCount > 0 && (
                  <span className={`
                    absolute -top-1 -right-2 flex items-center justify-center
                    bg-red-500 text-white rounded-full font-bold
                    ${isChild ? 'min-w-5 h-5 text-xs' : 'min-w-4 h-4 text-[10px]'}
                  `}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </span>
              <span className={`font-medium ${isChild ? 'text-xs' : 'text-[10px]'}`}>
                {isChild ? item.childLabel : item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
