import { NextResponse } from 'next/server';

const rateLimit = new Map<string, { count: number, resetTime: number }>();

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();
    
    // Check rate limit (ví dụ: 5 request / phút)
    const limitInfo = rateLimit.get(ip) || { count: 0, resetTime: now + 60000 };
    if (now > limitInfo.resetTime) {
      limitInfo.count = 0;
      limitInfo.resetTime = now + 60000;
    }
    
    if (limitInfo.count >= 5) {
      return NextResponse.json({ error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.' }, { status: 429 });
    }
    
    limitInfo.count++;
    rateLimit.set(ip, limitInfo);

    const body = await request.json();
    const { password } = body;

    // Giả lập verify password (thực tế cần dùng bcrypt)
    const MOCK_STORED_HASH = process.env.ADMIN_PASSWORD_HASH || 'password123';
    
    if (password !== MOCK_STORED_HASH) {
      return NextResponse.json({ error: 'Mật khẩu không chính xác' }, { status: 401 });
    }

    // Giả lập tạo JWT
    const token = `mock_jwt_token_${Date.now()}`;
    const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    return NextResponse.json({
      token,
      expires_at
    });
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi server nội bộ' }, { status: 500 });
  }
}
