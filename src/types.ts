export const WORD_BEFORE_CARET_REGEX =
  /([A-Za-z]+(?:['-][A-Za-z]+)*)$/;

export function extractWordBeforeCaret(textBeforeCaret: string): string | null {
  // If the caret is after punctuation like `:` or `.`, trim non-word chars first.
  const trimmed = textBeforeCaret.replace(/[^A-Za-z0-9'-]+$/g, '');
  const match = trimmed.match(WORD_BEFORE_CARET_REGEX);
  return match?.[1] ?? null;
}

export type DictionaryApiV2Phonetic = {
  text?: string | null;
};

export type DictionaryApiV2Entry = {
  phonetics?: DictionaryApiV2Phonetic[] | null;
};

export type DictionaryApiV2Response = DictionaryApiV2Entry[];

function isDictionaryApiV2Response(value: unknown): value is DictionaryApiV2Response {
  if (!Array.isArray(value)) return false;
  return value.every((entry) => {
    if (entry == null || typeof entry !== 'object') return false;
    const phonetics = (entry as { phonetics?: unknown }).phonetics;
    return phonetics == null || Array.isArray(phonetics);
  });
}

export function extractIpaTextFromDictionaryResponse(
  response: unknown,
): string | null {
  if (!isDictionaryApiV2Response(response)) return null;

  // Per spec: prefer `phonetics[0].text`, but fall back to first truthy text.
  const firstEntry = response[0];
  const phonetics = firstEntry?.phonetics ?? [];
  const firstText = phonetics?.[0]?.text ?? null;
  if (typeof firstText === 'string' && firstText.trim().length > 0) {
    return firstText.trim();
  }

  const firstTruthy = phonetics
    .map((p) => (typeof p?.text === 'string' ? p.text.trim() : ''))
    .find((t) => t.length > 0);

  return firstTruthy ?? null;
}

