<#
 instalar_tareas_web.ps1 - Crea las tareas de Windows que mantienen actualizada la web.

   WebVentas_Hora   cada hora (por defecto de 08:15 a 22:15): sube hoy y ayer
   WebVentas_Mes    cada dia a las 06:30: vuelve a subir el mes en curso (toma cancelaciones tardias y cifras finales)
   WebVentas_Catalogos  cada dia a las 06:20: actualiza nombres de vendedores

 Corre este instalador una sola vez, desde la carpeta donde estan subir_ventas.ps1 y web_config.json.
 No toca las tareas del reporte de Telegram (VentaHora, VentaCierre...).
 Para quitarlas:  schtasks /Delete /TN WebVentas_Hora /F   y   schtasks /Delete /TN WebVentas_Mes /F
#>
param(
    [string] $HoraInicio = '08:15',
    [int] $HorasRepeticion = 14,
    [string] $HoraMes = '06:30'
)

$ErrorActionPreference = 'Stop'
$carpeta = Split-Path -Parent $MyInvocation.MyCommand.Path
$script = Join-Path $carpeta 'subir_ventas.ps1'
if (-not (Test-Path -LiteralPath $script)) { throw "No existe $script (debe estar junto a este instalador)." }
if (-not (Test-Path -LiteralPath (Join-Path $carpeta 'web_config.json'))) { throw 'Falta web_config.json junto al script.' }
if (-not (Test-Path -LiteralPath (Join-Path $carpeta 'web_ventas.sql'))) { throw 'Falta web_ventas.sql junto al script.' }

$inv = [System.Globalization.CultureInfo]::InvariantCulture
$usuario = '{0}\{1}' -f $env:USERDOMAIN, $env:USERNAME
$baseArgs = '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "{0}"' -f $script
$inicioHora = [datetime]::ParseExact($HoraInicio, 'HH:mm', $inv)
$inicioMes = [datetime]::ParseExact($HoraMes, 'HH:mm', $inv)

$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 45)
$principal = New-ScheduledTaskPrincipal -UserId $usuario -LogonType Interactive -RunLevel Limited

# --- Cada hora ---
$trigHora = New-ScheduledTaskTrigger -Daily -At $inicioHora
$rep = New-ScheduledTaskTrigger -Once -At $inicioHora -RepetitionInterval (New-TimeSpan -Hours 1) -RepetitionDuration (New-TimeSpan -Hours $HorasRepeticion)
$trigHora.Repetition = $rep.Repetition
$accHora = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $baseArgs
Register-ScheduledTask -TaskName 'WebVentas_Hora' -Action $accHora -Trigger $trigHora -Settings $settings -Principal $principal `
    -Description 'Sube a la web las ventas de hoy y ayer (con hora)' -Force | Out-Null
Write-Host ('Creada: WebVentas_Hora  (cada hora desde {0}, {1} h de repeticion)' -f $HoraInicio, $HorasRepeticion)

# --- Cada dia: mes completo ---
$trigMes = New-ScheduledTaskTrigger -Daily -At $inicioMes
$accMes = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument ($baseArgs + ' -Mes')
Register-ScheduledTask -TaskName 'WebVentas_Mes' -Action $accMes -Trigger $trigMes -Settings $settings -Principal $principal `
    -Description 'Vuelve a subir el mes en curso (cancelaciones tardias y cifras finales)' -Force | Out-Null
Write-Host ('Creada: WebVentas_Mes   (cada dia a las {0})' -f $HoraMes)

# --- Cada dia: catalogos (vendedores) ---
if (Test-Path -LiteralPath (Join-Path $carpeta 'subir_catalogos.ps1')) {
    $trigCat = New-ScheduledTaskTrigger -Daily -At ([datetime]::ParseExact('06:20', 'HH:mm', $inv))
    $accCat = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument ('-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "{0}"' -f (Join-Path $carpeta 'subir_catalogos.ps1'))
    Register-ScheduledTask -TaskName 'WebVentas_Catalogos' -Action $accCat -Trigger $trigCat -Settings $settings -Principal $principal `
        -Description 'Actualiza el catalogo de vendedores en la web' -Force | Out-Null
    Write-Host 'Creada: WebVentas_Catalogos (cada dia a las 06:20)'
}

Write-Host ''
Write-Host 'Listo. Para probar una ahora:  schtasks /Run /TN WebVentas_Hora'
Write-Host 'El resultado queda en subir_ventas.log (misma carpeta).'
