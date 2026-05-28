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
    <div className="flex h-full overflow-hidden">
      <div className="hidden md:flex flex-shrink-0">{sidebar}</div>

      <div className="flex flex-1 overflow-hidden">
        <div
          className={cn(
            'w-full md:w-[380px] lg:w-[380px] flex-shrink-0 flex flex-col border-r border-gray-200 dark:border-gray-800 overflow-hidden',
            'md:flex',
            mobilePanel === 'list' ? 'flex' : 'hidden'
          )}
        >
          {list}
        </div>

        <div
          className={cn(
            'flex-1 overflow-hidden',
            'md:flex',
            mobilePanel === 'viewer' ? 'flex' : 'hidden'
          )}
        >
          {viewer}
        </div>
      </div>
    </div>
  );
}
