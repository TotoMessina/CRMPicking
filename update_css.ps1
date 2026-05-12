$cssPath = 'src\index.css'
$content = Get-Content $cssPath -Raw

$content = $content -replace 'max-width: 1600px;', 'max-width: 2400px;'
$content = $content -replace 'grid-template-columns: 1fr 340px;', 'grid-template-columns: 1fr minmax(340px, 420px);'
$content = $content -replace 'grid-template-columns: 1fr 320px 240px;', 'grid-template-columns: 1fr minmax(320px, 400px) minmax(240px, 320px);'

$searchString = '@media (max-width: 1280px) {'
$index = $content.IndexOf($searchString)

if ($index -ge 0) {
    $newQueries = @'
@media (max-width: 1280px) {
    .db-row-3 { grid-template-columns: 1fr 300px; }
    .db-churn-panel { display: none; }
    .db-row-4 { grid-template-columns: 1fr 1fr; }
    .db-activity-panel { grid-column: span 2; }
}

@media (max-width: 1024px) {
    .db-row-1 { grid-template-columns: 1fr; }
    .db-kpi-grid { 
        grid-template-rows: unset; 
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); 
    }
    .db-kpi-card:hover { transform: translateY(-4px); box-shadow: none; }
    .db-row-3 { grid-template-columns: 1fr; }
    .db-map-body { min-height: 400px; }
    .db-feed-panel { min-height: 350px; }
    .db-row-4 { grid-template-columns: 1fr 1fr; }
    .db-activity-panel { grid-column: span 2; }
}

@media (max-width: 768px) {
    .db-shell { padding: 12px; gap: 16px; }
    .db-hero { padding: 24px 20px; min-height: auto; }
    .db-hero-title { font-size: 1.8rem; }
    
    .db-hero-stats { flex-wrap: wrap; gap: 12px; justify-content: flex-start; }
    .db-hs-div { display: none; }
    .db-hs { flex-direction: row; align-items: baseline; gap: 8px; flex: 1 1 calc(50% - 16px); min-width: 120px; }
    .db-hs-num { font-size: 1.3rem; }
    
    .db-kpi-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
    .db-actions-grid { grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
    
    .db-row-3 { grid-template-columns: 1fr; }
    .db-feed-panel { height: auto; min-height: 350px; }
    .db-row-4 { grid-template-columns: 1fr; }
    .db-activity-panel { grid-column: 1 / -1; }
}

@media (max-width: 480px) {
    .db-hero-title { font-size: 1.6rem; }
    .db-hero-stats { flex-direction: column; align-items: flex-start; gap: 10px; }
    .db-hs { flex: 1 1 100%; width: 100%; justify-content: space-between; }
    
    .db-kpi-grid { grid-template-columns: 1fr; gap: 10px; }
    .db-actions-grid { grid-template-columns: 1fr; gap: 10px; }
    .db-action-chip { padding: 12px 14px; }
    .db-action-chip-desc { display: inline-block; }
}
'@
    $newCss = $content.Substring(0, $index) + $newQueries
    Set-Content $cssPath $newCss -Encoding UTF8
    Write-Host 'Replaced CSS successfully.'
} else {
    Write-Host 'Could not find media queries to replace.'
}
