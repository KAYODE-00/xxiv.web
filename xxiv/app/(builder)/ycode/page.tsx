'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/useAuthStore';
import Link from 'next/link';

export default function YCodeDashboard() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const authInitialized = useAuthStore((state) => state.initialized);
  const [sites, setSites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authInitialized) return;

    if (!user) {
      router.push('/login');
      return;
    }

    // Fetch user's sites/projects
    const fetchSites = async () => {
      try {
        // TODO: Replace with actual API endpoint
        setSites([]);
      } catch (error) {
        console.error('Failed to fetch sites:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSites();
  }, [user, authInitialized, router]);

  if (!authInitialized || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-white/60 mt-1">Welcome back, {user?.email}</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Create New Site */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold mb-6">Projects</h2>
          <Link
            href="/ycode"
            className="inline-block px-6 py-3 bg-white text-black rounded-lg font-semibold hover:bg-white/90 transition"
          >
            ➕ Create New Project
          </Link>
        </div>

        {/* Sites Grid */}
        {sites.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-white/60 mb-6">No projects yet. Get started by creating your first project.</p>
            <Link
              href="/ycode/welcome"
              className="inline-block px-6 py-3 bg-white/10 border border-white/20 rounded-lg font-semibold hover:bg-white/20 transition"
            >
              Learn More
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sites.map((site) => (
              <div
                key={site.id}
                className="bg-white/5 border border-white/10 rounded-lg p-6 hover:bg-white/10 transition cursor-pointer"
              >
                <h3 className="font-semibold text-lg">{site.name}</h3>
                <p className="text-white/60 text-sm mt-2">{site.description}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
