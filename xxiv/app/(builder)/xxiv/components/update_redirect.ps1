
$path = "c:\Users\Admin\Downloads\xxiv.web\xxiv\app\(builder)\xxiv\components\XXIVBuilderMain.tsx"
$content = Get-Content $path -Raw

# Use a regex that is flexible with whitespace and newlines
$oldPattern = "(?s)if\s*\(\s*response\.error\s*===\s*'Not authenticated'\s*\)\s*\{\s*toast\.error\s*\(\s*'You have been disconnected, please reload the page'\s*\)\s*;\s*\}"

$newText = "if (response.error === 'Not authenticated') {
              toast.error('You have been disconnected, please reload the page');
            } else if (response.error === 'Site not found' || response.error === 'Site ID is required') {
              toast.error('You do not have access to this project or the site ID is missing');
              router.push('/dashboard');
              return;
            }"

if ($content -match $oldPattern) {
    $updatedContent = $content -replace $oldPattern, $newText
    $updatedContent | Set-Content $path -NoNewline
    Write-Output "Successfully updated the file."
} else {
    Write-Error "Could not find the target pattern in the file."
    exit 1
}
