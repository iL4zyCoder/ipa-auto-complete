# IPA Auto-Complete
Type a word in RemNote and then type `:` right after it. The plugin shows a small popup with the IPA transcription. Press `Enter` to insert the IPA, or `Escape` to dismiss.

## Features
- Detects the word immediately before a `:` caret
- Fetches IPA from `https://api.dictionaryapi.dev/api/v2/entries/en/{word}`
- Shows a small tooltip under the caret
- `Enter` inserts the IPA (with a leading space); `Escape` closes

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
3. Type a word (example: `regular`), then type `:` right after it.
4. Press `Enter` to insert the IPA, or `Escape` to dismiss.

