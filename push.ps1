# push.ps1 - Commit + Push para main-clean + Deploy Vercel automatico
# Uso: .\push.ps1 "mensagem do commit"

param(
    [string]$Message = "chore: update"
)

Write-Host "`n[1/4] A verificar branch..." -ForegroundColor Cyan
$branch = git branch --show-current
Write-Host "  Branch actual: $branch"

# Guardar trabalho na branch actual
Write-Host "`n[2/4] A fazer commit em '$branch'..." -ForegroundColor Cyan
git add src/ .gitignore .gitattributes 2>$null
git commit -m $Message 2>&1 | Select-Object -Last 3

# Mudar para main-clean e sincronizar
Write-Host "`n[3/4] A actualizar main-clean..." -ForegroundColor Cyan
git checkout main-clean 2>&1 | Out-Null
git checkout $branch -- src/ .gitignore .gitattributes 2>&1 | Out-Null
git add src/ .gitignore .gitattributes 2>$null
git commit -m $Message 2>&1 | Select-Object -Last 2
$pushResult = git push origin main-clean 2>&1
Write-Host "  $pushResult" -ForegroundColor Green

# Voltar para branch de trabalho
git checkout $branch 2>&1 | Out-Null
Write-Host "  Voltou para '$branch'" -ForegroundColor Gray

# Disparar deploy Vercel
Write-Host "`n[4/4] A disparar deploy Vercel..." -ForegroundColor Cyan
$result = Invoke-RestMethod -Uri "https://api.vercel.com/v1/integrations/deploy/prj_jMDvpEOSqLUZQk3EXzFmpporQjpd/5mptxSqBpp" -Method Post
Write-Host "  Deploy iniciado: $($result.job.id) — Estado: $($result.job.state)" -ForegroundColor Green

Write-Host "`nDone! Deploy a construir em https://rest-ia.vercel.app`n" -ForegroundColor Yellow
