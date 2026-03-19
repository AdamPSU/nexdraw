from contextlib import asynccontextmanager
from datetime import datetime
from io import BytesIO
from pathlib import Path

import base64

import torch
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.responses import JSONResponse, Response
from PIL import Image
from transformers import AutoModelForZeroShotObjectDetection, AutoProcessor

MODEL_ID = "IDEA-Research/grounding-dino-base"
DEFAULT_QUERY = "object . drawing . shape"
MIN_SIDE = 512
OUTPUT_DIR = Path(__file__).parent.parent / "test" / "image_outputs"

_processor = None
_model = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _processor, _model
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    _processor = AutoProcessor.from_pretrained(MODEL_ID)
    _model = AutoModelForZeroShotObjectDetection.from_pretrained(MODEL_ID).to("cuda")
    _model.eval()
    yield


app = FastAPI(lifespan=lifespan)


def _expand_box(box: list[float], img_w: int, img_h: int) -> tuple[int, int, int, int]:
    x0, y0, x1, y1 = box
    if (x1 - x0) < MIN_SIDE:
        cx = (x0 + x1) / 2
        x0, x1 = cx - MIN_SIDE / 2, cx + MIN_SIDE / 2
    if (y1 - y0) < MIN_SIDE:
        cy = (y0 + y1) / 2
        y0, y1 = cy - MIN_SIDE / 2, cy + MIN_SIDE / 2
    return (max(0, int(x0)), max(0, int(y0)), min(img_w, int(x1)), min(img_h, int(y1)))


@app.post("/crop")
async def crop(image: UploadFile = File(...), prompt: str = Form(DEFAULT_QUERY)):
    raw = await image.read()
    pil_img = Image.open(BytesIO(raw)).convert("RGB")
    text_query = prompt.strip() or DEFAULT_QUERY

    inputs = _processor(images=pil_img, text=text_query, return_tensors="pt").to("cuda")
    with torch.no_grad():
        outputs = _model(**inputs)

    results = _processor.post_process_grounded_object_detection(
        outputs,
        inputs.input_ids,
        threshold=0.3,
        text_threshold=0.25,
        target_sizes=[pil_img.size[::-1]],
    )[0]

    if len(results["scores"]) == 0:
        ts = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        (OUTPUT_DIR / f"{ts}_no_detection.png").write_bytes(raw)
        return JSONResponse({
            "image": base64.b64encode(raw).decode(),
            "crop": [0, 0, pil_img.width, pil_img.height],
        })

    best_idx = results["scores"].argmax().item()
    box = results["boxes"][best_idx].cpu().tolist()
    x0, y0, x1, y1 = _expand_box(box, pil_img.width, pil_img.height)
    cropped = pil_img.crop((x0, y0, x1, y1))

    buf = BytesIO()
    cropped.save(buf, format="PNG")
    png_bytes = buf.getvalue()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    (OUTPUT_DIR / f"{ts}.png").write_bytes(png_bytes)

    return JSONResponse({
        "image": base64.b64encode(png_bytes).decode(),
        "crop": [x0, y0, x1, y1],
    })
