
$path = "c:\Users\Admin\Downloads\xxiv.web\xxiv\app\(dashboard)\actions\sites.ts"
$content = Get-Content $path -Raw

$oldPattern = "(?s)export async function getUserSites\(\) \{.*?return data \|\| \[\];\s*\}"

$newText = "export async function getUserSites() {
  const user = await requireAuthUser();
  const supabase = await createDashboardClient();

  // 1. Fetch sites owned by user
  const { data: owned, error: ownedError } = await supabase
    .from('xxiv_sites')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (ownedError) throw ownedError;

  // 2. Fetch sites where user is a collaborator
  const { data: memberships, error: memberError } = await supabase
    .from('xxiv_site_members')
    .select('site_id')
    .eq('user_id', user.id);

  if (memberError) throw memberError;

  const collabSiteIds = (memberships || []).map(m => m.site_id);
  let collaborative: any[] = [];

  if (collabSiteIds.length > 0) {
    const { data: collabData, error: collabError } = await supabase
      .from('xxiv_sites')
      .select('*, owner:user_id(email)')
      .in('id', collabSiteIds)
      .order('created_at', { ascending: false });
    
    if (collabError) throw collabError;
    collaborative = collabData || [];
  }

  return {
    owned: owned || [],
    collaborative: collaborative
  };
}"

if ($content -match $oldPattern) {
    $updatedContent = $content -replace $oldPattern, $newText
    $updatedContent | Set-Content $path -NoNewline
    Write-Output "Successfully updated getUserSites in sites.ts"
} else {
    Write-Error "Could not find the target pattern in the file."
    exit 1
}
