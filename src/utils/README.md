# utils — Client-Side Image Processing

Browser-only utilities (Canvas API) for cleaning up AI-generated images before they're placed on the tldraw canvas.

## Functions

### `correctYellowedWhites(imageUrl, threshold?)`

Gemini sometimes returns images with a warm/yellow tint in near-white areas. This normalizes any pixel where all channels are close to 255 (default threshold: 240) to pure white, giving sketched drawings a clean white background consistent with the canvas.

### `removeWhiteBackground(imageUrl, threshold?)`

Makes all near-white pixels fully transparent (alpha → 0). Used to composite the generated image onto the canvas without a white box artifact on top of existing drawings.

Both functions return a `data:image/png;base64,...` URL via an offscreen `<canvas>`.
