# Async/Queue Processing Explained

## What is Async/Queue Processing?

**Async/Queue processing** is a pattern where you **decouple the request from the response**. Instead of waiting for work to complete before responding, you:

1. **Accept the request immediately** → Return a job ID
2. **Queue the work** → Process in background
3. **Track progress** → Store status in database/cache
4. **Client polls** → Checks status periodically
5. **Return results** → When ready, client fetches them

## Current Flow (Synchronous) ❌

```
User Uploads PDF
    ↓
Browser waits...
    ↓
Server processes PDF (30-60 seconds)
    ↓
Server translates 326 transactions (slow)
    ↓
Server categorizes 326 transactions
    ↓
Server responds with results
    ↓
Browser receives response
```

**Problems:**
- ❌ Browser blocks for 30-60 seconds
- ❌ Request can timeout (900s limit)
- ❌ User sees loading spinner
- ❌ Connection must stay open
- ❌ If server crashes, work is lost

## Async/Queue Flow (Proposed) ✅

```
User Uploads PDF
    ↓
Server immediately returns: { jobId: "abc123", status: "queued" }
    ↓
Browser shows: "Processing... Job ID: abc123"
    ↓
[Background] PDF added to queue
    ↓
[Background] Worker picks up job
    ↓
[Background] Server processes PDF (30-60 seconds)
    ↓
[Background] Server stores results in database
    ↓
Browser polls every 2 seconds: GET /job/abc123/status
    ↓
Response: { status: "processing", progress: 45% }
    ↓
Browser polls again: GET /job/abc123/status
    ↓
Response: { status: "completed", transactions: [...] }
    ↓
Browser shows results
```

**Benefits:**
- ✅ Browser responds immediately (no waiting)
- ✅ No timeout issues (work happens in background)
- ✅ Better UX (progress updates, can close tab)
- ✅ Scales better (queue workers can scale independently)
- ✅ Handles failures (retry failed jobs)

## Architecture Components

### 1. **Job Queue System**

A queue stores work that needs to be done. Popular options:

- **Redis + BullMQ** (Node.js) or **Bull** (simpler)
- **RabbitMQ** (more complex, enterprise-grade)
- **PostgreSQL + pg-boss** (uses your existing DB)
- **Render Background Workers** (native Render feature)

### 2. **Database Schema**

Store job status and results:

```sql
CREATE TABLE pdf_processing_jobs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  status VARCHAR(20) NOT NULL, -- 'queued', 'processing', 'completed', 'failed'
  progress INTEGER DEFAULT 0, -- 0-100
  error_message TEXT,
  result JSONB, -- stores transactions when completed
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  completed_at TIMESTAMP
);
```

### 3. **API Endpoints**

**Upload PDF (new):**
```typescript
POST /api/transactions/upload-bank-statement
→ Returns: { jobId: "abc123", status: "queued" }
```

**Check Status:**
```typescript
GET /api/jobs/:jobId/status
→ Returns: { 
    status: "processing" | "completed" | "failed",
    progress: 45,
    transactions?: [...],
    error?: "..."
  }
```

**Get Results (when completed):**
```typescript
GET /api/jobs/:jobId/results
→ Returns: { transactions: [...], metadata: {...} }
```

### 4. **Worker Process**

Separate process that picks up jobs from queue:

```python
# worker.py
import redis
from process_pdf import extract_transactions_with_pdfplumber

while True:
    # Pick up job from queue
    job = queue.get_next_job()
    
    # Update status
    update_job_status(job.id, "processing", progress=0)
    
    # Process PDF
    transactions = extract_transactions_with_pdfplumber(job.pdf_path)
    
    # Update progress
    update_job_status(job.id, "processing", progress=50)
    
    # Translate & categorize
    for tx in transactions:
        translate_and_categorize(tx)
        update_progress(job.id, 50 + (index / len(transactions)) * 50)
    
    # Store results
    store_job_results(job.id, transactions)
    
    # Mark complete
    update_job_status(job.id, "completed")
```

### 5. **Frontend Changes**

**Before (current):**
```typescript
const response = await fetch('/api/upload', { ... });
// Browser waits here for 60 seconds
const data = await response.json();
```

**After (async):**
```typescript
// 1. Submit job
const { jobId } = await fetch('/api/upload', { ... })
  .then(r => r.json());

// 2. Poll for status
const pollStatus = setInterval(async () => {
  const status = await fetch(`/api/jobs/${jobId}/status`)
    .then(r => r.json());
  
  if (status.status === 'completed') {
    clearInterval(pollStatus);
    setTransactions(status.transactions);
  } else if (status.status === 'failed') {
    clearInterval(pollStatus);
    showError(status.error);
  } else {
    updateProgress(status.progress);
  }
}, 2000); // Check every 2 seconds
```

## Example Implementation (Simplified)

### Backend: Upload Endpoint

