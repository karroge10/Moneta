import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { errorResponse } from '@/lib/api-errors';
import { db } from '@/lib/db';
import { calculateGoalProgress } from '@/lib/goalUtils';
import { moneyToNumber, parseMoney, type MoneyValue } from '@/lib/money';
import { Goal } from '@/types/dashboard';
import { formatDisplayDate, parseDisplayDate } from '@/lib/transaction-utils';
import { goalCreateSchema, goalUpdateSchema, parseJsonBody } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


export async function GET(_request: NextRequest) {
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
      targetDate: formatDisplayDate(goal.targetDate),
      ...goalAmountsForResponse(goal),
      currencyId: goal.currencyId ?? undefined,
      createdAt: goal.createdAt.toISOString(),
      updatedAt: goal.updatedAt.toISOString(),
    }));
    
    return NextResponse.json({ goals: formattedGoals });
  } catch (error) {
    return errorResponse(error, 'Error fetching goals', 'Failed to fetch goals');
  }
}


export async function POST(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const parsed = await parseJsonBody(request, goalCreateSchema);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;

    const { name, targetDate, currencyId } = body;
    const targetAmount = parseMoney(body.targetAmount)!;
    const initialCurrentAmount = parseMoney(body.currentAmount ?? 0)!;
    
    if (targetAmount.lte(0)) {
      return NextResponse.json(
        { error: 'Target amount must be greater than 0' },
        { status: 400 }
      );
    }
    
    if (initialCurrentAmount.lt(0)) {
      return NextResponse.json(
        { error: 'Current amount cannot be negative' },
        { status: 400 }
      );
    }
    
    
    const parsedDate = parseDisplayDate(targetDate)!;
    
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
      targetDate: formatDisplayDate(newGoal.targetDate),
      ...goalAmountsForResponse(newGoal),
      currencyId: newGoal.currencyId ?? undefined,
    };
    
    return NextResponse.json({ goal }, { status: 201 });
  } catch (error) {
    return errorResponse(error, 'Error creating goal', 'Failed to create goal');
  }
}


export async function PUT(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const parsed = await parseJsonBody(request, goalUpdateSchema);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;

    const { id, name, targetDate, currencyId } = body;
    const targetAmount = parseMoney(body.targetAmount)!;
    const currentAmount = parseMoney(body.currentAmount)!;
    
    if (targetAmount.lte(0)) {
      return NextResponse.json(
        { error: 'Target amount must be greater than 0' },
        { status: 400 }
      );
    }
    
    if (currentAmount.lt(0)) {
      return NextResponse.json(
        { error: 'Current amount cannot be negative' },
        { status: 400 }
      );
    }
    
    
    const existingGoal = await db.goal.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });
    
    if (!existingGoal) {
      return NextResponse.json(
        { error: 'Goal not found' },
        { status: 404 }
      );
    }
    
    
    const parsedDate = parseDisplayDate(targetDate)!;
    
    const updatedGoal = await db.goal.update({
      where: {
        id,
        userId: user.id,
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
      targetDate: formatDisplayDate(updatedGoal.targetDate),
      ...goalAmountsForResponse(updatedGoal),
      currencyId: updatedGoal.currencyId ?? undefined,
    };
    
    return NextResponse.json({ goal });
  } catch (error) {
    return errorResponse(error, 'Error updating goal', 'Failed to update goal');
  }
}


export async function DELETE(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));
    
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        { error: 'Missing or invalid goal id' },
        { status: 400 }
      );
    }
    
    
    const existingGoal = await db.goal.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });
    
    if (!existingGoal) {
      return NextResponse.json(
        { error: 'Goal not found' },
        { status: 404 }
      );
    }
    
    
    await db.goal.delete({
      where: {
        id,
        userId: user.id,
      },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error, 'Error deleting goal', 'Failed to delete goal');
  }
}


function goalAmountsForResponse(goal: { targetAmount: MoneyValue; currentAmount: MoneyValue }) {
  const targetAmount = moneyToNumber(goal.targetAmount);
  const currentAmount = moneyToNumber(goal.currentAmount);
  return {
    targetAmount,
    currentAmount,
    progress: calculateGoalProgress(currentAmount, targetAmount),
  };
}
