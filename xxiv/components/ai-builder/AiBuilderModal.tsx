'use client';

import { useEffect, useMemo, useState } from 'react';
import { X, Upload, ImageIcon, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

type AiBuilderModalProps = {
  open: boolean;
  onClose: () => void;
  projectId: string;
};

type InputMode = 'describe' | 'upload';
type StepKey = 'analyzing' | 'planning' | 'creating' | 'styling' | 'publishing';
type StepStatus = 'pending' | 'in_progress' | 'completed';

type ProgressStep = {
  key: StepKey;
  label: string;
  status: StepStatus;
};

const EXAMPLE_PROMPTS = [
  {
    label: 'Restaurant in Abuja',
    prompt:
      'Build a premium restaurant website for Abuja Flame. Include Home, Menu, Reservations, About, and Contact pages. Use a dark charcoal background with warm copper accents, elegant typography, and bold food photography.',
  },
  {
    label: 'Fashion brand',
    prompt:
      'Create a modern fashion brand website for Atelier North. Include Home, Lookbook, New Arrivals, Story, and Contact pages. Minimal black and white design with editorial layouts and luxury serif headlines.',
  },
  {
    label: 'Law firm',
    prompt:
      'Design a professional website for Sterling Chambers, a Lagos law firm. Include Home, Practice Areas, Attorneys, Case Results, and Contact pages. Use navy, white, and muted gold with confident, trustworthy messaging.',
  },
  {
    label: 'Tech startup',
    prompt:
      'Create a landing-focused website for PulseGrid, a SaaS startup. Include Home, Product, Pricing, About, and Contact pages. Use a sleek near-black UI with silver accents, sharp sans-serif fonts, and conversion-focused sections.',
  },
];

const INITIAL_STEPS: ProgressStep[] = [
  { key: 'analyzing', label: 'Analyzing your input...', status: 'pending' },
  { key: 'planning', label: 'Planning your website structure...', status: 'pending' },
  { key: 'creating', label: 'Creating pages...', status: 'pending' },
  { key: 'styling', label: 'Adding content and styling...', status: 'pending' },
  { key: 'publishing', label: 'Publishing your website...', status: 'pending' },
];

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Failed to read image'));
        return;
      }
      const [, base64 = ''] = result.split(',');
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Failed to read image'));
    reader.readAsDataURL(file);
  });
}

function nextSteps(step: StepKey): ProgressStep[] {
  const order: StepKey[] = ['analyzing', 'planning', 'creating', 'styling', 'publishing'];
  const currentIndex = order.indexOf(step);

  return INITIAL_STEPS.map((item, index) => ({
    ...item,
    status: index < currentIndex ? 'completed' : index === currentIndex ? 'in_progress' : 'pending',
  }));
}

