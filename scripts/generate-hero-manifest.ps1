param(
  [string]$AssetsDirectory = (Join-Path $PSScriptRoot '..\assets'),
  [int]$MaxSlides = 3
)

# Hero carousel naming convention:
#   hero-<name>.<png|jpg|jpeg|webp>
# The manifest is capped at three files and is regenerated before publishing.
$pattern = '^hero-[a-z0-9][a-z0-9-]*\.(png|jpe?g|webp)$'
$manifestPath = Join-Path $AssetsDirectory 'hero-slides.json'

$files = @(
  Get-ChildItem -LiteralPath $AssetsDirectory -File |
    Where-Object { $_.Name -match $pattern } |
    Sort-Object @(
      @{ Expression = { if ($_.Name -ieq 'hero-solutions-neutral.png') { 0 } else { 1 } } },
      @{ Expression = { $_.Name } }
    ) |
    Select-Object -First $MaxSlides
)

$slides = @($files | ForEach-Object { "assets/$($_.Name)" })
$manifest = [ordered]@{ slides = $slides }
$manifest | ConvertTo-Json -Depth 2 | Set-Content -LiteralPath $manifestPath -Encoding utf8NoBOM

Write-Output "Generated $manifestPath with $($slides.Count) Hero slide(s)."
