import { NextRequest, NextResponse } from 'next/server';
import { UserVaultService } from '@/services/auth/user-vault.service';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('khdh_auth_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Chưa đăng nhập.' }, { status: 401 });
    }

    const user = await UserVaultService.verifySessionToken(token);
    if (!user) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Phiên làm việc đã hết hạn.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { apiKeys } = body;

    if (!Array.isArray(apiKeys) || apiKeys.length === 0) {
      return NextResponse.json(
        { error: 'INVALID_KEYS', message: 'Vui lòng cung cấp ít nhất 1 Google AI API Key hợp lệ.' },
        { status: 400 }
      );
    }

    const saved = UserVaultService.saveUserKeys(user.email, apiKeys);
    if (!saved) {
      return NextResponse.json(
        { error: 'SAVE_FAILED', message: 'Không thể lưu trữ API Key.' },
        { status: 500 }
      );
    }

    const updatedKeys = UserVaultService.getUserDecryptedKeys(user.email);

    return NextResponse.json({
      success: true,
      message: `Đã lưu và mã hóa an toàn ${updatedKeys.length} Google AI API Key theo tài khoản ${user.email}.`,
      keyCount: updatedKeys.length,
      hasConfiguredKeys: updatedKeys.length > 0,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: 'Lỗi máy chủ khi lưu API Key: ' + String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('khdh_auth_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const user = await UserVaultService.verifySessionToken(token);
    if (!user) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const keys = UserVaultService.getUserDecryptedKeys(user.email);
    const maskedKeys = keys.map((k) => {
      if (k.length <= 8) return '********';
      return k.substring(0, 6) + '...' + k.substring(k.length - 4);
    });

    return NextResponse.json({
      success: true,
      keyCount: keys.length,
      maskedKeys,
    });
  } catch (error) {
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