export default function AiBuilderModal({ open, onClose, projectId }: AiBuilderModalProps) {
  const [mode, setMode] = useState<InputMode>('describe');
  const [description, setDescription] = useState('');
  const [extraInstructions, setExtraInstructions] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState<ProgressStep[]>(INITIAL_STEPS);
  const [progressMessage, setProgressMessage] = useState('XIV AI is building your website...');

  useEffect(() => {
    if (!open) {
      setMode('describe');
      setDescription('');
      setExtraInstructions('');
      setImageFile(null);
      setImagePreview(null);
      setIsGenerating(false);
      setError(null);
      setSteps(INITIAL_STEPS);
      setProgressMessage('XIV AI is building your website...');
    }
  }, [open]);

  const descriptionLength = description.length;
  const canGenerate = useMemo(() => {
    if (mode === 'describe') return description.trim().length > 0;
    return !!imageFile || extraInstructions.trim().length > 0;
  }, [description, extraInstructions, imageFile, mode]);

  const handleFileSelect = (file: File | null) => {
    setError(null);
    if (!file) {
      setImageFile(null);
      setImagePreview(null);
      return;
    }

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setError('Please upload a PNG, JPG, or WebP image.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be 5MB or smaller.');
      return;
    }

    setImageFile(file);
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
  };

  const handleGenerate = async () => {
    if (!canGenerate) return;

    setError(null);
    setIsGenerating(true);
    setSteps(nextSteps('analyzing'));
    setProgressMessage('Analyzing your input...');

    try {
      let imageBase64: string | undefined;
      let imageMediaType: string | undefined;

      if (imageFile) {
        imageBase64 = await fileToBase64(imageFile);
        imageMediaType = imageFile.type;
      }

      const effectiveDescription = mode === 'describe'
        ? description.trim()
        : extraInstructions.trim();

      const generateResponse = await fetch('/api/ai-builder/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          description: effectiveDescription || undefined,
          imageBase64,
          imageMediaType,
        }),
      });

      const generateJson = await generateResponse.json();
      if (!generateResponse.ok) {
        throw new Error(generateJson.error || 'Failed to generate a site plan');
      }

      setSteps(nextSteps('creating'));
      setProgressMessage('Planning complete. Creating pages...');

      const buildResponse = await fetch('/api/ai-builder/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          sitePlan: generateJson,
        }),
      });

      if (!buildResponse.ok || !buildResponse.body) {
        const text = await buildResponse.text();
        throw new Error(text || 'Failed to build the website');
      }

      const reader = buildResponse.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const eventBlock of events) {
          const lines = eventBlock.split('\n');
          const eventName = lines.find((line) => line.startsWith('event:'))?.replace('event:', '').trim();
          const dataLine = lines.find((line) => line.startsWith('data:'))?.replace('data:', '').trim();
          if (!eventName || !dataLine) continue;

          const data = JSON.parse(dataLine) as { stage?: string; message?: string; editorUrl?: string };

          if (eventName === 'progress') {
            if (data.stage === 'creating-pages') {
              setSteps(nextSteps('creating'));
            } else if (data.stage === 'styling') {
              setSteps(nextSteps('styling'));
            } else if (data.stage === 'publishing') {
              setSteps(nextSteps('publishing'));
            }
            setProgressMessage(data.message || 'XIV AI is building your website...');
          }

          if (eventName === 'complete' && data.editorUrl) {
            setSteps(INITIAL_STEPS.map((step) => ({ ...step, status: 'completed' })));
            setProgressMessage('Website ready. Opening the editor...');
            window.location.href = data.editorUrl;
            return;
          }

          if (eventName === 'error') {
            throw new Error(data.message || 'Something went wrong during the build');
          }
        }
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Failed to build the website');
      setIsGenerating(false);
      setSteps(INITIAL_STEPS);
      setProgressMessage('XIV AI is building your website...');
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex bg-black/90 p-4 md:p-8"
      onClick={() => {
        if (!isGenerating) onClose();
      }}
    >
      <style jsx>{`
        .ai-builder-shell {
          background:
            radial-gradient(circle at top left, rgba(255,255,255,0.08), transparent 28%),
            radial-gradient(circle at bottom right, rgba(192,192,192,0.1), transparent 32%),
            #080808;
        }
        .ai-builder-logo {
          animation: ai-builder-pulse 1.8s ease-in-out infinite;
        }
        @keyframes ai-builder-pulse {
          0%, 100% { opacity: 0.55; transform: scale(0.98); }
          50% { opacity: 1; transform: scale(1.02); }
        }
      `}</style>

      <div
        className="ai-builder-shell relative flex min-h-full w-full flex-1 flex-col overflow-hidden rounded-[28px] border border-white/10 text-[#E8E8E8] shadow-[0_40px_120px_rgba(0,0,0,0.7)]"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={isGenerating}
          className="absolute right-5 top-5 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Close AI Builder"
        >
          <X className="h-4 w-4" />
        </button>

        {!isGenerating ? (
          <div className="flex h-full flex-col">
            <div className="border-b border-white/8 px-6 pb-6 pt-8 md:px-10">
              <div className="mb-3 font-['Bebas_Neue'] text-5xl tracking-[0.18em] text-white md:text-6xl">XIV AI</div>
              <p className="max-w-2xl text-sm text-[#BDBDBD] md:text-base">
                Describe a site or upload a design reference. XIV AI will plan the structure, build the pages, style the sections, and open everything in the editor.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 md:px-10">
              <Tabs value={mode} onValueChange={(value) => setMode(value as InputMode)} className="gap-6">
                <TabsList className="h-11 rounded-full bg-white/5 p-1">
                  <TabsTrigger value="describe" className="rounded-full px-5 text-sm data-[state=active]:bg-white data-[state=active]:text-black">
                    Describe
                  </TabsTrigger>
                  <TabsTrigger value="upload" className="rounded-full px-5 text-sm data-[state=active]:bg-white data-[state=active]:text-black">
                    Upload Design
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="describe" className="space-y-5">
                  <div className="space-y-3">
                    <label className="text-sm text-[#D0D0D0]">Describe your website</label>
                    <Textarea
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder="Describe your website... e.g. A modern hotel website called Luxury Palace in Lagos. Black and gold design. Pages: Home, Rooms, Pricing, Contact."
                      className="min-h-[220px] rounded-[24px] border border-white/10 bg-white/5 px-5 py-5 text-sm text-white placeholder:text-[#8D8D8D]"
                    />
                    <div className="text-right text-xs text-[#8D8D8D]">{descriptionLength} characters</div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-sm text-[#D0D0D0]">Example prompts</div>
                    <div className="flex flex-wrap gap-2">
                      {EXAMPLE_PROMPTS.map((example) => (
                        <button
                          key={example.label}
                          type="button"
                          onClick={() => setDescription(example.prompt)}
                          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-[#E8E8E8] transition hover:bg-white/10"
                        >
                          {example.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="upload" className="space-y-5">
                  <div
                    className="rounded-[24px] border border-dashed border-white/15 bg-white/5 p-5"
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      handleFileSelect(event.dataTransfer.files?.[0] || null);
                    }}
                  >
                    <input
                      id="ai-builder-upload"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(event) => handleFileSelect(event.target.files?.[0] || null)}
                    />
                    <label htmlFor="ai-builder-upload" className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[20px] border border-white/5 bg-black/20 px-6 py-12 text-center transition hover:bg-black/30">
                      <div className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5">
                        <Upload className="h-5 w-5" />
                      </div>
                      <div className="text-sm text-white">Drag and drop a PNG, JPG, or WebP file</div>
                      <div className="text-xs text-[#8D8D8D]">Screenshots, photos, and Figma exports up to 5MB</div>
                    </label>
                  </div>

                  {imagePreview && (
                    <div className="overflow-hidden rounded-[24px] border border-white/10 bg-black/30">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imagePreview} alt="Uploaded design preview" className="max-h-[280px] w-full object-cover" />
                    </div>
                  )}

                  <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 text-sm text-[#CFCFCF]">
                    XIV AI will recreate this design and fill it with your content.
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm text-[#D0D0D0]">Add any extra instructions (optional)</label>
                    <Textarea
                      value={extraInstructions}
                      onChange={(event) => setExtraInstructions(event.target.value)}
                      placeholder="Add any extra instructions (optional)"
                      className="min-h-[140px] rounded-[24px] border border-white/10 bg-white/5 px-5 py-5 text-sm text-white placeholder:text-[#8D8D8D]"
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <div className="border-t border-white/8 px-6 py-5 md:px-10">
              {error && (
                <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-sm text-[#E8E8E8]">Usually takes 30-60 seconds</div>
                  <div className="mt-1 text-xs text-[#8D8D8D]">We’ll open the editor as soon as the site is ready.</div>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-11 rounded-full border border-white/10 bg-transparent px-5 text-white hover:bg-white/10"
                    onClick={onClose}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleGenerate}
                    disabled={!canGenerate}
                    className="h-11 rounded-full bg-white px-6 text-sm font-medium text-black hover:bg-[#E8E8E8]"
                  >
                    Generate My Website
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center px-6 py-10 text-center">
            <div className="ai-builder-logo font-['Bebas_Neue'] text-7xl tracking-[0.24em] text-white">XIV</div>
            <div className="mt-4 text-base text-[#E8E8E8]">{progressMessage}</div>
            <div className="mt-2 text-sm text-[#9D9D9D]">XIV AI is building your website...</div>

            <div className="mt-10 w-full max-w-xl space-y-3 text-left">
              {steps.map((step) => (
                <div
                  key={step.key}
                  className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
                    step.status === 'completed'
                      ? 'border-white/12 bg-white/8'
                      : step.status === 'in_progress'
                        ? 'border-white/16 bg-white/10'
                        : 'border-white/8 bg-white/[0.03]'
                  }`}
                >
                  <div
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-full border ${
                      step.status === 'completed'
                        ? 'border-white bg-white text-black'
                        : step.status === 'in_progress'
                          ? 'border-white/30 bg-white/10 text-white'
                          : 'border-white/10 bg-transparent text-[#808080]'
                    }`}
                  >
                    {step.status === 'completed' ? <Check className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
                  </div>
                  <div className="text-sm text-white">{step.label}</div>
                </div>
              ))}
            </div>

            {error && (
              <div className="mt-8 flex flex-col items-center gap-4">
                <div className="max-w-xl rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                  {error}
                </div>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setIsGenerating(false);
                      setSteps(INITIAL_STEPS);
                    }}
                    className="rounded-full bg-white px-5 text-black hover:bg-[#E8E8E8]"
                  >
                    Try Again
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="rounded-full border border-white/10 bg-transparent px-5 text-white hover:bg-white/10"
                    onClick={onClose}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
