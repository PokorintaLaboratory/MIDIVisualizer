# MIDI Visualizer

React-based MIDI visualizer for inspecting local `.mid` and `.midi` files in the browser.

## Features

- Client-side MIDI parsing with `@tonejs/midi`
- Track list with channel, instrument, and note counts
- Canvas piano roll rendering
- Time-axis zoom and drag panning
- Local-only file processing with no server upload

## Development

```powershell
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

Open http://127.0.0.1:5173/.

## GitHub Pages

The `Deploy GitHub Pages` workflow builds the app with the `/MIDIVisualizer/` base path and publishes `dist`.
