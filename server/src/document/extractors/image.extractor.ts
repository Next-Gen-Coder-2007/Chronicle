import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import type { DocumentExtractor } from './document-extractor.interface.js';

@Injectable()
export class ImageExtractor implements DocumentExtractor {
  private readonly logger = new Logger(ImageExtractor.name);

  constructor(private readonly configService: ConfigService) {}

  supports(mimeType: string, filename?: string): boolean {
    if (mimeType && mimeType.startsWith('image/')) {
      return true;
    }
    if (
      filename &&
      /\.(jpe?g|png|webp|gif|bmp|tiff|svg)$/i.test(filename)
    ) {
      return true;
    }
    return false;
  }

  private resolveImageMimeType(mimeType?: string, filename?: string): string {
    if (mimeType && mimeType.startsWith('image/')) {
      return mimeType;
    }
    if (filename) {
      const lower = filename.toLowerCase();
      if (lower.endsWith('.png')) return 'image/png';
      if (lower.endsWith('.webp')) return 'image/webp';
      if (lower.endsWith('.gif')) return 'image/gif';
      if (lower.endsWith('.bmp')) return 'image/bmp';
      if (lower.endsWith('.svg')) return 'image/svg+xml';
      if (lower.endsWith('.tiff') || lower.endsWith('.tif')) return 'image/tiff';
      if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    }
    return 'image/jpeg';
  }

  async extract(
    data: Buffer,
    filename: string,
    mimeType?: string,
  ): Promise<string> {
    if (!data || data.length === 0) {
      throw new BadRequestException(
        `Cannot extract visual understanding: image buffer for "${filename}" is empty.`,
      );
    }

    const apiKey =
      this.configService.get<string>('GEMINI_API_KEY') ||
      process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new InternalServerErrorException(
        'Gemini API key is not configured. Set the GEMINI_API_KEY environment variable to enable image understanding.',
      );
    }

    const resolvedMime = this.resolveImageMimeType(mimeType, filename);
    const modelName =
      this.configService.get<string>('GEMINI_MODEL') ||
      process.env.GEMINI_MODEL ||
      'gemini-2.5-flash';

    const prompt = `You are a factual, comprehensive computer vision analysis system preparing rich textual data for future semantic retrieval and RAG (Retrieval-Augmented Generation).

Analyze this image thoroughly and factually based ONLY on what is directly visible.

CRITICAL ACCURACY RULES:
- Be strictly factual. Do NOT invent, assume, or hallucinate details.
- Do NOT guess exact locations unless supported by clearly visible signage or landmark evidence.
- Do NOT identify people by name or attempt facial recognition.
- Do NOT guess personal identities, exact ages, or personal relationships (family/friends) unless explicitly written or evidenced.
- Clearly distinguish direct visual observations from uncertainty.

Analyze and document all relevant visual aspects that are actually present:
1. Overall scene: What is the main subject and setting?
2. People: Number of people, positions, clothing, visible facial characteristics, pose, actions, interactions.
3. Objects: Important objects, their spatial arrangements, properties, and relationships.
4. Animals: Species/type if recognizable, position, activity.
5. Environment: Indoor or outdoor, natural landscape, architecture, rooms, weather, lighting conditions.
6. Location: Recognizable landmark/place if verifiable; otherwise describe the environment without guessing.
7. Activities: Events, actions, or tasks being performed.
8. Spatial Relationships: Positions (e.g. next to, behind, in front of, inside, holding, sitting on, standing beside).
9. Visible Text: Transcribe accurately any signs, posters, screens, labels, captions, badges, or UI text.
10. Screenshots/UI: If this is a screenshot, identify the application, UI components, hierarchy, and readable text.
11. Documents/Forms: If this is a document or page, extract readable text, headers, and structural elements.
12. Charts/Graphs: Chart type, axes, labels, values, and trends.
13. Logos/Branding: Visible brand marks or logos only when genuinely recognizable.
14. Important Details: Additional visual nuances valuable for semantic search.
15. Uncertainty: Explicitly state what cannot be determined (e.g., exact location, date, identities).

OUTPUT FORMAT:
- Output clean, structured plain text.
- Do NOT return JSON.
- Do NOT use markdown code fences (no triple backticks).
- Use clear section headers only for sections that apply to this image:

Overall Description:
[Factual description]

People:
[Observations]

Objects:
[Observations]

Animals:
[Observations]

Environment:
[Observations]

Location:
[Observations and bounds of uncertainty]

Activities:
[Observations]

Relationships:
[Observations]

Visible Text:
[Transcribed text]

Screenshots/Documents:
[Observations]

Important Details:
[Observations]

Uncertainty:
[Explicit notes on what cannot be verified]`;

    try {
      this.logger.log(
        `Analyzing image "${filename}" (${resolvedMime}, ${data.length} bytes) using model "${modelName}"...`,
      );

      const ai = new GoogleGenAI({ apiKey });
      const base64Data = data.toString('base64');

      const response = await ai.models.generateContent({
        model: modelName,
        contents: [
          {
            inlineData: {
              mimeType: resolvedMime,
              data: base64Data,
            },
          },
          prompt,
        ],
      });

      const responseText = response.text ? response.text.trim() : '';

      if (!responseText) {
        throw new Error('Gemini returned an empty visual understanding response.');
      }

      const cleanedText = responseText
        .replace(/^```[a-zA-Z]*\n?/gm, '')
        .replace(/```$/gm, '')
        .replace(/\r\n/g, '\n')
        .trim();

      this.logger.log(
        `Successfully generated image understanding for "${filename}" (${cleanedText.length} characters).`,
      );

      return cleanedText;
    } catch (err: any) {
      const sanitizedMessage = (err.message || 'Unknown error').replace(
        new RegExp(apiKey, 'gi'),
        '[REDACTED_API_KEY]',
      );

      this.logger.error(
        `Gemini vision understanding failed for "${filename}": ${sanitizedMessage}`,
      );

      throw new BadRequestException(
        `Image understanding failed for "${filename}": ${sanitizedMessage}`,
      );
    }
  }

  async extractStructured(
    data: Buffer,
    filename: string,
    mimeType?: string,
  ): Promise<{ fullText: string; segments?: any[]; metadata?: Record<string, any> }> {
    const fullText = await this.extract(data, filename, mimeType);
    const segments: any[] = [];

    // Parse visible text (OCR) if present
    const ocrMatch = fullText.match(/Visible Text:\s*([\s\S]*?)(?=\n[A-Z][A-Za-z /]+:|$)/i);
    const visibleText = ocrMatch ? ocrMatch[1].trim() : '';

    if (visibleText && !visibleText.toLowerCase().includes('none') && !visibleText.toLowerCase().includes('no text')) {
      segments.push({
        contentType: 'ocr',
        text: `Transcribed text in image "${filename}":\n${visibleText}`,
        sourceReference: `${filename} (Visible Text)`,
        metadata: { filename, type: 'ocr' },
      });
    }

    // Main visual description
    segments.push({
      contentType: 'image_description',
      text: fullText,
      sourceReference: `${filename} (Visual Analysis)`,
      metadata: { filename, type: 'image_description' },
    });

    return {
      fullText,
      segments,
      metadata: { filename, mimeType: this.resolveImageMimeType(mimeType, filename) },
    };
  }
}

