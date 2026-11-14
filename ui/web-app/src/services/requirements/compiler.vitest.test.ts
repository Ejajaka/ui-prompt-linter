import { describe, expect, it } from 'vitest';
import { compileRequirements } from './compiler.ts';
import type { ExtractedDocument } from '../../types/requirements.ts';

function documentFor(pages: string[]): ExtractedDocument {
  return {
    pages,
    text: pages.join('\n\n'),
    pageCount: pages.length,
    fileName: 'requirements.md',
    mimeType: 'text/markdown',
  };
}

describe('requirement compiler', () => {
  it('extracts traceable functional and non-functional requirements', () => {
    const page = [
      'Requirements',
      '- Users must log in with email and password.',
      '- The dashboard should display employee statistics.',
      '- The system must be responsive on mobile devices.',
    ].join('\n');
    const docs = compileRequirements(documentFor([page]), { codePrefix: 'REQ-TEST' });

    expect(docs).toHaveLength(3);
    expect(docs.map((item) => item.requirementCode)).toEqual([
      'REQ-TEST-001',
      'REQ-TEST-002',
      'REQ-TEST-003',
    ]);
    expect(docs[0].kind).toBe('functional');
    expect(docs[2].kind).toBe('non_functional');
    expect(docs[0].metadata.roles).toContain('Users');
    expect(docs[1].metadata.components).toContain('dashboard');
    for (const draft of docs) {
      expect(page.slice(draft.sourceCharStart, draft.sourceCharEnd)).toContain(draft.originalText);
    }
  });

  it('keeps page numbers and drops duplicate statements', () => {
    const docs = compileRequirements(
      documentFor([
        'Login page\nThe user must sign in with a password.',
        'Employee page\n- Admins can edit employee profiles.\n- Admins can edit employee profiles.',
      ]),
      { codePrefix: 'REQ-PAGE' }
    );
    expect(docs).toHaveLength(2);
    expect(docs[0].sourcePage).toBe(1);
    expect(docs[1].sourcePage).toBe(2);
    expect(docs[1].metadata.roles).toContain('Admins');
  });
});
