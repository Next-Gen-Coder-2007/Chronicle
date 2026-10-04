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
export class VideoExtractor implements DocumentExtractor {
  private readonly logger = new Logger(VideoExtractor.name);
  private static readonly MAX_INLINE_VIDEO_SIZE = 20 * 1024 * 1024;

  constructor(private readonly configService: ConfigService) {}

  supports(mimeType: string, filename?: string): boolean {
    if (mimeType && mimeType.startsWith('video/')) {
      return true;
    }
    if (
      filename &&
      /\.(mp4|webm|mov|mkv|avi|wmv|flv|m4v|3gp|mpg|mpeg)$/i.test(filename)
    ) {
      return true;
    }
    return false;
  }

  private resolveVideoMimeType(mimeType?: string, filename?: string): string {
    const rawMime = (mimeType || '').toLowerCase().trim();

    if (rawMime === 'video/mp4') return 'video/mp4';
    if (rawMime === 'video/webm') return 'video/webm';
    if (rawMime === 'video/quicktime' || rawMime === 'video/mov') return 'video/quicktime';
    if (rawMime === 'video/mpeg' || rawMime === 'video/mpg') return 'video/mpeg';
    if (rawMime === 'video/x-msvideo' || rawMime === 'video/avi') return 'video/avi';
    if (rawMime === 'video/x-matroska' || rawMime === 'video/mkv') return 'video/x-matroska';
    if (rawMime === 'video/x-ms-wmv' || rawMime === 'video/wmv') return 'video/wmv';
    if (rawMime === 'video/x-flv' || rawMime === 'video/flv') return 'video/x-flv';
    if (rawMime === 'video/3gpp') return 'video/3gpp';

    if (rawMime.startsWith('video/')) {
      return rawMime;
    }

    if (filename) {
      const lower = filename.toLowerCase();
      if (lower.endsWith('.mp4') || lower.endsWith('.m4v')) return 'video/mp4';
      if (lower.endsWith('.webm')) return 'video/webm';
      if (lower.endsWith('.mov')) return 'video/quicktime';
      if (lower.endsWith('.avi')) return 'video/avi';
      if (lower.endsWith('.mkv')) return 'video/x-matroska';
      if (lower.endsWith('.wmv')) return 'video/wmv';
      if (lower.endsWith('.flv')) return 'video/x-flv';
      if (lower.endsWith('.3gp')) return 'video/3gpp';
      if (lower.endsWith('.mpg') || lower.endsWith('.mpeg')) return 'video/mpeg';
    }

    return 'video/mp4';
  }

  async extract(
    data: Buffer,
    filename: string,
    mimeType?: string,
  ): Promise<string> {
    if (!data || data.length === 0) {
      throw new BadRequestException(
        `Cannot extract video content: video buffer for "${filename}" is empty.`,
      );
    }

    if (data.length > VideoExtractor.MAX_INLINE_VIDEO_SIZE) {
      throw new BadRequestException(
        `Video "${filename}" exceeds the maximum direct processing limit of 20MB (${(data.length / (1024 * 1024)).toFixed(2)}MB).`,
      );
    }

    const apiKey =
      this.configService.get<string>('GEMINI_API_KEY') ||
      process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new InternalServerErrorException(
        'Gemini API key is not configured. Set the GEMINI_API_KEY environment variable to enable video understanding.',
      );
    }

    const resolvedMime = this.resolveVideoMimeType(mimeType, filename);
    const modelName =
      this.configService.get<string>('GEMINI_MODEL') ||
      process.env.GEMINI_MODEL ||
      'gemini-2.5-flash';

