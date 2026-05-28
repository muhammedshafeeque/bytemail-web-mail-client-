import { AnimatePresence } from 'framer-motion';
import { useComposeStore } from '@/store/composeStore';
import { ComposeWindow } from './ComposeWindow';

export function ComposeModal() {
  const { windows } = useComposeStore();

  return (
    <AnimatePresence>
      {windows.map((win, i) => (
        <ComposeWindow key={win.id} window={win} index={i} />
      ))}
    </AnimatePresence>
  );
}
