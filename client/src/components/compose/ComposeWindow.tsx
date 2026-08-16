import { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Minus, Maximize2, Minimize2, X, Send, Paperclip } from 'lucide-react';
import { ComposeWindow as IComposeWindow } from '@/store/composeStore';
import { useCompose } from '@/hooks/useCompose';
import { useSendEmail } from '@/hooks/useEmails';
import { RecipientInput } from './RecipientInput';
import { RichTextEditor } from './RichTextEditor';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';
import api from '@/api/client';
import { useDebounce } from '@/hooks/useDebounce';

interface ComposeWindowProps {
  window: IComposeWindow;
  index: number;
}

export function ComposeWindow({ window: win, index }: ComposeWindowProps) {
  const { closeCompose, updateCompose, minimizeCompose, toggleFullscreen } = useCompose();
  const sendEmail = useSendEmail();
  const fileRef = useRef<HTMLInputElement>(null);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { data } = win;

  const debouncedData = useDebounce(data, 5000);

  const saveDraft = useCallback(async () => {
    if (!data.subject && !data.body_html && data.to.length === 0) return;
    setIsSaving(true);
    try {
      if (draftId) {
        await api.put(`/drafts/${draftId}`, data);
      } else {
        const res = await api.post('/drafts', data);
        setDraftId((res.data as { data: { _id: string } }).data._id);
      }
    } catch {}
    setIsSaving(false);
  }, [data, draftId]);

  useEffect(() => {
    saveDraft();
  }, [debouncedData]);

  const handleSend = async () => {
    if (data.to.length === 0) return;
    await sendEmail.mutateAsync({
      to: data.to,
      cc: data.cc.length > 0 ? data.cc : undefined,
      bcc: data.bcc.length > 0 ? data.bcc : undefined,
      subject: data.subject,
      body_html: data.body_html,
      body_text: data.body_text,
      reply_to: data.reply_to,
    });
    if (draftId) await api.delete(`/drafts/${draftId}`).catch(() => {});
    closeCompose(win.id);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    updateCompose(win.id, { attachments: [...data.attachments, ...files] });
  };

  const offset = index * 20;

  if (win.minimized) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ right: `${16 + offset}px` }}
        className="fixed bottom-0 z-50 w-64 bg-brand-800 dark:bg-zinc-900 text-white rounded-t-xl shadow-compose overflow-hidden cursor-pointer"
        onClick={() => minimizeCompose(win.id)}
      >
        <div className="flex items-center justify-between px-4 py-2.5">
          <span className="text-sm font-medium truncate">{data.subject || 'New Message'}</span>
          <div className="flex items-center gap-1">
            <button onClick={(e) => { e.stopPropagation(); minimizeCompose(win.id); }} className="p-1 hover:bg-white/10 rounded">
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); closeCompose(win.id); }} className="p-1 hover:bg-white/10 rounded">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      transition={{ duration: 0.2 }}
      style={win.fullscreen ? {} : { right: `${16 + offset}px`, bottom: 0 }}
      className={cn(
        'fixed z-50 bg-white dark:bg-zinc-900 rounded-t-2xl shadow-compose flex flex-col overflow-hidden',
        win.fullscreen
          ? 'inset-4 rounded-2xl'
          : 'w-[540px] h-[480px]'
      )}
    >
      <div className="flex items-center justify-between px-4 py-3 bg-brand-800 dark:bg-zinc-950 text-white rounded-t-2xl flex-shrink-0">
        <span className="text-sm font-medium truncate">{data.subject || 'New Message'}</span>
        <div className="flex items-center gap-1">
          {isSaving && <span className="text-xs text-gray-400 mr-2">Saving...</span>}
          <button onClick={() => minimizeCompose(win.id)} className="p-1 hover:bg-white/10 rounded-md transition-colors">
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => toggleFullscreen(win.id)} className="p-1 hover:bg-white/10 rounded-md transition-colors">
            {win.fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
          <button onClick={() => closeCompose(win.id)} className="p-1 hover:bg-red-500/80 rounded-md transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex flex-col border-b border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 flex-shrink-0">
        <RecipientInput
          label="To"
          value={data.to}
          onChange={(to) => updateCompose(win.id, { to })}
          placeholder="Recipients"
        />
        <div className="flex items-center justify-end px-3 py-1 gap-2">
          {!showCc && (
            <button onClick={() => setShowCc(true)} className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
              Cc
            </button>
          )}
          {!showBcc && (
            <button onClick={() => setShowBcc(true)} className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
              Bcc
            </button>
          )}
        </div>
        {showCc && (
          <RecipientInput
            label="Cc"
            value={data.cc}
            onChange={(cc) => updateCompose(win.id, { cc })}
          />
        )}
        {showBcc && (
          <RecipientInput
            label="Bcc"
            value={data.bcc}
            onChange={(bcc) => updateCompose(win.id, { bcc })}
          />
        )}
        <div className="px-3 py-2">
          <input
            type="text"
            value={data.subject}
            onChange={(e) => updateCompose(win.id, { subject: e.target.value })}
            placeholder="Subject"
            className="w-full text-sm bg-transparent outline-none text-gray-800 dark:text-gray-200 placeholder-gray-400"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <RichTextEditor
          value={data.body_html}
          onChange={(html, text) => updateCompose(win.id, { body_html: html, body_text: text })}
          minHeight={win.fullscreen ? '400px' : '180px'}
        />
      </div>

      {data.attachments.length > 0 && (
        <div className="px-3 pb-2 flex flex-wrap gap-1">
          {data.attachments.map((file, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">
              {file.name}
              <button onClick={() => updateCompose(win.id, { attachments: data.attachments.filter((_, idx) => idx !== i) })}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Button
            onClick={handleSend}
            loading={sendEmail.isPending}
            disabled={data.to.length === 0}
            size="sm"
          >
            <Send className="h-3.5 w-3.5" />
            Send
          </Button>
          <button
            onClick={() => fileRef.current?.click()}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <input ref={fileRef} type="file" multiple className="hidden" onChange={handleFileChange} />
        </div>
        <button
          onClick={() => closeCompose(win.id)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}
