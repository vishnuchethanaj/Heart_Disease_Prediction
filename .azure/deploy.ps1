param(
    [Parameter(Mandatory = $true)]
    [string]$SubscriptionId,

    [Parameter(Mandatory = $true)]
    [string]$ResourceGroup,

    [Parameter(Mandatory = $false)]
    [string]$Location = "centralindia",

    [Parameter(Mandatory = $true)]
    [string]$AppName,

    [Parameter(Mandatory = $false)]
    [string]$PlanName = "heartpred-plan"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    throw "Azure CLI (az) is not installed. Install it first: https://aka.ms/installazurecliwindows"
}

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$zipPath = Join-Path $env:TEMP ("{0}-deploy.zip" -f $AppName)

Write-Host "Setting Azure subscription..."
az account set --subscription $SubscriptionId

Write-Host "Creating resource group if missing..."
az group create --name $ResourceGroup --location $Location | Out-Null

Write-Host "Creating Linux App Service plan if missing..."
az appservice plan create --name $PlanName --resource-group $ResourceGroup --sku B1 --is-linux | Out-Null

Write-Host "Creating Web App if missing..."
az webapp create --resource-group $ResourceGroup --plan $PlanName --name $AppName --runtime "PYTHON|3.12" | Out-Null

Write-Host "Applying app settings and startup command..."
az webapp config appsettings set --resource-group $ResourceGroup --name $AppName --settings SCM_DO_BUILD_DURING_DEPLOYMENT=true WEBSITES_PORT=8000 | Out-Null
az webapp config set --resource-group $ResourceGroup --name $AppName --startup-file "gunicorn --bind=0.0.0.0 --timeout 600 api.server:app" | Out-Null

if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

Write-Host "Creating deployment package..."
Push-Location $projectRoot
try {
    $exclude = @('.git', '.venv', '__pycache__', '.azure')
    $items = Get-ChildItem -Force | Where-Object { $exclude -notcontains $_.Name }
    Compress-Archive -Path $items.FullName -DestinationPath $zipPath -Force
}
finally {
    Pop-Location
}

Write-Host "Deploying zip package..."
az webapp deploy --resource-group $ResourceGroup --name $AppName --src-path $zipPath --type zip | Out-Null

$appUrl = "https://{0}.azurewebsites.net" -f $AppName
Write-Host "Deployment complete: $appUrl"
Write-Host "Health endpoint: $appUrl/api/health"
