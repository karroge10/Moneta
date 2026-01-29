import { randomUUID } from 'crypto';
import { auth } from '@clerk/nextjs/server';
import { db } from './db';

function generateRandomUsername(): string {
  return `user_${randomUUID().slice(0, 8)}`;
}

/**
 * Get or create a user in the database based on Clerk authentication
 * Returns the database user record, or null if not authenticated
 */
export async function getCurrentUser() {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    return null;
  }

  // Find or create user in database
  let user = await db.user.findUnique({
    where: { clerkUserId },
  });

  if (!user) {
    let userName = generateRandomUsername();
    const maxAttempts = 5;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        user = await db.user.create({
          data: {
            clerkUserId,
            userName,
            plan: 'basic',
          },
        });
        break;
      } catch (err) {
        const isUniqueViolation =
          err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'P2002';
        if (isUniqueViolation && attempt < maxAttempts - 1) {
          userName = generateRandomUsername();
        } else {
          throw err;
        }
      }
    }
  }

  return user;
}

/**
 * Get the current user's ID from Clerk and database
 * Throws an error if user is not authenticated
 */
export async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('Unauthorized: User not authenticated');
  }

  return user;
}

/**
 * Get the current user with language relation included
 * Throws an error if user is not authenticated
 * Use this when you need the user's language preference to avoid extra queries
 */
export async function requireCurrentUserWithLanguage() {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    throw new Error('Unauthorized: User not authenticated');
  }

  // Find or create user in database with language relation
  let user = await db.user.findUnique({
    where: { clerkUserId },
    include: { language: true },
  });

  if (!user) {
    let userName = generateRandomUsername();
    const maxAttempts = 5;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        user = await db.user.create({
          data: {
            clerkUserId,
            userName,
            plan: 'basic',
          },
          include: { language: true },
        });
        break;
      } catch (err) {
        const isUniqueViolation =
          err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'P2002';
        if (isUniqueViolation && attempt < maxAttempts - 1) {
          userName = generateRandomUsername();
        } else {
          throw err;
        }
      }
    }
    if (!user) {
      throw new Error('Unauthorized: Failed to create user');
    }
  }

  return user;
}


