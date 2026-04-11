'use client';

import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  const router = useRouter();

  const handleGetStarted = () => {
    // Routes directly to your dashboard/app entry point
    router.push('/dashboard'); 
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white selection:bg-white selection:text-black">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="bg-white p-1 rounded">
             <Icon name="ycode-logo" className="size-5 text-black" />
          </div>
          <span className="font-bold text-xl tracking-tight">Ycode</span>
        </div>
        <div className="hidden md:flex gap-8 text-sm text-neutral-400 font-medium">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#templates" className="hover:text-white transition-colors">Templates</a>
          <a href="#docs" className="hover:text-white transition-colors">Docs</a>
        </div>
        <Button
          variant="outline" 
          className="border-white/10 bg-white text-black transition-all"
          onClick={handleGetStarted}
        >
          Sign In
        </Button>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 px-6 overflow-hidden">
        {/* Ambient Glow Background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-b from-white/5 to-transparent blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs font-medium text-neutral-400 mb-8 animate-in fade-in slide-in-from-bottom-2 duration-1000">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
xxiv
          </div>
          
          <h1 className="text-6xl md:text-8xl font-bold tracking-tighter mb-8 bg-gradient-to-b from-white to-neutral-500 bg-clip-text text-transparent">
            Build without <br /> boundaries.
          </h1>
          
          <p className="text-lg md:text-xl text-neutral-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            The next-generation site builder for professionals. High-performance exports, 
            Next.js integration, and a black-and-white interface designed for focus.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              size="lg" 
              onClick={handleGetStarted}
              className="h-14 px-10 bg-white text-black hover:bg-neutral-200 text-base font-semibold transition-transform hover:scale-105 active:scale-95"
            >
              Open Dashboard
              <Icon name="arrow-right" className="ml-2 size-4" />
            </Button>
            <Button 
              size="lg" 
              variant="ghost" 
              className="h-14 px-8 text-neutral-400 hover:text-white hover:bg-white/5"
            >
              View Templates
            </Button>
          </div>
        </div>
      </section>

      {/* Feature Section Preview */}
      <section className="px-6 py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { title: "React Native", desc: "Export pure React code instantly." },
              { title: "Visual Logic", desc: "Nodes over code. Complexity made simple." },
              { title: "Cloud Sync", desc: "Real-time collaboration across teams." }
            ].map((feature, i) => (
              <div key={i} className="group cursor-default">
                <div className="h-px w-full bg-gradient-to-r from-white/20 to-transparent mb-6 group-hover:from-white transition-all duration-500" />
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-neutral-500 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 text-center text-neutral-600 text-xs tracking-widest uppercase">
        © 2026 XXIV Web
      </footer>
    </div>
  );
}