<#
 subir_catalogos.ps1 - Sube los catalogos a la web: vendedores (clave y nombre) y categorias (genericos), para que los reportes muestren nombres.
 Usa el mismo web_config.json que subir_ventas.ps1. Es seguro repetirlo (actualiza, no duplica).
 Pruebas:  -DryRun (solo cuenta)   -DatosCsv x.csv / -GenericosCsv y.csv (usan un CSV en vez de MySQL)
#>
param(
    [switch] $DryRun,
    [string] $DatosCsv,
    [string] $GenericosCsv
)
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.ServicePointManager]::SecurityProtocol
$inv = [System.Globalization.CultureInfo]::InvariantCulture
$baseDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$logPath = Join-Path $baseDir 'subir_ventas.log'
function Write-Log([string] $nivel, [string] $msg) {
    $linea = '[{0}] {1} - {2}' -f (Get-Date).ToString('dd/MM/yyyy HH:mm:ss'), $nivel, $msg
    Add-Content -LiteralPath $logPath -Value $linea -Encoding UTF8
    Write-Host $linea
}
try {
    $cfg = Get-Content -LiteralPath (Join-Path $baseDir 'web_config.json') -Raw -Encoding UTF8 | ConvertFrom-Json
    $base = ([string]$cfg.url).Trim().TrimEnd('/')
    if ($base -match '/rest/v1$') { $base = $base.Substring(0, $base.Length - 8) }
    if ([string]::IsNullOrWhiteSpace([string]$cfg.service_key) -or ([string]$cfg.service_key) -match 'AQUI|\{|\s') { throw 'service_key en web_config.json no es una llave valida.' }
    $hdr = @{ apikey = [string]$cfg.service_key }
    if (-not ([string]$cfg.service_key).StartsWith('sb_')) { $hdr['Authorization'] = 'Bearer ' + [string]$cfg.service_key }

    function Get-Filas([string] $archivoSql, [string] $csv) {
        if ($csv) { return @(Import-Csv -LiteralPath $csv -Encoding UTF8) }
        $sql = Get-Content -LiteralPath (Join-Path $baseDir $archivoSql) -Raw -Encoding UTF8
        $conn = New-Object System.Data.Odbc.OdbcConnection("DSN=$($cfg.dsn)")
        try {
            $conn.Open()
            $cmd = $conn.CreateCommand(); $cmd.CommandText = $sql; $cmd.CommandTimeout = 300
            $ad = New-Object System.Data.Odbc.OdbcDataAdapter($cmd)
            $dt = New-Object System.Data.DataTable
            [void]$ad.Fill($dt)
            return @($dt.Rows)
        }
        finally { $conn.Close(); $conn.Dispose() }
    }

    function Send-Lotes($lista, [string] $ruta) {
        $h2 = @{} + $hdr
        $h2['Prefer'] = 'resolution=merge-duplicates,return=minimal'
        for ($i = 0; $i -lt $lista.Count; $i += 500) {
            $n = [Math]::Min(500, $lista.Count - $i)
            $lote = $lista.GetRange($i, $n).ToArray()
            $bytes = [System.Text.Encoding]::UTF8.GetBytes((ConvertTo-Json -InputObject $lote -Compress -Depth 3))
            [void](Invoke-RestMethod -Method Post -Uri ($base + $ruta) -Headers $h2 -ContentType 'application/json; charset=utf-8' -Body $bytes -TimeoutSec 120)
        }
    }

    $filas = Get-Filas 'web_vendedores.sql' $DatosCsv

    $ahora = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ', $inv)
    $lista = New-Object System.Collections.Generic.List[object]
    foreach ($f in $filas) {
        $ing = [string]$f.fecha_ingreso
        if ($ing -notmatch '^\d{4}-\d{2}-\d{2}') { $ing = $null } elseif ($ing.StartsWith('0000')) { $ing = $null } else { $ing = $ing.Substring(0, 10) }
        [void]$lista.Add([ordered]@{
            clave_vendedor = ([string]$f.clave_vendedor).Trim()
            nombre         = (([string]$f.nombre) -replace '\s+', ' ').Trim()
            fecha_ingreso  = $ing
            vigente        = ([string]$f.vigente -eq '1')
            actualizado    = $ahora
        })
    }
    # ---- Categorias (genericos) ----
    $gfilas = Get-Filas 'web_genericos.sql' $GenericosCsv
    $glista = New-Object System.Collections.Generic.List[object]
    foreach ($g in $gfilas) {
        $cod = ([string]$g.generico).Trim()
        if ($cod -eq '') { continue }
        [void]$glista.Add([ordered]@{
            generico    = $cod
            linea       = $(if ([string]$g.linea -ne '') { ([string]$g.linea).Trim() } else { $null })
            ramo        = $(if ([string]$g.ramo -ne '') { ([string]$g.ramo).Trim() } else { $null })
            categoria   = $(if ([string]$g.categoria -ne '') { ([string]$g.categoria).Trim() } else { $null })
            tipo        = $(if ([string]$g.tipo -ne '') { ([string]$g.tipo).Trim() } else { $null })
            categoprior = $(if ([string]$g.categoprior -eq '1') { 1 } else { 0 })
        })
    }

    if ($DryRun) { Write-Log 'INFO' ("Prueba sin enviar: {0} vendedor(es), {1} categoria(s)" -f $lista.Count, $glista.Count); exit 0 }

    Send-Lotes $lista '/rest/v1/vendedores?on_conflict=clave_vendedor'
    Write-Log 'EXITO' ("Vendedores: {0} registro(s) subidos" -f $lista.Count)
    Send-Lotes $glista '/rest/v1/genericos?on_conflict=generico'
    Write-Log 'EXITO' ("Categorias: {0} registro(s) subidos" -f $glista.Count)
    exit 0
}
catch {
    Write-Log 'ERROR' ('Subir catalogos - ' + $_.Exception.Message)
    exit 1
}
