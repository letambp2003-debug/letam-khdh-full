import { NextRequest } from 'next/server';
import { UserVaultService } from '@/services/auth/user-vault.service';

/**
 * Utility helper to ensure complete, watertight isolation between teacher accounts.
 * Every user has their own private workspace (User Project ID) based on their Google Email.
 */
export function getUserProjectId(email?: string | null): string {
  if (!email || !email.includes('@')) {
    return 'usr_guest';
  }
  const cleanEmail = email.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
  return `usr_${cleanEmail}`;
}

/**
 * Resolves the authenticated user's workspace project ID from the request.
 * Priority:
 * 1. Verified JWT session cookie (`khdh_auth_token`)
 * 2. `x-user-email` request header
 * 3. Client provided `projectId` (if it follows `usr_` namespace)
 * 4. Fallback to `usr_guest`
 */
export async function resolveUserProjectIdFromRequest(
  request: NextRequest,
  clientProjectId?: string | null
): Promise<string> {
  try {
    // 1. Check verified session token from cookie
    const token = request.cookies.get('khdh_auth_token')?.value;
    if (token) {
      const user = await UserVaultService.verifySessionToken(token);
      if (user && user.email) {
        return getUserProjectId(user.email);
      }
    }

    // 2. Check header
    const headerEmail = request.headers.get('x-user-email');
    if (headerEmail && headerEmail.includes('@')) {
      return getUserProjectId(headerEmail);
    }

    // 3. Check client provided project id
    if (clientProjectId && clientProjectId.startsWith('usr_') && clientProjectId !== 'usr_guest') {
      return clientProjectId.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    }
  } catch (err) {
    console.warn('Error resolving user project ID from request:', err);
  }

  return 'usr_guest';
}
