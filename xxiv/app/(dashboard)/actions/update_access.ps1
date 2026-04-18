
$path = "c:\Users\Admin\Downloads\xxiv.web\xxiv\app\(dashboard)\actions\sites.ts"
$content = Get-Content $path -Raw

# Pattern 1: getSiteById
$old1 = "(?s)\.from\('xxiv_sites'\)\s+\.select\('\*'\)\s+\.eq\('id', siteId\)\s+\.eq\('user_id', user.id\)\s+\.single\(\)"
$new1 = ".from('xxiv_sites').select('*').eq('id', siteId).single()"

# Pattern 2: getSiteSettings
$old2 = "(?s)\.from\('xxiv_sites'\)\s+\.select\('\*'\)\s+\.eq\('id', siteId\)\s+\.eq\('user_id', user.id\)\s+\.single\(\)"
# (Same as pattern 1, we can use Replace with -all if careful, but let's be specific)

# Let's just do a global replace for this specific chain which is always the same for ownership check
$updatedContent = $content -replace "\.eq\('user_id', user.id\)\s+\.single\(\)", ".single()"

# Wait, we want to keep it for DELETE and CUSTOM DOMAIN
# So let's be more specific about the functions

$updatedContent = $updatedContent -replace "(?s)(async function getSiteById\(siteId: string\) \{.*?)\.eq\('user_id', user.id\)\s+\.single\(\)", "`$1.single()"
$updatedContent = $updatedContent -replace "(?s)(async function getSiteSettings\(siteId: string\) \{.*?)\.eq\('user_id', user.id\)\s+\.single\(\)", "`$1.single()"
$updatedContent = $updatedContent -replace "(?s)(async function openSiteEditor\(siteId: string\) \{.*?)\.eq\('user_id', user.id\)\s+\.single\(\)", "`$1.single()"

$updatedContent | Set-Content $path -NoNewline
Write-Output "Successfully updated site actions in sites.ts"
