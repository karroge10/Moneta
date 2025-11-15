import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import os from 'node:os';
import { TransactionUploadResponse, UploadedTransaction } from '@/types/dashboard';
import { requireCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { normalizeMerchantName, extractMerchantFromDescription, fuzzyMatch, findMerchantByBaseWords, detectSpecialTransactionType } from '@/lib/merchant';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function ensureDirectory(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function saveTempFile(file: File) {
  const uploadRoot = path.join(process.cwd(), 'tmp', 'uploads');
  await ensureDirectory(uploadRoot);

  const uniqueName = `${Date.now()}-${randomUUID()}.pdf`;
  const filePath = path.join(uploadRoot, uniqueName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, buffer);

  return filePath;
}

function getPythonExecutable() {
  if (process.env.PYTHON_PATH) {
    return process.env.PYTHON_PATH;
  }
  return process.platform === 'win32' ? 'python' : 'python3';
}

async function runPythonPipeline(pdfPath: string) {
  const pythonExec = getPythonExecutable();
  const scriptPath = path.join(process.cwd(), 'python', 'process_pdf.py');
  const modelPath =
    process.env.CATEGORIES_MODEL_PATH ||
    path.join(process.cwd(), 'python', 'models', 'categories.ftz');

  return new Promise<TransactionUploadResponse>((resolve, reject) => {
    const child = spawn(pythonExec, [scriptPath, pdfPath, modelPath], {
      env: {
        ...process.env,
        TMPDIR: process.env.TMPDIR ?? os.tmpdir(),
      },
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', data => {
      stdout += data.toString();
    });

    child.stderr.on('data', data => {
      stderr += data.toString();
    });

    child.on('error', error => {
      reject(error);
    });

    child.on('close', code => {
      if (code !== 0) {
        reject(new Error(stderr || `Python process exited with code ${code}`));
        return;
      }

      try {
        const parsed = JSON.parse(stdout) as TransactionUploadResponse;
        resolve(parsed);
      } catch (error) {
        reject(new Error(`Failed to parse worker output: ${(error as Error).message}`));
      }
    });
  });
}

async function analyzeCategorization(transactions: UploadedTransaction[]): Promise<UploadedTransaction[]> {
  console.log('\n\n' + '='.repeat(80));
  console.log('[PDF PROCESSING] Analyzing transaction categorization...');
  console.log('='.repeat(80) + '\n');

  try {
    const user = await requireCurrentUser();
    
    // Pre-fetch all categories to build a lookup map
    const allCategories = await db.category.findMany();
    const categoryMap = new Map<string, number>();
    const categoryByIdMap = new Map<number, string>(); // Map ID -> name for setting category names
    allCategories.forEach((cat: { name: string; id: number }) => {
      categoryMap.set(cat.name.toLowerCase(), cat.id);
      categoryByIdMap.set(cat.id, cat.name);
    });

    // Pre-fetch global merchants (shared by all users)
    const globalMerchants = await db.merchantGlobal.findMany();
    const globalMerchantMap = new Map<string, number>();
    const globalMerchantPatterns: string[] = [];
    globalMerchants.forEach((merchant: { namePattern: string; categoryId: number }) => {
      const normalizedPattern = normalizeMerchantName(merchant.namePattern);
      globalMerchantMap.set(normalizedPattern, merchant.categoryId);
      globalMerchantPatterns.push(merchant.namePattern);
    });

    // Pre-fetch user's merchant mappings (learned from previous corrections - overrides global)
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

    let matchedCount = 0;
    let unmatchedCount = 0;
    const unmatchedTransactions: Array<{
      original: string;
      extracted: string;
      normalized: string;
      reasons: string[];
      checkedPatterns: Array<{ pattern: string; similarity: number; type: string }>;
    }> = [];

    // Process and update transactions with matched categories
    const updatedTransactions = transactions.map((item: UploadedTransaction) => {
      let categoryId = null;
      let matchedMerchant: string | null = null;
      const unmatchedReasons: string[] = [];
      const checkedPatterns: Array<{ pattern: string; similarity: number; type: string }> = [];

      // Use translated description for all matching operations (fallback to original if not available)
      const descriptionForMatching = item.translatedDescription || item.description;

      // Check for special transaction types first (roundup, currency exchange, etc.)
      const specialType = detectSpecialTransactionType(descriptionForMatching);
      if (specialType === 'EXCLUDE') {
        // Transaction should be excluded from categorization (roundup, currency exchange, cash withdrawal)
        // Clear any category suggestion (including "Currency Exchange" from Python)
        return {
          ...item,
          category: null, // Explicitly set to null to exclude from categorization
        };
      } else if (specialType && specialType !== 'EXCLUDE') {
        // Special type that should be categorized (e.g., commissions -> utilities)
        const specialCategoryId = categoryMap.get(specialType.toLowerCase());
        if (specialCategoryId) {
          const specialCategoryName = categoryByIdMap.get(specialCategoryId);
          if (specialCategoryName) {
            return {
              ...item,
              category: specialCategoryName,
            };
          }
        }
      }

      // Extract and normalize merchant name
      const merchantName = extractMerchantFromDescription(descriptionForMatching);
      const normalizedMerchant = normalizeMerchantName(merchantName);

      const allUserPatterns = userMerchantPatterns;
      const allGlobalPatterns = globalMerchantPatterns;

      // Priority 1: User override
      if (userMerchantMap.has(normalizedMerchant)) {
        categoryId = userMerchantMap.get(normalizedMerchant) ?? null;
        matchedMerchant = normalizedMerchant;
      } else {
        unmatchedReasons.push(`User exact match: "${normalizedMerchant}" not found in user merchant map`);
        
        const foundMerchant = findMerchantByBaseWords(descriptionForMatching, allUserPatterns);
        if (foundMerchant) {
          const foundNormalized = normalizeMerchantName(foundMerchant);
          if (userMerchantMap.has(foundNormalized)) {
            categoryId = userMerchantMap.get(foundNormalized) ?? null;
            matchedMerchant = foundMerchant;
          } else {
            unmatchedReasons.push(`User word match: found "${foundMerchant}" but not in user merchant map`);
          }
        } else {
          unmatchedReasons.push(`User word match: no base words found in description`);
        }

        if (!categoryId) {
          let bestMatch: { pattern: string; catId: number; similarity: number } | null = null;
          for (const [pattern, catId] of userMerchantMap.entries()) {
            const similarity = fuzzyMatch(normalizedMerchant, pattern);
            const descSimilarity = fuzzyMatch(descriptionForMatching.toLowerCase(), pattern);
            const maxSimilarity = Math.max(similarity, descSimilarity);
            checkedPatterns.push({ pattern, similarity: maxSimilarity, type: 'user-fuzzy' });
            // Increased threshold from 0.5 to 0.65 to reduce false positives
            if (maxSimilarity >= 0.65) {
              if (!bestMatch || maxSimilarity > bestMatch.similarity) {
                bestMatch = { pattern, catId, similarity: maxSimilarity };
              }
            }
          }
          if (bestMatch) {
            categoryId = bestMatch.catId;
            matchedMerchant = bestMatch.pattern;
          } else if (checkedPatterns.length > 0) {
            const maxSim = Math.max(...checkedPatterns.filter(p => p.type === 'user-fuzzy').map(p => p.similarity));
            unmatchedReasons.push(`User fuzzy match: best similarity ${maxSim.toFixed(2)} < 0.65 threshold`);
          }
        }
      }

      // Priority 2: Global merchant database
      if (!categoryId) {
        if (globalMerchantMap.has(normalizedMerchant)) {
          categoryId = globalMerchantMap.get(normalizedMerchant) ?? null;
          matchedMerchant = normalizedMerchant;
        } else {
          unmatchedReasons.push(`Global exact match: "${normalizedMerchant}" not found in global merchant map`);
          
          const foundMerchant = findMerchantByBaseWords(descriptionForMatching, allGlobalPatterns);
          if (foundMerchant) {
            const foundNormalized = normalizeMerchantName(foundMerchant);
            if (globalMerchantMap.has(foundNormalized)) {
              categoryId = globalMerchantMap.get(foundNormalized) ?? null;
              matchedMerchant = foundMerchant;
            } else {
              unmatchedReasons.push(`Global word match: found "${foundMerchant}" (normalized: "${foundNormalized}") but not in global merchant map`);
            }
          } else {
            unmatchedReasons.push(`Global word match: no base words found in description`);
          }

          if (!categoryId) {
            let bestMatch: { pattern: string; catId: number; similarity: number } | null = null;
            const topCandidates: Array<{ pattern: string; catId: number; similarity: number }> = [];
            for (const [pattern, catId] of globalMerchantMap.entries()) {
              const similarity = fuzzyMatch(normalizedMerchant, pattern);
              const descSimilarity = fuzzyMatch(descriptionForMatching.toLowerCase(), pattern);
              const maxSimilarity = Math.max(similarity, descSimilarity);
              checkedPatterns.push({ pattern, similarity: maxSimilarity, type: 'global-fuzzy' });
              topCandidates.push({ pattern, catId, similarity: maxSimilarity });
              // Increased threshold from 0.5 to 0.65 to reduce false positives
              // (e.g., "Guts and Fame" shouldn't match "furniture")
              if (maxSimilarity >= 0.65) {
                if (!bestMatch || maxSimilarity > bestMatch.similarity) {
                  bestMatch = { pattern, catId, similarity: maxSimilarity };
                }
              }
            }
            topCandidates.sort((a, b) => b.similarity - a.similarity);
            const top5 = topCandidates.slice(0, 5);
            if (top5.length > 0 && top5[0].similarity > 0) {
              unmatchedReasons.push(`Global fuzzy match: top candidates: ${top5.map(c => `"${c.pattern}" (${c.similarity.toFixed(2)})`).join(', ')}`);
            }
            if (bestMatch) {
              categoryId = bestMatch.catId;
              matchedMerchant = bestMatch.pattern;
            } else {
              unmatchedReasons.push(`Global fuzzy match: best similarity ${top5.length > 0 ? top5[0].similarity.toFixed(2) : '0.00'} < 0.65 threshold`);
            }
          }
        }
      }

      // Priority 3: Python processor suggestion
      if (!categoryId && item.category) {
        const categoryName = item.category.toLowerCase();
        categoryId = categoryMap.get(categoryName) ?? null;
        if (!categoryId) {
          unmatchedReasons.push(`Python suggestion: category "${item.category}" not found in category map`);
        }
      } else if (!categoryId && !item.category) {
        unmatchedReasons.push(`Python suggestion: no category provided by processor`);
      }

      // Update the transaction with the matched category name
      let updatedCategory = item.category; // Keep Python's suggestion if no match found
      
      if (categoryId) {
        const matchedCategoryName = categoryByIdMap.get(categoryId);
        if (matchedCategoryName) {
          updatedCategory = matchedCategoryName;
          matchedCount++;
        } else {
          // Category ID found but name not found - shouldn't happen, but handle gracefully
          unmatchedCount++;
          unmatchedTransactions.push({
            original: item.description,
            extracted: merchantName,
            normalized: normalizedMerchant,
            reasons: [...unmatchedReasons, `Category ID ${categoryId} found but name not in map`],
            checkedPatterns: checkedPatterns.filter(p => p.similarity > 0).sort((a, b) => b.similarity - a.similarity).slice(0, 10),
          });
        }
      } else {
        unmatchedCount++;
        unmatchedTransactions.push({
          original: item.description,
          extracted: merchantName,
          normalized: normalizedMerchant,
          reasons: unmatchedReasons,
          checkedPatterns: checkedPatterns.filter(p => p.similarity > 0).sort((a, b) => b.similarity - a.similarity).slice(0, 10),
        });
      }

      // Return updated transaction with category applied
      return {
        ...item,
        category: updatedCategory,
      };
    });

    // Log comprehensive summary
    console.log('\n\n');
    console.log('█'.repeat(80));
    console.log('█'.repeat(80));
    console.log('█'.repeat(80));
    console.log('█'.repeat(80));
    console.log(`█  [CATEGORIZATION SUMMARY]`);
    console.log('█'.repeat(80));
    console.log(`█  Total transactions: ${transactions.length}`);
    console.log(`█  ✓ Categorized: ${matchedCount} (${((matchedCount / transactions.length) * 100).toFixed(1)}%)`);
    console.log(`█  ✗ Uncategorized: ${unmatchedCount} (${((unmatchedCount / transactions.length) * 100).toFixed(1)}%)`);
    console.log('█'.repeat(80));
    console.log('█'.repeat(80));
    console.log('█'.repeat(80));
    console.log('█'.repeat(80));
    console.log('\n');

    if (unmatchedTransactions.length > 0) {
      console.log('\n');
      console.log('█'.repeat(80));
      console.log(`█  [UNCATEGORIZED TRANSACTIONS - ${unmatchedTransactions.length} total]`);
      console.log('█'.repeat(80));
      console.log('█'.repeat(80));
      unmatchedTransactions.forEach((tx, index) => {
        console.log(`\n█  ┌─ Transaction #${index + 1} ────────────────────────────────────────────────────────────`);
        console.log(`█  │ Original: "${tx.original}"`);
        console.log(`█  │ Extracted: "${tx.extracted}"`);
        console.log(`█  │ Normalized: "${tx.normalized}"`);
        console.log(`█  │ Reasons why it didn't match:`);
        tx.reasons.forEach(reason => {
          console.log(`█  │   • ${reason}`);
        });
        if (tx.checkedPatterns.length > 0) {
          console.log(`█  │ Top checked patterns (similarity > 0):`);
          tx.checkedPatterns.slice(0, 5).forEach(pattern => {
            console.log(`█  │   • "${pattern.pattern}" (${pattern.type}): ${pattern.similarity.toFixed(3)}`);
          });
        }
        console.log(`█  └────────────────────────────────────────────────────────────────────────────`);
      });
      console.log('\n');
      console.log('█'.repeat(80));
      console.log('█'.repeat(80));
      console.log('\n');
    }

    // Return updated transactions with categories applied
    return updatedTransactions;
  } catch (error) {
    console.error('[analyze-categorization] error', error);
    // Don't throw - just return original transactions if analysis fails
    return transactions;
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'A PDF file is required.' }, { status: 400 });
    }

    const tempFilePath = await saveTempFile(file);

    try {
      const result = await runPythonPipeline(tempFilePath);
      
      // Analyze categorization after parsing and apply matched categories
      if (result.transactions && result.transactions.length > 0) {
        const updatedTransactions = await analyzeCategorization(result.transactions);
        // Update the result with transactions that have categories applied
        result.transactions = updatedTransactions;
      }
      
      return NextResponse.json(result);
    } finally {
      await fs.unlink(tempFilePath).catch(() => {});
    }
  } catch (error) {
    console.error('[upload-bank-statement] error', error);
    return NextResponse.json(
      { error: 'Failed to process bank statement. Please try again.' },
      { status: 500 },
    );
  }
}


