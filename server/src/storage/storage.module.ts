import { Module, Global } from '@nestjs/common';
import { LocalStorageService } from './local-storage.service.js';
import { STORAGE_SERVICE } from './storage.interface.js';

@Global()
@Module({
  providers: [
    LocalStorageService,
    {
      provide: STORAGE_SERVICE,
      useExisting: LocalStorageService,
    },
  ],
  exports: [LocalStorageService, STORAGE_SERVICE],
})
export class StorageModule {}
