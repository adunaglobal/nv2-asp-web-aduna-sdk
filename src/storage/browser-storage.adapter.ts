// -----------------------------------------------------------------------------

// Aduna ASP SDK Source Available Software License Agreement

// -----------------------------------------------------------------------------

import { StorageAdapter } from './storage.interface';

export class BrowserStorageAdapter implements StorageAdapter {
  constructor(private prefix: string = 'ADUNA_SDK') { }

  private isBrowser(): boolean {
    return typeof window !== 'undefined' && !!window.localStorage;
  }

  setItem(key: string, value: string): void {
    if (this.isBrowser()) {
      window.localStorage.setItem(this.prefix + key, value);
    }
  }

  getItem(key: string): string | null {
    if (this.isBrowser()) {
      return window.localStorage.getItem(this.prefix + key);
    }
    return null;
  }

  removeItem(key: string): void {
    if (this.isBrowser()) {
      window.localStorage.removeItem(this.prefix + key);
    }
  }
}
