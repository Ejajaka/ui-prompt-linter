import type {
  ExtractedDocument,
  RequirementDraft,
  RequirementKind,
  RequirementMetadata,
} from '../../types/requirements.ts';

const MODAL_RE = /\b(shall|must|should|will|would|needs?\s+to|required|must\s+be|can|may|is\s+able\s+to|are\s+able\s+to)\b/i;
const ACTION_RE = /\b(add|allow|apply|authenticate|build|close|create|delete|disable|display|download|edit|enable|encrypt|ensure|fetch|filter|grant|handle|include|keep|launch|log|make|navigate|notify|open|prevent|provide|redirect|render|require|restrict|save|search|send|show|sort|store|submit|support|update|upload|validate)\b/i;
const UI_NOUN_RE = /\b(button|navbar|navigation|input|field|form|card|modal|dialog|image|dropdown|sidebar|footer|checkbox|table|dashboard|page|screen|menu|toast|banner|tab)\b/i;
const NON_FUNCTIONAL_RE = /\b(security|secure|performance|latency|accessibility|a11y|responsive|availability|reliability|scalability|compliance|privacy|audit|encryption|retention|browser|mobile|tablet|internationalization|localization|seo|rate\s+limit|backup|disaster|uptime)\b/i;

const SCREENS_RE = /\b([A-Z][a-zA-Z0-9]*(?:\s+[A-Z][a-zA-Z0-9]*){0,3})\s+(?:page|screen)\b/g;
const ROLES_RE = /\b(admin|administrator|super\s+admin|employee|manager|customer|user|guest|owner|reviewer|operator|auditor|editor|viewer)s?\b/gi;
const COMPONENTS = [
  'button', 'navbar', 'navigation', 'input', 'form', 'card', 'modal', 'dialog',
  'image', 'dropdown', 'sidebar', 'footer', 'checkbox', 'table', 'dashboard',
  'menu', 'toast', 'banner', 'tab',
];
const BEHAVIOURS = [
  'add', 'allow', 'apply', 'authenticate', 'build', 'close', 'create', 'delete',
  'disable', 'display', 'download', 'edit', 'enable', 'encrypt', 'ensure',
  'fetch', 'filter', 'grant', 'handle', 'include', 'keep', 'launch', 'log',
  'navigate', 'notify', 'open', 'prevent', 'provide', 'redirect', 'render',
  'restrict', 'save', 'search', 'send', 'show', 'sort', 'store', 'submit',
  'support', 'update', 'upload', 'validate',
];

export interface CompileOptions {
  codePrefix?: string;
  maxRequirements?: number;
}

function unique(values: string[], limit = 8): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const key = value.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(value.trim());
    if (out.length >= limit) break;
  }
  return out;
}

function metadataFor(text: string, fileName: string): RequirementMetadata {
  const lowered = text.toLowerCase();
  const screens = [...text.matchAll(SCREENS_RE)].map((match) => match[1]);
  const roles = [...text.matchAll(ROLES_RE)].map((match) => match[0]);
  const components = COMPONENTS.filter((component) => lowered.includes(component));
  const behaviours = BEHAVIOURS.filter((verb) => new RegExp(`\\b${verb}\\b`, 'i').test(text));
  return {
    screens: unique(screens),
    components: unique(components),
    roles: unique(roles),
    behaviours: unique(behaviours),
    fileName,
  };
}

function kindFor(text: string): RequirementKind {
  return NON_FUNCTIONAL_RE.test(text) ? 'non_functional' : 'functional';
}

function shouldKeep(text: string, isBullet: boolean): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 12) return false;
  if (/^[A-Z][A-Za-z0-9 /&-]{1,60}:$/.test(trimmed)) return false;
  if (MODAL_RE.test(trimmed)) return true;
  if (UI_NOUN_RE.test(trimmed) && ACTION_RE.test(trimmed)) return true;
  if (isBullet && ACTION_RE.test(trimmed)) return true;
  return false;
}

interface Segment {
  text: string;
  start: number;
  paragraph: number;
}

function segmentsForPage(pageText: string): Segment[] {
  const segments: Segment[] = [];
  const lines = pageText.split(/\r?\n/);
  let offset = 0;
  let paragraph = 0;

  const pushSentence = (raw: string, start: number, para: number) => {
    const sentenceRe = /[^.!?]+(?:[.!?]+|$)/g;
    let match: RegExpExecArray | null;
    while ((match = sentenceRe.exec(raw)) !== null) {
      const text = match[0].trim();
      if (!text) continue;
      const leading = match[0].indexOf(text);
      segments.push({ text, start: start + match.index + Math.max(0, leading), paragraph: para });
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      offset += line.length + 1;
      continue;
    }
    paragraph += 1;
    const leading = line.indexOf(trimmed);
    const isBullet = /^([-*•]|\d+[.)])\s+/.test(trimmed) || /^\d+(\.\d+)*\s+/.test(trimmed);
    if (isBullet || trimmed.length < 320) {
      const cleaned = trimmed.replace(/^([-*•]|\d+[.)])\s+/, '').trim();
      const bulletOffset = startForTrimmed(line, trimmed) + (trimmed.length - cleaned.length);
      if (shouldKeep(cleaned, isBullet)) {
        segments.push({ text: cleaned, start: offset + bulletOffset, paragraph });
      } else if (cleaned.length >= 320) {
        pushSentence(cleaned, offset + bulletOffset, paragraph);
      }
    } else {
      pushSentence(trimmed, offset + leading, paragraph);
    }
    offset += line.length + 1;
  }
  return segments;
}

function startForTrimmed(line: string, trimmed: string): number {
  return Math.max(0, line.indexOf(trimmed));
}

/**
 * Deterministic requirement compiler.
 *
 * It deliberately preserves the exact requirement wording and character
 * offsets. Semantic LLM enrichment can add labels/suggestions later, but it
 * may not replace or silently rewrite the source text.
 */
export function compileRequirements(
  document: ExtractedDocument,
  options: CompileOptions = {},
): RequirementDraft[] {
  const prefix = options.codePrefix || 'REQ';
  const max = options.maxRequirements ?? 300;
  const drafts: RequirementDraft[] = [];
  const seen = new Set<string>();
  let globalOffset = 0;

  document.pages.forEach((page, pageIndex) => {
    const segments = segmentsForPage(page);
    for (const segment of segments) {
      if (drafts.length >= max) break;
      const normalized = segment.text.replace(/\s+/g, ' ').trim();
      if (!normalized) continue;
      const dedupeKey = normalized.toLowerCase();
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      drafts.push({
        requirementCode: `${prefix}-${String(drafts.length + 1).padStart(3, '0')}`,
        originalText: segment.text,
        normalizedText: normalized,
        kind: kindFor(segment.text),
        sourcePage: pageIndex + 1,
        sourceParagraph: segment.paragraph,
        sourceCharStart: globalOffset + segment.start,
        sourceCharEnd: globalOffset + segment.start + segment.text.length,
        metadata: metadataFor(segment.text, document.fileName),
      });
    }
    globalOffset += page.length + 2;
  });

  return drafts;
}
