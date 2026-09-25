$ErrorActionPreference = "Stop"

$envPath = Join-Path $PSScriptRoot "..\.env"

if (-not (Test-Path $envPath)) {
    throw ".env file was not found."
}

function Get-EnvValue($name) {
    $line = Get-Content $envPath | Where-Object { $_ -match "^$name=" } | Select-Object -First 1
    if ($null -eq $line) {
        return $null
    }

    return $line.Substring($name.Length + 1)
}

function Convert-SecureStringToPlainText($secureValue) {
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureValue)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    } finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    }
}

function Set-EnvValue($name, $value) {
    $content = Get-Content $envPath -Raw
    $line = "$name=$value"
    $pattern = "(?m)^$name=.*$"

    if ($content -match $pattern) {
        $content = [Regex]::Replace($content, $pattern, $line)
    } else {
        $content = $content.TrimEnd() + "`r`n$line`r`n"
    }

    Set-Content -Path $envPath -Value $content -NoNewline
}

$appId = Get-EnvValue "FACEBOOK_APP_ID"
$appSecret = Get-EnvValue "FACEBOOK_APP_SECRET"

if ([string]::IsNullOrWhiteSpace($appId) -or [string]::IsNullOrWhiteSpace($appSecret)) {
    throw "FACEBOOK_APP_ID and FACEBOOK_APP_SECRET must be set in .env first."
}

$shortToken = Convert-SecureStringToPlainText (Read-Host "Paste the short-lived User Token" -AsSecureString)

$response = Invoke-RestMethod `
    -Method Get `
    -Uri "https://graph.facebook.com/v23.0/oauth/access_token" `
    -Body @{
        grant_type = "fb_exchange_token"
        client_id = $appId
        client_secret = $appSecret
        fb_exchange_token = $shortToken
    }

if ([string]::IsNullOrWhiteSpace($response.access_token)) {
    throw "Meta did not return a long-lived access token."
}

Set-EnvValue "FACEBOOK_USER_ACCESS_TOKEN" $response.access_token
Write-Host "Long-lived User Token saved to .env successfully."