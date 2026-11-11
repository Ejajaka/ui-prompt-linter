import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  Check,
  ChevronRight,
  Sparkles,
  Cpu,
  Layers,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Wand2,
  Link2,
  ClipboardCheck,
  Gauge,
  Info,
  Lock,
  Eye,
  Terminal,
  RefreshCw,
} from 'lucide-react';

interface AboutPageProps {
  onStartAnalysis: () => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ onStartAnalysis }) => {
  const scrollToWorkflow = () => {
    document.getElementById('workflow-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Interactive live-preview simulation state
  const [animStep, setAnimStep] = useState<number>(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setAnimStep((prev) => (prev + 1) % 4);
    }, 2800);
    return () => clearInterval(interval);
  }, [isPaused]);

  return (
    <div className="space-y-16 lg:space-y-24 max-w-6xl mx-auto pb-12 antialiased">
      {/* HERO */}
      <section className="relative pt-2 sm:pt-6 lg:pt-8" aria-label="Hero">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#49686C]/5 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute top-1/3 left-10 w-72 h-72 bg-[#D1B653]/10 rounded-full blur-2xl pointer-events-none -z-10" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#E4EBDD] text-[#30494B] border border-[#CFE2C8] shadow-xs">
              <span className="w-2 h-2 rounded-full bg-[#49686C] animate-pulse" />
              <span>Prompt Linter — Pre-Generation UI Prompt Review</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#283638] tracking-tight leading-[1.15]">
              Better interfaces start <br className="hidden sm:inline" />
              <span className="text-[#49686C] underline decoration-[#D1B653] decoration-wavy decoration-2 underline-offset-6">
                before the first line
              </span>{' '}
              of UI code.
            </h1>

            <p className="text-base sm:text-lg text-[#737A72] max-w-xl leading-relaxed">
              Catch missing labels, colours, placement and actions in natural-language UI prompts
              before they reach a generator. Prompt Linter detects elements, links attributes,
              clears up ambiguity and produces a validated rewrite.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                type="button"
                onClick={onStartAnalysis}
                className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#49686C] hover:bg-[#30494B] text-white text-sm font-bold shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer active:scale-[0.98] group"
              >
                <span>Analyze a Prompt</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>

              <button
                type="button"
                onClick={scrollToWorkflow}
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-white hover:bg-[#F6F4EC] text-[#283638] border border-[#E5E2D8] hover:border-[#CDC9BC] text-sm font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <span>How It Works</span>
                <ChevronRight className="w-4 h-4 text-[#737A72]" />
              </button>
            </div>

            <div className="pt-4 flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-[#737A72]">
              <div className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-[#49686C]" />
                <span>Rules + BERT + LLM</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-[#49686C]" />
                <span>Clarifies ambiguity</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-[#49686C]" />
                <span>Validated rewrite</span>
              </div>
            </div>
          </div>

          {/* LIVE PREVIEW CARD */}
          <div
            className="lg:col-span-5 relative"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <div className="bg-[#FFFFFF] rounded-2xl border border-[#E5E2D8] shadow-lg p-5 sm:p-6 space-y-4 relative overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E2D8]">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#B94D42]/70" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#D1B653]/70" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#688E5E]/70" />
                  <span className="text-[11px] font-mono text-[#737A72] ml-2">prompt-linter.live</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F6F4EC] text-[#49686C] font-semibold">
                  Step {animStep + 1}/4
                </span>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] uppercase tracking-wider font-bold text-[#737A72]">
                  Input UI prompt
                </span>
                <div className="p-3 rounded-lg bg-[#FAFAF8] border border-[#E5E2D8] text-xs font-mono text-[#283638] leading-relaxed relative">
                  Add a{' '}
                  <span className="bg-[#FDF2F0] text-[#B94D42] px-1 py-0.5 rounded font-bold">
                    red
                  </span>{' '}
                  <span className="bg-[#E4EBDD] text-[#30494B] px-1 py-0.5 rounded font-bold">
                    button
                  </span>{' '}
                  labelled{' '}
                  <span className="bg-[#F0F5F5] text-[#49686C] px-1 py-0.5 rounded font-bold">
                    “Sign Up”
                  </span>
                  .
                </div>
              </div>

              {/* Step 1: Element Detection */}
              <div className={`transition-all duration-300 ${animStep >= 1 ? 'opacity-100 translate-y-0' : 'opacity-40 translate-y-1'}`}>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-[#283638] flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-[#49686C]" /> Detected elements
                  </span>
                  <span className="text-[11px] text-[#49686C] font-mono">1 element</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2 py-1 rounded bg-[#F0F5F5] border border-[#CFDFE1] text-[11px] font-mono font-medium text-[#49686C] flex items-center gap-1">
                    <Layers className="w-3 h-3" /> Button #1
                  </span>
                  <span className="px-2 py-1 rounded bg-[#F4F9F1] border border-[#CFE2C8] text-[11px] font-mono font-medium text-[#3E6B33]">
                    LABEL · Sign Up
                  </span>
                  <span className="px-2 py-1 rounded bg-[#FEFCE8] border border-[#FEF08A] text-[11px] font-mono font-medium text-[#856C16]">
                    COLOR · red
                  </span>
                </div>
              </div>

              {/* Step 2: Evaluation Findings */}
              <div className={`transition-all duration-300 ${animStep >= 2 ? 'opacity-100 translate-y-0' : 'opacity-40 translate-y-1'}`}>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-[#283638] flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#D1B653]" /> Evaluation findings
                  </span>
                  <span className="text-[11px] text-[#856C16] font-semibold font-mono">Medium · 44/100</span>
                </div>
                <div className="space-y-1.5">
                  <div className="p-2 rounded bg-[#FEFCE8] border border-[#FEF08A] flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-[#856C16] shrink-0" />
                      <span className="font-semibold text-[#856C16]">Missing action (ACTION)</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold uppercase text-[#856C16]">Missing</span>
                  </div>
                  <div className="p-2 rounded bg-[#FEFCE8] border border-[#FEF08A] flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-[#856C16] shrink-0" />
                      <span className="font-semibold text-[#856C16]">Missing placement (LOCATION)</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold uppercase text-[#856C16]">Missing</span>
                  </div>
                </div>
              </div>

              {/* Step 3: Validated Rewrite */}
              <div className={`transition-all duration-300 ${animStep >= 3 ? 'opacity-100 translate-y-0' : 'opacity-40 translate-y-1'}`}>
                <div className="p-2.5 rounded-lg bg-[#F4F9F1] border border-[#CFE2C8] space-y-1 text-xs text-[#2D5A27]">
                  <div className="flex items-center justify-between gap-2 font-bold">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#3E6B33]" />
                      Validated best prompt
                    </span>
                    <span className="text-[10px] font-mono bg-white/70 rounded px-1.5 py-0.5 text-[#3E6B33]">
                      risk 44/100
                    </span>
                  </div>
                  <p className="text-[11px] font-mono leading-relaxed">
                    Add a red button in the &lt;location&gt; labelled “Sign Up” that &lt;what it does&gt;.
                  </p>
                </div>
              </div>

              {/* Interactive step indicator */}
              <div className="flex items-center justify-between pt-2 border-t border-[#E5E2D8] text-[11px] text-[#737A72]">
                <div className="flex items-center gap-1.5">
                  {[0, 1, 2, 3].map((step) => (
                    <button
                      key={step}
                      type="button"
                      onClick={() => setAnimStep(step)}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${
                        animStep === step ? 'w-6 bg-[#49686C]' : 'w-2 bg-[#E5E2D8] hover:bg-[#CDC9BC]'
                      }`}
                      aria-label={`Show step ${step + 1}`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setAnimStep((s) => (s + 1) % 4)}
                  className="inline-flex items-center gap-1 text-[#49686C] hover:text-[#30494B] font-medium"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Next simulation step</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="bg-white rounded-2xl border border-[#E5E2D8] p-6 sm:p-10 shadow-xs space-y-6">
        <div className="max-w-2xl space-y-2">
          <div className="text-xs font-bold text-[#D1B653] uppercase tracking-wider">
            The completeness gap
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#283638] tracking-tight">
            A prompt can look clear and still generate the wrong UI.
          </h2>
          <p className="text-sm text-[#737A72] leading-relaxed">
            UI generators fill the gaps themselves. Missing labels, vague colours and ambiguous
            actions become assumptions in the generated screen.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          <div className="p-5 rounded-xl bg-[#FAFAF8] border border-[#E5E2D8] space-y-3">
            <div className="w-8 h-8 rounded-lg bg-[#FDF2F0] text-[#B94D42] flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-[#283638]">Missing details</h3>
            <p className="text-xs text-[#737A72] leading-relaxed">
              “Add a button” says nothing about its text, colour, placement or what clicking it does.
              The generator has to guess.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[#FAFAF8] border border-[#E5E2D8] space-y-3">
            <div className="w-8 h-8 rounded-lg bg-[#FEFCE8] text-[#D1B653] flex items-center justify-center">
              <Eye className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-[#283638]">Vague values</h3>
            <p className="text-xs text-[#737A72] leading-relaxed">
              “Some nice colour”, “somewhere on the side” and “does something useful” are not
              actionable. Prompt Linter asks instead of pretending.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[#FAFAF8] border border-[#E5E2D8] space-y-3">
            <div className="w-8 h-8 rounded-lg bg-[#F0F5F5] text-[#49686C] flex items-center justify-center">
              <Link2 className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-[#283638]">Attribute ambiguity</h3>
            <p className="text-xs text-[#737A72] leading-relaxed">
              With several elements on screen, it is easy to attach a colour or action to the wrong
              component. The engine links every attribute to an element.
            </p>
          </div>
        </div>
      </section>

      {/* WORKFLOW */}
      <section id="workflow-section" className="space-y-8 scroll-mt-20">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="text-xs font-bold text-[#49686C] uppercase tracking-wider">
            Diagnostic workflow
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#283638] tracking-tight">
            How Prompt Linter works
          </h2>
          <p className="text-sm text-[#737A72]">
            Four stages that turn an ambiguous UI request into a safe, specific prompt.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative">
          {[
            {
              n: '01',
              tag: 'Input',
              title: 'Describe',
              text: 'Provide the natural-language UI request: the screen, elements, colours, placement and behaviour.',
              foot: '→ Natural language',
            },
            {
              n: '02',
              tag: 'Route',
              title: 'Detect',
              text: 'Choose Rules, BERT or LLM from prompt features, then detect elements and link their attributes.',
              foot: '→ Element-aware tagging',
            },
            {
              n: '03',
              tag: 'Clarify',
              title: 'Ask',
              text: 'Missing, vague or low-confidence details become targeted questions. Answers are merged and re-checked.',
              foot: '→ Grounded answers',
            },
            {
              n: '04',
              tag: 'Output',
              title: 'Improve',
              text: 'Get a risk score, prioritised recommendations and a validated final prompt with placeholders.',
              foot: '→ Copy-ready rewrite',
            },
          ].map((step, index) => (
            <div
              key={step.n}
              className="bg-white p-5 rounded-xl border border-[#E5E2D8] shadow-xs flex flex-col justify-between relative group hover:border-[#49686C] transition-colors"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span
                    className={`w-8 h-8 rounded-lg font-mono font-bold text-xs flex items-center justify-center ${
                      index === 3 ? 'bg-[#F4F9F1] text-[#3E6B33]' : 'bg-[#F0F5F5] text-[#49686C]'
                    }`}
                  >
                    {step.n}
                  </span>
                  <span className="text-[11px] font-mono font-medium text-[#737A72]">{step.tag}</span>
                </div>
                <h3 className="text-base font-bold text-[#283638]">{step.title}</h3>
                <p className="text-xs text-[#737A72] leading-relaxed">{step.text}</p>
              </div>
              <div
                className={`pt-4 text-[11px] font-mono ${
                  index === 3 ? 'text-[#3E6B33]' : 'text-[#49686C]'
                }`}
              >
                {step.foot}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ADVANTAGES */}
      <section className="space-y-6">
        <div className="max-w-2xl space-y-2">
          <div className="text-xs font-bold text-[#49686C] uppercase tracking-wider">
            Engine advantages
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#283638] tracking-tight">
            What makes Prompt Linter useful?
          </h2>
          <p className="text-sm text-[#737A72]">
            Built for designers, product teams and engineers who use AI-assisted UI generation.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-xl border border-[#E5E2D8] shadow-xs space-y-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#49686C]" />
              <h3 className="text-sm font-bold text-[#283638]">Element-aware findings</h3>
            </div>
            <p className="text-xs text-[#737A72] leading-relaxed">
              Every missing detail is attached to a specific element — not just “the prompt is
              incomplete”.
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-[#E5E2D8] shadow-xs space-y-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#3E6B33]" />
              <h3 className="text-sm font-bold text-[#283638]">Grounded suggestions</h3>
            </div>
            <p className="text-xs text-[#737A72] leading-relaxed">
              Recommendations use the confirmed prompt and answers. Placeholders remain where the
              user has not decided.
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-[#E5E2D8] shadow-xs space-y-2">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-[#D1B653]" />
              <h3 className="text-sm font-bold text-[#283638]">Shared risk score</h3>
            </div>
            <p className="text-xs text-[#737A72] leading-relaxed">
              Completeness, vagueness, detector confidence and unresolved questions combine into a
              deterministic 0–100 score.
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-[#E5E2D8] shadow-xs space-y-2">
            <div className="flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-[#49686C]" />
              <h3 className="text-sm font-bold text-[#283638]">Three engines, one result</h3>
            </div>
            <p className="text-xs text-[#737A72] leading-relaxed">
              Rules, a fine-tuned DistilBERT tagger and an optional grounded LLM feed the same
              checker and the same final recommendation.
            </p>
          </div>
        </div>
      </section>

      {/* HONESTY */}
      <section className="bg-white rounded-2xl border border-[#E5E2D8] p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#E5E2D8]">
          <Cpu className="w-4 h-4 text-[#49686C]" />
          <h2 className="text-base font-bold text-[#283638]">Honest by design</h2>
        </div>

        <div className="space-y-3 text-xs text-[#737A72] leading-relaxed">
          <p>
            The core analysis is deterministic and explainable. Rules and BERT only label words that
            exist in the prompt. The LLM layer is grounded: values that cannot be found in the
            prompt or in the user’s answers are rejected.
          </p>
          <p>
            The final prompt is built from the confirmed checklist and placeholders. The LLM cannot
            silently add a colour, location or action that the user did not provide.
          </p>
          <p className="text-[#30494B] font-medium bg-[#F6F4EC] p-3 rounded-lg border border-[#E5E2D8]">
            The risk score is a heuristic, not a guarantee. It highlights missing details and
            uncertainty; it does not replace design review or a human check of the generated UI.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#30494B] rounded-2xl p-8 sm:p-12 text-center text-white space-y-5 relative overflow-hidden shadow-lg">
        <div className="max-w-xl mx-auto space-y-3 relative z-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Make the missing details visible.
          </h2>
          <p className="text-sm text-gray-200 leading-relaxed">
            Start with the UI you want to build. Review what the prompt left out before generating
            the screen.
          </p>
          <div className="pt-3">
            <button
              type="button"
              onClick={onStartAnalysis}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#D1B653] hover:bg-[#bda241] text-[#283638] text-sm font-bold shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-[0.98]"
            >
              <span>Analyze a Prompt</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="absolute -right-12 -bottom-12 opacity-10 pointer-events-none">
          <ClipboardCheck className="w-64 h-64" />
        </div>
      </section>
    </div>
  );
};
