# AI Chart Scanner Pro

A browser-only chart screenshot analysis interface built with Vite.

## Features
- Upload PNG, JPG or WEBP chart screenshots.
- Analyse the image locally in the browser.
- Estimate visual directional bias and chart structure.
- Draw LONG / SHORT / WAIT zones, entry, stop and target guide lines.
- Show a confluence checklist and setup score.
- Save the annotated image locally.
- No paid AI API and no secret key required.

## Limitation
This first version is an image-analysis prototype. A screenshot does not reliably contain exact market price, OHLC, live volume, or order-book data. Levels are chart-relative guides, not claimed market prices. The scanner does not claim a guaranteed win rate and does not connect to a brokerage account or place live trades.

## Development
Current Vite releases require Node.js 20.19+ or 22.12+.
```bash
npm install
npm run dev
```
Build:
```bash
npm run build
```
The included GitHub Actions workflow builds the Vite app and publishes `dist/` to GitHub Pages.
