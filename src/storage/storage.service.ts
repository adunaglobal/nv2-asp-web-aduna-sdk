// -----------------------------------------------------------------------------

// Aduna ASP SDK Source Available Software License Agreement

// -----------------------------------------------------------------------------
 
import { StorageAdapter } from './storage.interface';

export class StorageService {
  constructor(private storage: StorageAdapter) { }

  save(name: string, value: string): void {
    this.storage.setItem(name, value);
  }

  load(name: string): string | null {
    return this.storage.getItem(name);
  }

  delete(name: string): void {
    this.storage.removeItem(name);
  }
}
