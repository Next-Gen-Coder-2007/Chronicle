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
export class AudioExtractor implements DocumentExtractor {
  private readonly logger = new Logger(AudioExtractor.name);

  constructor(private readonly configService: ConfigService) {}

  supports(mimeType: string, filename?: string): boolean {
    if (mimeType && mimeType.startsWith('audio/')) {
      return true;
    }
    if (
      filename &&
      /\.(mp3|wav|ogg|m4a|aac|flac|webm|wma|aiff?)$/i.test(filename)
    ) {
      return true;
    }
    return false;
  }

  private resolveAudioMimeType(mimeType?: string, filename?: string): string {
    const rawMime = (mimeType || '').toLowerCase().trim();

    if (rawMime === 'audio/wav' || rawMime === 'audio/x-wav') return 'audio/wav';
    if (rawMime === 'audio/mp3' || rawMime === 'audio/mpeg') return 'audio/mp3';
    if (rawMime === 'audio/flac' || rawMime === 'audio/x-flac') return 'audio/flac';
    if (rawMime === 'audio/ogg' || rawMime === 'audio/vorbis') return 'audio/ogg';
    if (rawMime === 'audio/aac' || rawMime === 'audio/x-aac') return 'audio/aac';
    if (rawMime === 'audio/webm') return 'audio/webm';
    if (rawMime === 'audio/m4a' || rawMime === 'audio/x-m4a' || rawMime === 'audio/mp4') {
      return 'audio/mp4';
    }
    if (rawMime === 'audio/aiff' || rawMime === 'audio/x-aiff') return 'audio/aiff';

    if (rawMime.startsWith('audio/')) {
      return rawMime;
    }

    if (filename) {
      const lower = filename.toLowerCase();
      if (lower.endsWith('.wav')) return 'audio/wav';
      if (lower.endsWith('.mp3')) return 'audio/mp3';
      if (lower.endsWith('.flac')) return 'audio/flac';
      if (lower.endsWith('.ogg')) return 'audio/ogg';
      if (lower.endsWith('.aac')) return 'audio/aac';
      if (lower.endsWith('.webm')) return 'audio/webm';
      if (lower.endsWith('.m4a')) return 'audio/mp4';
      if (lower.endsWith('.aif') || lower.endsWith('.aiff')) return 'audio/aiff';
    }

    return 'audio/mp3';
  }

  async extract(
    data: Buffer,
    filename: string,
    mimeType?: string,
  ): Promise<string> {
    if (!data || data.length === 0) {
      throw new BadRequestException(
        `Cannot extract audio content: audio buffer for "${filename}" is empty.`,
      );
    }

    const apiKey =
      this.configService.get<string>('GEMINI_API_KEY') ||
      process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new InternalServerErrorException(
        'Gemini API key is not configured. Set the GEMINI_API_KEY environment variable to enable audio understanding.',
      );
    }

    const resolvedMime = this.resolveAudioMimeType(mimeType, filename);
    const modelName =
      this.configService.get<string>('GEMINI_MODEL') ||
      process.env.GEMINI_MODEL ||
      'gemini-2.5-flash';

