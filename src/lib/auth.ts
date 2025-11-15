import { auth } from '@clerk/nextjs/server';
import { db } from './db';

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
    // Create new user if doesn't exist
    user = await db.user.create({
      data: {
        clerkUserId,
        plan: 'basic',
      },
    });
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
    // Create new user if doesn't exist
    user = await db.user.create({
      data: {
        clerkUserId,
        plan: 'basic',
      },
      include: { language: true },
    });
  }

  return user;
}


