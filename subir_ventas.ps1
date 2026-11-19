<#
 subir_ventas.ps1 - Sube las ventas (con hora) de MySQL a la base de la web (Supabase).

 Modos (elige uno):
   (sin parametros)        hoy y ayer                      -> para correr cada hora
   -Mes                    del dia 1 del mes actual a hoy  -> para correr cada noche
   -CargaInicial           del 1 de enero del anio pasado a hoy, por meses (una sola vez)
   -Desde 2026-11-01 -Hasta 2026-11-13    rango manual (Hasta incluido)

 Es idempotente: si corres el mismo rango dos veces no duplica (actualiza por folio + codigo + baja + fecha).
 Solo lee de MySQL. Los montos que sube son venta CON intereses y sin IVA (venta_total).
 No sube cuenta de cliente, nomina, saldos ni enganche.

 Configuracion: web_config.json junto al script (NO lo subas a GitHub):
   { "dsn": "crediland", "url": "https://TU-PROYECTO.supabase.co", "service_key": "..." }

 Pruebas:  -DryRun        lee MySQL y muestra cuantas filas subiria, sin enviar
           -DatosCsv x.csv  usa un CSV en vez de MySQL (para probar el envio)
#>
param(
    [switch] $Mes,
    [switch] $CargaInicial,
    [string] $Desde,
    [string] $Hasta,
    [switch] $DryRun,
    [string] $DatosCsv,
    [int] $LoteFilas = 1000
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

# Evita que dos corridas se pisen (hora y noche)
$mutex = New-Object System.Threading.Mutex($false, 'Global\subir_ventas_web')
if (-not $mutex.WaitOne(0)) { Write-Log 'INFO' 'Ya hay una carga en curso; se omite esta corrida.'; exit 0 }

try {
    $cfgPath = Join-Path $baseDir 'web_config.json'
    if (-not (Test-Path -LiteralPath $cfgPath)) { throw "Falta web_config.json en $baseDir" }
    $cfg = Get-Content -LiteralPath $cfgPath -Raw -Encoding UTF8 | ConvertFrom-Json
    $base = ([string]$cfg.url).Trim().TrimEnd('/')
    if ($base -match '/rest/v1$') { $base = $base.Substring(0, $base.Length - 8) }   # tolera que pegues la URL con /rest/v1
    if ([string]::IsNullOrWhiteSpace([string]$cfg.service_key) -or ([string]$cfg.service_key) -match 'AQUI|\{|\s') { throw 'service_key en web_config.json no es una llave valida: pega solo la llave, sin llaves ni comillas extra.' }
    # Llaves nuevas de Supabase (sb_secret_...) van solo en 'apikey'; las clasicas (service_role, formato JWT) van en ambos encabezados.
    $hdr = @{ apikey = [string]$cfg.service_key }
    if (-not ([string]$cfg.service_key).StartsWith('sb_')) { $hdr['Authorization'] = 'Bearer ' + [string]$cfg.service_key }

    $sqlTpl = Get-Content -LiteralPath (Join-Path $baseDir 'web_ventas.sql') -Raw -Encoding UTF8

    # ---------- Rango(s) a cargar ----------
    $hoy = (Get-Date).Date
    $rangos = @()
    if ($Desde) {
        $d = [datetime]::ParseExact($Desde, 'yyyy-MM-dd', $inv)
        if ($Hasta) { $h = [datetime]::ParseExact($Hasta, 'yyyy-MM-dd', $inv) } else { $h = $hoy }
        $rangos += , @($d, $h)
    }
    elseif ($CargaInicial) {
        $cur = New-Object DateTime (($hoy.Year - 1), 1, 1)
        while ($cur -le $hoy) {
            $fin = $cur.AddMonths(1).AddDays(-1)
            if ($fin -gt $hoy) { $fin = $hoy }
            $rangos += , @($cur, $fin)
            $cur = $cur.AddMonths(1)
        }
    }
    elseif ($Mes) { $rangos += , @((New-Object DateTime ($hoy.Year, $hoy.Month, 1)), $hoy) }
    else { $rangos += , @($hoy.AddDays(-1), $hoy) }

    function Get-Filas([datetime] $d, [datetime] $h) {
        if ($DatosCsv) { return @(Import-Csv -LiteralPath $DatosCsv -Encoding UTF8) }
        $sql = $sqlTpl.Replace('{{DESDE}}', $d.ToString('yyyy-MM-dd', $inv)).Replace('{{HASTA1}}', $h.AddDays(1).ToString('yyyy-MM-dd', $inv))
        $conn = New-Object System.Data.Odbc.OdbcConnection("DSN=$($cfg.dsn)")
        try {
            $conn.Open()
            $cmd = $conn.CreateCommand(); $cmd.CommandText = $sql; $cmd.CommandTimeout = 600
            $ad = New-Object System.Data.Odbc.OdbcDataAdapter($cmd)
            $dt = New-Object System.Data.DataTable
            [void]$ad.Fill($dt)
            return @($dt.Rows)
        }
        finally { $conn.Close(); $conn.Dispose() }
    }

    function ConvertTo-Dec($v) {
        if ($null -eq $v -or $v -is [System.DBNull] -or [string]$v -eq '') { return $null }
        return [decimal]::Parse([string]$v, $inv)
    }

    function Send-Lote($filas) {
        $url = $base + '/rest/v1/ventas_detalle?on_conflict=folio_venta,codigo,es_baja,fecha'
        $json = ConvertTo-Json -InputObject $filas.ToArray() -Compress -Depth 3
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
        $h2 = @{} + $hdr
        $h2['Prefer'] = 'resolution=merge-duplicates,return=minimal'
        [void](Invoke-RestMethod -Method Post -Uri $url -Headers $h2 -ContentType 'application/json; charset=utf-8' -Body $bytes -TimeoutSec 120)
    }

    function Send-Bitacora($desde, $hasta, $n, $ok, $msg) {
        try {
            $o = [ordered]@{ tabla = 'ventas_detalle'; desde = $desde; hasta = $hasta; filas = $n; ok = $ok; mensaje = $msg }
            $bytes = [System.Text.Encoding]::UTF8.GetBytes((ConvertTo-Json -InputObject @($o) -Compress))
            [void](Invoke-RestMethod -Method Post -Uri ($base + '/rest/v1/carga_log') -Headers $hdr -ContentType 'application/json; charset=utf-8' -Body $bytes -TimeoutSec 60)
        }
        catch { Write-Log 'ERROR' ('No se pudo escribir la bitacora: ' + $_.Exception.Message) }
    }

    $total = 0
    foreach ($r in $rangos) {
        $d = $r[0]; $h = $r[1]
        $dTxt = $d.ToString('yyyy-MM-dd', $inv); $hTxt = $h.ToString('yyyy-MM-dd', $inv)
        $filas = Get-Filas $d $h
        $lote = New-Object System.Collections.Generic.List[object]
        $n = 0
        foreach ($f in $filas) {
            $o = [ordered]@{
                folio_venta     = [string]$f.folio_venta
                codigo          = [string]$f.codigo
                es_baja         = ([string]$f.es_baja -eq '1')
                fecha           = [string]$f.fecha
                hr              = $(if ([string]$f.hr -ne '') { [int]$f.hr } else { $null })
                clave_muebleria = [string]$f.clave_muebleria
                clave_vendedor  = $(if ([string]$f.clave_vendedor -ne '') { [string]$f.clave_vendedor } else { $null })
                tipo_venta      = [string]$f.tipo_venta
                generico        = $(if ([string]$f.generico -ne '') { [string]$f.generico } else { $null })
                cantidad        = [int](ConvertTo-Dec $f.cantidad)
                venta_total     = ConvertTo-Dec $f.venta_total
                vtaretail       = ConvertTo-Dec $f.vtaretail
                intereses       = ConvertTo-Dec $f.intereses
                costo           = ConvertTo-Dec $f.costo
            }
            [void]$lote.Add($o); $n++
            if ($lote.Count -ge $LoteFilas) {
                if (-not $DryRun) { Send-Lote $lote }
                $lote.Clear()
            }
        }
        if ($lote.Count -gt 0 -and -not $DryRun) { Send-Lote $lote }
        $total += $n
        if ($DryRun) { Write-Log 'INFO' ("Prueba sin enviar: {0} fila(s) del {1} al {2}" -f $n, $dTxt, $hTxt) }
        else {
            Write-Log 'EXITO' ("Ventas: {0} fila(s) subidas del {1} al {2}" -f $n, $dTxt, $hTxt)
            Send-Bitacora $dTxt $hTxt $n $true $null
        }
    }
    exit 0
}
catch {
    Write-Log 'ERROR' ('Subir ventas - ' + $_.Exception.Message)
    try { Send-Bitacora $null $null 0 $false $_.Exception.Message } catch { }
    exit 1
}
finally {
    try { $mutex.ReleaseMutex() } catch { }
}
