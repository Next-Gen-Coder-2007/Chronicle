import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GoogleGenAI } from '@google/genai';
import { SearchService, type SearchResultChunk } from '../search/search.service.js';
import { Memory } from '../entities/memory.entity.js';

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
  documentName: string;
  fileId?: string;
  filename?: string;
  mimeType?: string;
  memoryId?: string;
  chunkIndex: number;
  similarity: number;
  relevanceScore: number;
  content: string;
  page?: number;
  pageNumber?: number;
  startTime?: number;
  startTimestamp?: number;
  endTime?: number;
  endTimestamp?: number;
  contentType?: string;
}

export interface ChatResponse {
  answer: string;
  sources: ChatSourceCitation[];
  memoryId?: string;
  query: string;
}

export interface MemorySummaryResponse {
  memoryId: string;
  title: string;
  overview: string;
  importantEvents: string[];
  placesVisited: string[];
  peopleMentioned: string[];
  keyConversations: string[];
  importantDates: string[];
  activities: string[];
  relatedFiles: string[];
}

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(
    @InjectRepository(Memory)
    private readonly memoryRepository: Repository<Memory>,
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

  private reformulateQuery(query: string, history?: ChatMessage[]): string {
    if (!history || history.length === 0) return query;

    const lowerQuery = query.toLowerCase();
    const needsContext = /\b(that|it|then|there|they|she|he|those|this|what happened|tell me more|when was|who was)\b/i.test(
      lowerQuery,
    );

    if (!needsContext) return query;

    // Grab the last user question or key terms from previous turn
    const lastUserTurn = [...history]
      .reverse()
      .find((m) => m.role === 'user' && m.content.trim().length > 0);

    if (lastUserTurn) {
      const priorKeywords = lastUserTurn.content
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 3)
        .slice(0, 4)
        .join(' ');

      if (priorKeywords) {
        return `${query} (${priorKeywords})`;
      }
    }

    return query;
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const rawQuery = (request.message || '').trim();
    if (!rawQuery) {
      throw new BadRequestException('Chat message cannot be empty.');
    }

    const retrievalQuery = this.reformulateQuery(rawQuery, request.history);
    const candidateLimit = 35;
    const minSimilarity = request.minSimilarity ?? 0.15;

    // 1. Retrieve candidates via hybrid search + reranking
    const allCandidates = await this.searchService.search(retrievalQuery, {
      userId: request.userId,
      memoryId: request.memoryId,
      limit: candidateLimit,
      minSimilarity,
    });

    // 2. Fetch scoped memory metadata if memoryId is specified
    let memoryContext = '';
    if (request.memoryId) {
      const memory = await this.memoryRepository.findOne({
        where: { id: request.memoryId, userId: request.userId },
      });
      if (memory) {
        memoryContext = `[Active Memory: "${memory.title}" | Dates: ${memory.started}${memory.ended ? ` to ${memory.ended}` : ' (ongoing)'} | Location: ${memory.location || 'unspecified'} | Tags: ${Array.isArray(memory.tags) ? memory.tags.join(', ') : memory.tags || 'none'}]\nDescription: ${memory.description}\n\n`;
      }
    }

    // 3. Diversify chunks across distinct files
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

    // 4. Construct rich citations
    const sources: ChatSourceCitation[] = chunks.map((c) => ({
      id: c.id,
      documentId: c.documentId,
      documentName: c.filename || 'Document',
      fileId: c.fileId,
      filename: c.filename,
      mimeType: c.mimeType,
      memoryId: c.memoryId,
      chunkIndex: c.chunkIndex,
      similarity: c.similarity,
      relevanceScore: c.similarity,
      content: c.content,
      page: c.pageNumber,
      pageNumber: c.pageNumber,
      startTime: c.startTimestamp,
      startTimestamp: c.startTimestamp,
      endTime: c.endTimestamp,
      endTimestamp: c.endTimestamp,
      contentType: c.contentType,
    }));

    // 5. Build context text with citations
    const contextText =
      chunks.length > 0
        ? chunks
            .map((chunk, idx) => {
              const docName = chunk.filename || 'Document';
              const type = chunk.mimeType || chunk.contentType || 'unknown';
              const relevance = (chunk.similarity * 100).toFixed(1);
              let metaInfo = `Relevance: ${relevance}%`;

              if (chunk.pageNumber !== undefined) {
                metaInfo += ` | Page: ${chunk.pageNumber}`;
              }
              if (chunk.startTimestamp !== undefined) {
                metaInfo += ` | Time: ${chunk.startTimestamp}s - ${chunk.endTimestamp || ''}s`;
              }

              return `[Source ${idx + 1}: "${docName}" (${type}) | ${metaInfo}]\n${chunk.content}`;
            })
            .join('\n\n---\n\n')
        : 'No relevant document chunks found in the user memories.';

    const systemInstruction = `You are Chronicle AI, a production-grade personal knowledge and memory assistant.
You help the user recall, synthesize, and answer questions about information stored in their memories, documents (PDFs, DOCX, CSV, TXT), audio transcripts, image descriptions, and video records.

CRITICAL GROUNDING INSTRUCTIONS:
1. Ground your answers ONLY in the provided context from user memories and documents.
2. Every claim must be traceable to the retrieved context.
3. When referencing evidence, clearly cite the specific file, page number, and/or timestamp (e.g., "[Chennai Trip.pdf - Page 3]" or "[voice-note.mp3 at 01:14]").
4. If the provided context does not contain sufficient information to answer the question, state politely and clearly: "I couldn't find information about that in your memories."
5. Format your answers cleanly in markdown with bold highlights and bullet points.`;

    const userPrompt = `${memoryContext}CONTEXT FROM USER MEMORIES:
${contextText}

USER QUESTION:
${rawQuery}`;

    const { ai, model } = this.getClient();
    const contents: any[] = [];

    // Append bounded conversation history (last 8 messages)
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
        query: rawQuery,
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

  async generateMemorySummary(userId: string, memoryId: string): Promise<MemorySummaryResponse> {
    const memory = await this.memoryRepository.findOne({
      where: { id: memoryId, userId },
      relations: { files: { document: { chunks: true } } },
    });

    if (!memory) {
      throw new NotFoundException(`Memory with id "${memoryId}" not found.`);
    }

    const files = memory.files || [];
    const relatedFiles = files.map((f) => f.filename);

    // Aggregate sample chunk contents from this memory
    let aggregatedContent = `Memory Title: ${memory.title}\nDescription: ${memory.description}\nDates: ${memory.started} to ${memory.ended || 'ongoing'}\nLocation: ${memory.location || 'none'}\n\n`;

    for (const file of files) {
      aggregatedContent += `--- File: ${file.filename} (${file.mimeType}) ---\n`;
      if (file.document?.content) {
        aggregatedContent += file.document.content.slice(0, 3000) + '\n\n';
      }
    }

    const prompt = `You are Chronicle AI's memory synthesis engine.
Analyze all available content for this memory and produce a structured, fact-grounded JSON summary.

Memory Content:
${aggregatedContent}

Respond ONLY with a valid JSON object matching this exact schema:
{
  "overview": "A concise 2-3 sentence overview of this memory",
  "importantEvents": ["event 1", "event 2"],
  "placesVisited": ["place 1", "place 2"],
  "peopleMentioned": ["person 1", "person 2"],
  "keyConversations": ["key conversation or topic 1"],
  "importantDates": ["date or milestone 1"],
  "activities": ["activity 1", "activity 2"]
}`;

    const { ai, model } = this.getClient();

    try {
      const response = await ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      });

      const rawJson = (response.text || '{}').trim();
      const parsed = JSON.parse(rawJson);

      return {
        memoryId,
        title: memory.title,
        overview: parsed.overview || memory.description,
        importantEvents: Array.isArray(parsed.importantEvents) ? parsed.importantEvents : [],
        placesVisited: Array.isArray(parsed.placesVisited) ? parsed.placesVisited : [],
        peopleMentioned: Array.isArray(parsed.peopleMentioned) ? parsed.peopleMentioned : [],
        keyConversations: Array.isArray(parsed.keyConversations) ? parsed.keyConversations : [],
        importantDates: Array.isArray(parsed.importantDates) ? parsed.importantDates : [],
        activities: Array.isArray(parsed.activities) ? parsed.activities : [],
        relatedFiles,
      };
    } catch (err: any) {
      this.logger.error(`Memory summary generation failed: ${err.message}`);
      return {
        memoryId,
        title: memory.title,
        overview: memory.description || 'No overview available.',
        importantEvents: [],
        placesVisited: memory.location ? [memory.location] : [],
        peopleMentioned: [],
        keyConversations: [],
        importantDates: [memory.started],
        activities: [],
        relatedFiles,
      };
    }
  }
}
