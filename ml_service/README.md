# ml_service — Grounding DINO Crop Service

FastAPI microservice that detects the primary object in a canvas snapshot and returns a tightly cropped region. Used by `/api/generate-solution` to focus Gemini on the relevant part of the drawing before image generation.

**Requires:** NVIDIA GPU with CUDA 12.4. Without this service running, the main app skips cropping and passes the full canvas to Gemini.

---

## How it works

1. Receives a PNG canvas snapshot and an optional text prompt
2. Runs [Grounding DINO](https://huggingface.co/IDEA-Research/grounding-dino-base) (zero-shot object detection) to locate the most prominent object
3. Expands the bounding box by 40% on each side and enforces a 512px minimum dimension
4. Returns the cropped image (base64 PNG) and the crop coordinates `[x0, y0, x1, y1]`
5. If no object is detected, returns the full image unchanged

---

## Setup

Requires [uv](https://docs.astral.sh/uv/).

```bash
cd ml_service
uv run main.py
```

Service starts at `http://localhost:8001`. Model weights (~700 MB) are downloaded from Hugging Face on first run.

---

## Endpoint

### `POST /crop`

**Request** (`multipart/form-data`):

| Field | Type | Default | Description |
|---|---|---|---|
| `image` | `File` | required | PNG canvas snapshot |
| `prompt` | `string` | `"object . drawing . shape"` | Text query for detection |

**Response**:

```json
{
  "image": "<base64-encoded PNG>",
  "crop": [x0, y0, x1, y1]
}
```

---

## Dependencies

| Package | Purpose |
|---|---|
| `fastapi` + `uvicorn` | HTTP server |
| `transformers` | Grounding DINO model |
| `torch` + `torchvision` | CUDA inference (cu124 index) |
| `Pillow` | Image crop and encode |
