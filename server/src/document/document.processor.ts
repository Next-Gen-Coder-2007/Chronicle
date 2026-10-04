import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { Job } from 'bullmq';
import { DocumentService } from './document.service.js';
import {
  DOCUMENT_PROCESSING_QUEUE,
  PROCESS_DOCUMENT_JOB,
  type ProcessDocumentJobData,
} from './document.constants.js';

export {
  DOCUMENT_PROCESSING_QUEUE,
  PROCESS_DOCUMENT_JOB,
  type ProcessDocumentJobData,
};

@Processor(DOCUMENT_PROCESSING_QUEUE)
export class DocumentProcessor extends WorkerHost {
  private readonly logger = new Logger(DocumentProcessor.name);

  constructor(
    @Inject(forwardRef(() => DocumentService))
    private readonly documentService: DocumentService,
  ) {
    super();
  }

  async process(job: Job<ProcessDocumentJobData, any, string>): Promise<any> {
    this.logger.log(
      `[BullMQ] Starting job "${job.id}" (name: ${job.name}) for document "${job.data.documentId}" (attempt ${job.attemptsMade + 1})...`,
    );

    if (job.name === PROCESS_DOCUMENT_JOB) {
      const { documentId, mimeType, filename } = job.data;
      const result = await this.documentService.executeDocumentProcessing(
        documentId,
        undefined,
        mimeType,
        filename,
      );
      this.logger.log(
        `[BullMQ] Successfully completed processing for document "${documentId}".`,
      );
      return {
        documentId: result.id,
        status: result.status,
      };
    }

    this.logger.warn(`[BullMQ] Unknown job name "${job.name}" encountered.`);
  }
}
