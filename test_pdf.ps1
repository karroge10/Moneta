# PowerShell script to test PDF extraction
$ErrorActionPreference = "Stop"

Write-Host "Testing PDF Extraction..." -ForegroundColor Cyan
Write-Host "=" * 80

$pdfPath = "public/REDACTED_STATEMENT.pdf"

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

