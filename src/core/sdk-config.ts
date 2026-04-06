// -----------------------------------------------------------------------------

// Aduna ASP SDK Source Available Software License Agreement

// -----------------------------------------------------------------------------
 

import { StorageService } from "../storage/storage.service";

export interface AdunaNv2AspWebSdkConfig {
  aspServerUrl: string;
  apiKey?: string;
  storage?: StorageService;
  storagePrefix?: string;
}