    const prompt = `You are a comprehensive, highly factual video understanding AI system preparing rich textual data for future semantic retrieval and RAG (Retrieval-Augmented Generation).

Analyze this entire video thoroughly across all dimensions: visual content, audio track/speech, and chronological/temporal progression.

CRITICAL ACCURACY RULES:
- Never hallucinate or invent information.
- Strictly describe what is directly visible and audible.
- Do NOT perform face recognition or guess personal identities, names, or relationships from appearance alone. If a person's name is explicitly spoken, you may note it as spoken in dialogue.
- Use generic labels for people (e.g. Person 1, Person 2) unless explicitly introduced in speech.
- Preserve complete spoken content, sentences, questions, answers, numbers, dates, and technical terms. Do NOT replace the transcript with only a summary.
- For unclear speech, use [inaudible].
- Use verifiable timestamps (e.g. [00:15]) when reliably determinable. Do not invent exact timestamps.
- Explicitly distinguish observations from uncertainties.

VIDEO ANALYSIS DIMENSIONS:
1. Video Type: Content category (e.g. meeting, lecture, tutorial, presentation, interview, vlog, screen recording, demonstration, personal recording).
2. Overall Description: Concise factual summary of what the video is generally about.
3. Duration: Approximate duration if verifiable.
4. Languages: Spoken language(s) detected.
5. People: Number of visible individuals, generic labels (Person 1, Person 2), positions, attire, physical actions, poses, and interactions.
6. Scenes: Environments, settings, and notable scene changes (e.g. classroom, office, outdoor street).
7. Timeline: Chronological progression of major events and actions with timestamps if available.
8. Visual Events: Notable occurrences, camera transitions, and visual changes.
9. Audio / Transcript: Full spoken transcript preserving speaker dialogue (e.g. Speaker 1: ..., Speaker 2: ...), questions, answers, technical terms, and numbers.
10. Topics: Major themes, subjects, or concepts covered.
11. Important Facts: Key factual information communicated visually or auditorily.
12. Objects: Prominent objects, their spatial arrangements, and how people interact with them.
13. Visible Text: Text appearing on screen, slides, posters, signs, documents, labels, and badges.
14. Screen Activity: If screen recording: applications, UI hierarchy, navigation, open files, error messages, code, terminal commands.
15. Locations: Recognizable landmarks/settings only when genuinely verifiable; otherwise describe the environment without guessing.
16. Decisions: Clear decisions or agreements reached.
17. Action Items: Explicitly assigned tasks, instructions, or next steps.
18. Questions and Answers: Notable questions asked and the answers provided.
19. Important Audio Events: Relevant non-speech acoustic events (e.g. applause, laughter, music, alarm, vehicle horn, door closing).
20. Uncertainty: Explicitly state any ambiguities, inaudible audio, or unidentifiable elements.

OUTPUT FORMAT:
- Output clean, structured plain text.
- Do NOT return JSON.
- Do NOT use markdown code fences (no triple backticks).
- Use clear section headers only for sections that apply to this video:

Video Type:
[Classification]

Overall Description:
[Factual description]

Duration:
[Duration if verifiable]

Languages:
[Detected language(s)]

People:
[Observations]

Scenes:
[Environments and scene changes]

Timeline:
[Chronological events with timestamps if verifiable]

Visual Events:
[Visual events and transitions]

Audio / Transcript:
[Full transcription with dialogue]

Topics:
[Bulleted list of topics]

Important Facts:
[Bulleted list of facts]

Objects:
[Bulleted list of objects and interactions]

Visible Text:
[Transcribed visible text]

Screen Activity:
[Screen recording analysis if applicable]

Locations:
[Factual location observations and bounds of uncertainty]

Decisions:
[Bulleted list of decisions]

Action Items:
[Bulleted list of action items]

Questions and Answers:
[Questions and answers]

Important Audio Events:
[Notable acoustic events]

Uncertainty:
[Notes on ambiguities or inaudible parts]`;

