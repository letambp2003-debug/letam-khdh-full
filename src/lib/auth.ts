import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { getEnv } from './env';

export async function verifyPassword(password: string): Promise<boolean> {
  const env = getEnv();
  if (!env.AUTH_PASSWORD_HASH) {
    console.error("AUTH_PASSWORD_HASH chưa được thiết lập trong biến môi trường");
    return false;
  }
  return await bcrypt.compare(password, env.AUTH_PASSWORD_HASH);
}

export async function createToken(payload: any): Promise<string> {
  const env = getEnv();
  const secret = new TextEncoder().encode(env.AUTH_SECRET);
  
  // Gộp payload gốc vào với thông tin token chuẩn
  return new SignJWT({ ...payload, name: env.TEACHER_NAME })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('teacher')
    .setIssuedAt()
    .setExpirationTime(`${env.SESSION_MAX_AGE_HOURS}h`)
    .sign(secret);
}

export async function verifyToken(token: string): Promise<any> {
  const env = getEnv();
  const secret = new TextEncoder().encode(env.AUTH_SECRET);
  
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    return null;
  }
}
