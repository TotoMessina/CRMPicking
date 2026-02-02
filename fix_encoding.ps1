$path = "c:\Users\Usr\Desktop\CRMPicking-main\mapa.js"
$content = Get-Content -Path $path -Raw
$content = $content.Replace('ðŸ—‘ï¸', '🗑️')
$content = $content.Replace('SÃ­', 'Sí')
$content = $content.Replace('Ã³', 'ó')
$content = $content.Replace('Ã¡', 'á')
$content = $content.Replace('Ã©', 'é')
$content = $content.Replace('Ã­', 'í')
$content = $content.Replace('Ãº', 'ú')
$content = $content.Replace('Ã±', 'ñ')
$content = $content.Replace('Â¿', '¿')
$content = $content.Replace('â€œ', '“')
$content = $content.Replace('â€', '”')
$content = $content.Replace('â€”', '—')
$content = $content.Replace('ðŸ”µ', '🔵')
$content = $content.Replace('ðŸ”´', '🔴')
$content = $content.Replace('ðŸŸ ', '🟠')
$content = $content.Replace('â˜€ï¸', '☀️')
$content = $content.Replace('ðŸŒ™', '🌙')
# Extra safety for 'Limit prÃ¡ctico'
$content = $content.Replace('prÃ¡ctico', 'práctico')
# 'Sin interÃ©s'
$content = $content.Replace('interÃ©s', 'interés')
# 'DirecciÃ³n'
$content = $content.Replace('DirecciÃ³n', 'Dirección')
# 'SÃ¡b'
$content = $content.Replace('SÃ¡b', 'Sáb')
Set-Content -Path $path -Value $content -Encoding UTF8
Write-Host "Encoding fixed."