    const prompt = `You are a high-accuracy, factual audio speech-to-text and audio understanding AI system preparing rich textual data for future semantic retrieval and RAG (Retrieval-Augmented Generation).

Listen to and analyze this audio file thoroughly, generating an accurate transcript and factual audio understanding based ONLY on what can be genuinely heard in the audio.

CRITICAL ACCURACY RULES:
- Never hallucinate or invent information.
- Do NOT guess speaker identities, names, locations, relationships, emotions, or intentions unless explicitly stated in the speech.
- Preserve complete spoken content, sentences, wording, questions, answers, numbers, dates, and technical terms. Do NOT summarize instead of transcribing.
- For numbers, dates, times, quantities, percentages, technical versions: maintain exact accuracy (distinguish e.g. 15 from 50, 15.5 from 50.5).
- If part of the speech is unclear or inaudible, do NOT invent missing words. Use [inaudible].
- If a section cannot be reliably determined from the audio, state "Unable to determine from the audio." or omit it.

AUDIO ANALYSIS REQUIREMENTS:
1. Audio Type: Describe the recording nature (e.g. conversation, voice memo, meeting, lecture, presentation, podcast, interview, phone call, ambient recording).
2. Language: Detect the primary spoken language(s). If multiple languages are spoken, list all reliably detected languages.
3. Speakers: Identify distinguishable speakers generically (e.g. Speaker 1, Speaker 2) unless real-world names are explicitly spoken.
4. Transcript: Provide the complete, accurate transcript. When multiple speakers are present, preserve conversation dialogue structure:
   Speaker 1:
   [Spoken text]

   Speaker 2:
   [Spoken text]
5. Topics: Major subjects or themes discussed.
6. Important Facts: Key factual points stated in the audio.
7. Named Entities: Explicitly mentioned people, organizations, products, places, technologies, or events.
8. Decisions: Clear agreements, conclusions, or choices made.
9. Action Items: Explicitly assigned tasks, instructions, or next steps.
10. Questions and Answers: Important questions asked and the answers provided.
11. Relevant Audio Events: Notable non-speech sounds that aid understanding (e.g. applause, laughter, music, alarm, vehicle horn, door closing). Do not catalog minor background noise.
12. Uncertainty: Explicitly state any ambiguities, unclear audio segments, or things that cannot be verified.

OUTPUT FORMAT:
- Return clean, structured plain text.
- Do NOT return JSON.
- Do NOT use markdown code fences (no triple backticks).
- Use section headers only for sections that apply to this audio:

Audio Type:
[Type of recording]

Language:
[Detected language(s)]

Speakers:
[Speaker information]

Transcript:
[Full transcription]

Topics:
[Bulleted list of topics]

Important Facts:
[Bulleted list of facts]

Named Entities:
[Bulleted list of entities]

Decisions:
[Bulleted list of decisions]

Action Items:
[Bulleted list of action items]

Questions and Answers:
[Questions and answers]

Relevant Audio Events:
[Notable audio events]

Uncertainty:
[Uncertainties and inaudible segments]`;

    try {
      this.logger.log(
        `Analyzing audio "${filename}" (${resolvedMime}, ${data.length} bytes) using model "${modelName}"...`,
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
        throw new Error('Gemini returned an empty audio understanding response.');
      }

      const cleanedText = responseText
        .replace(/^```[a-zA-Z]*\n?/gm, '')
        .replace(/```$/gm, '')
        .replace(/\r\n/g, '\n')
        .trim();

      this.logger.log(
        `Successfully generated audio understanding for "${filename}" (${cleanedText.length} characters).`,
      );

      return cleanedText;
    } catch (err: any) {
      const sanitizedMessage = (err.message || 'Unknown error').replace(
        new RegExp(apiKey, 'gi'),
        '[REDACTED_API_KEY]',
      );

      this.logger.error(
        `Gemini audio understanding failed for "${filename}": ${sanitizedMessage}`,
      );

      throw new BadRequestException(
        `Audio extraction failed for "${filename}": ${sanitizedMessage}`,
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

    // Extract Transcript block
    const transcriptMatch = fullText.match(/Transcript:\s*([\s\S]*?)(?=\n[A-Z][A-Za-z /]+:|$)/i);
    const transcriptText = transcriptMatch ? transcriptMatch[1].trim() : '';

    if (transcriptText) {
      // Find dialogue / timestamp turns e.g. [00:15 - 00:30] Speaker 1: Hello
      const turnRegex = /(?:\[(\d{1,2}:\d{2})(?:\s*-\s*(\d{1,2}:\d{2}))?\]\s*)?(?:(Speaker\s*\d+|[A-Z][a-z]+):\s*)?([^\n]+(?:\n(?!(?:\[\d{1,2}:\d{2}|Speaker\s*\d+:))[^\n]+)*)/g;
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
            contentType: 'audio_transcript',
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

    // Always include a holistic summary chunk
    segments.push({
      contentType: 'audio_transcript',
      text: fullText,
      sourceReference: `${filename} (Full Analysis)`,
      metadata: { filename, type: 'audio_summary' },
    });

    return {
      fullText,
      segments: segments.length > 0 ? segments : undefined,
      metadata: { filename, mimeType: this.resolveAudioMimeType(mimeType, filename) },
    };
  }
}

