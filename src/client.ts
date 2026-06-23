//
// -----------------------------------------------------------------------------
// Copyright © 2026 Aduna AB
// Licensed under the Aduna ASP SDK Source Available Software License Agreement
// -----------------------------------------------------------------------------
//
 
export class SdkError extends Error {
  constructor(
    message: string,
    public error?: string,
    public errorDescription?: string
  ) {
    super(message);
    this.error = error;
    this.errorDescription = errorDescription;
  }
}

export class AdunaNv2AspWebSdkClient {

  storageKey = 'AdunaNv2AspWebSdkClient';

  sba_error = 'sba_error';
  nba_error = 'nba_error';
  nv_error = 'nv_error';

  // =============================
  // HTTP Helper
  // =============================
  private async request<T>(url: string, mode: string, options: RequestInit): Promise<T> {
    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');

    try {
      const response = await fetch(url, { ...options, headers });

      let body: any = null;
      try {
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          body = await response.json();
        } else {
          body = await response.text();
        }
      } catch {
        // ignore parsing errors
      }

      if (response.ok) {
        return body as T;
      }

      // Normalize error
      let errorCode = body?.error || 'http_error';
      if (errorCode == 'http_error') {
        if (mode == 'sba')
          errorCode = 'sba_error';
        else if (mode == 'nba')
          errorCode = 'nba_error';
        else if (mode == 'nv')
          errorCode = 'nv_error';
      }

      const errorDescription =
        body?.error_description ||
        body?.message ||
        (typeof body === 'string' ? body : `${response.status} ${response.statusText}`);

      console.log('SdkError', errorCode, errorDescription);
      throw new SdkError('Request failed', errorCode, errorDescription);

    } catch (error: any) {
      if (error instanceof SdkError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new SdkError('HTTP Exception', 'http_exception', message);
    }
  }

  // =============================
  // NETWORK (NBA)
  // =============================
  async getNetworkBasedUrl(url: string): Promise<any> {
    return this.request<any>(url, 'nba', { method: 'GET' });
  }

  async nba(invocationUrlResponse: any): Promise<{ sdkResult: any; mode: string }> {

    const nba = invocationUrlResponse.networkBasedAuthZData;

    if (!nba || !('url' in nba)) {
      throw new SdkError('', this.nba_error, 'Mandatory invocation data missing');
    }

    try {
      
      const sdkResult = await this.getNetworkBasedUrl(invocationUrlResponse.networkBasedAuthZData.url);

      console.log('nba', 'sdkResult', sdkResult);

      if (!('devicePhoneNumberVerified' in sdkResult) && !('devicePhoneNumber' in sdkResult))
        throw new SdkError('', this.nba_error, 'Verification information missing');

      return { sdkResult, mode: 'nba' };

    } catch (error) {
      if (error instanceof SdkError) throw error;
      throw new SdkError('', this.nba_error, error instanceof Error ? error.message : String(error));
    }
  }

  // =============================
  // SIM-BASED INVOCATION CREATION (SBA)
  // =============================
  async createInvocation(response: any, platform: string): Promise<string> {
    if (!response.simBasedAuthZData)
      throw new SdkError('', this.sba_error, 'Missing simBasedAuthZData');

    const appInfoJwtQueryParameterName = localStorage.getItem(this.storageKey + 'appInfoJwtQueryParameterName');
    const { nonce, appInfoJwt, iOSAppClipUrl, vpResponse } = response.simBasedAuthZData;

    if (platform === 'ios') {
      return `${iOSAppClipUrl}&${appInfoJwtQueryParameterName}=${encodeURIComponent(appInfoJwt)}`;
    }

    if (platform === 'android') {
      if (response.simBasedAuthZData.androidAppUrl) {
        return `${iOSAppClipUrl}&${appInfoJwtQueryParameterName}=${encodeURIComponent(appInfoJwt)}`;
      }

      if (typeof navigator === 'undefined' || !navigator.credentials)
        throw new SdkError('', this.sba_error, 'Web Credential API not supported');

      const openId4VPRequest = {
        digital: {
          requests: [{
            protocol: "openid4vp-v1-unsigned",
            data: {
              dcql_query: {
                credentials: [{
                  format: vpResponse.format,
                  id: vpResponse.id,
                  meta: vpResponse.meta,
                  claims: vpResponse.claims
                }]
              },
              nonce,
              response_mode: "dc_api",
              response_type: "vp_token"
            }
          }]
        }
      };

      let credential: Credential | null;
      try {
        credential = await navigator.credentials.get(openId4VPRequest as any);
      } catch (error: any) {
        throw new SdkError('', this.sba_error, error instanceof Error ? error.message : String(error));
      }

      const vpToken = (credential as any)?.data?.vp_token;
      if (!vpToken)
        throw new SdkError('', this.sba_error, 'Authorization cancelled or failed');

      const payloadObject = { protocol: "openid4vp-v1-unsigned", data: (credential as any).data };
      return encodeURIComponent(JSON.stringify(payloadObject));
    }

    throw new SdkError('', this.sba_error, 'Unsupported platform');
  }

