'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ImagePlus,
  LayoutGrid,
  Link2,
  PlusSquare,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { createSite, createSiteDraft } from '@/app/(dashboard)/actions/sites';
import {
  AI_BUILDER_PROVIDER_OPTIONS,
  fileToBase64,
  generateAiSitePlan,
  streamAiSiteBuild,
} from '@/lib/ai-builder/client';
import type { AiBuilderInputSource, AiBuilderProviderId } from '@/lib/ai-builder/types';

type Step = 'method' | 'name' | 'ai-name' | 'ai-build';
type ProgressStepKey = 'analyzing' | 'planning' | 'creating' | 'styling' | 'publishing';
type ProgressStepStatus = 'pending' | 'in_progress' | 'completed';

type ProgressStep = {
  key: ProgressStepKey;
  label: string;
  status: ProgressStepStatus;
};

const INITIAL_STEPS: ProgressStep[] = [
  { key: 'analyzing', label: 'Analyzing your AI input...', status: 'pending' },
  { key: 'planning', label: 'Planning pages, CMS, and SEO...', status: 'pending' },
  { key: 'creating', label: 'Creating pages and collections...', status: 'pending' },
  { key: 'styling', label: 'Styling sections and content...', status: 'pending' },
  { key: 'publishing', label: 'Publishing the site...', status: 'pending' },
];

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 40);
}

function getStepsForStage(stage: ProgressStepKey): ProgressStep[] {
  const order: ProgressStepKey[] = ['analyzing', 'planning', 'creating', 'styling', 'publishing'];
  const currentIndex = order.indexOf(stage);

  return INITIAL_STEPS.map((item, index) => ({
    ...item,
    status: (index < currentIndex ? 'completed' : index === currentIndex ? 'in_progress' : 'pending') as ProgressStepStatus,
  }));
}

