import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { SignJWT, jwtVerify } from 'jose';
import { getEnv } from '@/config/env';

export interface UserProfile {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
  role: 'TEACHER' | 'ADMIN';
  encryptedKeys?: string;
  keyCount?: number;
  createdAt: string;
  lastLoginAt: string;
}

export class UserVaultService {
  // In-memory runtime cache for serverless functions
  private static memoryStore = new Map<string, UserProfile>();

  private static getStorageDir(): string {
    // Prefer OS temp dir which is always writable in serverless environments (e.g. /tmp)
    try {
      const tmpDir = path.join(os.tmpdir(), 'khdh-users');
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
      return tmpDir;
    } catch {
      return '';
    }
  }

  private static getEncryptionKey(): Buffer {
    const env = getEnv();
    const secret = env.AUTH_SECRET || 'khdh-auto-default-secret-key-32-chars-minimum';
    return crypto.createHash('sha256').update(secret).digest();
  }

  public static encrypt(text: string): string {
    const key = this.getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  public static decrypt(cipherText: string): string {
    try {
      const key = this.getEncryptionKey();
      const parts = cipherText.split(':');
      if (parts.length !== 2) return '';
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch {
      return '';
    }
  }

  private static getUserFilePath(email: string): string {
    const dir = this.getStorageDir();
    if (!dir) return '';
    const safeEmail = email.toLowerCase().trim().replace(/[^a-z0-9@._-]/g, '_');
    return path.join(dir, `${safeEmail}.json`);
  }

  public static getUserByEmail(email: string): UserProfile | null {
    const normalized = email.toLowerCase().trim();
    if (this.memoryStore.has(normalized)) {
      return this.memoryStore.get(normalized)!;
    }

    try {
      const filePath = this.getUserFilePath(normalized);
      if (filePath && fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf8');
        const user = JSON.parse(raw);
        this.memoryStore.set(normalized, user);
        return user;
      }
    } catch {
      // Fallback silently to memory
    }
    return null;
  }

  public static saveUser(user: UserProfile): void {
    const normalized = user.email.toLowerCase().trim();
    this.memoryStore.set(normalized, user);

    try {
      const filePath = this.getUserFilePath(normalized);
      if (filePath) {
        fs.writeFileSync(filePath, JSON.stringify(user, null, 2), 'utf8');
      }
    } catch {
      // Silent in read-only environments; memoryStore + JWT token handles persistence perfectly
    }
  }

  public static findOrCreateGoogleUser(profile: {
    googleId: string;
    email: string;
    name: string;
    picture?: string;
  }): { user: UserProfile; isFirstTime: boolean } {
    const normalizedEmail = profile.email.toLowerCase().trim();
    const existing = this.getUserByEmail(normalizedEmail);
    const now = new Date().toISOString();

    if (existing) {
      existing.lastLoginAt = now;
      if (profile.name && profile.name.trim()) existing.name = profile.name.trim();
      if (profile.picture) existing.picture = profile.picture;
      if (profile.googleId) existing.googleId = profile.googleId;
      this.saveUser(existing);
      const keys = this.getUserDecryptedKeys(existing.email);
      return {
        user: { ...existing, keyCount: keys.length },
        isFirstTime: keys.length === 0,
      };
    }

    const newUser: UserProfile = {
      googleId: profile.googleId,
      email: normalizedEmail,
      name: (profile.name && profile.name.trim()) ? profile.name.trim() : normalizedEmail.split('@')[0],
      picture: profile.picture || '',
      role: 'TEACHER',
      encryptedKeys: '',
      keyCount: 0,
      createdAt: now,
      lastLoginAt: now,
    };

    this.saveUser(newUser);
    return { user: newUser, isFirstTime: true };
  }

  public static saveUserKeys(email: string, keys: string[]): boolean {
    const normalized = email.toLowerCase().trim();
    let user = this.getUserByEmail(normalized);
    if (!user) {
      user = {
        googleId: `user_${Date.now()}`,
        email: normalized,
        name: normalized.split('@')[0],
        role: 'TEACHER',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };
    }

    const cleanKeys = Array.from(
      new Set(
        keys
          .map((k) => k.trim())
          .filter((k) => k.length > 10 && !k.includes('...') && !k.includes('***'))
      )
    );

    if (cleanKeys.length === 0) {
      user.encryptedKeys = '';
      user.keyCount = 0;
    } else {
      user.encryptedKeys = this.encrypt(JSON.stringify(cleanKeys));
      user.keyCount = cleanKeys.length;
    }

    this.saveUser(user);
    return true;
  }

  public static getUserDecryptedKeys(emailOrUser: string | UserProfile): string[] {
    let encryptedKeys = '';
    if (typeof emailOrUser === 'string') {
      const user = this.getUserByEmail(emailOrUser);
      encryptedKeys = user?.encryptedKeys || '';
    } else {
      encryptedKeys = emailOrUser.encryptedKeys || '';
    }

    if (!encryptedKeys) return [];

    const decrypted = this.decrypt(encryptedKeys);
    if (!decrypted) return [];

    try {
      const parsed = JSON.parse(decrypted);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /**
   * Tạo JWT Token tự chứa (Self-contained JWT Vault) mang theo toàn bộ encryptedKeys an toàn
   */
  public static async createSessionToken(user: UserProfile): Promise<string> {
    const env = getEnv();
    const secret = new TextEncoder().encode(env.AUTH_SECRET);
    return new SignJWT({
      email: user.email,
      name: user.name,
      picture: user.picture,
      googleId: user.googleId,
      role: user.role,
      ek: user.encryptedKeys || '',
      kc: user.keyCount || 0,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(user.email)
      .setIssuedAt()
      .setExpirationTime(`${env.SESSION_MAX_AGE_HOURS * 7}h`)
      .sign(secret);
  }

  public static async verifySessionToken(token: string): Promise<UserProfile | null> {
    try {
      const env = getEnv();
      const secret = new TextEncoder().encode(env.AUTH_SECRET);
      const { payload } = await jwtVerify(token, secret);
      const email = payload.email as string;
      if (!email) return null;

      // Extract user from token payload directly
      const tokenUser: UserProfile = {
        email,
        name: (payload.name as string) || email.split('@')[0],
        picture: (payload.picture as string) || '',
        googleId: (payload.googleId as string) || '',
        role: ((payload.role as string) as 'TEACHER' | 'ADMIN') || 'TEACHER',
        encryptedKeys: (payload.ek as string) || '',
        keyCount: typeof payload.kc === 'number' ? payload.kc : 0,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };

      // Check if local memory/file has a newer version
      const existing = this.getUserByEmail(email);
      if (existing) {
        // Merge in case keys were updated in session
        if (tokenUser.encryptedKeys && !existing.encryptedKeys) {
          existing.encryptedKeys = tokenUser.encryptedKeys;
          existing.keyCount = tokenUser.keyCount;
        }
        return existing;
      }

      this.memoryStore.set(email.toLowerCase().trim(), tokenUser);
      return tokenUser;
    } catch {
      return null;
    }
  }

  public static async verifyGoogleIdToken(idToken: string): Promise<{
    success: boolean;
    profile?: { googleId: string; email: string; name: string; picture?: string };
    error?: string;
  }> {
    try {
      const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
      if (!res.ok) {
        return { success: false, error: 'Google ID token không hợp lệ hoặc đã hết hạn.' };
      }
      const data = await res.json();
      if (!data.email) {
        return { success: false, error: 'Không tìm thấy địa chỉ email trong Google token.' };
      }
      return {
        success: true,
        profile: {
          googleId: data.sub || data.user_id || '',
          email: data.email,
          name: data.name || data.email.split('@')[0],
          picture: data.picture || '',
        },
      };
    } catch (err) {
      return { success: false, error: 'Không thể kết nối đến Google OAuth API: ' + String(err) };
    }
  }
}
