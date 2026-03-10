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

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  try {
    const formData = await req.formData();
    const imageFile = formData.get('image') as File | null;
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
      const buffer = Buffer.from(base64Data, 'base64');
      const blob = new Blob([buffer], { type: mimeType || 'image/jpeg' });
      const url = await fal.storage.upload(blob);
      imageUrls.push(url);
    }

    for (const ref of referenceImages) {
      const buffer = Buffer.from(ref.data, 'base64');
      const blob = new Blob([buffer], { type: ref.mimeType });
      const url = await fal.storage.upload(blob);
      imageUrls.push(url);
    }

    const artistPrompt = fs.readFileSync(path.join(process.cwd(), 'src', 'features', 'ai', 'prompts', 'artist.txt'), 'utf8');
    const fullPrompt = actionPrompt
      ? `${artistPrompt}\n\nUSER INPUT: "${actionPrompt}"`
      : artistPrompt;

    const endpoint = imageUrls.length > 0 ? "fal-ai/flux-2-pro/edit" : "fal-ai/flux-2-pro";
    const input = imageUrls.length > 0
      ? { prompt: fullPrompt, image_urls: imageUrls, output_format: "png" as const }
      : { prompt: fullPrompt, output_format: "png" as const };

    try {
      const result = await fal.subscribe(endpoint, { input });
      const falImageUrl = (result.data as any).images?.[0]?.url;

      if (!falImageUrl) throw new Error("Flux returned no image");

      // Fetch and convert to base64 data URL to avoid CORS on the client
      const imgResponse = await fetch(falImageUrl);
      const imgBuffer = await imgResponse.arrayBuffer();
      const base64 = Buffer.from(imgBuffer).toString('base64');
      const imageUrl = `data:image/png;base64,${base64}`;

      solutionLogger.info({ requestId }, 'Solution generated via Flux 2 Pro');

      return NextResponse.json({ success: true, imageUrl, textContent: textContent || '' });
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
