# PowerShell script to test PDF extraction
$ErrorActionPreference = "Stop"

Write-Host "Testing PDF Extraction..." -ForegroundColor Cyan
Write-Host "=" * 80

$pdfPath = "public/MYCREDO_GE72CD0360000035897801_GEL_STATEMENT_2025_11_17_20_56_51.pdf"

if (-not (Test-Path $pdfPath)) {
    Write-Host "Error: PDF file not found at $pdfPath" -ForegroundColor Red
    exit 1
}

Write-Host "Running test script..." -ForegroundColor Yellow
python python/test_debit_only.py

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nTest completed successfully!" -ForegroundColor Green
} else {
    Write-Host "`nTest failed with exit code $LASTEXITCODE" -ForegroundColor Red
}

