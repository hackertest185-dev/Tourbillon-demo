$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path $PSScriptRoot -Parent
$taskManifestPath = Join-Path $taskRoot 'data/catalogue.json'
$taskCatalogue = Get-Content -LiteralPath $taskManifestPath -Raw | ConvertFrom-Json
$taskImageDirectory = Join-Path $taskRoot 'backend/Images/catalogue'
New-Item -ItemType Directory -Path $taskImageDirectory -Force | Out-Null

# Only download real product images from the manufacturers' product pages.
$taskResults = $taskCatalogue.watches | ForEach-Object -Parallel {
    $w = $_
    $targetDirectory = $using:taskImageDirectory
    $imageUrl = $null
    try {
        if ($w.brand -eq 'seiko') {
            $product = Invoke-RestMethod ($w.sourceUrl + '.js') -TimeoutSec 25
            if ($product.price / 100 -ne $w.price) { throw "Official price changed for $($w.reference); update the manifest first." }
            $imageUrl = 'https:' + $product.images[0]
        } else {
            $html = (Invoke-WebRequest $w.sourceUrl -TimeoutSec 25).Content
            if ($w.brand -eq 'tissot') {
                $imageUrl = [regex]::Match($html, '<meta property="og:image" content="([^"]+)"').Groups[1].Value
                $schema = [regex]::Match($html, '<script[^>]*type="application/ld\+json"[^>]*>([\s\S]*?)</script>').Groups[1].Value | ConvertFrom-Json
                if ([decimal]$schema.offers.price -ne $w.price) { throw "Official price changed for $($w.reference); update the manifest first." }
            } else {
                $ref = [regex]::Escape($w.reference + 'G')
                $pattern = '[^"\s<>]*Product--Image[^"\s<>]*/' + $ref + '/' + $ref + '\.png'
                $imageUrl = [regex]::Match($html, $pattern).Value
                if ($imageUrl.StartsWith('/')) { $imageUrl = 'https://www.grand-seiko.com' + $imageUrl }
                $plain = [System.Net.WebUtility]::HtmlDecode(([regex]::Replace($html, '<[^>]+>', ' ')))
                $price = [regex]::Match($plain, 'USD\s+([\d,]+\.\d{2})').Groups[1].Value
                if ([decimal]($price.Replace(',', '')) -ne $w.price) { throw "Official price changed for $($w.reference); update the manifest first." }
            }
        }
        if (!$imageUrl -or !([uri]$imageUrl).IsAbsoluteUri) { throw "No product image found for $($w.reference)" }
        $response = Invoke-WebRequest ([System.Net.WebUtility]::HtmlDecode($imageUrl)) -TimeoutSec 30
        if ($response.Headers['Content-Type'][0] -notlike 'image/*') { throw 'The image endpoint returned non-image content.' }
        $filePath = Join-Path $targetDirectory ($w.reference.ToLowerInvariant() + '.png')
        [IO.File]::WriteAllBytes($filePath, [byte[]]$response.Content)
        [PSCustomObject]@{ reference = $w.reference; imageSourceUrl = $imageUrl; bytes = $response.RawContentLength }
    } catch {
        throw "$($w.reference): $($_.Exception.Message)"
    }
} -ThrottleLimit 4

foreach ($watch in $taskCatalogue.watches) {
    $asset = $taskResults | Where-Object reference -eq $watch.reference
    if (!$asset) { throw "Missing image: $($watch.reference)" }
    $watch | Add-Member -NotePropertyName imageSourceUrl -NotePropertyValue $asset.imageSourceUrl -Force
}
$taskCatalogue | ConvertTo-Json -Depth 15 | Set-Content -LiteralPath $taskManifestPath -Encoding utf8
$taskResults | Select-Object reference, bytes | Format-Table
