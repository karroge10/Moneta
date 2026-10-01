import { NextRequest, NextResponse } from 'next/server';
import { UploadedTransaction, TransactionUploadMetadata } from '@/types/dashboard';
import { requireCurrentUser } from '@/lib/auth';
import { errorResponse } from '@/lib/api-errors';
import { db } from '@/lib/db';
import { moneyToNumber } from '@/lib/money';
import { toDateKey } from '@/lib/dates';
import { Prisma, TransactionType } from '@prisma/client';
import { shouldCreateNotification } from '@/lib/notification-settings';
import { normalizeMerchantName, extractMerchantFromDescription, fuzzyMatch, findMerchantByBaseWords, detectSpecialTransactionType } from '@/lib/merchant';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  console.log('\n\n' + '='.repeat(80));
  console.log('[TRANSACTION IMPORT] Starting import process...');
  console.log('='.repeat(80) + '\n');
  
  try {
    const user = await requireCurrentUser();
    const body = await request.json();
    const transactions = body?.transactions as UploadedTransaction[];
    const metadata = body?.metadata as TransactionUploadMetadata | undefined;
    const statementCurrencyIdInput = body?.statementCurrencyId;
    const merchantsToLearn = body?.merchantsToLearn as Array<{ description: string; categoryId: number }> | undefined;

    console.log(`[TRANSACTION IMPORT] Received ${transactions?.length || 0} transactions to import\n`);

    if (!Array.isArray(transactions)) {
      console.error('[TRANSACTION IMPORT] ERROR: transactions is not an array');
      return NextResponse.json(
        { error: 'transactions must be an array' },
        { status: 400 },
      );
    }

    let resolvedCurrency: { id: number; alias: string; symbol: string } | null = null;
    let requestedCurrencyId: number | null = null;
    if (typeof statementCurrencyIdInput === 'number') {
      requestedCurrencyId = statementCurrencyIdInput;
    } else if (typeof statementCurrencyIdInput === 'string' && statementCurrencyIdInput.trim() !== '') {
      const parsed = Number.parseInt(statementCurrencyIdInput, 10);
      if (!Number.isNaN(parsed)) {
        requestedCurrencyId = parsed;
      }
    }

    if (requestedCurrencyId) {
      const currencyRecord = await db.currency.findUnique({
        where: { id: requestedCurrencyId },
        select: { id: true, alias: true, symbol: true },
      });
      if (currencyRecord) {
        resolvedCurrency = currencyRecord;
      }
    }

    if (!resolvedCurrency && metadata?.currency) {
      const currencyRecord = await db.currency.findFirst({
        where: {
          alias: metadata.currency.toUpperCase(),
        },
        select: { id: true, alias: true, symbol: true },
      });
      if (currencyRecord) {
        resolvedCurrency = currencyRecord;
      }
    }

    if (!resolvedCurrency && user.currencyId) {
      const userCurrencyRecord = await db.currency.findUnique({
        where: { id: user.currencyId },
        select: { id: true, alias: true, symbol: true },
      });
      if (userCurrencyRecord) {
        resolvedCurrency = userCurrencyRecord;
      }
    }

    if (!resolvedCurrency) {
      const defaultCurrency = await db.currency.findFirst({
        select: { id: true, alias: true, symbol: true },
      });
      if (!defaultCurrency) {
        return NextResponse.json(
          { error: 'No currency configured. Please set up currencies first.' },
          { status: 500 },
        );
      }
      resolvedCurrency = defaultCurrency;
    }

    const currencyId = resolvedCurrency.id;

    
    const allCategories = await db.category.findMany();
    const categoryMap = new Map<string, number>();
    allCategories.forEach((cat: { name: string; id: number }) => {
      categoryMap.set(cat.name.toLowerCase(), cat.id);
    });

    
    const globalMerchants = await db.merchantGlobal.findMany();
    const globalMerchantMap = new Map<string, number>();
    const globalMerchantPatterns: string[] = [];
    globalMerchants.forEach((merchant: { namePattern: string; categoryId: number }) => {
      
      const normalizedPattern = normalizeMerchantName(merchant.namePattern);
      globalMerchantMap.set(normalizedPattern, merchant.categoryId);
      
      globalMerchantPatterns.push(merchant.namePattern);
    });
    console.log(`[merchant-setup] Loaded ${globalMerchants.length} global merchants`);

    
    const userMerchants = await db.merchant.findMany({
      where: { userId: user.id },
      include: { category: true },
    });
    const userMerchantMap = new Map<string, number>();
    const userMerchantPatterns: string[] = [];
    userMerchants.forEach((merchant: { namePattern: string; categoryId: number }) => {
      
      const normalizedPattern = normalizeMerchantName(merchant.namePattern);
      userMerchantMap.set(normalizedPattern, merchant.categoryId);
      
      userMerchantPatterns.push(merchant.namePattern);
    });
    console.log(`[merchant-setup] Loaded ${userMerchants.length} user merchants`);

    
    const categoryNameMapping: Record<string, string> = {
      'transportation': 'transportation', 
      'transport': 'transportation', 
      'utilities': 'other', 
    };

    console.log(`[merchant-import] Processing ${transactions.length} transactions`);
    
    
    let matchedCount = 0;
    let unmatchedCount = 0;
    
    const transactionsToCreate = transactions
      .map((item: UploadedTransaction) => {
        const amount = Number(item.amount) || 0;
        const date = new Date(item.date);
        
        
        const type: TransactionType = amount >= 0 ? 'income' : 'expense';
        const absoluteAmount = Math.abs(amount);

        
        let categoryId = null;
        
        
        
        const descriptionForMatching = item.translatedDescription || item.description;
        const specialType = detectSpecialTransactionType(descriptionForMatching);
        
        
        
        
        
        
        
        if (item.category !== undefined && item.category !== null && item.category !== '') {
          let categoryName = item.category.toLowerCase();
          
          
          if (categoryNameMapping[categoryName]) {
            categoryName = categoryNameMapping[categoryName];
          }
          
          categoryId = categoryMap.get(categoryName) ?? null;
          if (categoryId) {
          } else {
            
          }
        } else if (item.category === null || item.category === '') {
          
          console.log(`[merchant-match] ⊘ User cleared category, saving as uncategorized`);
        }
        
        
        const merchantName = extractMerchantFromDescription(descriptionForMatching);
        const normalizedMerchant = normalizeMerchantName(merchantName);
        
        
        
        
        
        if (type === 'income' && !categoryId) {
          
        }
        
        else if (!categoryId) {
          let skipMerchantMatching = false;
          
          if (specialType && specialType !== 'EXCLUDE') {
            
            
            const specialCategoryId = categoryMap.get(specialType.toLowerCase());
            if (specialCategoryId) {
              categoryId = specialCategoryId;
              skipMerchantMatching = true; 
            }
          }
          
          
          const allUserPatterns = userMerchantPatterns;
          const allGlobalPatterns = globalMerchantPatterns;
          
          
          if (!skipMerchantMatching) {
          
          if (userMerchantMap.has(normalizedMerchant)) {
            categoryId = userMerchantMap.get(normalizedMerchant) ?? null;
          } else {
            
            
            const foundMerchant = findMerchantByBaseWords(descriptionForMatching, allUserPatterns);
            if (foundMerchant) {
              const foundNormalized = normalizeMerchantName(foundMerchant);
              if (userMerchantMap.has(foundNormalized)) {
                categoryId = userMerchantMap.get(foundNormalized) ?? null;
             }
           }
            
            
            if (!categoryId) {
              let bestMatch: { pattern: string; catId: number; similarity: number } | null = null;
              for (const [pattern, catId] of userMerchantMap.entries()) {
                const similarity = fuzzyMatch(normalizedMerchant, pattern);
                
                const descSimilarity = fuzzyMatch(descriptionForMatching.toLowerCase(), pattern);
                const maxSimilarity = Math.max(similarity, descSimilarity);
              const threshold = 0.85;
              if (maxSimilarity >= threshold) {
                if (!bestMatch || maxSimilarity > bestMatch.similarity) {
                  bestMatch = { pattern, catId, similarity: maxSimilarity };
                }
              }
              }
              if (bestMatch) {
                categoryId = bestMatch.catId;
             }
            }
          }
        }
        
        
        if (!skipMerchantMatching && !categoryId) {
          
          if (globalMerchantMap.has(normalizedMerchant)) {
            categoryId = globalMerchantMap.get(normalizedMerchant) ?? null;
          } else {
            
            
            const foundMerchant = findMerchantByBaseWords(descriptionForMatching, allGlobalPatterns);
            if (foundMerchant) {
              const foundNormalized = normalizeMerchantName(foundMerchant);
              if (globalMerchantMap.has(foundNormalized)) {
                categoryId = globalMerchantMap.get(foundNormalized) ?? null;
             }
           }
            
            
            if (!categoryId) {
              let bestMatch: { pattern: string; catId: number; similarity: number } | null = null;

              for (const [pattern, catId] of globalMerchantMap.entries()) {
                const similarity = fuzzyMatch(normalizedMerchant, pattern);
                
                const descSimilarity = fuzzyMatch(descriptionForMatching.toLowerCase(), pattern);
                const maxSimilarity = Math.max(similarity, descSimilarity);
              const threshold = 0.85;
              if (maxSimilarity >= threshold) {
                if (!bestMatch || maxSimilarity > bestMatch.similarity) {
                  bestMatch = { pattern, catId, similarity: maxSimilarity };
                }
              }
              }
              
              if (bestMatch) {
                categoryId = bestMatch.catId;
             }
            }
          }
        }
        
          
          if (!categoryId && item.category) {
            let categoryName = item.category.toLowerCase();
            
            
            if (categoryNameMapping[categoryName]) {
              categoryName = categoryNameMapping[categoryName];
            }
            
            categoryId = categoryMap.get(categoryName) ?? null;
          }
        } 
        
        
        if (!categoryId) {
          unmatchedCount++;
        } else {
          matchedCount++;
        }

        return {
          userId: user.id,
          type,
          amount: absoluteAmount,
          
          description: item.description,
          source: 'pdf_import', 
          date,
          categoryId,
          currencyId,
        };
      })
      .filter((item): item is NonNullable<typeof item> => 
        item !== null && Boolean(item?.description) && !isNaN(item?.date.getTime())
      );

    
    
    console.log(`[merchant-import] Summary: ${matchedCount} matched, ${unmatchedCount} unmatched out of ${transactions.length} transactions`);

    if (!transactionsToCreate.length) {
      return NextResponse.json(
        { error: 'No valid transactions provided.' },
        { status: 422 },
      );
    }

    
    await db.transaction.createMany({
      data: transactionsToCreate,
      skipDuplicates: true,
    });

    
    
    
    const now = new Date();
    const createdTransactions = await db.transaction.findMany({
      where: {
        userId: user.id,
        source: 'pdf_import', 
        createdAt: {
          gte: new Date(now.getTime() - 60000), 
        },
      },
      orderBy: { createdAt: 'desc' },
      take: transactionsToCreate.length,
    });

    
    
    const categoryIds = [...new Set(createdTransactions.map((tx) => tx.categoryId).filter(Boolean))];
    const categories = categoryIds.length > 0 
      ? await db.category.findMany({
          where: { id: { in: categoryIds as number[] } },
        })
      : [];
    const categoryById = new Map(categories.map((cat: { id: number; name: string }) => [cat.id, cat.name]));

    
    
    const responseTransactions = createdTransactions.map((tx) => {
      const amount = moneyToNumber(tx.amount);
      return {
        id: tx.id.toString(),
        date: toDateKey(tx.date),
        description: tx.description,
        translatedDescription: tx.description, 
        amount: tx.type === 'income' ? amount : -amount,
        category: tx.categoryId ? categoryById.get(tx.categoryId) ?? null : null,
      };
    });

    console.info('[transactions/import] persisted transactions', responseTransactions.length);

    
    if (merchantsToLearn && merchantsToLearn.length > 0) {
      console.log(`[merchants/learn] Learning ${merchantsToLearn.length} merchant mappings`);
      const { normalizeMerchantName, extractMerchantFromDescription } = await import('@/lib/merchant');
      
      
      const batchSize = 10;
      const batches: Array<typeof merchantsToLearn> = [];
      for (let i = 0; i < merchantsToLearn.length; i += batchSize) {
        batches.push(merchantsToLearn.slice(i, i + batchSize));
      }
      
      
      for (const batch of batches) {
        await Promise.all(
          batch.map(async (item) => {
            try {
              const merchantName = extractMerchantFromDescription(item.description);
              const normalizedMerchant = normalizeMerchantName(merchantName);
              
              if (normalizedMerchant && normalizedMerchant.length >= 2) {
                await db.merchant.upsert({
                  where: {
                    userId_namePattern: {
                      userId: user.id,
                      namePattern: normalizedMerchant,
                    },
                  },
                  update: {
                    categoryId: item.categoryId,
                    matchCount: { increment: 1 },
                    updatedAt: new Date(),
                  },
                  create: {
                    userId: user.id,
                    namePattern: normalizedMerchant,
                    categoryId: item.categoryId,
                    matchCount: 1,
                  },
                });
              } else {
                console.warn(`[merchants/learn] ⚠ Could not extract merchant from: "${item.description}"`);
              }
            } catch (error) {
              
              console.debug('[merchants/learn] Failed to learn merchant mapping', error);
            }
          })
        );
      }
      console.log(`[merchants/learn] Completed learning ${merchantsToLearn.length} merchant mappings`);
    }

    
    try {
      if (await shouldCreateNotification(user.id, 'PDF Processing')) {
        const now = new Date();
        await db.notification.create({
          data: {
            userId: user.id,
            type: 'PDF Processing',
            text: `Successfully imported ${responseTransactions.length} transaction${responseTransactions.length !== 1 ? 's' : ''}!`,
            date: now,
            time: now.toTimeString().split(' ')[0],
            read: false,
          },
        });
      }
    } catch (notifError) {
      console.error('[transactions/import] Failed to create notification:', notifError);
      
    }

    return NextResponse.json({ ok: true, transactions: responseTransactions });
  } catch (error) {
    return errorResponse(error, '[transactions/import] error', 'Unable to import transactions.');
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireCurrentUser();
    const { searchParams } = request.nextUrl;
    const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10));
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(searchParams.get('pageSize') ?? '10', 10)));
    const search = (searchParams.get('search') ?? '').toLowerCase();
    const category = searchParams.get('category');

    
    
    const where: Prisma.TransactionWhereInput = {
      userId: user.id,
      investmentAssetId: null,
    };

    if (category) {
      
      const categoryRecord = await db.category.findFirst({
        where: {
          name: {
            equals: category,
            mode: 'insensitive',
          },
        },
      });

      if (categoryRecord) {
        where.categoryId = categoryRecord.id;
      } else {
        
        return NextResponse.json({
          transactions: [],
          total: 0,
          page,
          pageSize,
        });
      }
    }

    if (search) {
      where.description = { contains: search, mode: 'insensitive' };
    }

    
    const total = await db.transaction.count({ where });

    
    const transactions = await db.transaction.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { date: 'desc' },
      include: {
        category: true,
      },
    });

    
    
    const pageItems = transactions.map((tx) => {
      const amount = moneyToNumber(tx.amount);
      return {
        id: tx.id.toString(),
        date: toDateKey(tx.date),
        description: tx.description,
        translatedDescription: tx.description, 
        amount: tx.type === 'income' ? amount : -amount,
        category: tx.category?.name ?? null,
      };
    });

    return NextResponse.json({
      transactions: pageItems,
      total,
      page,
      pageSize,
    });
  } catch (error) {
    return errorResponse(error, '[transactions/import] GET error', 'Unable to fetch transactions.');
  }
}
