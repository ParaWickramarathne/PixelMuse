# PixelMuse

A private, frontend-only image optimizer built with React, TypeScript, Vite, Tailwind CSS, and Lucide icons. Images are decoded and processed locally with the Canvas API. There are no image uploads, APIs, accounts, or databases.

## Run locally

```sh
npm install
npm run dev
```

## Production build

```sh
npm run build
npm run preview
```

Deploy the generated `dist` directory to any static host.

## Live website

https://ParaWickramarathne.github.io/PixelMuse/

GitHub Pages deploys automatically when changes are pushed to `main`, using `.github/workflows/deploy-pages.yml`. Relative asset paths support the repository subdirectory and local previews.

## Features

- Multi-image upload and drag-and-drop, with file validation (20 MB per image).
- JPEG/WebP quality controls and lossless PNG export.
- Combined compression, resizing, and conversion; aspect ratio lock and social presets.
- Individual batch downloads, actual size/savings summaries, and draggable before/after comparison.
- Light/dark theme and preferences persisted in localStorage. Image data is never stored there.
- Locally generated demo image, no external image requests or remote fonts.
- Object URL cleanup and confirmation before discarding undownloaded results.

## Processing details

PNG ignores lossy quality settings. JPEG flattens transparency onto white. WebP output requires browser encoding support, which is checked before returning a result. Animated input exports a still frame. Fixed dimension presets stretch to fit; aspect ratio mode preserves proportions. For a mixed batch, custom width applies to each image and height is calculated from its own aspect ratio. Original and half-size modes use each image's own dimensions. Files may become larger; the UI reports actual results rather than promising savings.

Input images are limited to 60 megapixels; output images to 40 megapixels and 16,384 pixels per side to keep browser memory use practical. Change `MAX_FILE_SIZE` in `src/image.ts` to adjust the file limit.

## Browser tests

```sh
npx playwright install chromium
npm test
```
