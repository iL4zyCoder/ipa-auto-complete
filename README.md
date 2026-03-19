# IPA Auto-Complete

Type a word anywhere in RemNote to automatically show its IPA transcription. Press `Enter` to insert the IPA right after the word. Press `Escape` to dismiss the popup.

## Features

- Global hotkey: `Ctrl+I`
- Detects the word before your cursor
- Fetches IPA from `https://api.dictionaryapi.dev/api/v2/entries/en/{word}`
- Shows a small tooltip under the caret
- `Enter` inserts the IPA; `Escape` closes

## Data privacy

This plugin sends the word you typed to a third-party service (`dictionaryapi.dev`) to retrieve the IPA transcription. No other user data is sent.

## Development

1. Install dependencies:
   - `npm install`
2. Run the plugin locally:
   - `npm run dev`
3. Build a production zip:
   - `npm run build`

## Testing

1. Open RemNote and use a dummy knowledgebase.
2. Develop from localhost:
   - URL: `http://localhost:8080`
3. Type a word (example: `regular`) and press `Ctrl+I`.
4. Press `Enter` to insert the IPA, or `Escape` to dismiss.

