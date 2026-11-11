import React, { useState } from 'react';
import {
  LayoutDashboard,
  Type,
  Palette,
  MousePointerClick,
  MessageSquare,
  Layers,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface GuidelineCategory {
  id: string;
  title: string;
  icon: any;
  description: string;
  controls: {
    name: string;
    description: string;
    remediationClause: string;
    severity: 'critical' | 'high' | 'medium';
  }[];
}

const GUIDELINES_DATA: GuidelineCategory[] = [
  {
    id: 'elements',
    title: 'Element completeness',
    icon: Layers,
    description: 'Every required UI element should be named with a supported type and a clear surface form.',
    controls: [
      {
        name: 'Name the element',
        description: 'State the UI element explicitly: button, navbar, input, card, modal, image, dropdown, sidebar, footer or checkbox.',
        remediationClause: 'Add a navbar at the top of the page with links Home, About and Contact.',
        severity: 'high',
      },
      {
        name: 'Use a supported type',
        description: 'Use one of the ten supported element types so the checker applies the right required-attribute schema.',
        remediationClause: 'Use “input field” instead of “thing for typing”.',
        severity: 'high',
      },
      {
        name: 'Avoid landmark confusion',
        description: 'A UI noun inside a location phrase is a landmark reference, not another element.',
        remediationClause: '“Above the footer” is a location; it does not create a second footer element.',
        severity: 'medium',
      },
    ],
  },
  {
    id: 'labels',
    title: 'Labels & content',
    icon: Type,
    description: 'Specify the text, list items or purpose the user will see on the element.',
    controls: [
      {
        name: 'Button text',
        description: 'Say what the button says, not just that it exists.',
        remediationClause: 'Add a red button labelled “Sign Up” at the top right corner.',
        severity: 'high',
      },
      {
        name: 'Navigation and sidebar items',
        description: 'List the links or items in a navbar or sidebar.',
        remediationClause: 'Add a navbar with links Home, Products and Pricing.',
        severity: 'high',
      },
      {
        name: 'Input purpose',
        description: 'Say what an input field is for, such as email, password or search query.',
        remediationClause: 'Add an email input field in the center of the screen.',
        severity: 'high',
      },
    ],
  },
  {
    id: 'colour',
    title: 'Colour & styling',
    icon: Palette,
    description: 'State an explicit colour or theme intent; vague colour requests are treated as missing.',
    controls: [
      {
        name: 'Explicit colour',
        description: 'Give a concrete colour name or hex code.',
        remediationClause: 'Use blue, dark green, maroon or #2E86C1 rather than “a nice colour”.',
        severity: 'high',
      },
      {
        name: 'No vague colour',
        description: 'Expressions like “some nice colour” or “a colour that looks good” are not actionable.',
        remediationClause: 'Replace “in a bright colour” with “in teal”.',
        severity: 'medium',
      },
      {
        name: 'Theme and contrast intent',
        description: 'If the element should blend with a theme, state the theme or the contrast requirement.',
        remediationClause: 'Use the dark theme with a light label for contrast.',
        severity: 'medium',
      },
    ],
  },
  {
    id: 'placement',
    title: 'Placement & layout',
    icon: LayoutDashboard,
    description: 'Say where the element sits using an absolute or relational location.',
    controls: [
      {
        name: 'Absolute placement',
        description: 'Use a screen region: top right corner, bottom left, center of the page, middle of the screen.',
        remediationClause: 'Place the card in the bottom right corner.',
        severity: 'high',
      },
      {
        name: 'Relational placement',
        description: 'Describe placement relative to another element when that is clearer.',
        remediationClause: 'Place the checkbox below the password field.',
        severity: 'high',
      },
      {
        name: 'Region clarity',
        description: 'Say whether the location is on the page, the screen, the header or a specific section.',
        remediationClause: 'Place the button at the top of the page, not just “at the top”.',
        severity: 'medium',
      },
    ],
  },
  {
    id: 'actions',
    title: 'Actions & behaviour',
    icon: MousePointerClick,
    description: 'Describe what happens after the user interacts with the element.',
    controls: [
      {
        name: 'Click action',
        description: 'For a button, state what clicking it does.',
        remediationClause: 'Add a “Sign Up” button that opens the signup form.',
        severity: 'high',
      },
      {
        name: 'Modal trigger',
        description: 'For a modal, state what opens it or when it appears.',
        remediationClause: 'Add a modal titled “Confirm Delete” that appears when the user clicks Delete.',
        severity: 'high',
      },
      {
        name: 'Dropdown selection',
        description: 'For a dropdown, state what happens when an option is selected.',
        remediationClause: 'Add a country dropdown that filters the list by country.',
        severity: 'high',
      },
    ],
  },
  {
    id: 'states',
    title: 'States & feedback',
    icon: MessageSquare,
    description: 'Mention validating, loading, empty, success and error states when they matter for the UI.',
    controls: [
      {
        name: 'Loading and empty states',
        description: 'Say what the user sees while data loads or when there is nothing to show.',
        remediationClause: 'Show a loading spinner and an empty-state message when there are no results.',
        severity: 'high',
      },
      {
        name: 'Validation copy',
        description: 'Describe the message shown when input is missing or invalid.',
        remediationClause: 'Show “Enter a valid email” below the email field.',
        severity: 'medium',
      },
      {
        name: 'Success feedback',
        description: 'Say how the user knows an action succeeded.',
        remediationClause: 'Show a “Saved successfully” toast after the form is submitted.',
        severity: 'medium',
      },
    ],
  },
];

export const GuidelinesPage: React.FC = () => {
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>('elements');

  const toggleCategory = (id: string) => {
    setExpandedCategoryId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#283638] tracking-tight">
          Prompt Guidelines & Attributes
        </h1>
        <p className="text-xs sm:text-sm text-[#737A72] mt-1">
          Reference catalog of UI prompt checks, required attributes and example wording used by Prompt Linter.
        </p>
      </div>

      <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#E5E2D8] text-xs text-[#737A72] leading-relaxed flex items-start gap-3">
        <CheckCircle2 className="w-4 h-4 text-[#49686C] shrink-0 mt-0.5" />
        <p>
          Prompt Linter checks prompts against a schema-driven completeness baseline. The examples
          below use the same annotation rules as the dataset: only stated details count, vague values
          are treated as missing, and landmark phrases are not elements.
        </p>
      </div>

      <div className="space-y-3">
        {GUIDELINES_DATA.map((cat) => {
          const Icon = cat.icon;
          const isExpanded = expandedCategoryId === cat.id;

          return (
            <div
              key={cat.id}
              className="bg-[#FFFFFF] rounded-xl border border-[#E5E2D8] shadow-xs overflow-hidden transition-all"
            >
              <button
                type="button"
                onClick={() => toggleCategory(cat.id)}
                className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 text-left hover:bg-[#FAFAF8] transition-colors"
                aria-expanded={isExpanded}
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-2 rounded-lg bg-[#F0F5F5] text-[#49686C] shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-[#283638]">{cat.title}</h3>
                    <p className="text-xs text-[#737A72] line-clamp-1">{cat.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-[#737A72] hidden sm:inline-block">
                    {cat.controls.length} checks
                  </span>
                  <div className="p-1 rounded text-[#737A72]">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="px-5 pb-5 pt-1 border-t border-[#E5E2D8] space-y-4 bg-[#FAFAF8]">
                  <p className="text-xs text-[#737A72] pt-2">{cat.description}</p>

                  <div className="space-y-3">
                    {cat.controls.map((ctrl, idx) => (
                      <div key={idx} className="p-4 rounded-lg bg-[#FFFFFF] border border-[#E5E2D8] space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs font-bold text-[#283638]">{ctrl.name}</h4>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${
                              ctrl.severity === 'critical'
                                ? 'bg-[#FDF2F0] text-[#B94D42] border-[#F0C4BF]'
                                : ctrl.severity === 'high'
                                ? 'bg-[#FFF7ED] text-[#C96839] border-[#FED7AA]'
                                : 'bg-[#FEFCE8] text-[#856C16] border-[#FEF08A]'
                            }`}
                          >
                            {ctrl.severity}
                          </span>
                        </div>
                        <p className="text-xs text-[#737A72]">{ctrl.description}</p>
                        <div className="p-2.5 rounded bg-[#F6F4EC] border border-[#E5E2D8] text-xs font-mono text-[#30494B]">
                          <span className="font-sans font-bold text-[#49686C] block text-[11px] mb-0.5">
                            Example wording:
                          </span>
                          &ldquo;{ctrl.remediationClause}&rdquo;
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
