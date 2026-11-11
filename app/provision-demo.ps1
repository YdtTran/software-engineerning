param([string]$NodeCommand = 'node')

$ErrorActionPreference = 'Stop'
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$accountFile = Join-Path $PSScriptRoot 'db/.local/demo-accounts.json'
if (Test-Path -LiteralPath $accountFile) {
    throw 'Demo accounts already exist. Use that account file or choose a separate configuration; existing credentials were preserved.'
}
$specs = @(
    @{ Username = 'user'; Id = 'demo-user'; Role = 'user' },
    @{ Username = 'operator'; Id = 'demo-operator'; Role = 'operator' }
)
$accounts = foreach ($spec in $specs) {
    $securePassword = Read-Host "Password for $($spec.Username)" -AsSecureString
    $plainPassword = [System.Net.NetworkCredential]::new('', $securePassword).Password
    try {
        $output = $plainPassword | & $NodeCommand (Join-Path $PSScriptRoot 'src/hash-demo-account.js') $spec.Username $spec.Id $spec.Role
        if ($LASTEXITCODE -ne 0) { throw 'Account provisioning failed.' }
        $parsed = ($output -join "`n") | ConvertFrom-Json
        [PSCustomObject]@{
            username = $spec.Username
            id = $spec.Id
            roles = @($spec.Role)
            salt = [string]$parsed[0].salt
            passwordHash = [string]$parsed[0].passwordHash
        }
    }
    finally {
        $plainPassword = $null
        $securePassword = $null
    }
}
[System.IO.Directory]::CreateDirectory((Split-Path -Parent $accountFile)) | Out-Null
$accountJson = ConvertTo-Json -InputObject @($accounts) -Depth 5
[System.IO.File]::WriteAllText($accountFile, $accountJson, [System.Text.UTF8Encoding]::new($false))
Write-Output 'Provisioned user (User) and operator (Operator). Passwords are not stored; local salted hashes are ignored by Git.'
