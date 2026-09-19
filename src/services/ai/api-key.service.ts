import { ApiKeyValidationResult } from './ai.types';

const API_KEYS_SESSION_KEY = 'khdh_user_gemini_api_keys';
const API_KEYS_LOCAL_KEY = 'khdh_user_gemini_api_keys_persistent';

let rotationIndex = 0;

export class ApiKeyService {
  /**
   * Tách danh sách nhiều key từ chuỗi nhập vào (hỗ trợ xuống dòng, dấu phẩy, chấm phẩy, khoảng trắng)
   */
  public static parseKeys(rawInput: string): string[] {
    if (!rawInput || typeof rawInput !== 'string') return [];
    
    // Tách theo xuống dòng, dấu phẩy, chấm phẩy
    const rawList = rawInput.split(/[\r\n,;]+/);
    const cleanedList: string[] = [];

    for (const item of rawList) {
      const trimmed = item.trim();
      if (trimmed && trimmed.length >= 20) {
        // Chỉ thêm nếu chưa trùng lặp
        if (!cleanedList.includes(trimmed)) {
          cleanedList.push(trimmed);
        }
      }
    }

    return cleanedList;
  }

  /**
   * Kiểm tra định dạng cơ bản của 1 Google AI API Key (AIza...)
   */
  public static validateFormat(apiKey: string): ApiKeyValidationResult {
    if (!apiKey || typeof apiKey !== 'string') {
      return { isValid: false, message: 'API Key không được để trống' };
    }

    const trimmed = apiKey.trim();
    if (trimmed.length < 25) {
      return { isValid: false, message: 'Độ dài API Key quá ngắn (thường 39 ký tự)' };
    }

    if (!trimmed.startsWith('AIza')) {
      return { isValid: false, message: 'Google AI API Key chuẩn thường bắt đầu bằng "AIza"' };
    }

    return {
      isValid: true,
      message: 'Định dạng API Key hợp lệ',
      maskedKey: this.maskKey(trimmed),
    };
  }

  /**
   * Che giấu API key để hiển thị an toàn trên giao diện (••••••••abcd)
   */
  public static maskKey(apiKey: string): string {
    if (!apiKey) return '';
    const trimmed = apiKey.trim();
    if (trimmed.length <= 8) return '••••••••';
    const last4 = trimmed.slice(-4);
    return `••••••••${last4}`;
  }

  /**
   * Lưu danh sách các API Keys (Client storage)
   */
  public static saveClientKeys(keys: string[], remember = false): void {
    if (typeof window === 'undefined') return;
    const filtered = keys.map(k => k.trim()).filter(k => k.length >= 20);
    const jsonStr = JSON.stringify(filtered);

    sessionStorage.setItem(API_KEYS_SESSION_KEY, jsonStr);
    if (remember) {
      localStorage.setItem(API_KEYS_LOCAL_KEY, jsonStr);
    } else {
      localStorage.removeItem(API_KEYS_LOCAL_KEY);
    }
  }

  /**
   * Lấy toàn bộ danh sách API Keys đã lưu
   */
  public static getClientKeys(): string[] {
    if (typeof window === 'undefined') return [];
    
    // Ưu tiên session storage
    const sessionData = sessionStorage.getItem(API_KEYS_SESSION_KEY);
    if (sessionData) {
      try {
        const parsed = JSON.parse(sessionData);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        // Fallback if plain string
        if (sessionData.length > 20) return [sessionData];
      }
    }

    // Sau đó kiểm tra local storage
    const localData = localStorage.getItem(API_KEYS_LOCAL_KEY);
    if (localData) {
      try {
        const parsed = JSON.parse(localData);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        if (localData.length > 20) return [localData];
      }
    }

    return [];
  }

  /**
   * Lấy key tiếp theo theo cơ chế Round-Robin (Luân phiên)
   */
  public static getNextKey(): string {
    const keys = this.getClientKeys();
    if (keys.length === 0) return '';
    if (keys.length === 1) return keys[0];

    rotationIndex = (rotationIndex + 1) % keys.length;
    return keys[rotationIndex];
  }

  /**
   * Lấy API Key đầu tiên hoặc luân phiên
   */
  public static getClientKey(): string {
    const keys = this.getClientKeys();
    return keys.length > 0 ? keys[0] : '';
  }

  /**
   * Xoá toàn bộ API Keys khỏi Client storage
   */
  public static clearClientKeys(): void {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(API_KEYS_SESSION_KEY);
    localStorage.removeItem(API_KEYS_LOCAL_KEY);
    rotationIndex = 0;
  }
}

