import React from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Cpu,
  FileOutput,
  FileText,
  FolderKanban,
  History,
  Monitor,
  Network,
  Palette,
  ShieldCheck,
  Sparkles,
  Wrench,
} from 'lucide-react';

interface ManualPageProps {
  onOpenProjects?: () => void;
}

interface ManualSection {
  id: string;
  icon: React.ElementType;
  title: string;
  intro: string;
  steps: string[];
  tip?: string;
}

const SECTIONS: ManualSection[] = [
  {
    id: 'quick-start',
    icon: Sparkles,
    title: 'Quick start',
    intro: 'Vector turns requirement documents into a reviewed, build-ready interface brief. The whole flow takes about ten minutes on a small document.',
    steps: [
      'Create a project — everything in Vector belongs to one project.',
      'Open Requirement Compiler and upload your document (PDF, DOCX, TXT or Markdown).',
      'Review the extracted requirements and approve the ones you trust.',
      'Open Requirement Intelligence to check ambiguity, conflicts and dependencies.',
      'Accept the edge cases you agree with and approve the acceptance criteria.',
      'Generate the six-section brief in Specification & Prompt, then send it to Bolt.',
    ],
    tip: 'Only approved requirements become confirmed source text. Pending and rejected items never silently enter the brief.',
  },
  {
    id: 'projects',
    icon: FolderKanban,
    title: 'Projects',
    intro: 'A project groups its documents, requirements, approvals, design systems, prompts and analyses.',
    steps: [
      'Create a project from the Projects page with a name and optional description.',
      'Switch projects from the header dropdown; the whole app follows.',
      'Edit a project at any time with the pencil icon on its row.',
      'Deleting a project removes its documents, requirements and history after confirmation.',
    ],
    tip: 'Use one project per product or client. Analyses and history never mix between projects.',
  },
  {
    id: 'compiler',
    icon: FileText,
    title: 'Requirement Compiler',
    intro: 'Convert a requirement document into individual, traceable statements.',
    steps: [
      'Upload a PDF, DOCX, TXT or Markdown file up to 25 MB.',
      'Vector extracts statements and keeps the source page, paragraph and character range.',
      'Select Prioritize to classify requirements as critical, high, medium or low.',
      'Approve or reject one requirement, or select several and use the bulk actions.',
      'Filter by functional or non-functional, and search by text, code or role.',
    ],
    tip: 'Bulk rejection asks for confirmation. Every decision is added to the project audit trail.',
  },
  {
    id: 'intelligence',
    icon: Network,
    title: 'Requirement Intelligence',
    intro: 'See how requirements relate to screens, components and roles before design starts.',
    steps: [
      'Review the graph of requirements and their connections.',
      'Read findings grouped as ambiguities, conflicts and dependencies.',
      'Use the affected requirement codes and quoted source text to judge each finding.',
      'Download the full graph as a PNG for reviews, tickets or documentation.',
    ],
  },
  {
    id: 'review',
    icon: ClipboardCheck,
    title: 'Review & Acceptance',
    intro: 'Close the gaps a document usually leaves out, without inventing company requirements.',
    steps: [
      'Review suggested edge cases such as failure states, duplicates, empty results and permissions.',
      'Accept or reject suggestions one by one, or in bulk.',
      'Approve Given/When/Then acceptance criteria linked to their requirement.',
      'Rejected items stay visible for reference but are excluded from the approved brief.',
    ],
    tip: 'Suggestions are clearly labelled as AI-inferred until a person accepts them.',
  },
  {
    id: 'prompt',
    icon: FileOutput,
    title: 'Specification & Prompt',
    intro: 'Generate the design brief your team or an AI builder can act on.',
    steps: [
      'Choose a design system; its tokens are injected into the brief.',
      'Check Source of truth: approved/total requirements, criteria and suggestions, with the source of each value.',
      'Copy the six-section brief or save it as a version.',
      'Compare versions to see what changed, and restore an earlier version when needed.',
      'Save a baseline before editing requirements to detect regressions later.',
    ],
    tip: 'An approved brief includes approved criteria only. In draft mode, pending requirements and criteria are included and marked.',
  },
  {
    id: 'design',
    icon: Palette,
    title: 'Design Systems',
    intro: 'Keep colour, typography, spacing and brand guidance consistent across every brief.',
    steps: [
      'Create a design system and fill in colour, type, spacing, radius, shadows, navigation and accessibility tokens.',
      'Save it; every save records a version snapshot.',
      'Select it in Specification & Prompt to inject the tokens.',
      'Restore any earlier version from the history; the restore is recorded as a new version.',
    ],
  },
  {
    id: 'workspace',
    icon: Monitor,
    title: 'Bolt Workspace',
    intro: 'Move from a validated brief into interface generation.',
    steps: [
      'Open the workspace to see the brief beside the Bolt panel.',
      'Use Send to Bolt to copy the prompt and open Bolt in a new tab.',
      'Paste the prompt, generate and publish the app.',
      'Add the published bolt.host URL to preview it inside Vector.',
    ],
    tip: 'If Bolt blocks framing, use Open Bolt. Vector never fakes an embedded editor.',
  },
  {
    id: 'analysis',
    icon: Cpu,
    title: 'Prompt Analysis',
    intro: 'Check a single UI prompt for missing labels, colours, placement and actions.',
    steps: [
      'Choose the project the analysis belongs to.',
      'Describe the screen and its elements, then run the analysis.',
      'Answer any targeted questions to remove ambiguity.',
      'Read the risk index, completeness and per-element suggestions.',
      'Reopen any saved analysis from History.',
    ],
    tip: 'Completed analyses are saved only to the selected project.',
  },
  {
    id: 'history',
    icon: History,
    title: 'Analysis History',
    intro: 'Every prompt evaluation is stored per project.',
    steps: [
      'Use the project dropdown to look into another project’s records.',
      'Search by prompt or element, filter by risk and sort by date, risk or completeness.',
      'Open a record to reload its prompt.',
      'Delete a single record, or clear this project’s history after confirmation.',
    ],
  },
  {
    id: 'account',
    icon: ShieldCheck,
    title: 'Account & security',
    intro: 'Your workspace is private by default.',
    steps: [
      'Sign out from the header; the app asks for confirmation.',
      'Reset a forgotten password from the sign-in screen.',
      'Projects and documents are private to your workspace.',
      'The last page you visited is remembered for your account.',
    ],
  },
  {
    id: 'help',
    icon: Wrench,
    title: 'Troubleshooting',
    intro: 'The fastest fixes for the usual blockers.',
    steps: [
      '“Choose a project first” — pick one from the header dropdown or create a project.',
      'Analyze is disabled — select a project, or wait for the analyser to finish preparing.',
      'History looks empty — it is scoped to the project chosen in the History dropdown.',
      'Bolt preview is blank — the host blocks framing; use Open Bolt instead.',
      'A document produced no requirements — write requirements as full sentences, not headings.',
    ],
  },
];

