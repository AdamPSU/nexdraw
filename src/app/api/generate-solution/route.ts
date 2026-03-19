import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { solutionLogger } from '@/lib/logger';
import fs from 'fs';
import path from 'path';

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_AI_API_KEY,
});

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
      const { file: croppedFile, crop: detectedCrop } = await cropImageWithDino(imageFile, prompt);
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

    // --- STAGE 2: IMAGE GENERATION (Gemini nano-banana-2) ---
    const promptFile = actionPrompt ? 'positive_prompt.txt' : 'artist.txt';
    const artistPrompt = fs.readFileSync(path.join(process.cwd(), 'src', 'features', 'ai', 'prompts', promptFile), 'utf8');
    const negativePrompt = fs.readFileSync(path.join(process.cwd(), 'src', 'features', 'ai', 'prompts', 'negative_prompt.txt'), 'utf8');
    const fullPrompt = actionPrompt
      ? `${artistPrompt}\n\nUSER INPUT: "${actionPrompt}"\n\nAVOID: ${negativePrompt.trim()}`
      : artistPrompt;

    const parts: any[] = [{ text: fullPrompt }];
    if (base64Data && mimeType) parts.push({ inlineData: { data: base64Data, mimeType } });
    referenceImages.forEach(img => parts.push({ inlineData: img }));

    try {
      const result = await ai.models.generateContent({
        model: "gemini-3.1-flash-image-preview",
        contents: [{ role: "user", parts }],
        config: { responseModalities: ["IMAGE"] },
      });

      const imagePart = result.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
      if (!imagePart?.inlineData) throw new Error("Gemini returned no image");

      const base64 = imagePart.inlineData.data;
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