```typescript
// src/app/api/transactions/upload-bank-statement/route.ts

import { Queue } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';

const queue = new Queue('pdf-processing', {
  connection: { host: process.env.REDIS_HOST }
});

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file');
  
  // Save file temporarily
  const filePath = await saveTempFile(file);
  
  // Create job
  const jobId = uuidv4();
  const job = await queue.add('process-pdf', {
    jobId,
    filePath,
    userId: user.id,
  }, {
    jobId, // Use our UUID as job ID
  });
  
  // Store job metadata in database
  await db.pdfProcessingJob.create({
    data: {
      id: jobId,
      userId: user.id,
      status: 'queued',
      progress: 0,
    },
  });
  
  // Return immediately (don't wait for processing!)
  return NextResponse.json({
    jobId,
    status: 'queued',
  });
}
```

### Backend: Status Endpoint

```typescript
// src/app/api/jobs/[jobId]/status/route.ts

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const job = await db.pdfProcessingJob.findUnique({
    where: { id: params.jobId },
  });
  
  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }
  
  return NextResponse.json({
    status: job.status,
    progress: job.progress,
    transactions: job.result, // Only populated when completed
    error: job.errorMessage,
  });
}
```

### Backend: Worker Process

```typescript
// workers/pdf-processor.ts

import { Worker } from 'bullmq';
import { updateJobStatus } from '@/lib/jobs';

const worker = new Worker('pdf-processing', async (job) => {
  const { jobId, filePath, userId } = job.data;
  
  try {
    // Update status
    await updateJobStatus(jobId, 'processing', 0);
    
    // Process PDF
    const transactions = await processPDF(filePath);
    await updateJobStatus(jobId, 'processing', 50);
    
    // Translate & categorize
    const processed = [];
    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i];
      const translated = await translate(tx.description);
      const category = await categorize(translated);
      processed.push({ ...tx, translatedDescription: translated, category });
      
      // Update progress
      const progress = 50 + ((i + 1) / transactions.length) * 50;
      await updateJobStatus(jobId, 'processing', progress);
    }
    
    // Store results
    await updateJobStatus(jobId, 'completed', 100, processed);
    
  } catch (error) {
    await updateJobStatus(jobId, 'failed', 0, null, error.message);
    throw error;
  }
});

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err);
});
```

### Frontend: Upload Component

```typescript
// src/app/transactions/import/page.tsx

const handleUpload = async (file: File) => {
  // 1. Upload and get job ID
  const formData = new FormData();
  formData.append('file', file);
  
  const { jobId } = await fetch('/api/transactions/upload-bank-statement', {
    method: 'POST',
    body: formData,
  }).then(r => r.json());
  
  setUploadState('processing');
  setJobId(jobId);
  
  // 2. Poll for status
  const pollInterval = setInterval(async () => {
    const status = await fetch(`/api/jobs/${jobId}/status`)
      .then(r => r.json());
    
    setProgressValue(status.progress);
    
    if (status.status === 'completed') {
      clearInterval(pollInterval);
      setParsedRows(status.transactions);
      setUploadState('ready');
    } else if (status.status === 'failed') {
      clearInterval(pollInterval);
      setUploadState('error');
      setError(status.error);
    }
  }, 2000); // Poll every 2 seconds
};
```

## Queue vs. Batching

| Feature | Current (Sync) | Batching | Async/Queue |
|---------|---------------|----------|-------------|
| **Response Time** | 30-60s wait | 15-30s per chunk | Immediate (<1s) |
| **Timeout Risk** | High (900s limit) | Medium (per chunk) | None (no timeout) |
| **User Experience** | Loading spinner | Multiple requests | Progress updates |
| **Scalability** | Limited by workers | Limited by workers | Scales independently |
| **Complexity** | Simple | Medium | Higher |
| **Error Handling** | Lost on crash | Partial success | Retry-able |
| **Resource Usage** | Blocking | Parallel chunks | Background workers |

## When to Use Async/Queue

**Good for:**
- ✅ Long-running tasks (>30 seconds)
- ✅ Many concurrent users
- ✅ Tasks that might fail and need retrying
- ✅ Better user experience (immediate feedback)
- ✅ Production applications with scale

**Not needed if:**
- ❌ Tasks complete in <5 seconds
- ❌ Low traffic (<10 concurrent users)
- ❌ Simple MVP/prototype
- ❌ Don't want to add complexity

## Implementation Options for Your Project

### Option 1: Render Background Workers (Easiest)
- Native Render feature
- No Redis needed
- Simple job queue
- **Cost**: Included in Render plans

### Option 2: Redis + BullMQ (Most Flexible)
- Industry standard
- Great for Node.js
- Rich features (retries, delays, priorities)
- **Cost**: Redis instance (~$7/month)

### Option 3: PostgreSQL + pg-boss (Database-only)
- Uses existing database
- No additional services
- Good for simpler needs
- **Cost**: Free (uses existing DB)

### Option 4: Simple Database Polling (Simplest)
- No queue system needed
- Store jobs in database
- Poll database for pending jobs
- **Cost**: Free
- **Limitation**: Less efficient for high concurrency

## Recommendation

**For your use case:**

1. **Start simple**: Increase timeout to 900s (already done) ✅
2. **Monitor usage**: If you see timeout issues or 100+ concurrent users
3. **Then implement async**: Use Render Background Workers or Redis + BullMQ

**Confidence: 8/10** — Async/queue is the right pattern for production scale, but adds complexity. Only implement if needed based on actual usage patterns.