export default function CreateSiteModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('method');
  const [siteName, setSiteName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [aiProvider, setAiProvider] = useState<AiBuilderProviderId>('groq');
  const [aiInputSource, setAiInputSource] = useState<AiBuilderInputSource>('prompt');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiReferenceUrl, setAiReferenceUrl] = useState('');
  const [aiExtraInstructions, setAiExtraInstructions] = useState('');
  const [aiImageFile, setAiImageFile] = useState<File | null>(null);
  const [aiImagePreview, setAiImagePreview] = useState<string | null>(null);
  const [aiProjectId, setAiProjectId] = useState<string | null>(null);
  const [aiIsRunning, setAiIsRunning] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSteps, setAiSteps] = useState<ProgressStep[]>(INITIAL_STEPS);
  const [aiProgressMessage, setAiProgressMessage] = useState('AI is preparing your site...');

  const slugPreview = useMemo(() => slugify(siteName) || 'your-site', [siteName]);
  const selectedProvider = useMemo(
    () => AI_BUILDER_PROVIDER_OPTIONS.find((option) => option.id === aiProvider) || AI_BUILDER_PROVIDER_OPTIONS[0],
    [aiProvider],
  );

  const canRunAi = useMemo(() => {
    if (!siteName.trim()) return false;

    if (aiInputSource === 'prompt') {
      return aiPrompt.trim().length > 0;
    }

    if (aiInputSource === 'url') {
      return aiReferenceUrl.trim().length > 0;
    }

    return aiImageFile !== null;
  }, [aiImageFile, aiInputSource, aiPrompt, aiReferenceUrl, siteName]);

  useEffect(() => {
    if (aiInputSource === 'upload' && aiProvider !== 'anthropic') {
      setAiProvider('anthropic');
    }
  }, [aiInputSource, aiProvider]);

  function resetAiState() {
    if (aiImagePreview) {
      URL.revokeObjectURL(aiImagePreview);
    }

    setAiProvider('groq');
    setAiInputSource('prompt');
    setAiPrompt('');
    setAiReferenceUrl('');
    setAiExtraInstructions('');
    setAiImageFile(null);
    setAiImagePreview(null);
    setAiProjectId(null);
    setAiIsRunning(false);
    setAiError(null);
    setAiSteps(INITIAL_STEPS);
    setAiProgressMessage('AI is preparing your site...');
  }

  function closeAndReset() {
    setStep('method');
    setSiteName('');
    setError(null);
    resetAiState();
    onClose();
  }

  function handleFileSelect(file: File | null) {
    setAiError(null);

    if (aiImagePreview) {
      URL.revokeObjectURL(aiImagePreview);
    }

    if (!file) {
      setAiImageFile(null);
      setAiImagePreview(null);
      return;
    }

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setAiError('Please upload a PNG, JPG, or WebP image.');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setAiError('Image must be 8MB or smaller.');
      return;
    }

    setAiImageFile(file);
    setAiImagePreview(URL.createObjectURL(file));
  }

  async function submitScratch() {
    setError(null);
    const formData = new FormData();
    formData.set('name', siteName);

    startTransition(async () => {
      try {
        await createSite(formData);
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : 'Failed to create site';
        setError(message);
      }
    });
  }

  async function submitAiBuild() {
    if (!canRunAi) return;

    setAiError(null);
    setAiIsRunning(true);
    setAiSteps(getStepsForStage('analyzing'));
    setAiProgressMessage('Creating your site shell...');

    try {
      let projectId = aiProjectId;
      if (!projectId) {
        const draft = await createSiteDraft(siteName.trim());
        projectId = draft.siteId;
        setAiProjectId(projectId);
      }

      let imageBase64: string | undefined;
      let imageMediaType: 'image/png' | 'image/jpeg' | 'image/webp' | undefined;
      if (aiImageFile) {
        imageBase64 = await fileToBase64(aiImageFile);
        imageMediaType = aiImageFile.type as 'image/png' | 'image/jpeg' | 'image/webp';
      }

      setAiSteps(getStepsForStage('planning'));
      setAiProgressMessage('Generating the site architecture, CMS, and SEO...');

      const sitePlan = await generateAiSitePlan({
        projectId,
        siteName: siteName.trim(),
        provider: aiProvider,
        inputSource: aiInputSource,
        prompt: aiInputSource === 'prompt' ? aiPrompt.trim() : aiExtraInstructions.trim() || undefined,
        description: aiInputSource !== 'prompt' ? aiExtraInstructions.trim() || undefined : undefined,
        referenceUrl: aiInputSource === 'url' ? aiReferenceUrl.trim() : undefined,
        imageBase64,
        imageMediaType,
      });

      setAiSteps(getStepsForStage('creating'));
      setAiProgressMessage('Building pages and CMS collections...');

      await streamAiSiteBuild({
        projectId,
        sitePlan,
        onProgress: (data) => {
          if (data.stage === 'creating-pages') {
            setAiSteps(getStepsForStage('creating'));
          } else if (data.stage === 'styling') {
            setAiSteps(getStepsForStage('styling'));
          } else if (data.stage === 'publishing') {
            setAiSteps(getStepsForStage('publishing'));
          }

          if (data.message) {
            setAiProgressMessage(data.message);
          }
        },
        onComplete: (editorUrl) => {
          setAiSteps(INITIAL_STEPS.map((item) => ({ ...item, status: 'completed' as ProgressStepStatus })));
          setAiProgressMessage('Site ready. Opening the editor...');
          window.location.href = editorUrl;
        },
      });
    } catch (caughtError) {
      setAiError(caughtError instanceof Error ? caughtError.message : 'Failed to build the AI site');
      setAiIsRunning(false);
      setAiSteps(INITIAL_STEPS);
      setAiProgressMessage('AI is preparing your site...');
      return;
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 80,
        padding: 16,
      }}
      onClick={closeAndReset}
    >
      <div
        style={{
          width: '100%',
          maxWidth: step === 'ai-build' ? 760 : 560,
          background: '#0a0a0a',
          border: '1px solid #1a1a1a',
          borderRadius: 16,
          padding: 32,
          position: 'relative',
          transition: 'max-width 0.2s ease',
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          onClick={closeAndReset}
          aria-label="Close"
          disabled={aiIsRunning}
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            width: 36,
            height: 36,
            borderRadius: 10,
            border: '1px solid #1a1a1a',
            background: 'transparent',
            color: '#bbb',
            cursor: aiIsRunning ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: aiIsRunning ? 0.55 : 1,
          }}
        >
          <X size={18} />
        </button>

        {step === 'method' && (
          <>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 18 }}>
              How do you want to start?
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
              <button
                onClick={() => router.push('/templates')}
                style={optionStyle}
              >
                <LayoutGrid size={20} />
                <div style={optionTitleStyle}>Start with a Template</div>
                <div style={optionBodyStyle}>
                  Professional designs ready to customize
                </div>
              </button>

              <button
                onClick={() => {
                  setError(null);
                  setStep('name');
                }}
                style={optionStyle}
              >
                <PlusSquare size={20} />
                <div style={optionTitleStyle}>Start from Scratch</div>
                <div style={optionBodyStyle}>
                  Blank canvas, your vision
                </div>
              </button>

              <button
                onClick={() => {
                  setError(null);
                  setStep('ai-name');
                }}
                style={{
                  ...optionStyle,
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
                }}
              >
                <Sparkles size={20} />
                <div style={optionTitleStyle}>Build with AI</div>
                <div style={optionBodyStyle}>
                  Prompt, screenshot, Figma export, or URL
                </div>
              </button>
            </div>
          </>
        )}

        {step === 'name' && (
          <>
            <BackButton onClick={() => setStep('method')} />
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 10 }}>Name your site</div>

            <input
              value={siteName}
              onChange={(event) => setSiteName(event.target.value)}
              placeholder="e.g. My Portfolio"
              autoFocus
              style={inputStyle}
            />

            <div style={{ marginTop: 10, fontSize: 12, color: '#888' }}>
              xxivbuilder.com/{slugPreview}
            </div>

            {error && <InlineError message={error} />}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
              <button
                className="xxiv-btn-primary"
                onClick={submitScratch}
                disabled={pending || !siteName.trim()}
                style={primaryButtonStyle(pending || !siteName.trim())}
              >
                {pending ? 'Creating...' : 'Create Site ->'}
              </button>
            </div>
          </>
        )}

        {step === 'ai-name' && (
          <>
            <BackButton
              onClick={() => {
                resetAiState();
                setStep('method');
              }}
            />
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 10 }}>Name your AI site</div>

            <input
              value={siteName}
              onChange={(event) => setSiteName(event.target.value)}
              placeholder="e.g. Atelier North"
              autoFocus
              style={inputStyle}
            />

            <div style={{ marginTop: 10, fontSize: 12, color: '#888' }}>
              This creates the site shell first, then AI fills it with pages, CMS content, and SEO.
            </div>

            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 12, color: '#666' }}>xxivbuilder.com/{slugPreview}</div>
              <button
                className="xxiv-btn-primary"
                onClick={() => setStep('ai-build')}
                disabled={!siteName.trim()}
                style={primaryButtonStyle(!siteName.trim())}
              >
                Next: Build with AI -&gt;
              </button>
            </div>
          </>
        )}

        {step === 'ai-build' && (
          <>
            <BackButton
              onClick={() => {
                if (!aiIsRunning) {
                  setAiError(null);
                  setStep('ai-name');
                }
              }}
            />

            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 600 }}>Build {siteName || 'your site'} with AI</div>
                <div style={{ color: '#888', fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>
                  Choose an AI provider, then describe the site, paste a live website URL, or upload a screenshot/Figma export.
                </div>
              </div>
              <div style={{
                border: '1px solid #1a1a1a',
                borderRadius: 999,
                padding: '8px 12px',
                color: '#ccc',
                fontSize: 12,
                whiteSpace: 'nowrap',
              }}>
                {siteName}
              </div>
            </div>

            {!aiIsRunning ? (
              <>
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>Provider</div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {AI_BUILDER_PROVIDER_OPTIONS.map((provider) => {
                      const active = provider.id === aiProvider;
                      return (
                        <button
                          key={provider.id}
                          type="button"
                          onClick={() => setAiProvider(provider.id)}
                          style={{
                            border: active ? '1px solid #fff' : '1px solid #1a1a1a',
                            background: active ? '#fff' : 'transparent',
                            color: active ? '#000' : '#fff',
                            borderRadius: 999,
                            padding: '8px 14px',
                            fontSize: 13,
                            cursor: 'pointer',
                          }}
                        >
                          {provider.label}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ marginTop: 8, color: '#666', fontSize: 12 }}>
                    {selectedProvider.supportsImages
                      ? `${selectedProvider.label} can use text and visual references in this flow.`
                      : `${selectedProvider.label} is wired for prompt-first planning in this flow.`}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
                  <AiModeButton
                    active={aiInputSource === 'prompt'}
                    icon={<Sparkles size={16} />}
                    label="Prompt"
                    onClick={() => setAiInputSource('prompt')}
                  />
                  <AiModeButton
                    active={aiInputSource === 'url'}
                    icon={<Link2 size={16} />}
                    label="Existing URL"
                    onClick={() => setAiInputSource('url')}
                  />
                  <AiModeButton
                    active={aiInputSource === 'upload'}
                    icon={<ImagePlus size={16} />}
                    label="Screenshot / Figma"
                    onClick={() => setAiInputSource('upload')}
                  />
                </div>

                {aiInputSource === 'prompt' && (
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>Prompt</div>
                    <textarea
                      value={aiPrompt}
                      onChange={(event) => setAiPrompt(event.target.value)}
                      placeholder="Create a bold architecture portfolio for Atelier North with home, selected works, studio, journal, and contact pages. Use a refined editorial feel, warm neutrals, elegant serif headlines, project CMS, and polished SEO copy."
                      style={textareaStyle(180)}
                    />
                  </div>
                )}

                {aiInputSource === 'url' && (
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>Reference website URL</div>
                    <input
                      value={aiReferenceUrl}
                      onChange={(event) => setAiReferenceUrl(event.target.value)}
                      placeholder="https://example.com"
                      style={inputStyle}
                    />
                    <div style={{ marginTop: 12, fontSize: 12, color: '#888', marginBottom: 8 }}>What should AI keep or improve?</div>
                    <textarea
                      value={aiExtraInstructions}
                      onChange={(event) => setAiExtraInstructions(event.target.value)}
                      placeholder="Keep the structure and luxury feel, but rewrite the content for my brand, add a projects CMS, and make the typography more distinctive."
                      style={textareaStyle(140)}
                    />
                  </div>
                )}

                {aiInputSource === 'upload' && (
                  <div style={{ marginBottom: 18 }}>
                    <label
                      htmlFor="ai-site-upload"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 10,
                        minHeight: 160,
                        border: '1px dashed #2f2f2f',
                        borderRadius: 16,
                        background: 'rgba(255,255,255,0.02)',
                        cursor: 'pointer',
                        padding: 20,
                      }}
                    >
                      <Upload size={20} />
                      <div style={{ fontSize: 14, color: '#fff' }}>Upload a screenshot or Figma export</div>
                      <div style={{ fontSize: 12, color: '#888' }}>PNG, JPG, or WebP up to 8MB</div>
                    </label>
                    <input
                      id="ai-site-upload"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(event) => handleFileSelect(event.target.files?.[0] || null)}
                      style={{ display: 'none' }}
                    />

                    {aiImagePreview && (
                      <div style={{ marginTop: 14, overflow: 'hidden', borderRadius: 14, border: '1px solid #1a1a1a' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={aiImagePreview} alt="AI input preview" style={{ width: '100%', maxHeight: 260, objectFit: 'cover' }} />
                      </div>
                    )}

                    <div style={{ marginTop: 12, fontSize: 12, color: '#888', marginBottom: 8 }}>Extra instructions</div>
                    <textarea
                      value={aiExtraInstructions}
                      onChange={(event) => setAiExtraInstructions(event.target.value)}
                      placeholder="Use this layout direction, but make it more premium, generate a projects CMS, and write polished SEO for each page."
                      style={textareaStyle(140)}
                    />
                  </div>
                )}

                {aiError && <InlineError message={aiError} />}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                  <div style={{ fontSize: 12, color: '#666', lineHeight: 1.5 }}>
                    The AI planner can generate pages, collections, starter content, and SEO, then apply them inside the editor automatically.
                  </div>
                  <button
                    className="xxiv-btn-primary"
                    onClick={submitAiBuild}
                    disabled={!canRunAi}
                    style={primaryButtonStyle(!canRunAi)}
                  >
                    Generate Site -&gt;
                  </button>
                </div>
              </>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <div style={{
                    width: 46,
                    height: 46,
                    borderRadius: 999,
                    border: '1px solid #2a2a2a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(255,255,255,0.04)',
                  }}>
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>Building your site</div>
                    <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>{aiProgressMessage}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: 10 }}>
                  {aiSteps.map((progressStep) => (
                    <div
                      key={progressStep.key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        border: '1px solid #1a1a1a',
                        borderRadius: 14,
                        padding: '14px 16px',
                        background: progressStep.status === 'in_progress'
                          ? 'rgba(255,255,255,0.06)'
                          : progressStep.status === 'completed'
                            ? 'rgba(255,255,255,0.04)'
                            : 'transparent',
                      }}
                    >
                      <div style={{
                        width: 28,
                        height: 28,
                        borderRadius: 999,
                        border: '1px solid #2a2a2a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: progressStep.status === 'completed' ? '#fff' : 'transparent',
                        color: progressStep.status === 'completed' ? '#000' : '#fff',
                      }}>
                        {progressStep.status === 'completed' ? <Check size={14} /> : <Sparkles size={14} />}
                      </div>
                      <div style={{ fontSize: 13, color: '#ddd' }}>{progressStep.label}</div>
                    </div>
                  ))}
                </div>

                {aiError && (
                  <div style={{ marginTop: 16 }}>
                    <InlineError message={aiError} />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                      <button
                        className="xxiv-btn-primary"
                        onClick={() => {
                          setAiError(null);
                          setAiIsRunning(false);
                        }}
                        style={primaryButtonStyle(false)}
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        background: 'transparent',
        border: 'none',
        color: '#bbb',
        cursor: 'pointer',
        padding: 0,
        marginBottom: 14,
      }}
    >
      <ArrowLeft size={18} />
      Back
    </button>
  );
}

