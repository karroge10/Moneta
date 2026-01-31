import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { calculateGoalProgress } from '@/lib/goalUtils';
import { Goal } from '@/types/dashboard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Format date to match frontend format (e.g., "Dec 25th 2024")
function formatDate(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  
  // Add ordinal suffix
  const suffix = day === 1 || day === 21 || day === 31 ? 'st' :
                 day === 2 || day === 22 ? 'nd' :
                 day === 3 || day === 23 ? 'rd' : 'th';
  
  return `${month} ${day}${suffix} ${year}`;
}

// Parse date from display format ("Dec 25th 2024") or ISO string
function parseDate(dateStr: string): Date {
  if (dateStr.includes('st') || dateStr.includes('nd') || dateStr.includes('rd') || dateStr.includes('th')) {
    // Parse custom format
    const months: Record<string, number> = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11,
    };
    const parts = dateStr.split(' ');
    const month = months[parts[0]];
    const day = parseInt(parts[1].replace(/\D/g, ''));
    const year = parseInt(parts[2]);
    return new Date(year, month, day);
  } else {
    // Parse ISO string (YYYY-MM-DD)
    return new Date(dateStr);
  }
}

// GET - Fetch all goals for authenticated user
export async function GET(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    
    const goals = await db.goal.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    const formattedGoals: Goal[] = goals.map(goal => ({
      id: goal.id.toString(),
      name: goal.name,
      targetDate: formatDate(goal.targetDate),
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      progress: calculateGoalProgress(goal.currentAmount, goal.targetAmount),
      currencyId: goal.currencyId ?? undefined,
      createdAt: goal.createdAt.toISOString(),
      updatedAt: goal.updatedAt.toISOString(),
    }));
    
    return NextResponse.json({ goals: formattedGoals });
  } catch (error) {
    console.error('Error fetching goals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch goals' },
      { status: 500 }
    );
  }
}

// POST - Create a new goal
export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const body = await request.json();
    
    const { name, targetDate, targetAmount, currentAmount, currencyId } = body;
    
    if (!name || !targetDate || targetAmount === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: name, targetDate, targetAmount' },
        { status: 400 }
      );
    }
    
    if (targetAmount <= 0) {
      return NextResponse.json(
        { error: 'Target amount must be greater than 0' },
        { status: 400 }
      );
    }
    
    const initialCurrentAmount = currentAmount ?? 0;
    if (initialCurrentAmount < 0) {
      return NextResponse.json(
        { error: 'Current amount cannot be negative' },
        { status: 400 }
      );
    }
    
    // Parse date
    let parsedDate: Date;
    try {
      parsedDate = parseDate(targetDate);
      if (isNaN(parsedDate.getTime())) {
        throw new Error('Invalid date');
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }
    
    const newGoal = await db.goal.create({
      data: {
        userId: user.id,
        name,
        targetDate: parsedDate,
        targetAmount,
        currentAmount: initialCurrentAmount,
        currencyId: currencyId ?? null,
      },
    });
    
    const goal: Goal = {
      id: newGoal.id.toString(),
      name: newGoal.name,
      targetDate: formatDate(newGoal.targetDate),
      targetAmount: newGoal.targetAmount,
      currentAmount: newGoal.currentAmount,
      progress: calculateGoalProgress(newGoal.currentAmount, newGoal.targetAmount),
      currencyId: newGoal.currencyId ?? undefined,
    };
    
    return NextResponse.json({ goal }, { status: 201 });
  } catch (error) {
    console.error('Error creating goal:', error);
    return NextResponse.json(
      { error: 'Failed to create goal' },
      { status: 500 }
    );
  }
}

// PUT - Update an existing goal
export async function PUT(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const body = await request.json();
    
    const { id, name, targetDate, targetAmount, currentAmount, currencyId } = body;
    
    if (!id || !name || !targetDate || targetAmount === undefined || currentAmount === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: id, name, targetDate, targetAmount, currentAmount' },
        { status: 400 }
      );
    }
    
    if (targetAmount <= 0) {
      return NextResponse.json(
        { error: 'Target amount must be greater than 0' },
        { status: 400 }
      );
    }
    
    if (currentAmount < 0) {
      return NextResponse.json(
        { error: 'Current amount cannot be negative' },
        { status: 400 }
      );
    }
    
    // Verify goal belongs to user
    const existingGoal = await db.goal.findFirst({
      where: {
        id: parseInt(id),
        userId: user.id,
      },
    });
    
    if (!existingGoal) {
      return NextResponse.json(
        { error: 'Goal not found' },
        { status: 404 }
      );
    }
    
    // Parse date
    let parsedDate: Date;
    try {
      parsedDate = parseDate(targetDate);
      if (isNaN(parsedDate.getTime())) {
        throw new Error('Invalid date');
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }
    
    const updatedGoal = await db.goal.update({
      where: {
        id: parseInt(id),
      },
      data: {
        name,
        targetDate: parsedDate,
        targetAmount,
        currentAmount,
        currencyId: currencyId ?? null,
      },
    });
    
    const goal: Goal = {
      id: updatedGoal.id.toString(),
      name: updatedGoal.name,
      targetDate: formatDate(updatedGoal.targetDate),
      targetAmount: updatedGoal.targetAmount,
      currentAmount: updatedGoal.currentAmount,
      progress: calculateGoalProgress(updatedGoal.currentAmount, updatedGoal.targetAmount),
      currencyId: updatedGoal.currencyId ?? undefined,
    };
    
    return NextResponse.json({ goal });
  } catch (error) {
    console.error('Error updating goal:', error);
    return NextResponse.json(
      { error: 'Failed to update goal' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a goal
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Missing goal id' },
        { status: 400 }
      );
    }
    
    // Verify goal belongs to user
    const existingGoal = await db.goal.findFirst({
      where: {
        id: parseInt(id),
        userId: user.id,
      },
    });
    
    if (!existingGoal) {
      return NextResponse.json(
        { error: 'Goal not found' },
        { status: 404 }
      );
    }
    
    // Delete goal
    await db.goal.delete({
      where: {
        id: parseInt(id),
      },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting goal:', error);
    return NextResponse.json(
      { error: 'Failed to delete goal' },
      { status: 500 }
    );
  }
}

