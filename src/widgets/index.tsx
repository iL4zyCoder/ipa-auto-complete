import { AppEvents, declareIndexPlugin, type ReactRNPlugin, WidgetLocation } from '@remnote/plugin-sdk';
import '../style.css';
import '../index.css'; // import <widget-name>.css

let activeFloatingWidgetId: string | null = null;
let lastOpenCheckAtMs = 0;
let openDebounceId: ReturnType<typeof setTimeout> | null = null;

async function onActivate(plugin: ReactRNPlugin) {
  await plugin.app.registerWidget('ipa_floating', WidgetLocation.FloatingWidget, {
    dimensions: { height: 'auto', width: 260 },
  });

  const openTooltipAtCaret = async (): Promise<void> => {
    const caretRect = await plugin.editor.getCaretPosition();

    // `DOMRect` shape differs slightly; use multiple fallbacks.
    const left = caretRect ? (caretRect.x ?? caretRect.left) : 30;
    const topBase = caretRect ? (caretRect.y ?? caretRect.top) : 30;
    const top = topBase + 6;

    if (activeFloatingWidgetId) {
      await plugin.window.closeFloatingWidget(activeFloatingWidgetId).catch(() => undefined);
      activeFloatingWidgetId = null;
    }

    try {
      activeFloatingWidgetId = await plugin.window.openFloatingWidget('ipa_floating', {
        top,
        left,
      });
    } catch (e) {
      activeFloatingWidgetId = null;
    }
  };

  const maybeOpen = async (): Promise<void> => {
    // If it's already open, we generally don't need to re-open.
    if (activeFloatingWidgetId) {
      const now = Date.now();
      if (now - lastOpenCheckAtMs > 700) {
        lastOpenCheckAtMs = now;
        const isOpen = await plugin.window
          .isFloatingWidgetOpen(activeFloatingWidgetId)
          .catch(() => false);
        if (!isOpen) {
          activeFloatingWidgetId = null;
        } else {
          return;
        }
      } else {
        // Recently checked open state; assume it's open.
        return;
      }
    }

    await openTooltipAtCaret();
  };

  // Follow the official autocomplete approach: open on text edits.
  plugin.event.addListener(AppEvents.EditorTextEdited, undefined, () => {
    if (openDebounceId) clearTimeout(openDebounceId);
    openDebounceId = setTimeout(() => {
      void maybeOpen();
    }, 150);
  });

  // Also open once on activation.
  void maybeOpen();
}

async function onDeactivate(plugin: ReactRNPlugin) {
  if (openDebounceId) clearTimeout(openDebounceId);

  if (activeFloatingWidgetId) {
    await plugin.window.closeFloatingWidget(activeFloatingWidgetId).catch(() => undefined);
    activeFloatingWidgetId = null;
  }
}

declareIndexPlugin(onActivate, onDeactivate);
