<#
 subir_catalogos.ps1 - Sube el catalogo de vendedores (clave y nombre) a la web, para que los reportes muestren nombres.
 Usa el mismo web_config.json que subir_ventas.ps1. Es seguro repetirlo (actualiza, no duplica).
 Pruebas:  -DryRun (solo cuenta)   -DatosCsv x.csv (usa un CSV en vez de MySQL)
#>
param(
    [switch] $DryRun,
    [string] $DatosCsv
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

    if ($DatosCsv) { $filas = @(Import-Csv -LiteralPath $DatosCsv -Encoding UTF8) }
    else {
        $sql = Get-Content -LiteralPath (Join-Path $baseDir 'web_vendedores.sql') -Raw -Encoding UTF8
        $conn = New-Object System.Data.Odbc.OdbcConnection("DSN=$($cfg.dsn)")
        try {
            $conn.Open()
            $cmd = $conn.CreateCommand(); $cmd.CommandText = $sql; $cmd.CommandTimeout = 120
            $ad = New-Object System.Data.Odbc.OdbcDataAdapter($cmd)
            $dt = New-Object System.Data.DataTable
            [void]$ad.Fill($dt)
            $filas = @($dt.Rows)
        }
        finally { $conn.Close(); $conn.Dispose() }
    }

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
    if ($DryRun) { Write-Log 'INFO' ("Prueba sin enviar: {0} vendedor(es)" -f $lista.Count); exit 0 }

    $h2 = @{} + $hdr
    $h2['Prefer'] = 'resolution=merge-duplicates,return=minimal'
    for ($i = 0; $i -lt $lista.Count; $i += 500) {
        $n = [Math]::Min(500, $lista.Count - $i)
        $lote = $lista.GetRange($i, $n).ToArray()
        $bytes = [System.Text.Encoding]::UTF8.GetBytes((ConvertTo-Json -InputObject $lote -Compress -Depth 3))
        [void](Invoke-RestMethod -Method Post -Uri ($base + '/rest/v1/vendedores?on_conflict=clave_vendedor') -Headers $h2 -ContentType 'application/json; charset=utf-8' -Body $bytes -TimeoutSec 120)
    }
    Write-Log 'EXITO' ("Vendedores: {0} registro(s) subidos" -f $lista.Count)
    exit 0
}
catch {
    Write-Log 'ERROR' ('Subir catalogos - ' + $_.Exception.Message)
    exit 1
}