  // =============================
  // DEVICE DETECTION
  // =============================
  private ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  isMobile = () => /Android|iPhone|iPad|iPod/i.test(this.ua);
  isAndroid = () => /Android/i.test(this.ua);
  isIOS = () => /iPhone|iPad|iPod/i.test(this.ua);
  isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof document !== 'undefined';
  }

  // =============================
  // SBA FLOW
  // =============================
  async sba(invocationUrlResponse: any) {
    let os = '';
    if (this.isAndroid()) os = 'android';
    else if (this.isIOS()) os = 'ios';
    else throw new SdkError('', this.sba_error, 'Incompatible OS');

    const data = invocationUrlResponse.simBasedAuthZData;
    const has = (k: string) => k in data;

    if (
      (this.isIOS() && (!has('appInfoJwt') || !has('iOSAppClipUrl'))) ||
      (this.isAndroid() && (!has('vpResponse') || !has('nonce')))
    ) throw new SdkError('', this.sba_error, 'Mandatory invocation data missing');

    if (!('appCallbackQueryParameterName' in data) || !('appInfoJwtQueryParameterName' in data))
      throw new SdkError('', this.sba_error, 'Mandatory invocation data missing');

    if (this.isIOS() || (this.isAndroid() && has('androidAppUrl'))) {
      localStorage.setItem(this.storageKey + 'appInfoJwtQueryParameterName', data.appInfoJwtQueryParameterName);
      localStorage.setItem(this.storageKey + 'appCallbackQueryParameterName', data.appCallbackQueryParameterName);
    }

    const invocationUrl = await this.createInvocation(invocationUrlResponse, os);

    if (this.isMobile()) {
      if (this.isIOS() || (this.isAndroid() && has('androidAppUrl'))) {
        window.location.href = invocationUrl;
        return { invocationUrlSuccessfullyParsed: true };
      }
      if (this.isAndroid()) {
        return { invocationUrl, mode: 'sba' };
      }
    }

    throw new SdkError('', this.sba_error, 'Could not create invocation url');
  }

  // =============================
  // METHOD SELECTION
  // =============================
  async methodSelection(invocationUrlResponse: any, mode: string): Promise<any> {
    if (mode === "NBA") return this.nba(invocationUrlResponse);
    if (mode === "SBA") return this.sba(invocationUrlResponse);
    if (mode === "NBAF") {
      if (invocationUrlResponse.networkBasedAuthZData) return this.nba(invocationUrlResponse);
      if (invocationUrlResponse.simBasedAuthZData) return this.sba(invocationUrlResponse);
      throw new SdkError('', this.nv_error, 'Invocation data missing');
    }
    if (mode === "SBAF") {
      if (invocationUrlResponse.simBasedAuthZData) return this.sba(invocationUrlResponse);
      if (invocationUrlResponse.networkBasedAuthZData) return this.nba(invocationUrlResponse);
      throw new SdkError('', this.nv_error, 'Invocation data missing');
    }
    throw new SdkError('', this.nv_error, 'Invocation data missing');
  }

  // =============================
  // URL ANALYSIS
  // =============================
  analyzeUrl(params: { [key: string]: any }) {
    const key = localStorage.getItem(this.storageKey + 'appCallbackQueryParameterName') || '';
    if (!(key in params) && !('error' in params)) {
      throw new SdkError('', this.sba_error, 'App callback missing URL data');
    }

    const value = params[key] ?? null;
    const state = params['state'] ?? null;
    const error = params['error'] ?? null;
    const errorDescription = params['error_description'] ?? null;

    if (!this.isBrowser()) return;

    if (error && errorDescription) return { error, errorDescription };
    if (value && state) return { appCallbackQueryParameter: value, state };
    if (value) return { appCallbackQueryParameter: value };

    throw new SdkError('', this.sba_error, 'Generic error');
  }

  // =============================
  // CLEANUP
  // =============================
  cleanLocalStorage() {
    localStorage.removeItem(this.storageKey + 'appInfoJwtQueryParameterName');
    localStorage.removeItem(this.storageKey + 'appCallbackQueryParameterName');
  }
}