import { Injectable, Logger } from '@nestjs/common';
import type { SearchResultChunk } from './search.service.js';

export interface RerankOptions {
  topK?: number;
  minScore?: number;
  boostFilename?: boolean;
}

export interface IRerankerService {
  rerank(
    query: string,
    candidates: SearchResultChunk[],
    options?: RerankOptions,
  ): Promise<SearchResultChunk[]>;
}

@Injectable()
export class RerankerService implements IRerankerService {
  private readonly logger = new Logger(RerankerService.name);

  async rerank(
    query: string,
    candidates: SearchResultChunk[],
    options?: RerankOptions,
  ): Promise<SearchResultChunk[]> {
    if (!candidates || candidates.length === 0) {
      return [];
    }

    const cleanQuery = (query || '').trim().toLowerCase();
    if (!cleanQuery) {
      return candidates.slice(0, options?.topK ?? 10);
    }

    const queryTokens = cleanQuery
      .split(/[^a-z0-9_]+/i)
      .filter((t) => t.length > 2);

    const scored = candidates.map((candidate) => {
      const contentLower = (candidate.content || '').toLowerCase();
      const filenameLower = (candidate.filename || '').toLowerCase();
      const sectionLower = (candidate.metadata?.section || '').toLowerCase();

      // 1. Initial base score (vector / hybrid similarity)
      let score = candidate.similarity || 0;

      // 2. Exact phrase match bonus
      if (contentLower.includes(cleanQuery)) {
        score += 0.25;
      }

      // 3. Section heading or title relevance
      if (sectionLower.includes(cleanQuery)) {
        score += 0.15;
      }

      // 4. Token coverage & proximity bonus
      if (queryTokens.length > 0) {
        let matchedCount = 0;
        let positions: number[] = [];

        for (const token of queryTokens) {
          const idx = contentLower.indexOf(token);
          if (idx !== -1) {
            matchedCount++;
            positions.push(idx);
          } else if (filenameLower.includes(token)) {
            matchedCount += 0.5;
          }
        }

        const coverage = matchedCount / queryTokens.length;
        score += coverage * 0.2;

        // Proximity bonus: if multiple query words appear near each other
        if (positions.length >= 2) {
          positions.sort((a, b) => a - b);
          const span = positions[positions.length - 1] - positions[0];
          if (span < 200) {
            score += 0.1;
          }
        }
      }

      // 5. Recency / Page / Timestamp normalization
      if (candidate.pageNumber !== undefined && candidate.pageNumber <= 3) {
        score += 0.02; // Slight early document priority
      }

      return {
        ...candidate,
        similarity: Number(Math.min(1, Math.max(0, score)).toFixed(6)),
      };
    });

    // Sort descending by reranked score
    scored.sort((a, b) => b.similarity - a.similarity);

    const filtered = options?.minScore !== undefined
      ? scored.filter((c) => c.similarity >= options.minScore!)
      : scored;

    const topK = options?.topK ?? 10;
    return filtered.slice(0, topK);
  }
}
