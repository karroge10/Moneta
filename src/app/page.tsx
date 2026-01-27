import LandingPage from '@/components/LandingPage';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export default async function Home() {
  // Fetch user plan server-side to avoid client-side delay
  let userPlan: string | null = null;
  
  try {
    const user = await getCurrentUser();
    if (user) {
      const userWithPlan = await db.user.findUnique({
        where: { id: user.id },
        select: { plan: true },
      });
      userPlan = userWithPlan?.plan || null;
    }
  } catch (error) {
    // User not authenticated or error fetching - that's fine
    userPlan = null;
  }

  return <LandingPage initialUserPlan={userPlan} />;
}