function InlineError({ message }: { message: string }) {
  return (
    <div
      style={{
        marginTop: 14,
        border: '1px solid rgba(239,68,68,0.35)',
        background: 'rgba(239,68,68,0.08)',
        color: '#fca5a5',
        borderRadius: 12,
        padding: '10px 12px',
        fontSize: 13,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
      }}
    >
      <AlertCircle size={16} style={{ marginTop: 1, flexShrink: 0 }} />
      <span>{message}</span>
    </div>
  );
}

function AiModeButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        borderRadius: 999,
        border: active ? '1px solid #fff' : '1px solid #1a1a1a',
        background: active ? '#fff' : 'transparent',
        color: active ? '#000' : '#fff',
        padding: '8px 14px',
        fontSize: 13,
        cursor: 'pointer',
      }}
    >
      {icon}
      {label}
    </button>
  );
}

const optionStyle: CSSProperties = {
  textAlign: 'left',
  background: 'transparent',
  border: '1px solid #1a1a1a',
  borderRadius: 14,
  padding: 16,
  cursor: 'pointer',
  color: '#fff',
};

const optionTitleStyle: CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  marginTop: 10,
};

const optionBodyStyle: CSSProperties = {
  fontSize: 12,
  color: '#888',
  marginTop: 6,
  lineHeight: 1.4,
};

const inputStyle: CSSProperties = {
  width: '100%',
  background: '#0f0f0f',
  border: '1px solid #1a1a1a',
  borderRadius: 12,
  padding: '14px 14px',
  color: '#fff',
  fontSize: 16,
  outline: 'none',
};

function textareaStyle(minHeight: number): CSSProperties {
  return {
    width: '100%',
    minHeight,
    resize: 'vertical',
    background: '#0f0f0f',
    border: '1px solid #1a1a1a',
    borderRadius: 12,
    padding: '14px 14px',
    color: '#fff',
    fontSize: 14,
    outline: 'none',
    lineHeight: 1.6,
  };
}

function primaryButtonStyle(disabled: boolean): CSSProperties {
  return {
    padding: '10px 14px',
    fontSize: 14,
    opacity: disabled ? 0.7 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}
