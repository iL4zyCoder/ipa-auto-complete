import { useEffect, useState } from 'react';
import {
  AppEvents,
  renderWidget,
  useAPIEventListener,
  usePlugin,
  useRunAsync,
  useTracker,
  SelectionType,
  WidgetLocation,
} from '@remnote/plugin-sdk';
import {
  extractIpaTextFromDictionaryResponse,
  extractWordBeforeCaret,
} from '../types';

type TooltipStatus = 'loading' | 'no-word' | 'no-ipa' | 'ready';

function getDictionaryApiUrl(word: string): string {
  return `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
}

function TooltipBody({
  status,
  word,
  ipaText,
}: {
  status: TooltipStatus;
  word: string | null;
  ipaText: string | null;
}) {
  const containerClassName = [
    'w-[260px]',
    'outline-none',
    'rounded-lg',
    'bg-white/85',
    'backdrop-blur',
    'border',
    'border-black/10',
    'shadow-[0_10px_25px_-15px_rgba(0,0,0,0.35)]',
    'overflow-hidden',
    'text-gray-900',
  ].join(' ');

  return (
    <div className={containerClassName}>
      <div className="px-3 py-2">
        <div className="mt-2 space-y-2">
          {status === 'loading' && (
            <div className="space-y-2">
              <div className="h-3 w-24 rounded-md bg-black/10 animate-pulse" />
              <div className="h-4 w-36 rounded-md bg-black/10 animate-pulse" />
            </div>
          )}

          {status === 'no-word' && (
            <div className="text-sm text-gray-900/80">No word found</div>
          )}

          {status === 'no-ipa' && (
            <div className="text-sm text-gray-900/80">No IPA found</div>
          )}

          {status === 'ready' && (
            <div className="space-y-1">
              <div className="text-xs opacity-70">
                Word: <span className="font-medium">{word ?? ''}</span>
              </div>
              <div className="font-mono text-[14px] leading-tight text-gray-900">
                {ipaText}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const IpaFloatingWidget = () => {
  const plugin = usePlugin();

  // Get floatingWidgetId from this widget's context.
  const ctx = useRunAsync(
    async () => await plugin.widget.getWidgetContext<WidgetLocation.FloatingWidget>(),
    [],
  );
  const floatingWidgetId = ctx?.floatingWidgetId;

  const [hidden, setHidden] = useState(true);
  const [status, setStatus] = useState<TooltipStatus>('loading');
  const [ipaText, setIpaText] = useState<string | null>(null);

  // Reactively compute the word before the caret.
  const wordBeforeCaret = useTracker(async (reactivePlugin) => {
    const sel = await reactivePlugin.editor.getSelection();
    if (!sel || sel.type !== SelectionType.Text) return null;
    if (sel.range.start !== sel.range.end) return null; // only when caret is collapsed

    const caretIndex = sel.isReverse ? sel.range.end : sel.range.start;
    if (typeof caretIndex !== 'number' || caretIndex < 0) return null;

    const focusedTextRich = await reactivePlugin.editor.getFocusedEditorText();
    if (!focusedTextRich) return null;

    // Only trigger when the user just typed `:` (caret is right after `:`).
    if (caretIndex === 0) return null;
    const charBeforeCaret = await reactivePlugin.richText.charAt(focusedTextRich, caretIndex - 1);
    if (charBeforeCaret !== ':') return null;

    // Important: use RichText slicing to match the SDK's indices.
    const beforeRich = await reactivePlugin.richText.substring(
      focusedTextRich,
      0,
      caretIndex,
    );
    const beforeText = await reactivePlugin.richText.toString(beforeRich);
    return extractWordBeforeCaret(beforeText);
  });

  // Keep tooltip position synced with caret.
  const caretRect = useTracker(async (reactivePlugin) => reactivePlugin.editor.getCaretPosition());
  useEffect(() => {
    if (!floatingWidgetId || !caretRect) return;
    const top = caretRect.y + 6;
    const left = caretRect.x;
    void plugin.window
      .setFloatingWidgetPosition(floatingWidgetId, { top, left })
      .catch(() => undefined);
  }, [floatingWidgetId, caretRect?.y, caretRect?.x]);

  // Fetch IPA whenever the extracted word changes.
  useEffect(() => {
    if (!floatingWidgetId) return;

    if (!wordBeforeCaret) {
      setStatus('no-word');
      setIpaText(null);
      setHidden(true);
      return;
    }

    const word = wordBeforeCaret;
    // Show only when we have a word.
    if (hidden) setHidden(false);
    setStatus('loading');
    setIpaText(null);

    const abortController = new AbortController();
    let debounceId: ReturnType<typeof setTimeout> | null = null;
    let fetchTimeoutId: ReturnType<typeof setTimeout> | null = null;

    debounceId = setTimeout(() => {
      void (async () => {
        try {
          const url = getDictionaryApiUrl(word);
          // Hard timeout so pending promises cannot hang the plugin.
          fetchTimeoutId = setTimeout(() => abortController.abort(), 4000);
          const response = await fetch(url, { signal: abortController.signal });
          if (!response.ok) {
            setStatus('no-ipa');
            return;
          }

          const json: unknown = await response.json();
          const extractedIpa = extractIpaTextFromDictionaryResponse(json);
          if (!extractedIpa) {
            setStatus('no-ipa');
            return;
          }

          setIpaText(extractedIpa);
          setStatus('ready');
        } catch {
          setStatus('no-ipa');
        } finally {
          if (fetchTimeoutId) clearTimeout(fetchTimeoutId);
          fetchTimeoutId = null;
        }
      })();
    }, 250);

    return () => {
      if (debounceId) clearTimeout(debounceId);
      if (fetchTimeoutId) clearTimeout(fetchTimeoutId);
      abortController.abort();
    };
  }, [floatingWidgetId, wordBeforeCaret, hidden]);

  // Steal Enter/Escape only while visible.
  useEffect(() => {
    if (!floatingWidgetId) return;
    const keys = ['enter', 'escape'];
    if (!hidden) {
      void plugin.window.stealKeys(floatingWidgetId, keys).catch(() => undefined);
    } else {
      void plugin.window.releaseKeys(floatingWidgetId, keys).catch(() => undefined);
    }
    return () => {
      void plugin.window.releaseKeys(floatingWidgetId, keys).catch(() => undefined);
    };
  }, [floatingWidgetId, hidden, plugin]);

  useAPIEventListener(AppEvents.StealKeyEvent, floatingWidgetId, ({ key }) => {
    const k = typeof key === 'string' ? key.toLowerCase() : '';
    if (k === 'escape' || k === 'esc') {
      setHidden(true);
      return;
    }

    if (k === 'enter') {
      void (async () => {
        if (status === 'ready' && ipaText) {
          await plugin.editor.insertPlainText(` ${ipaText}`);
        }
        setHidden(true);
      })();
    }
  });

  if (hidden) return null;

  return <TooltipBody status={status} word={wordBeforeCaret ?? null} ipaText={ipaText} />;
};

renderWidget(IpaFloatingWidget);

