import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { fal } from '@fal-ai/client';
import { solutionLogger } from '@/lib/logger';
import fs from 'fs';
import path from 'path';

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_AI_API_KEY,
});

fal.config({ credentials: process.env.FAL_API_KEY });

const ML_SERVICE_URL = 'http://localhost:8001';

async function cropImageWithDino(
  imageFile: File, prompt: string | null
): Promise<{ file: File; crop: [number, number, number, number] }> {
  const fd = new FormData();
  fd.append('image', imageFile, 'canvas.png');
  if (prompt) fd.append('prompt', prompt);
  const res = await fetch(`${ML_SERVICE_URL}/crop`, { method: 'POST', body: fd });
  if (!res.ok) throw new Error(`ML service ${res.status}`);
  const { image, crop } = await res.json();
  const buffer = Buffer.from(image, 'base64');
  return { file: new File([buffer], 'canvas_cropped.png', { type: 'image/png' }), crop };
}

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  try {
    const formData = await req.formData();
    let imageFile = formData.get('image') as File | null;
    const prompt = formData.get('prompt') as string | null;
    const source = formData.get('source') as string | null;

    // Collect reference images
    const referenceImages: { data: string; mimeType: string }[] = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('reference_') && value instanceof File) {
        const buffer = Buffer.from(await value.arrayBuffer());
        referenceImages.push({
          data: buffer.toString('base64'),
          mimeType: value.type || 'image/jpeg'
        });
      }
    }

    let base64Data: string | null = null;
    let mimeType: string | null = null;

    if (imageFile) {
      const buffer = Buffer.from(await imageFile.arrayBuffer());
      base64Data = buffer.toString('base64');
      mimeType = imageFile.type || 'image/jpeg';
    }

    // Crop to detected object region
    let crop: [number, number, number, number] | null = null;
    if (imageFile) {
      const t0 = Date.now();
      const { file: croppedFile, crop: detectedCrop } = await cropImageWithDino(imageFile, prompt);
      solutionLogger.info({ requestId, ms: Date.now() - t0 }, 'DINO crop');
      imageFile = croppedFile;
      crop = detectedCrop;
      base64Data = Buffer.from(await imageFile.arrayBuffer()).toString('base64');
      mimeType = 'image/png';
    }

    let textContent = "";
    let shouldDraw = true;
    let actionPrompt: string | null = prompt;

    // --- STAGE 1: INTENT CLASSIFICATION (Only for Chat) ---
    if (source === 'chat' && prompt) {
      const classifierPrompt = fs.readFileSync(path.join(process.cwd(), 'src', 'features', 'ai', 'prompts', 'classifier.txt'), 'utf8');

      const classifierParts: any[] = [{ text: `${classifierPrompt}\n\nUSER INPUT: "${prompt}"` }];

      referenceImages.forEach(img => {
        classifierParts.push({ inlineData: img });
      });

      if (base64Data && mimeType) {
        classifierParts.push({ inlineData: { data: base64Data, mimeType } });
      }

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: "user", parts: classifierParts }],
        config: { responseMimeType: "application/json" }
      });

      const rawClassifierText = result.text || "{}";
      solutionLogger.info({ requestId, rawClassifierText }, 'Classifier raw response');

      const intentData = JSON.parse(rawClassifierText);
      textContent = intentData.message || "";
      shouldDraw = intentData.intent?.toLowerCase() === "draw";
      actionPrompt = intentData.actionPrompt || prompt;

      solutionLogger.info({ requestId, intent: intentData.intent, hasMessage: !!textContent, shouldDraw, actionPrompt }, 'Classifier parsed intent');

      if (!shouldDraw) {
        return NextResponse.json({ success: true, imageUrl: null, textContent });
      }
    }

    // --- STAGE 2: IMAGE GENERATION (Flux 2 Pro via fal.ai) ---
    const imageUrls: string[] = [];

    if (imageFile && base64Data) {
      const t1 = Date.now();
      const buffer = Buffer.from(base64Data, 'base64');
      const blob = new Blob([buffer], { type: mimeType || 'image/jpeg' });
      const url = await fal.storage.upload(blob);
      solutionLogger.info({ requestId, ms: Date.now() - t1 }, 'fal upload');
      imageUrls.push(url);
    }

    for (const ref of referenceImages) {
      const buffer = Buffer.from(ref.data, 'base64');
      const blob = new Blob([buffer], { type: ref.mimeType });
      const url = await fal.storage.upload(blob);
      imageUrls.push(url);
    }

    const promptFile = actionPrompt ? 'positive_prompt.txt' : 'artist.txt';
    const artistPrompt = fs.readFileSync(path.join(process.cwd(), 'src', 'features', 'ai', 'prompts', promptFile), 'utf8');
    const negativePrompt = fs.readFileSync(path.join(process.cwd(), 'src', 'features', 'ai', 'prompts', 'negative_prompt.txt'), 'utf8');
    const fullPrompt = actionPrompt
      ? `${artistPrompt}\n\nUSER INPUT: "${actionPrompt}"`
      : artistPrompt;

    const endpoint = "fal-ai/nano-banana-2/edit";
    const baseInput = {
      prompt: fullPrompt,
      negative_prompt: negativePrompt.trim(),
      output_format: "png" as const,
      guidance_scale: actionPrompt ? 6 : 3,
    };
    const input = imageUrls.length > 0
      ? { ...baseInput, image_urls: imageUrls }
      : baseInput;

    try {
      const t2 = Date.now();
      const result = await fal.subscribe(endpoint, { input });
      solutionLogger.info({ requestId, ms: Date.now() - t2 }, 'fal generation');

      const falImageUrl = (result.data as any).images?.[0]?.url;

      if (!falImageUrl) throw new Error("Nano Banana returned no image");

      const imgResponse = await fetch(falImageUrl);
      const imgBuffer = await imgResponse.arrayBuffer();
      const base64 = Buffer.from(imgBuffer).toString('base64');
      const imageUrl = `data:image/png;base64,${base64}`;

      solutionLogger.info({ requestId }, 'Solution generated');

      return NextResponse.json({ success: true, imageUrl, textContent: textContent || '', crop });
    } catch (err) {
      solutionLogger.error({ requestId, err }, 'Artist stage error');
      return NextResponse.json({
        success: false,
        imageUrl: null,
        textContent: textContent || "I encountered an error while trying to draw that. Please try again!",
      });
    }
  } catch (error) {
    solutionLogger.error({ requestId, err: error }, 'Generation error');
    return NextResponse.json({ error: 'Failed to generate solution' }, { status: 500 });
  }
}
