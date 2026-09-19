import { NextRequest, NextResponse } from 'next/server';
import { UserVaultService } from '@/services/auth/user-vault.service';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('khdh_auth_token')?.value;
    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }

    const user = await UserVaultService.verifySessionToken(token);
    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }

    const decryptedKeys = UserVaultService.getUserDecryptedKeys(user.email);

    return NextResponse.json({
      authenticated: true,
      user: {
        email: user.email,
        name: user.name,
        picture: user.picture,
        role: user.role,
        hasConfiguredKeys: decryptedKeys.length > 0,
        keyCount: decryptedKeys.length,
      },
    });
  } catch (error) {
    return NextResponse.json({ authenticated: false }, { status: 200 });
  }
}