    try {
      this.logger.log(
        `Analyzing video "${filename}" (${resolvedMime}, ${data.length} bytes) using model "${modelName}"...`,
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
        throw new Error('Gemini returned an empty video understanding response.');
      }

      const cleanedText = responseText
        .replace(/^```[a-zA-Z]*\n?/gm, '')
        .replace(/```$/gm, '')
        .replace(/\r\n/g, '\n')
        .trim();

      this.logger.log(
        `Successfully generated video understanding for "${filename}" (${cleanedText.length} characters).`,
      );

      return cleanedText;
    } catch (err: any) {
      const sanitizedMessage = (err.message || 'Unknown error').replace(
        new RegExp(apiKey, 'gi'),
        '[REDACTED_API_KEY]',
      );

      this.logger.error(
        `Gemini video understanding failed for "${filename}": ${sanitizedMessage}`,
      );

      throw new BadRequestException(
        `Video extraction failed for "${filename}": ${sanitizedMessage}`,
      );
    }
  }

  private parseSeconds(ts: string): number | undefined {
    const parts = ts.trim().split(':').map(Number);
    if (parts.some(isNaN)) return undefined;
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return undefined;
  }

  async extractStructured(
    data: Buffer,
    filename: string,
    mimeType?: string,
  ): Promise<{ fullText: string; segments?: any[]; metadata?: Record<string, any> }> {
    const fullText = await this.extract(data, filename, mimeType);
    const segments: any[] = [];

    // Parse Timeline / Scenes e.g. [00:05 - 00:20] People entering lecture hall
    const timelineMatch = fullText.match(/Timeline:\s*([\s\S]*?)(?=\n[A-Z][A-Za-z /]+:|$)/i);
    const timelineText = timelineMatch ? timelineMatch[1].trim() : '';

    if (timelineText) {
      const sceneRegex = /(?:\[(\d{1,2}:\d{2})(?:\s*-\s*(\d{1,2}:\d{2}))?\]\s*)?([^\n]+)/g;
      let match: RegExpExecArray | null;

      while ((match = sceneRegex.exec(timelineText)) !== null) {
        const startTs = match[1];
        const endTs = match[2];
        const desc = match[3]?.trim();

        if (desc && desc.length > 5 && !desc.startsWith('-') && desc !== 'Timeline:') {
          const startSeconds = startTs ? this.parseSeconds(startTs) : undefined;
          const endSeconds = endTs ? this.parseSeconds(endTs) : undefined;

          segments.push({
            contentType: 'video_scene',
            text: desc,
            startTimestamp: startSeconds,
            endTimestamp: endSeconds,
            sourceReference: startTs ? `${filename} [${startTs}${endTs ? ` - ${endTs}` : ''}]` : filename,
            metadata: {
              filename,
              type: 'video_scene',
              startTime: startTs,
              endTime: endTs,
            },
          });
        }
      }
    }

    // Parse Audio / Transcript
    const transcriptMatch = fullText.match(/Audio \/ Transcript:\s*([\s\S]*?)(?=\n[A-Z][A-Za-z /]+:|$)/i);
    const transcriptText = transcriptMatch ? transcriptMatch[1].trim() : '';

    if (transcriptText) {
      const turnRegex = /(?:\[(\d{1,2}:\d{2})(?:\s*-\s*(\d{1,2}:\d{2}))?\]\s*)?(?:(Speaker\s*\d+|Person\s*\d+|[A-Z][a-z]+):\s*)?([^\n]+(?:\n(?!(?:\[\d{1,2}:\d{2}|(?:Speaker|Person)\s*\d+:))[^\n]+)*)/g;
      let match: RegExpExecArray | null;

      while ((match = turnRegex.exec(transcriptText)) !== null) {
        const startTsStr = match[1];
        const endTsStr = match[2];
        const speaker = match[3];
        const utterance = match[4]?.trim();

        if (utterance && utterance.length > 5) {
          const startSeconds = startTsStr ? this.parseSeconds(startTsStr) : undefined;
          const endSeconds = endTsStr ? this.parseSeconds(endTsStr) : undefined;

          segments.push({
            contentType: 'video_transcript',
            text: speaker ? `${speaker}: ${utterance}` : utterance,
            startTimestamp: startSeconds,
            endTimestamp: endSeconds,
            speaker,
            sourceReference: startTsStr ? `${filename} [${startTsStr}${endTsStr ? ` - ${endTsStr}` : ''}]` : filename,
            metadata: {
              filename,
              speaker,
              startTime: startTsStr,
              endTime: endTsStr,
            },
          });
        }
      }
    }

    // Holistic video summary
    segments.push({
      contentType: 'video_scene',
      text: fullText,
      sourceReference: `${filename} (Full Analysis)`,
      metadata: { filename, type: 'video_summary' },
    });

    return {
      fullText,
      segments: segments.length > 0 ? segments : undefined,
      metadata: { filename, mimeType: this.resolveVideoMimeType(mimeType, filename) },
    };
  }
}

