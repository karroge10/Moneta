import { timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';

/** Thrown by requireCurrentUser* when there is no signed-in user. */
export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Maps a caught error to a response: UnauthorizedError becomes 401, anything else is logged
 * and returned as a generic 500 so internal messages and stacks never reach the client.
 */
export function errorResponse(error: unknown, logLabel: string, fallbackMessage = 'Internal server error') {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  console.error(logLabel, error);
  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}

/**
 * Checks the x-internal-secret header against INTERNAL_API_SECRET.
 * Fails closed: an unset secret rejects every request.
 */
export function verifyInternalSecret(request: Request): boolean {
  const providedSecret = request.headers.get('x-internal-secret');
  return secretsMatch(providedSecret, process.env.INTERNAL_API_SECRET);
}

/**
 * Constant-time comparison of a provided secret with the expected one.
 * Returns false when either side is missing or empty.
 */
export function secretsMatch(provided: string | null | undefined, expected: string | undefined): boolean {
  if (!provided || !expected) return false;
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  if (providedBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(providedBuffer, expectedBuffer);
}
