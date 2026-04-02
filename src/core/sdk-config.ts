// -----------------------------------------------------------------------------

// Copyright © 2026 Aduna AB

// Licensed under the Aduna ASP SDK Software License Agreement

// -----------------------------------------------------------------------------
 

import { StorageService } from "../storage/storage.service";

export interface AdunaNv2AspWebSdkConfig {
  aspServerUrl: string;
  apiKey?: string;
  storage?: StorageService;
  storagePrefix?: string;
}
