'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/useAuthStore';
import { useEffect } from 'react';

export default function LandingPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const authInitialized = useAuthStore((state) => state.initialized);

  useEffect(() => {
    if (authInitialized && user) {
      router.push('/ycode');
    }
  }, [user, authInitialized, router]);

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Navigation */}
      <nav className="border-b border-white/10 sticky top-0 z-50 bg-black/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold">XXIV</div>
          <div className="flex gap-4">
            <Link href="/login" className="px-4 py-2 text-white/80 hover:text-white transition">
              Sign In
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 bg-white text-black rounded-lg font-semibold hover:bg-white/90 transition"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-6xl md:text-7xl font-bold mb-6 leading-tight">
            Build Your Website Visually
          </h1>
          <p className="text-xl text-white/60 mb-8 leading-relaxed">
            Create stunning, responsive websites without writing code. Design in real-time with our intuitive visual builder.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/signup"
              className="px-8 py-4 bg-white text-black rounded-lg font-semibold text-lg hover:bg-white/90 transition"
            >
              Start Building Free
            </Link>
            <Link
              href="#features"
              className="px-8 py-4 border border-white/20 rounded-lg font-semibold text-lg hover:border-white/40 transition"
            >
              Learn More
            </Link>
          </div>
        </div>

        {/* Hero Visual */}
        <div className="mt-20 aspect-video bg-gradient-to-b from-white/10 to-white/5 rounded-xl border border-white/10 flex items-center justify-center">
          <div className="text-white/40">
            <svg className="w-24 h-24 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5a4 4 0 100-8 4 4 0 000 8z" />
            </svg>
            <p>Design Preview</p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-24 border-t border-white/10">
        <h2 className="text-4xl font-bold mb-16 text-center">Powerful Features</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            {
              icon: '✨',
              title: 'Visual Builder',
              description: 'Drag and drop to design. See changes in real-time.',
            },
            {
              icon: '⚡',
              title: 'Lightning Fast',
              description: 'Optimized performance out of the box.',
            },
            {
              icon: '📱',
              title: 'Responsive Design',
              description: 'Perfect on mobile, tablet, and desktop.',
            },
            {
              icon: '🔧',
              title: 'Components',
              description: 'Reusable components for faster builds.',
            },
            {
              icon: '🌐',
              title: 'Deploy Anywhere',
              description: 'Export or deploy to your own server.',
            },
            {
              icon: '🎨',
              title: 'Customizable',
              description: 'Full control over styling and functionality.',
            },
          ].map((feature, idx) => (
            <div key={idx} className="bg-white/5 border border-white/10 rounded-lg p-8 hover:border-white/20 transition">
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-white/60">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-7xl mx-auto px-6 py-24 border-t border-white/10">
        <h2 className="text-4xl font-bold mb-16 text-center">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { step: '1', title: 'Create', description: 'Start a new project in seconds' },
            { step: '2', title: 'Design', description: 'Build your site visually with our editor' },
            { step: '3', title: 'Deploy', description: 'Publish to the web instantly' },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center text-3xl font-bold mx-auto mb-4">
                {item.step}
              </div>
              <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
              <p className="text-white/60">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-6 py-24 border-t border-white/10">
        <div className="bg-gradient-to-r from-white/10 to-white/5 border border-white/20 rounded-xl p-12 text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to build?</h2>
          <p className="text-xl text-white/60 mb-8">Create your first website today. No credit card required.</p>
          <Link
            href="/signup"
            className="inline-block px-8 py-4 bg-white text-black rounded-lg font-semibold text-lg hover:bg-white/90 transition"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-white/60">
                <li><Link href="#" className="hover:text-white transition">Features</Link></li>
                <li><Link href="#" className="hover:text-white transition">Pricing</Link></li>
                <li><Link href="#" className="hover:text-white transition">Docs</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-white/60">
                <li><Link href="#" className="hover:text-white transition">About</Link></li>
                <li><Link href="#" className="hover:text-white transition">Blog</Link></li>
                <li><Link href="#" className="hover:text-white transition">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-white/60">
                <li><Link href="#" className="hover:text-white transition">Privacy</Link></li>
                <li><Link href="#" className="hover:text-white transition">Terms</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Connect</h4>
              <ul className="space-y-2 text-white/60">
                <li><Link href="#" className="hover:text-white transition">Twitter</Link></li>
                <li><Link href="#" className="hover:text-white transition">Discord</Link></li>
                <li><Link href="#" className="hover:text-white transition">GitHub</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 flex items-center justify-between">
            <p className="text-white/60">© 2024 XXIV. All rights reserved.</p>
            <div className="text-2xl font-bold">XXIV</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
