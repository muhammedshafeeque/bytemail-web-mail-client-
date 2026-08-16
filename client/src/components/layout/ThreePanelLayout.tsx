import { ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface ThreePanelLayoutProps {
  sidebar: ReactNode;
  list: ReactNode;
  viewer: ReactNode;
  mobilePanel: 'list' | 'viewer';
}

export function ThreePanelLayout({ sidebar, list, viewer, mobilePanel }: ThreePanelLayoutProps) {
  return (
    <div className="flex h-full overflow-hidden min-w-0">
      <div className="hidden md:flex flex-shrink-0">{sidebar}</div>

      <div className="flex flex-1 min-w-0 overflow-hidden">
        <div
          className={cn(
            'w-full md:w-[320px] lg:w-[360px] xl:w-[400px] flex-shrink-0 flex flex-col border-r border-stone-200 dark:border-zinc-800 overflow-hidden',
            'md:flex',
            mobilePanel === 'list' ? 'flex' : 'hidden'
          )}
        >
          {list}
        </div>

        <div
          className={cn(
            'flex-1 min-w-0 w-full h-full flex flex-col overflow-hidden',
            mobilePanel === 'viewer' ? 'flex' : 'hidden md:flex'
          )}
        >
          {viewer}
        </div>
      </div>
    </div>
  );
}
