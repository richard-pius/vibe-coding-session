$base = 'http://localhost:5000'
$timestamp = [int](Get-Date -UFormat %s)
$email = "smoke+$timestamp@example.com"
$password = 'Pass123!'
$username = "smoke_user_$timestamp"

function PostJson($url, $obj, $token) {
  $json = $obj | ConvertTo-Json -Depth 5
  $headers = @{}
  if ($token) { $headers['Authorization'] = "Bearer $token" }
  try {
    return Invoke-RestMethod -Uri $url -Method Post -Body $json -ContentType 'application/json' -Headers $headers
  } catch {
    return $_.Exception.Response | Select-Object -ExpandProperty Content | ConvertFrom-Json -ErrorAction SilentlyContinue
  }
}

function GetJson($url, $token) {
  $headers = @{}
  if ($token) { $headers['Authorization'] = "Bearer $token" }
  try { return Invoke-RestMethod -Uri $url -Method Get -Headers $headers } catch { return $_.Exception.Response | Select-Object -ExpandProperty Content | ConvertFrom-Json -ErrorAction SilentlyContinue }
}

Write-Host "Registering user $email ..."
$reg = PostJson "$base/api/auth/register" @{ username=$username; email=$email; password=$password }
if ($reg.success -ne $true) {
  Write-Host "Register failed or already exists: $($reg.error)" -ForegroundColor Yellow
  Write-Host "Attempting login..."
  $login = PostJson "$base/api/auth/login" @{ email=$email; password=$password }
} else {
  $login = $reg
}

if ($login.success -ne $true) {
  Write-Host "Login failed: $($login.error)" -ForegroundColor Red
  exit 1
}

$token = $login.data.token
$userId = $login.data.User_ID
Write-Host "Authenticated as $userId" -ForegroundColor Green

# Create a task
$due = (Get-Date).AddDays(2).ToString('yyyy-MM-dd')
Write-Host "Creating task..."
$taskRes = PostJson "$base/api/tasks" @{ User_ID = $userId; Task_Name = "Smoke Test Task"; Due_Date = $due } $token
if ($taskRes.success -ne $true) { Write-Host "Task create failed: $($taskRes.error)" -ForegroundColor Red; exit 1 }
Write-Host "Task created: $($taskRes.data.Task_ID)" -ForegroundColor Green

# Create a transaction
Write-Host "Creating transaction..."
$today = (Get-Date).ToString('yyyy-MM-dd')
$trx = PostJson "$base/api/transactions" @{ User_ID=$userId; Date=$today; Amount=12.34; Type='Expense'; Category='Groceries' } $token
if ($trx.success -ne $true) { Write-Host "Transaction create failed: $($trx.error)" -ForegroundColor Red; exit 1 }
Write-Host "Transaction created: $($trx.data.Transaction_ID)" -ForegroundColor Green

# Fetch tasks
Write-Host "Fetching tasks..."
$tasks = GetJson "$base/api/tasks?user_id=$userId" $token
Write-Host ($tasks | ConvertTo-Json -Depth 5)

# Fetch transactions
Write-Host "Fetching transactions..."
$transactions = GetJson "$base/api/transactions?user_id=$userId" $token
Write-Host ($transactions | ConvertTo-Json -Depth 5)

# Dashboard summary
$month = (Get-Date).Month
$year = (Get-Date).Year
Write-Host "Fetching dashboard summary..."
$summary = GetJson "$base/api/dashboard/summary?user_id=$userId&month=$month&year=$year" $token
Write-Host ($summary | ConvertTo-Json -Depth 5)

Write-Host "Smoke tests completed successfully." -ForegroundColor Green
