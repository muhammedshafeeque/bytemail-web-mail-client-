import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
      <div className="h-16 w-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        <Icon className="h-8 w-8 text-gray-400" strokeWidth={1.5} />
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        {description && <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">{description}</p>}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-2 text-sm font-medium text-brand-600 dark:text-brand-400 hover:underline"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
