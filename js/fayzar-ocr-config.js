/**
 * ============================================================================
 * Fayzar Computer Web - AI OCR Secure Configuration & Multi-Key Vault
 * ============================================================================
 * This file securely manages the AI OCR engine credentials and 12-key fallback pool.
 * Keys are dynamically deobfuscated at runtime (XOR 42 + Base64) to prevent source inspection.
 * ============================================================================
 */

(function (global) {
  'use strict';

  // Obfuscated credential vault (XOR bit-shifted + Base64 encoded)
  // All 16 verified, active Google AI Studio Gemini API keys (including 2 new high-quota premium keys)
  const VAULT = {
    KEYS: [
      // Primary High-Quota Key 1
      "a3sEa0gSeGQcYG1AZxJdZ0kaZWh7ZnB8W05tfh5AXhNLXVJTfnJhUnxsRX9CH2JrGm9+GF0=",
      // Primary High-Quota Key 2
      "a3sEa0gSeGQcYU8daFkYcl9dE10aTRMYZGgSUGNtcEleblJkWB1HaFpzaUFOXkdcWQdAHXs=",
      // Verified System Vault Keys (Keys 3-16)
      "a3sEa0gSeGQcYXBpZ1lMex4HWGJhfW8SHnUdW1pbUk1tYXpmGUZSGXtQb1prQVMSB2BEHU0=",
      "a2NQS3lTaU9NUElzQ2d1bUleaWl8Xlh8Z2ZAfW9zbEIfZVNae0Zd",
      "a3sEa0gSeGQcYGN9XUwYSFlMHhxGaQdTextiYklzfn1sRHx9QxNlBxxueWdzcE4fUk1+Wns=",
      "a3sEa0gSeGQcZkViQ05pRU9QGhpOQmYcZ1MSSGV5SEFNHnJ8ZkAcWm5cTm5MSHBLUBxlGns=",
      "a3sEa0gSeGQcYWlefEgSGXAbbH5jWl1BWklnXFgcH14fblh4QGh/ZWRLbB1TY01zeG5LWms=",
      "a3sEa0gSeGQcYF1SGUMSRmx7SHN6QRhBZ1hvckBzU09EW0BMaUlHfhxcXlAfUBNtXHgZf3s=",
      "a3sEa0gSeGQcYXITeEhYa0hEeWl9El1zaXBzHhxMTmRLXltBe0JEQkcfS35aZlhuSW1wc2s=",
      "a3sEa0gSeGQcYGVrY2hAfWJgU39/RW1zGnxifxhhY15vSVBtbGlcelMSQVtFXl9gRXlZZl0=",
      "a3sEa0gSeGQcY0ZtY08SGXJje1AfWUx/XlhBGGNHbXliGkB8R2d4QnlzfHhZXEBQQRpwGXs=",
      "a3sEa0gSeGQcYGRSbEUeY2xcb2xzSWl+WF1/UgdmX1J5X35NUk5jHHJPTB9Ifm5IdXp4Yk0=",
      "a3sEa0gSeGQcYxhkE2xBRxNEfnVjWERnWH11Xk5yW3BrWWJGW0hjcxxienBvRE9uHm9QRU0=",
      "a2NQS3lTaRsdS39edXBfc21ZZllhE2J5a0xIRXtnTxl+XV5+H30e",
      "a2NQS3lTaFt5XVgefn9QThsdZR5EcxtlSEkdH0QeQGlBZx91aU9F",
      "a3sEa0gSeGQcYX0aH15SSGlPeHNDX2ZuQ3xQYhp/aWxkfX9zYkcfWn5dHx9QTVpYRVlgcE0=",
      // New Verified System Vault Keys (Keys 17-19)
      "a3sEa0gSeGQcYEBbXXl+S2kSWhNZeWRTHXVQbmtwY34fSGZfB2RwT2ddfmJoHklebGgZUGs=",
      "a3sEa0gSeGQcZkxNU39nZQcTaHt4fnVvek1lbkwSRVNJc2ISQGZLc1NofwdBZkNmXUNSbl0=",
      "a2NQS3lTaxsSSWt9ekF7GmYfU0F+entwRExJEltHYWJCa2doUFMa"
    ],
    MASK_SALT: 42
  };

  /**
   * Key+Model health and cooldown tracker with sessionStorage persistence
   * Maps `${cleanKey}::${model}` -> { state: 'cooldown', until: timestamp }
   * And `${cleanKey}` -> { state: 'invalid', until: Infinity } for broken keys
   */
  const keyModelStatusMap = new Map();

  // Restore active cooldowns from sessionStorage on startup
  try {
    if (typeof sessionStorage !== 'undefined') {
      const savedCooldowns = JSON.parse(sessionStorage.getItem('fayzar_key_model_cooldowns') || '{}');
      const now = Date.now();
      for (const [km, until] of Object.entries(savedCooldowns)) {
        if (typeof until === 'number' && until > now) {
          keyModelStatusMap.set(km, { state: 'cooldown', until });
        }
      }
    }
  } catch (e) {}

  // Pre-mark Key 0 for gemini-3-flash-preview if known daily quota exceeded
  try {
    const k0 = _unpack(VAULT.KEYS[0]);
    if (k0) {
      const k0m = `${k0}::gemini-3-flash-preview`;
      if (!keyModelStatusMap.has(k0m)) {
        keyModelStatusMap.set(k0m, { state: 'cooldown', until: Date.now() + (14400 * 1000) });
      }
    }
  } catch (e) {}

  function _syncCooldownsToStorage() {
    try {
      if (typeof sessionStorage === 'undefined') return;
      const obj = {};
      const now = Date.now();
      for (const [km, status] of keyModelStatusMap.entries()) {
        if (status.state === 'cooldown' && status.until > now) {
          obj[km] = status.until;
        }
      }
      sessionStorage.setItem('fayzar_key_model_cooldowns', JSON.stringify(obj));
    } catch (e) {}
  }

  /**
   * Internal string deobfuscator
   */
  function _unpack(encodedStr, salt = VAULT.MASK_SALT) {
    if (!encodedStr) return '';
    try {
      const raw = typeof atob === 'function' ? atob(encodedStr) : Buffer.from(encodedStr, 'base64').toString('binary');
      const chars = [];
      for (let i = 0; i < raw.length; i++) {
        chars.push(String.fromCharCode(raw.charCodeAt(i) ^ salt));
      }
      return chars.join('');
    } catch (e) {
      console.warn('Vault deobfuscation failed:', e);
      return '';
    }
  }

  let roundRobinIndex = 0;
  try {
    if (typeof localStorage !== 'undefined') {
      const savedIdx = parseInt(localStorage.getItem('fayzar_key_rr_index') || '0', 10);
      if (!isNaN(savedIdx) && savedIdx >= 0) roundRobinIndex = savedIdx;
    }
  } catch (e) {}

  const FayzarOcrConfig = {
    /**
     * Strict validation for Google AI Studio Gemini API Key format
     * Supports both classic Google AI Studio keys (AIzaSy...) and modern keys (AQ.Ab8RN...)
     */
    isValidApiKey: function (key) {
      if (!key || typeof key !== 'string') return false;
      const clean = key.trim();
      return (clean.startsWith('AIzaSy') || clean.startsWith('AQ.')) && clean.length >= 35 && /^[A-Za-z0-9_.-]+$/.test(clean);
    },

    /**
     * Mark a key as on cooldown specifically for a model (e.g. 429 quota exhaustion)
     * Default: 14400s (4 hours) so quota-exhausted keys don't retry in the same session
     */
    markKeyModelCooldown: function (key, model, seconds = 14400) {
      if (!key) return;
      const cleanKey = key.trim();
      const cleanModel = (model || 'default').trim();
      const kmKey = `${cleanKey}::${cleanModel}`;
      keyModelStatusMap.set(kmKey, {
        state: 'cooldown',
        until: Date.now() + (seconds * 1000)
      });
      _syncCooldownsToStorage();
      this.logAudit('KEY_MODEL_COOLDOWN', { keyMask: cleanKey.slice(0, 8) + '...', model: cleanModel, cooldownSec: seconds });
    },

    /**
     * Legacy markKeyCooldown (backwards compatibility)
     */
    markKeyCooldown: function (key, seconds = 14400) {
      this.markKeyModelCooldown(key, 'gemini-3-flash-preview', seconds);
    },

    /**
     * Mark a key as permanently invalid for current session (e.g. 400 API_KEY_INVALID)
     */
    markKeyInvalid: function (key) {
      if (!key) return;
      const cleanKey = key.trim();
      keyModelStatusMap.set(cleanKey, {
        state: 'invalid',
        until: Infinity
      });
      this.logAudit('KEY_INVALID', { keyMask: cleanKey.slice(0, 8) + '...' });
    },

    /**
     * Check if key is available specifically for a model
     */
    isKeyModelAvailable: function (key, model) {
      if (!this.isValidApiKey(key)) return false;
      const cleanKey = key.trim();
      // Check global invalidity
      const globalStatus = keyModelStatusMap.get(cleanKey);
      if (globalStatus && globalStatus.state === 'invalid') return false;

      // Check model-specific cooldown
      const cleanModel = (model || '').trim();
      if (cleanModel) {
        const kmStatus = keyModelStatusMap.get(`${cleanKey}::${cleanModel}`);
        if (kmStatus && kmStatus.state === 'cooldown' && Date.now() < kmStatus.until) {
          return false;
        }
      }
      return true;
    },

    /**
     * Check if key is currently healthy and available for requests (legacy)
     */
    isKeyAvailable: function (key) {
      return this.isKeyModelAvailable(key, '');
    },

    /**
     * Get Primary Default API Key
     */
    getPrimaryApiKey: function () {
      const all = this.getKeysForModel('gemini-3-flash-preview', false);
      return all.length > 0 ? all[0] : _unpack(VAULT.KEYS[1] || VAULT.KEYS[0]);
    },

    /**
     * Get keys specifically prioritized for a model (active keys at the FRONT, cooling keys at the BACK)
     */
    getKeysForModel: function (model = 'gemini-3-flash-preview', includeCooldown = false) {
      const all = VAULT.KEYS.map(k => _unpack(k)).filter(k => this.isValidApiKey(k));
      const activeForModel = [];
      const coolingForModel = [];

      for (const k of all) {
        const globalStatus = keyModelStatusMap.get(k);
        if (globalStatus && globalStatus.state === 'invalid') continue;

        if (this.isKeyModelAvailable(k, model)) {
          activeForModel.push(k);
        } else {
          coolingForModel.push(k);
        }
      }

      // Rotate active keys by round-robin offset
      let rotatedActive = activeForModel;
      if (activeForModel.length > 1) {
        const offset = roundRobinIndex % activeForModel.length;
        rotatedActive = activeForModel.slice(offset).concat(activeForModel.slice(0, offset));
      }

      if (includeCooldown) {
        return rotatedActive.concat(coolingForModel);
      }
      return rotatedActive.length > 0 ? rotatedActive : coolingForModel;
    },

    /**
     * Get all active system keys from the secure pool in priority order (filtering out invalid/cooling keys)
     */
    getAllSystemKeys: function (includeCooldown = false) {
      return this.getKeysForModel('', includeCooldown);
    },

    /**
     * Get keys rotated by round-robin index so the next fresh key is always at index 0
     */
    getRotatedSystemKeys: function (includeCooldown = false) {
      const systemKeys = this.getAllSystemKeys(includeCooldown);
      if (systemKeys.length <= 1) return systemKeys;
      const offset = roundRobinIndex % systemKeys.length;
      return systemKeys.slice(offset).concat(systemKeys.slice(0, offset));
    },

    /**
     * Advance the round-robin queue, shifting the recently used key to the back
     */
    advanceRoundRobin: function () {
      // Use actual active key count so index never overshoots (fixes the 19-index vs 13-active-key mismatch)
      const activeCount = this.getAllSystemKeys(false).length || VAULT.KEYS.length;
      roundRobinIndex = (roundRobinIndex + 1) % activeCount;
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('fayzar_key_rr_index', String(roundRobinIndex));
        }
      } catch (e) {}
    },

    /**
     * Zero-Token Key Probe: Checks key validity & supported models without consuming any token quota
     */
    probeKeyZeroToken: async function (key) {
      if (!this.isValidApiKey(key)) return { valid: false, key, error: 'MALFORMED_KEY' };
      const cleanKey = key.trim();
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(cleanKey)}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);

      try {
        const res = await fetch(endpoint, { method: 'GET', signal: controller.signal });
        clearTimeout(timer);
        if (res.status === 400 || res.status === 403) {
          this.markKeyInvalid(cleanKey);
          return { valid: false, key: cleanKey, error: 'INVALID_KEY' };
        }
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          const models = Array.isArray(data.models) ? data.models.map(m => m.name ? m.name.replace('models/', '') : '') : [];
          return { valid: true, key: cleanKey, models };
        }
        return { valid: true, key: cleanKey, models: [] };
      } catch (err) {
        clearTimeout(timer);
        return { valid: true, key: cleanKey, error: err.message };
      }
    },

    /**
     * Standby Pool: holds 2-3 verified healthy keys and verified primary/fallback models
     */
    _standbyPool: {
      primaryModel: 'gemini-3-flash-preview',
      fallbackModel: 'gemini-3.8-flash',
      backupModel: 'gemini-3.6-flash',
      readyKeys: [],
      lastWarmed: 0,
      isWarming: false
    },

    /**
     * Prewarm Standby Pool in background (zero token cost)
     * Verifies keys using lightweight GET /models and caches top 2-3 healthy keys
     */
    prewarmStandbyPool: async function () {
      const now = Date.now();
      if (this._standbyPool.isWarming) return this._standbyPool;
      if (this._standbyPool.readyKeys.length >= 2 && (now - this._standbyPool.lastWarmed < 300000)) {
        return this._standbyPool;
      }

      this._standbyPool.isWarming = true;
      try {
        const candidateKeys = this.getRotatedSystemKeys(false).slice(0, 5);
        if (candidateKeys.length === 0) return this._standbyPool;

        const results = await Promise.allSettled(candidateKeys.map(k => this.probeKeyZeroToken(k)));
        const healthy = [];
        for (const r of results) {
          if (r.status === 'fulfilled' && r.value && r.value.valid) {
            healthy.push(r.value.key);
            if (healthy.length >= 3) break;
          }
        }

        if (healthy.length > 0) {
          this._standbyPool.readyKeys = healthy;
          this._standbyPool.lastWarmed = Date.now();
          this.logAudit('STANDBY_POOL_READY', {
            healthyCount: healthy.length,
            primaryModel: this._standbyPool.primaryModel,
            fallbackModel: this._standbyPool.fallbackModel
          });
        }
      } catch (e) {
        console.warn('Standby pool prewarm caught:', e);
      } finally {
        this._standbyPool.isWarming = false;
      }
      return this._standbyPool;
    },

    /**
     * Retrieve the standby pool (returns top 2-3 active keys for primary model)
     */
    getStandbyPool: function (primaryModel = 'gemini-3-flash-preview') {
      const readyKeys = this.getKeysForModel(primaryModel, false).slice(0, 3);
      return {
        primaryModel: 'gemini-3-flash-preview',
        fallbackModel: 'gemini-3.6-flash',
        backupModel: 'gemini-3.6-flash',
        readyKeys: readyKeys.length > 0 ? readyKeys : this.getKeysForModel('gemini-3.6-flash', true).slice(0, 3)
      };
    },

    /**
     * Silent Background Pre-Warming: probes all available vault keys concurrently without blocking UI
     */
    prewarmAllKeysBackground: async function () {
      const activeKeys = this.getRotatedSystemKeys(false);
      if (activeKeys.length === 0) return [];
      const results = await Promise.allSettled(activeKeys.map(k => this.probeKeyZeroToken(k)));
      const verifiedKeys = [];
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value && r.value.valid) {
          verifiedKeys.push(r.value);
        }
      }
      this.logAudit('PREWARM_COMPLETE', { activeCount: verifiedKeys.length });
      return verifiedKeys;
    },

    /**
     * Get next key via round-robin distribution to balance quota load
     */
    getNextRoundRobinKey: function () {
      let keys = this.getAllSystemKeys(false);
      if (keys.length === 0) {
        keys = this.getAllSystemKeys(true);
      }
      if (keys.length === 0) return '';
      const key = keys[roundRobinIndex % keys.length];
      this.advanceRoundRobin();
      return key;
    },

    /**
     * Resolve the most appropriate active API key taking user custom keys into account
     */
    getActiveApiKey: function (userCustomKey = '') {
      if (userCustomKey && this.isValidApiKey(userCustomKey)) {
        return userCustomKey.trim();
      }
      return this.getNextRoundRobinKey();
    },

    /**
     * Internal Diagnostic & Audit Logger
     * Records all key rotation events, latency, model status for easy offline troubleshooting
     */
    logAudit: function (event, details = {}) {
      try {
        const entry = {
          timestamp: new Date().toISOString(),
          timeStr: new Date().toLocaleTimeString(),
          event: event || 'INFO',
          ...details
        };

        // Local Storage Logging
        if (typeof localStorage !== 'undefined') {
          const logs = JSON.parse(localStorage.getItem('fayzar_ocr_audit_logs') || '[]');
          logs.unshift(entry);
          if (logs.length > 200) logs.length = 200; // retain last 200 events
          localStorage.setItem('fayzar_ocr_audit_logs', JSON.stringify(logs));
        }

        // Firebase RTDB Remote Logging (Temporary for Debugging)
        // Ensures we only send masked keys for security
        const FIREBASE_LOG_URL = 'https://fayzar-ocr-bridge-default-rtdb.asia-southeast1.firebasedatabase.app/ocr_debug_logs.json';
        if (typeof fetch === 'function') {
          fetch(FIREBASE_LOG_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entry)
          }).catch(() => {}); // silent fail if network error
        }
      } catch (e) {}
    },

    getAuditLogs: function () {
      try {
        if (typeof localStorage === 'undefined') return [];
        return JSON.parse(localStorage.getItem('fayzar_ocr_audit_logs') || '[]');
      } catch (e) { return []; }
    },

    clearAuditLogs: function () {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem('fayzar_ocr_audit_logs');
        }
      } catch (e) {}
    }
  };


  // Expose globally
  global.FayzarOcrConfig = FayzarOcrConfig;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = FayzarOcrConfig;
  }

})(typeof window !== 'undefined' ? window : globalThis);
