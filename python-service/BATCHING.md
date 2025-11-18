# PDF Batching Strategy (Future Optimization)

## Overview

This document outlines a potential batching approach for processing large PDFs by splitting them into chunks and processing them in parallel.

## Current Approach

**Single Request Processing:**
- Upload entire PDF → Process all pages → Translate & categorize all transactions → Return results
- **Timeout**: 900 seconds (15 minutes) - sufficient for most PDFs
- **Pros**: Simple, single API call, easy error handling
- **Cons**: Long wait time for very large PDFs (1000+ transactions)

## Proposed Batching Approach

### Architecture

```
Client Upload → Split PDF into chunks → Send parallel requests → Merge results
```

### Implementation Steps

1. **PDF Splitting (Client-side)**
   - Use PDF.js or similar to split PDF into page ranges (e.g., pages 1-15, 16-30)
   - Each chunk is a separate PDF file
   - Maintain chunk metadata (page range, total chunks)

2. **Parallel Processing**
   - Send multiple requests simultaneously to `/process-pdf` endpoint
   - Each request processes one chunk independently
   - Use `Promise.all()` to wait for all chunks

3. **Result Merging (Client-side)**
   - Merge transactions from all chunks
   - Sort by date (transactions might span chunks)
   - Deduplicate if needed (overlap in page boundaries)
   - Send merged results to import endpoint

### API Changes

**Option 1: New Endpoint**
```
POST /process-pdf-chunk
- Accepts: PDF chunk (partial PDF)
- Returns: Transactions for this chunk
- Includes: chunk metadata (page range, total chunks)
```

**Option 2: Enhanced Existing Endpoint**
```
POST /process-pdf
- Accepts: PDF file + optional chunk metadata
- Returns: Transactions + chunk info
- Backwards compatible
```

### Pros

- ✅ **Faster per-request**: Each chunk processes faster (e.g., 15 pages vs 30)
- ✅ **Better UX**: Progress indicators per chunk
- ✅ **Parallel processing**: Multiple chunks processed simultaneously
- ✅ **Scalability**: Better resource utilization
- ✅ **Partial success**: If one chunk fails, others can succeed

### Cons

- ❌ **Complexity**: Client-side splitting, merging, error handling
- ❌ **More API calls**: N requests for N chunks (potential rate limiting)
- ❌ **Translation API limits**: Google Translate might have rate limits
- ❌ **Edge cases**: Transactions spanning page boundaries, metadata merging
- ❌ **Development time**: Significant implementation effort

### When to Implement

**Consider batching if:**
- You regularly see PDFs with 1000+ transactions
- Timeout becomes an issue even at 900 seconds
- Users complain about long wait times
- You have resources for complex implementation

**Avoid batching if:**
- Current timeout (900s) handles all use cases
- Most PDFs are <500 transactions
- You want to keep architecture simple
- Development resources are limited

### Alternative: Async Processing

Instead of batching, consider async processing:

1. **Queue-based approach:**
   - Upload PDF → Return immediately with job ID
   - Process in background (queue system like Redis/BullMQ)
   - Client polls for status or uses WebSocket for updates
   - Return results when ready

2. **Benefits:**
   - No timeout issues (can process indefinitely)
   - Better UX (immediate feedback)
   - Scales better (queue workers can scale independently)
   - Handles retries, failures gracefully

3. **Implementation:**
   - Use Render's background workers or external queue (Redis, SQS)
   - Store job status in database
   - Client polls `/job/{id}/status` endpoint

## Recommendation

**For now:** Keep single-request approach with 900s timeout
- Simpler architecture
- Handles 95% of use cases (most PDFs <500 transactions)
- Less development/maintenance overhead

**Future (if needed):**
1. First try async/queue-based processing (better than batching)
2. If async not viable, implement batching as fallback
3. Consider batching only for PDFs >50 pages or >800 transactions

## Implementation Complexity

- **Simple timeout increase**: ✅ Done (5 min)
- **Batching approach**: 🔨 ~3-5 days (splitting, merging, error handling)
- **Async/Queue approach**: 🔨 ~5-7 days (queue setup, job tracking, polling)