export const ManualPage: React.FC<ManualPageProps> = ({ onOpenProjects }) => {
  const scrollTo = (id: string) => {
    document.getElementById(`manual-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="max-w-6xl mx-auto">
      <section className="relative overflow-hidden rounded-2xl border border-[#E5E2D8] dark:border-[#29383A] bg-[#FFFFFF] dark:bg-[#1B2426] p-7 sm:p-10 shadow-xs">
        <div className="absolute -right-16 -top-20 w-72 h-72 rounded-full bg-[#49686C]/8 blur-2xl" />
        <div className="absolute -left-10 -bottom-24 w-64 h-64 rounded-full bg-[#D1B653]/12 blur-2xl" />
        <div className="relative max-w-2xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#E4EBDD] dark:bg-[#23301F] text-[#30494B] dark:text-[#B7D9B0] border border-[#CFE2C8] dark:border-[#3D5236]">
            <BookOpen className="w-3 h-3" />
            Vector manual
          </div>
          <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight text-[#283638] dark:text-[#F2F5F3] leading-[1.15]">
            Everything you need to run Vector.
          </h1>
          <p className="mt-3 text-sm sm:text-base text-[#737A72] dark:text-[#9AA6A2] leading-relaxed">
            A guided tour of every workspace: compile requirements, review the gaps, generate a
            build-ready brief and keep design decisions consistent.
          </p>
          {onOpenProjects && (
            <button
              type="button"
              onClick={onOpenProjects}
              className="mt-5 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#49686C] hover:bg-[#30494B] text-white text-sm font-bold shadow-sm transition-all active:scale-[0.99]"
            >
              Open Projects
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </section>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8 items-start">
        <nav className="hidden lg:block sticky top-24 space-y-1" aria-label="Manual contents">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#737A72] px-2 mb-2">
            Contents
          </div>
          {SECTIONS.map(({ id, title, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => scrollTo(id)}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-xs font-semibold text-[#737A72] dark:text-[#9AA6A2] hover:bg-[#F6F4EC] dark:hover:bg-[#222E30] hover:text-[#283638] dark:hover:text-white transition-colors"
            >
              <Icon className="w-3.5 h-3.5 text-[#49686C] shrink-0" />
              {title}
            </button>
          ))}
        </nav>

        <div className="space-y-5">
          {SECTIONS.map(({ id, icon: Icon, title, intro, steps, tip }) => (
            <section
              key={id}
              id={`manual-${id}`}
              className="scroll-mt-24 bg-[#FFFFFF] dark:bg-[#1B2426] rounded-xl border border-[#E5E2D8] dark:border-[#29383A] shadow-xs p-5 sm:p-6"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#F0F5F5] dark:bg-[#222E30] text-[#49686C] dark:text-[#B9D1D4] flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#283638] dark:text-[#E7E4D9]">{title}</h2>
                  <p className="text-xs text-[#737A72] dark:text-[#9AA6A2] leading-relaxed mt-1">{intro}</p>
                </div>
              </div>

              <ol className="mt-4 space-y-2">
                {steps.map((step) => (
                  <li key={step} className="flex items-start gap-2 text-xs text-[#283638] dark:text-[#D5DBD4] leading-relaxed">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#688E5E] shrink-0 mt-0.5" />
                    <span>{step}</span>
                  </li>
                ))}
              </ol>

              {tip && (
                <div className="mt-4 rounded-lg border border-[#CFDFE1] dark:border-[#33403F] bg-[#F0F5F5] dark:bg-[#1F2B2D] px-3 py-2.5 text-[11px] text-[#49686C] dark:text-[#B9D1D4] leading-relaxed">
                  <b>Tip:</b> {tip}
                </div>
              )}
            </section>
          ))}

          <section className="bg-[#30494B] rounded-xl p-6 sm:p-8 text-center text-white">
            <h2 className="text-xl font-extrabold tracking-tight">Ready to start?</h2>
            <p className="text-sm text-gray-200 mt-1.5">
              Open a project, upload a requirement document and let Vector do the first pass.
            </p>
            {onOpenProjects && (
              <button
                type="button"
                onClick={onOpenProjects}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#D1B653] hover:bg-[#bda241] text-[#283638] text-sm font-bold transition-all"
              >
                Go to Projects
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
