import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Document } from '../entities/document.entity.js';
import { DocumentChunk } from '../entities/document-chunk.entity.js';

export interface ChunkingOptions {
  maxChunkSize?: number;
  overlapSize?: number;
  minChunkSize?: number;
  preserveSectionContext?: boolean;
  customMetadata?: Record<string, any>;
}

export interface GeneratedChunk {
  content: string;
  chunkIndex: number;
  charCount: number;
  tokenCount: number;
  metadata: {
    section?: string;
    startChar: number;
    endChar: number;
    totalChunks?: number;
    [key: string]: any;
  };
}

@Injectable()
export class ChunkingService {
  private readonly logger = new Logger(ChunkingService.name);

  private static readonly DEFAULT_MAX_CHUNK_SIZE = 800;
  private static readonly DEFAULT_OVERLAP_SIZE = 150;
  private static readonly DEFAULT_MIN_CHUNK_SIZE = 100;

  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    @InjectRepository(DocumentChunk)
    private readonly chunkRepository: Repository<DocumentChunk>,
    private readonly dataSource: DataSource,
  ) {}

  private estimateTokens(text: string): number {
    if (!text || text.length === 0) return 0;
    return Math.max(1, Math.ceil(text.length / 4));
  }

  private splitIntoSections(content: string): Array<{ heading?: string; text: string; startOffset: number }> {
    const sectionRegex = /(?:^|\n\n)(?:(#{1,4}\s+[^\n]+)|([A-Z][A-Za-z0-9 /_\-&()]{2,40}:))\s*\n/g;
    const sections: Array<{ heading?: string; text: string; startOffset: number }> = [];

    let lastIndex = 0;
    let currentHeading: string | undefined = undefined;
    let match: RegExpExecArray | null;

    while ((match = sectionRegex.exec(content)) !== null) {
      const matchIndex = match.index;
      const matchedHeading = (match[1] || match[2] || '').trim();

      if (matchIndex > lastIndex) {
        const textBefore = content.substring(lastIndex, matchIndex).trim();
        if (textBefore.length > 0) {
          sections.push({
            heading: currentHeading,
            text: textBefore,
            startOffset: lastIndex,
          });
        }
      }

      currentHeading = matchedHeading.replace(/^#+\s*/, '').replace(/:$/, '').trim();
      lastIndex = matchIndex + match[0].length;
    }

    if (lastIndex < content.length) {
      const remainingText = content.substring(lastIndex).trim();
      if (remainingText.length > 0) {
        sections.push({
          heading: currentHeading,
          text: remainingText,
          startOffset: lastIndex,
        });
      }
    }

    if (sections.length === 0 && content.trim().length > 0) {
      sections.push({
        heading: undefined,
        text: content.trim(),
        startOffset: 0,
      });
    }

    return sections;
  }

  private splitSemanticFragments(text: string, maxFragSize: number = 300): string[] {
    const targetSize = Math.max(60, Math.floor(maxFragSize * 0.6));
    const paragraphs = text.split(/\n{2,}/);
    const fragments: string[] = [];

    for (const para of paragraphs) {
      const trimmedPara = para.trim();
      if (!trimmedPara) continue;

      if (trimmedPara.length <= targetSize) {
        fragments.push(trimmedPara);
        continue;
      }

      const lines = trimmedPara.split(/\n+/);
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        if (trimmedLine.length <= targetSize) {
          fragments.push(trimmedLine);
          continue;
        }

        const sentences = trimmedLine.split(/(?<=[.?!])\s+/);
        for (const sentence of sentences) {
          const trimmedSentence = sentence.trim();
          if (!trimmedSentence) continue;

          if (trimmedSentence.length <= targetSize) {
            fragments.push(trimmedSentence);
          } else {
            const words = trimmedSentence.split(/\s+/);
            let temp = '';
            for (const word of words) {
              if ((temp + ' ' + word).trim().length > targetSize) {
                if (temp) fragments.push(temp.trim());
                temp = word;
              } else {
                temp = temp ? `${temp} ${word}` : word;
              }
            }
            if (temp) fragments.push(temp.trim());
          }
        }
      }
    }

    return fragments;
  }

  chunkText(content: string, options?: ChunkingOptions): GeneratedChunk[] {
    if (!content || content.trim().length === 0) {
      return [];
    }

    const maxChunkSize = options?.maxChunkSize ?? ChunkingService.DEFAULT_MAX_CHUNK_SIZE;
    const overlapSize = options?.overlapSize ?? ChunkingService.DEFAULT_OVERLAP_SIZE;
    const minChunkSize = options?.minChunkSize ?? ChunkingService.DEFAULT_MIN_CHUNK_SIZE;
    const preserveSection = options?.preserveSectionContext ?? true;
    const customMetadata = options?.customMetadata ?? {};

    const sections = this.splitIntoSections(content);
    const rawChunks: Array<{
      content: string;
      section?: string;
      startChar: number;
      endChar: number;
    }> = [];

    for (const section of sections) {
      const sectionText = section.text;
      const sectionHeading = section.heading;
      const sectionOffset = section.startOffset;

      if (sectionText.length <= maxChunkSize) {
        let chunkText = sectionText;
        if (preserveSection && sectionHeading && !chunkText.toLowerCase().startsWith(sectionHeading.toLowerCase())) {
          chunkText = `[Section: ${sectionHeading}]\n${chunkText}`;
        }

        rawChunks.push({
          content: chunkText,
          section: sectionHeading,
          startChar: sectionOffset,
          endChar: sectionOffset + sectionText.length,
        });
        continue;
      }

      const fragments = this.splitSemanticFragments(sectionText, maxChunkSize);
      let currentAccumulator = '';
      let currentStartOffset = sectionOffset;

      for (let i = 0; i < fragments.length; i++) {
        const frag = fragments[i];

        const potential = currentAccumulator
          ? `${currentAccumulator}\n\n${frag}`
          : frag;

        if (potential.length <= maxChunkSize) {
          currentAccumulator = potential;
        } else {
          if (currentAccumulator) {
            let chunkText = currentAccumulator;
            if (
              preserveSection &&
              sectionHeading &&
              !chunkText.toLowerCase().includes(sectionHeading.toLowerCase())
            ) {
              chunkText = `[Section: ${sectionHeading}]\n${chunkText}`;
            }

            rawChunks.push({
              content: chunkText,
              section: sectionHeading,
              startChar: currentStartOffset,
              endChar: currentStartOffset + currentAccumulator.length,
            });

            let overlapText = '';
            if (overlapSize > 0 && currentAccumulator.length > overlapSize) {
              const tail = currentAccumulator.slice(-overlapSize);
              const breakIndex = tail.indexOf(' ');
              overlapText = breakIndex !== -1 ? tail.slice(breakIndex + 1).trim() : tail.trim();
            }

            currentStartOffset = currentStartOffset + currentAccumulator.length - overlapText.length;
            currentAccumulator = overlapText ? `${overlapText}\n\n${frag}` : frag;
          } else {
            let chunkText = frag;
            if (preserveSection && sectionHeading && !chunkText.toLowerCase().includes(sectionHeading.toLowerCase())) {
              chunkText = `[Section: ${sectionHeading}]\n${chunkText}`;
            }
            rawChunks.push({
              content: chunkText,
              section: sectionHeading,
              startChar: currentStartOffset,
              endChar: currentStartOffset + frag.length,
            });
            currentStartOffset += frag.length;
            currentAccumulator = '';
          }
        }
      }

      if (currentAccumulator.trim().length > 0) {
        let chunkText = currentAccumulator.trim();
        if (preserveSection && sectionHeading && !chunkText.toLowerCase().includes(sectionHeading.toLowerCase())) {
          chunkText = `[Section: ${sectionHeading}]\n${chunkText}`;
        }
        rawChunks.push({
          content: chunkText,
          section: sectionHeading,
          startChar: currentStartOffset,
          endChar: currentStartOffset + currentAccumulator.length,
        });
      }
    }

    if (rawChunks.length > 1) {
      const lastChunk = rawChunks[rawChunks.length - 1];
      const prevChunk = rawChunks[rawChunks.length - 2];
      if (
        lastChunk.section === prevChunk.section &&
        lastChunk.content.length < minChunkSize &&
        prevChunk.content.length + lastChunk.content.length <= maxChunkSize * 1.25
      ) {
        prevChunk.content = `${prevChunk.content}\n\n${lastChunk.content}`;
        prevChunk.endChar = lastChunk.endChar;
        rawChunks.pop();
      }
    }

    const totalChunks = rawChunks.length;
    return rawChunks.map((chunk, index) => {
      const charCount = chunk.content.length;
      return {
        content: chunk.content,
        chunkIndex: index,
        charCount,
        tokenCount: this.estimateTokens(chunk.content),
        metadata: {
          ...customMetadata,
          section: chunk.section,
          startChar: chunk.startChar,
          endChar: chunk.endChar,
          totalChunks,
        },
      };
    });
  }

  async chunkDocument(
    documentId: string,
    options?: ChunkingOptions,
  ): Promise<DocumentChunk[]> {
    const document = await this.documentRepository.findOne({
      where: { id: documentId },
      relations: { file: true },
    });

    if (!document) {
      throw new NotFoundException(`Document with id "${documentId}" not found.`);
    }

    if (!document.content || document.content.trim().length === 0) {
      this.logger.warn(
        `Document "${documentId}" has empty content. Cleaning existing chunks if any.`,
      );
      await this.deleteChunksForDocument(documentId);
      return [];
    }

    const customMetadata: Record<string, any> = {
      ...options?.customMetadata,
    };

    if (document.file) {
      customMetadata.filename = document.file.filename;
      customMetadata.mimeType = document.file.mimeType;
      customMetadata.fileId = document.file.id;
      customMetadata.memoryId = document.file.memoryId;
    }

    const generatedChunks = this.chunkText(document.content, {
      ...options,
      customMetadata,
    });

    this.logger.log(
      `Generated ${generatedChunks.length} chunks for Document "${documentId}". Persisting...`,
    );

    return await this.dataSource.transaction(async (manager) => {
      await manager.delete(DocumentChunk, { documentId });

      const chunkEntities = generatedChunks.map((gc) =>
        manager.create(DocumentChunk, {
          documentId,
          chunkIndex: gc.chunkIndex,
          content: gc.content,
          charCount: gc.charCount,
          tokenCount: gc.tokenCount,
          metadata: gc.metadata,
        }),
      );

      const saved = await manager.save(DocumentChunk, chunkEntities);
      return saved;
    });
  }

  async getChunksForDocument(documentId: string): Promise<DocumentChunk[]> {
    return this.chunkRepository.find({
      where: { documentId },
      order: { chunkIndex: 'ASC' },
    });
  }

  async deleteChunksForDocument(documentId: string): Promise<void> {
    await this.chunkRepository.delete({ documentId });
  }
}
