import React, { useState } from 'react';
import {
  Layers,
  Tag,
  Ruler,
  Gauge,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

type Tone = 'critical' | 'high' | 'medium' | 'low';

interface GuidelineControl {
  name: string;
  description: string;
  detail: string;
  badge: string;
  tone: Tone;
}

interface GuidelineCategory {
  id: string;
  title: string;
  icon: any;
  description: string;
  detailLabel: string;
  controls: GuidelineControl[];
}

const GUIDELINES_DATA: GuidelineCategory[] = [
  {
    id: 'elements',
    title: 'Supported UI Elements',
    icon: Layers,
    description:
      'The ten interface elements Prompt Linter detects, and the required details each one must state to be considered complete.',
    detailLabel: 'Required attributes',
    controls: [
      {
        name: 'Button',
        description: 'A clickable action: its text, colour, placement and what it does.',
        detail: 'LABEL, ACTION, COLOR, LOCATION',
        badge: '4 required',
        tone: 'critical',
      },
      {
        name: 'Navbar',
        description: 'A top navigation bar with links.',
        detail: 'COLOR, LOCATION, LABEL',
        badge: '3 required',
        tone: 'high',
      },
      {
        name: 'Input',
        description: 'A text field or form control.',
        detail: 'LABEL, LOCATION',
        badge: '2 required',
        tone: 'medium',
      },
      {
        name: 'Card',
        description: 'A content container with a title.',
        detail: 'COLOR, LOCATION, LABEL',
        badge: '3 required',
        tone: 'high',
      },
      {
        name: 'Modal',
        description: 'A dialog or overlay window.',
        detail: 'ACTION, LABEL, COLOR',
        badge: '3 required',
        tone: 'high',
      },
      {
        name: 'Image',
        description: 'A picture or illustration.',
        detail: 'LOCATION, LABEL',
        badge: '2 required',
        tone: 'medium',
      },
      {
        name: 'Dropdown',
        description: 'A select menu with options.',
        detail: 'LABEL, LOCATION, ACTION',
        badge: '3 required',
        tone: 'high',
      },
      {
        name: 'Sidebar',
        description: 'A side navigation panel.',
        detail: 'LOCATION, COLOR, LABEL',
        badge: '3 required',
        tone: 'high',
      },
      {
        name: 'Footer',
        description: 'The page footer.',
        detail: 'COLOR, LABEL',
        badge: '2 required',
        tone: 'medium',
      },
      {
        name: 'Checkbox',
        description: 'A tick box with label text.',
        detail: 'LABEL, LOCATION',
        badge: '2 required',
        tone: 'medium',
      },
    ],
  },
  {
    id: 'attributes',
    title: 'Required Attribute Kinds',
    icon: Tag,
    description:
      'What each attribute kind means when it is attached to an element, and how widely it applies across the schema.',
    detailLabel: 'What it means',
    controls: [
      {
        name: 'LABEL',
        description: 'The text or purpose shown on the element.',
        detail:
          'The text on a button, the links of a navbar or sidebar, the purpose of an input, the title of a card or modal, what an image shows, what a dropdown selects, the content of a footer, or the text next to a checkbox.',
        badge: '10 elements',
        tone: 'critical',
      },
      {
        name: 'LOCATION',
        description: 'Where the element sits on the screen.',
        detail:
          'Absolute placement such as “top right corner” or relational placement such as “below the navbar”. Vague placement (“somewhere on the side”) does not count.',
        badge: '8 elements',
        tone: 'high',
      },
      {
        name: 'COLOR',
        description: 'The colour of the element.',
        detail:
          'Named colours, hex values, or joined forms like “off-white”. Vague colours (“some nice colour”) do not count.',
        badge: '6 elements',
        tone: 'high',
      },
      {
        name: 'ACTION',
        description: 'What interacting with the element does.',
        detail:
          'What a button click does, what opens a modal, or what selecting a dropdown option does. “A login button” does not imply an action.',
        badge: '3 elements',
        tone: 'medium',
      },
    ],
  },
  {
    id: 'annotation',
    title: 'Annotation Rules',
    icon: Ruler,
    description:
      'The deterministic rules the engine follows when labelling the words in a prompt. These follow the dataset annotation spec.',
    detailLabel: 'Guidance',
    controls: [
      {
        name: 'No implicit inference',
        description: 'Only stated details are labelled — nothing is assumed.',
        detail:
          '“A login button” has a label context but no stated ACTION, so the action counts as missing rather than being inferred.',
        badge: 'Rule 1',
        tone: 'low',
      },
      {
        name: 'Vague values are not labelled',
        description: 'Non-actionable phrasing is treated as missing.',
        detail:
          '“Some nice colour”, “somewhere on the side”, “that does something useful” and “with some text” are too vague to label; the attribute is reported as “too vague”.',
        badge: 'Rule 2',
        tone: 'high',
      },
      {
        name: 'Landmark references are not elements',
        description: 'Placement nouns stay part of a location span.',
        detail:
          'In “above the footer” or “under the hero image”, the noun belongs to a LOCATION span — it is not a new element.',
        badge: 'Rule 3',
        tone: 'medium',
      },
      {
        name: 'Attributes follow their clause',
        description: 'A value belongs to the element it is closest to.',
        detail:
          '“A red button and a blue card” links red to the button and blue to the card, never the other way around.',
        badge: 'Rule 4',
        tone: 'medium',
      },
      {
        name: 'Only the words themselves are labelled',
        description: 'Function words stay outside the tag.',
        detail:
          'Quotes, “that/which”, “labelled” and “colour” remain unlabelled (O); only the actual value words carry the tag.',
        badge: 'Rule 5',
        tone: 'low',
      },
      {
        name: 'Coreference is out of scope',
        description: 'Pronouns and forward references are not resolved.',
        detail:
          '“Make it blue” or “another one next to it” are left for the user to clarify rather than guessed.',
        badge: 'Rule 6',
        tone: 'low',
      },
    ],
  },
  {
    id: 'risk',
    title: 'Risk Score Bands',
    icon: Gauge,
    description:
      'The shared deterministic 0–100 risk score and its four severity bands, shown before and after clarification.',
    detailLabel: 'Band',
    controls: [
      {
        name: 'Low',
        description: 'The prompt is essentially complete.',
        detail: 'Few or no missing details — safe to proceed to generation.',
        badge: '0–24',
        tone: 'low',
      },
      {
        name: 'Medium',
        description: 'Some details are missing or vague.',
        detail: 'Answer the clarification questions before generating to avoid assumptions.',
        badge: '25–49',
        tone: 'medium',
      },
      {
        name: 'High',
        description: 'Important details are missing or ambiguous.',
        detail: 'Resolve the missing attributes before relying on the generated UI.',
        badge: '50–74',
        tone: 'high',
      },
      {
        name: 'Critical',
        description: 'Core details are missing or the prompt contains risky assumptions.',
        detail: 'Block generation until the prompt is completed and validated.',
        badge: '75–100',
        tone: 'critical',
      },
    ],
  },
];

const TONE_STYLES: Record<Tone, string> = {
  critical: 'bg-[#FDF2F0] text-[#B94D42] border-[#F0C4BF]',
  high: 'bg-[#FFF7ED] text-[#C96839] border-[#FED7AA]',
  medium: 'bg-[#FEFCE8] text-[#856C16] border-[#FEF08A]',
  low: 'bg-[#F0F5F5] text-[#49686C] border-[#CFDFE1]',
};

export const GuidelinesPage: React.FC = () => {
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>('elements');

  const toggleCategory = (id: string) => {
    setExpandedCategoryId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#283638] tracking-tight">
          Prompt Guidelines &amp; Baseline
        </h1>
        <p className="text-xs sm:text-sm text-[#737A72] mt-1">
          Reference catalog of the UI elements, required attributes, annotation rules and risk bands
          evaluated by Prompt Linter.
        </p>
      </div>

      <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#E5E2D8] text-xs text-[#737A72] leading-relaxed flex items-start gap-3">
        <CheckCircle2 className="w-4 h-4 text-[#49686C] shrink-0 mt-0.5" />
        <p>
          Prompt Linter checks each detected element against a fixed{' '}
          <strong className="text-[#283638]">required-attribute schema</strong>. Findings shown
          during analysis map directly to the element types, attribute kinds and rules documented
          here.
        </p>
      </div>

      {/* Accordion List */}
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
                    <h3 className="text-sm sm:text-base font-bold text-[#283638]">
                      {cat.title}
                    </h3>
                    <p className="text-xs text-[#737A72] line-clamp-1">
                      {cat.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-[#737A72] hidden sm:inline-block">
                    {cat.controls.length} items
                  </span>
                  <div className="p-1 rounded text-[#737A72]">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="px-5 pb-5 pt-1 border-t border-[#E5E2D8] space-y-4 bg-[#FAFAF8]">
                  <p className="text-xs text-[#737A72] pt-2">
                    {cat.description}
                  </p>

                  <div className="space-y-3">
                    {cat.controls.map((ctrl, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-lg bg-[#FFFFFF] border border-[#E5E2D8] space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs font-bold text-[#283638]">
                            {ctrl.name}
                          </h4>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${TONE_STYLES[ctrl.tone]}`}>
                            {ctrl.badge}
                          </span>
                        </div>
                        <p className="text-xs text-[#737A72]">
                          {ctrl.description}
                        </p>
                        <div className="p-2.5 rounded bg-[#F6F4EC] border border-[#E5E2D8] text-xs font-mono text-[#30494B]">
                          <span className="font-sans font-bold text-[#49686C] block text-[11px] mb-0.5">
                            {cat.detailLabel}:
                          </span>
                          {ctrl.detail}
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
