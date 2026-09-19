import { NextRequest, NextResponse } from 'next/server';
import { UserVaultService } from '@/services/auth/user-vault.service';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error || !code) {
    console.error('Google OAuth callback error:', error || 'No authorization code provided');
    return NextResponse.redirect(new URL(`/?auth_error=${encodeURIComponent(error || 'NO_CODE')}`, url.origin));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId) {
    return NextResponse.redirect(new URL('/?auth_error=MISSING_CLIENT_ID', url.origin));
  }

  try {
    const redirectUri = `${url.origin}/api/auth/google/callback`;

    // 1. Trao đổi Authorization Code lấy Access Token & ID Token
    const tokenParams = new URLSearchParams({
      code,
      client_id: clientId,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });

    if (clientSecret) {
      tokenParams.set('client_secret', clientSecret);
    }

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams.toString(),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('Failed to exchange code for token:', tokenData);
      return NextResponse.redirect(new URL('/?auth_error=TOKEN_EXCHANGE_FAILED', url.origin));
    }

    // 2. Lấy thông tin tài khoản Google của Giáo viên
    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const googleUser = await userRes.json();

    if (!userRes.ok || !googleUser.email) {
      console.error('Failed to fetch user profile:', googleUser);
      return NextResponse.redirect(new URL('/?auth_error=USERINFO_FETCH_FAILED', url.origin));
    }

    // 3. Khởi tạo hoặc cập nhật hồ sơ người dùng trong hệ thống
    const { user } = UserVaultService.findOrCreateGoogleUser({
      googleId: googleUser.sub || `google_${Date.now()}`,
      email: googleUser.email.trim().toLowerCase(),
      name: googleUser.name || googleUser.email.split('@')[0],
      picture: googleUser.picture || '',
    });

    const sessionToken = await UserVaultService.createSessionToken(user);

    // 4. Tạo response chuyển hướng về trang chủ và gắn HttpOnly session cookie
    const response = NextResponse.redirect(new URL('/?auth_success=1', url.origin));

    response.cookies.set({
      name: 'khdh_auth_token',
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 ngày
    });

    return response;
  } catch (err) {
    console.error('Unexpected error in Google OAuth callback:', err);
    return NextResponse.redirect(new URL('/?auth_error=SERVER_ERROR', url.origin));
  }
}
