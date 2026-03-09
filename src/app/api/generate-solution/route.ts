import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { solutionLogger } from '@/lib/logger';
import fs from 'fs';
import path from 'path';

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_AI_API_KEY,
});

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
    let targetLayer: string | null = null;
    let actionPrompt: string | null = prompt;

    // --- STAGE 1: INTENT CLASSIFICATION (Only for Chat) ---
    if (source === 'chat' && prompt) {
      const classifierPrompt = fs.readFileSync(path.join(process.cwd(), 'prompts', 'classifier.txt'), 'utf8');
      
      const classifierParts: any[] = [{ text: `${classifierPrompt}\n\nUSER INPUT: "${prompt}"` }];
      
      // Include reference images in classification for better context
      referenceImages.forEach(img => {
        classifierParts.push({ inlineData: img });
      });

      // Include canvas snapshot if available
      if (base64Data && mimeType) {
        classifierParts.push({ inlineData: { data: base64Data, mimeType } });
      }

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{
          role: "user",
          parts: classifierParts
        }],
        config: {
          responseMimeType: "application/json"
        }
      });
      
      const rawClassifierText = result.text || "{}";
      solutionLogger.info({ requestId, rawClassifierText }, 'Classifier raw response');

      const intentData = JSON.parse(rawClassifierText);
      textContent = intentData.message || "";
      shouldDraw = intentData.intent?.toLowerCase() === "draw";
      targetLayer = intentData.targetLayer || null;
      actionPrompt = intentData.actionPrompt || prompt;

      solutionLogger.info({ requestId, intent: intentData.intent, hasMessage: !!textContent, shouldDraw, targetLayer, actionPrompt }, 'Classifier parsed intent');
      
      if (!shouldDraw) {
        return NextResponse.json({
          success: true,
          imageUrl: null,
          textContent: textContent,
          targetLayer: targetLayer,
        });
      }
    }

    const artistPrompt = fs.readFileSync(path.join(process.cwd(), 'prompts', 'artist.txt'), 'utf8');
    let fullArtistPrompt = actionPrompt 
      ? `${artistPrompt}\n\nUSER INPUT: "${actionPrompt}"`
      : artistPrompt;

    const artistParts: any[] = [
      { text: fullArtistPrompt },
    ];

    if (base64Data && mimeType) {
      artistParts.push({ inlineData: { data: base64Data, mimeType } }); // Canvas snapshot
    } else {
      // Provide a "blank slate" context if no image is present to allow generation on empty board
      artistParts.push({ text: "The canvas is currently empty. Please generate the requested art from scratch on a pure white background." });
    }

    // Add reference images to the artist's context
    referenceImages.forEach(img => {
      artistParts.push({ inlineData: img });
    });

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: [
          {
            role: 'user',
            parts: artistParts,
          },
        ],
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      });

      // CRITICAL: We use textContent from Stage 1 (the classifier) if it exists,
      // ensuring the user sees the conversational response immediately.
      const finalContent = textContent || response.text;
      
      let imageUrl = null;
      const candidates = response.candidates;
      if (candidates?.[0]?.content?.parts) {
        for (const part of candidates[0].content.parts) {
          if (part.inlineData) {
            imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            break;
          }
        }
      }

      solutionLogger.info({ requestId, hasImage: !!imageUrl }, 'Solution generated via native SDK');

      return NextResponse.json({
        success: !!imageUrl,
        imageUrl: imageUrl || null,
        textContent: finalContent || '',
        reason: imageUrl ? undefined : 'Model did not return an image completion.',
        targetLayer: targetLayer,
      });
    } catch (err) {
      solutionLogger.error({ requestId, err }, 'Artist stage error');
      return NextResponse.json({
        success: false,
        imageUrl: null,
        textContent: textContent || "I encountered an error while trying to draw that. Please try again!",
        reason: 'Artist model failed.',
        targetLayer: targetLayer,
      });
    }
  } catch (error) {
    solutionLogger.error({ requestId, err: error }, 'Generation error');
    return NextResponse.json({ error: 'Failed to generate solution' }, { status: 500 });
  }
}
