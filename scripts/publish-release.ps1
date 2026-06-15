[CmdletBinding()]
param(
    [ValidateSet("patch", "minor", "major")]
    [string]$Increment = "patch",

    [string]$Remote = "origin",

    [string]$Branch = "main"
)

$ErrorActionPreference = "Stop"

function Invoke-Checked {
    param(
        [Parameter(Mandatory)]
        [string]$Command,

        [Parameter(Mandatory)]
        [string[]]$Arguments
    )

    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$Command $($Arguments -join ' ') failed with exit code $LASTEXITCODE."
    }
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $repoRoot

$currentBranch = (git branch --show-current).Trim()
if ($LASTEXITCODE -ne 0 -or $currentBranch -ne $Branch) {
    throw "Run this script from branch '$Branch'. Current branch: '$currentBranch'."
}

$manifest = Get-Content -Raw -LiteralPath "package.json" | ConvertFrom-Json
$version = [string]$manifest.version
$tag = "v$version"

git rev-parse --verify --quiet "refs/tags/$tag" | Out-Null
if ($LASTEXITCODE -eq 0) {
    Invoke-Checked npm @("version", $Increment, "--no-git-tag-version")

    $manifest = Get-Content -Raw -LiteralPath "package.json" | ConvertFrom-Json
    $version = [string]$manifest.version
    $tag = "v$version"

    git rev-parse --verify --quiet "refs/tags/$tag" | Out-Null
    if ($LASTEXITCODE -eq 0) {
        throw "Tag '$tag' already exists after incrementing the version."
    }
}

$env:VSCE_PUBLISHER = "ChendrayanVenkatesan"
$env:RELEASE_TAG = $tag
Invoke-Checked npm @("run", "release:verify")

$releaseFiles = @(
    "package.json",
    "package-lock.json",
    "scripts/verify-release.mjs",
    "scripts/publish-release.ps1",
    "test/extension/activation.test.cjs",
    "docs/RELEASING.md"
)

Invoke-Checked git (@("add") + $releaseFiles)
Invoke-Checked git @("commit", "-m", "release $version")
Invoke-Checked git @("tag", $tag)
Invoke-Checked git @("push", $Remote, $Branch)
Invoke-Checked git @("push", $Remote, $tag)

Write-Host "Release $version pushed successfully. Tag: $tag"
