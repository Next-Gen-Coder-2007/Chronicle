import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { SearchService, type SearchResultChunk } from '../search/search.service.js';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  message: string;
  memoryId?: string;
  userId: string;
  history?: ChatMessage[];
  limit?: number;
  minSimilarity?: number;
}

export interface ChatSourceCitation {
  id: string;
  documentId: string;
  fileId?: string;
  filename?: string;
  mimeType?: string;
  memoryId?: string;
  chunkIndex: number;
  similarity: number;
  content: string;
}

export interface ChatResponse {
  answer: string;
  sources: ChatSourceCitation[];
  memoryId?: string;
  query: string;
}

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(
    private readonly searchService: SearchService,
    private readonly configService: ConfigService,
  ) {}

  private getClient(): { ai: GoogleGenAI; model: string } {
    const apiKey =
      this.configService.get<string>('GEMINI_API_KEY') ||
      process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new InternalServerErrorException(
        'Gemini API key is not configured. Set GEMINI_API_KEY.',
      );
    }

    const model =
      this.configService.get<string>('GEMINI_MODEL') ||
      process.env.GEMINI_MODEL ||
      'gemini-3.5-flash';

    return {
      ai: new GoogleGenAI({ apiKey }),
      model,
    };
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const query = (request.message || '').trim();
    if (!query) {
      throw new BadRequestException('Chat message cannot be empty.');
    }

    const candidateLimit = 35;
    const minSimilarity = request.minSimilarity ?? 0.15;

    const allCandidates = await this.searchService.search(query, {
      userId: request.userId,
      memoryId: request.memoryId,
      limit: candidateLimit,
      minSimilarity,
    });

    const queryLower = query.toLowerCase();
    const queryTerms = queryLower
      .split(/[^a-z0-9]+/i)
      .filter((t) => t.length > 2);

    for (const chunk of allCandidates) {
      let boost = 0;
      const fn = (chunk.filename || '').toLowerCase();
      const mime = (chunk.mimeType || '').toLowerCase();
      for (const term of queryTerms) {
        if (fn.includes(term) || (term === 'pdf' && mime.includes('pdf'))) {
          boost += 0.08;
        }
      }
      chunk.similarity = Math.min(1, chunk.similarity + boost);
    }

    allCandidates.sort((a, b) => b.similarity - a.similarity);

    const chunksByFile = new Map<string, SearchResultChunk[]>();
    for (const chunk of allCandidates) {
      const key = chunk.fileId || chunk.filename || chunk.documentId;
      if (!chunksByFile.has(key)) {
        chunksByFile.set(key, []);
      }
      chunksByFile.get(key)!.push(chunk);
    }

    const selectedChunks: SearchResultChunk[] = [];
    const maxPerFile = 5;
    const targetTotal = request.limit ?? 16;

    for (const [, fileChunks] of chunksByFile) {
      selectedChunks.push(...fileChunks.slice(0, maxPerFile));
    }

    selectedChunks.sort((a, b) => b.similarity - a.similarity);
    const chunks = selectedChunks.slice(0, targetTotal);

    const sources: ChatSourceCitation[] = chunks.map((c) => ({
      id: c.id,
      documentId: c.documentId,
      fileId: c.fileId,
      filename: c.filename,
      mimeType: c.mimeType,
      memoryId: c.memoryId,
      chunkIndex: c.chunkIndex,
      similarity: c.similarity,
      content: c.content,
    }));

    const contextText =
      chunks.length > 0
        ? chunks
            .map((chunk, idx) => {
              const docName = chunk.filename || 'Document';
              const type = chunk.mimeType || 'unknown';
              const relevance = (chunk.similarity * 100).toFixed(1);
              return `[Source ${idx + 1}: "${docName}" (${type}) | Relevance: ${relevance}%]\n${chunk.content}`;
            })
            .join('\n\n---\n\n')
        : 'No relevant document chunks found in the user memories.';

    const systemInstruction = `You are Chronicle AI, an intelligent personal memory assistant.
You help the user recall, synthesize, and answer questions about information stored in their memories, files, documents (PDFs, DOCX, CSV, TXT), audio transcripts, notes, images, and videos.

CRITICAL INSTRUCTIONS:
1. Thoroughly analyze ALL provided sources and document types (PDFs, notes, images, audio, video).
2. Answer the question accurately and comprehensively based on the context.
3. If specific documents like a resume or technical diagram are referenced, extract and synthesize details directly from those sections.
4. Citing sources: When citing information, clearly reference the source file (e.g. "From your Resume (PDF)..." or "In the Flow Chart...").
5. If the context does not contain the answer, politely state: "I couldn't find information about that in the selected memories."
6. Maintain a helpful, confident, and professional tone. Format your response cleanly using markdown (bullet points, bold highlights, headers).`;

    const userPrompt = `CONTEXT FROM USER MEMORIES:
${contextText}

USER QUESTION:
${query}`;

    const { ai, model } = this.getClient();

    const contents: any[] = [];

    if (request.history && request.history.length > 0) {
      const recentHistory = request.history.slice(-8);
      for (const msg of recentHistory) {
        if (!msg.content || !msg.content.trim()) continue;
        const role = msg.role === 'assistant' ? 'model' : 'user';
        if (
          contents.length > 0 &&
          contents[contents.length - 1].role === role
        ) {
          contents[contents.length - 1].parts[0].text += `\n${msg.content.trim()}`;
        } else {
          contents.push({
            role,
            parts: [{ text: msg.content.trim() }],
          });
        }
      }
    }

    if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
      contents[contents.length - 1].parts[0].text += `\n\n${userPrompt}`;
    } else {
      contents.push({
        role: 'user',
        parts: [{ text: userPrompt }],
      });
    }

    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
          temperature: 0.2,
        },
      });

      const answer = response.text || "I couldn't generate an answer.";

      return {
        answer,
        sources,
        memoryId: request.memoryId,
        query,
      };
    } catch (err: any) {
      const apiKey =
        this.configService.get<string>('GEMINI_API_KEY') ||
        process.env.GEMINI_API_KEY ||
        '';
      const sanitized = (err.message || 'Unknown error').replace(
        new RegExp(apiKey, 'gi'),
        '[REDACTED_API_KEY]',
      );
      this.logger.error(`RAG chat generation failed: ${sanitized}`);
      throw new InternalServerErrorException(
        `AI Chat generation failed: ${sanitized}`,
      );
    }
  }
}
