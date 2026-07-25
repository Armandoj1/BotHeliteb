# start-heliteb.ps1 — Levanta el stack HELITEB si algo esta caido.
# Se ejecuta automaticamente al iniciar sesion (tarea programada "HELITEB-Autostart")
# y tambien puede correrse a mano:  powershell -File .\start-heliteb.ps1

$ErrorActionPreference = 'SilentlyContinue'
$projectDir  = 'C:\Users\JoseArmando\Documents\PruebaTecnicaHeliteb'
$ngrokExe    = 'C:\ngrok\ngrok.exe'
$ngrokDomain = 'revenued-unsocializing-julianna.ngrok-free.dev'

function Port-Up($port) {
    [bool](Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)
}

# 1. Stack Docker: postgres, ollama, API .NET (puerto 5090), pgadmin
if (-not (Port-Up 5090)) {
    Push-Location $projectDir
    docker compose up -d
    Pop-Location
}

# 2. ngrok con dominio fijo (expone el API .NET a InboxCRM/Lumark de produccion)
if (-not (Get-Process ngrok -ErrorAction SilentlyContinue)) {
    Start-Process $ngrokExe -ArgumentList 'http',"--url=$ngrokDomain",'5090' -WindowStyle Hidden
}
