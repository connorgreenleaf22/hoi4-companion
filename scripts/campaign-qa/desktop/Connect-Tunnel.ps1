$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $taskRoot
$Host.UI.RawUI.WindowTitle = 'HOI4 Q&A - Secure MCP Tunnel'
$client = Join-Path $taskRoot 'tunnel-client/tunnel-client.exe'
$local = Join-Path $taskRoot '.bridge-local/qa-tunnel'
$secureKey = $null
try {
  & node -e "if(process.versions.node.split('.')[0] !== '24') { console.error('Install Node.js 24 LTS first.'); process.exit(1); }"
  if ($LASTEXITCODE -ne 0) { throw 'Node.js 24 is required for this pilot build.' }
  $descriptor = Join-Path $taskRoot '.bridge-local/qa-app/campaign-qa-connection.json'
  if (-not (Test-Path -LiteralPath $descriptor)) { throw 'Start Observation Service.cmd first and keep it open.' }
  & node build/smoke-qa.cjs $descriptor
  if ($LASTEXITCODE -ne 0) { throw 'Local six-tool smoke test failed; the tunnel was not started.' }
  Write-Host 'Stop the tunnel on any other PC before continuing.'
  $tunnel = Read-Host 'Existing tunnel ID (tunnel_...)'
  & node desktop/configure.cjs $tunnel
  if ($LASTEXITCODE -ne 0) { throw 'Invalid tunnel ID.' }
  Write-Host 'Use a runtime key limited to Tunnels Read + Use. Never use an admin key.'
  $secureKey = Read-Host 'Runtime API key (hidden; not saved)' -AsSecureString
  $credential = New-Object System.Net.NetworkCredential('', $secureKey)
  $env:CONTROL_PLANE_API_KEY = $credential.Password
  $credential = $null
  $env:LOG_HTTP_RAW_UNSAFE = 'false'
  $env:TRACING_ENABLED = 'false'
  $env:ALLOW_REMOTE_UI = 'false'
  & $client doctor --config (Join-Path $local 'profile.yaml') --explain *> (Join-Path $local 'doctor.txt')
  if ($LASTEXITCODE -ne 0) { throw 'Tunnel checks failed. Keep .bridge-local/qa-tunnel/doctor.txt locally for review.' }
  Write-Host 'Starting the read-only tunnel. Leave this window open; Ctrl+C stops it.'
  Write-Host 'The tunnel does not launch HOI4 or start recording.'
  & $client run --config (Join-Path $local 'profile.yaml')
  if ($LASTEXITCODE -ne 0) { throw 'Tunnel stopped with an error. Keep local tunnel.log for review.' }
} catch {
  Write-Host $_.Exception.Message -ForegroundColor Red
  Read-Host 'Press Enter to close' | Out-Null
} finally {
  Remove-Item Env:CONTROL_PLANE_API_KEY -ErrorAction SilentlyContinue
  if ($secureKey) { $secureKey.Dispose() }
}
