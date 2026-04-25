'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';

type SiteMember = {
  id: string;
  email: string | null;
  full_name: string | null;
  is_active: boolean;
  created_at: string;
};

function formatDate(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function SiteMembersSettings({ siteId }: { siteId: string }) {
  const [members, setMembers] = useState<SiteMember[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    void (async () => {
      const response = await fetch(`/api/xxiv/site-auth/users?site_id=${encodeURIComponent(siteId)}`, {
        cache: 'no-store',
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error || 'Failed to load members');
        return;
      }

      setMembers(data.users || []);
    })();
  }, [siteId]);

  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return members;

    return members.filter((member) =>
      [member.email, member.full_name]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query)),
    );
  }, [members, search]);

  function updateMember(userId: string, payload: { is_active?: boolean; action?: 'delete' }) {
    startTransition(async () => {
      setError(null);
      const response = await fetch(`/api/xxiv/site-auth/users/${userId}?site_id=${encodeURIComponent(siteId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error || 'Failed to update member');
        return;
      }

      setMembers((current) => {
        if (payload.action === 'delete') {
          return current.filter((member) => member.id !== userId);
        }

        return current.map((member) =>
          member.id === userId
            ? { ...member, ...(payload.is_active !== undefined ? { is_active: payload.is_active } : {}) }
            : member,
        );
      });
    });
  }

  function exportCsv() {
    const rows = [
      ['email', 'name', 'status', 'joined'],
      ...filteredMembers.map((member) => [
        member.email || '',
        member.full_name || '',
        member.is_active ? 'active' : 'inactive',
        member.created_at || '',
      ]),
    ];

    const csv = rows
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'site-members.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-medium">Site Members</h2>
          <p className="mt-2 text-sm text-zinc-400">{members.length} user{members.length === 1 ? '' : 's'} on this site.</p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          className="rounded-md border border-zinc-700 px-3 py-2 text-sm text-white"
        >
          Export CSV
        </button>
      </div>

      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search members..."
        className="mt-4 w-full rounded-md border border-zinc-800 bg-black px-3 py-2 text-sm text-white outline-none"
      />

      {error && (
        <div className="mt-4 rounded-xl border border-red-900 bg-red-950/30 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-xl border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-black/60 text-zinc-400">
            <tr>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredMembers.map((member) => (
              <tr key={member.id} className="border-t border-zinc-800">
                <td className="px-4 py-3 text-zinc-200">{member.email || 'Unknown'}</td>
                <td className="px-4 py-3 text-zinc-300">{member.full_name || '—'}</td>
                <td className="px-4 py-3 text-zinc-400">{formatDate(member.created_at)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs ${member.is_active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-zinc-800 text-zinc-400'}`}>
                    {member.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => updateMember(member.id, { is_active: !member.is_active })}
                      className="rounded-md border border-zinc-700 px-3 py-2 text-xs text-white disabled:opacity-50"
                    >
                      {member.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => updateMember(member.id, { action: 'delete' })}
                      className="rounded-md border border-red-900 px-3 py-2 text-xs text-red-300 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredMembers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-zinc-500">
                  No site members yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
