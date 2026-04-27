(async function () {
  const siteId = document.querySelector('meta[name="xxiv-site-id"]')?.content;
  const supabaseUrl = document.querySelector('meta[name="xxiv-supabase-url"]')?.content;
  const supabaseKey = document.querySelector('meta[name="xxiv-supabase-key"]')?.content;
  const siteAuthQuery = siteId ? `?site_id=${encodeURIComponent(siteId)}` : '';
  const siteHomeHref = siteId ? `/?xxiv_site_id=${encodeURIComponent(siteId)}` : '/';

  if (!siteId || !supabaseUrl || !supabaseKey || !window.supabase) {
    return;
  }

  const client = window.supabase.createClient(supabaseUrl, supabaseKey);
  const { data: { session } } = await client.auth.getSession();

  let siteUser = null;
  if (session?.access_token) {
    try {
      const response = await fetch(`/api/xxiv/site-auth/validate?site_id=${encodeURIComponent(siteId)}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const data = await response.json();
      if (data.valid) {
        siteUser = data.user;
      }
    } catch (error) {
      console.error('[xxiv-site-auth] Validation failed', error);
    }
  }

  document.querySelectorAll('[data-xxiv-auth]').forEach((element) => {
    const type = element.getAttribute('data-xxiv-auth');

    if (type === 'members-only') {
      if (!siteUser) {
        element.style.display = 'none';
        const prompt = document.createElement('div');
        prompt.innerHTML = `<div style="padding:24px;border:1px solid rgba(255,255,255,0.1);border-radius:16px;text-align:center"><p style="margin:0;color:inherit">Please log in to view this content.</p><a href="/xxiv-auth/login${siteAuthQuery}" style="display:inline-block;margin-top:16px;padding:10px 22px;background:#000;color:#fff;border-radius:10px;text-decoration:none">Log In</a></div>`;
        element.parentNode?.insertBefore(prompt, element.nextSibling);
      }
    }

    if (type === 'user-greeting') {
      element.textContent = siteUser
        ? `Welcome, ${siteUser.full_name || siteUser.email || 'Member'}`
        : 'Log In';

      if (!siteUser && element.tagName.toLowerCase() === 'a') {
        element.setAttribute('href', `/xxiv-auth/login${siteAuthQuery}`);
      }
    }

    if (type === 'logout') {
      element.addEventListener('click', async (event) => {
        event.preventDefault();
        await client.auth.signOut();
        window.location.href = siteHomeHref;
      });
    }
  });
})();
