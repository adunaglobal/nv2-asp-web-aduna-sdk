// 
// -----------------------------------------------------------------------------
// Copyright © 2026 Aduna AB
// Licensed under the Aduna ASP SDK Source Available Software License Agreement
// -----------------------------------------------------------------------------
// 
 
export interface StorageAdapter {
  setItem(key: string, value: string): void;
  getItem(key: string): string | null;
  removeItem(key: string): void;
}
