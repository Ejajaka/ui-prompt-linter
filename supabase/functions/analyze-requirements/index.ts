import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SYSTEM = `You review UI requirements for ambiguity, conflicts and dependencies.
Return STRICT JSON only:
{"findings":[{"type":"ambiguity|conflict|dependency","severity":"low|medium|high|critical","title":"","detail":"","whyItMatters":"","affectedRequirementIds":["uuid"],"evidenceRequirementIds":["uuid"]}]}
Rules:
- Only use requirement IDs supplied by the user.
- Do not invent requirements or evidence.
- Conflict findings must cite at least two affected requirement IDs.
- Dependency findings must cite the dependent and prerequisite requirement IDs.
- Ambiguity findings must cite the affected requirement and explain what clarification is needed.
- At most 20 findings. Prefer high-signal findings.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization') || '';
    const client = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const projectId = String(body?.projectId || '');
    if (!projectId) throw new Error('projectId is required.');
    const { data: requirementRows, error: requirementError } = await client
      .from('requirements')
      .select('id, requirement_code, original_text, kind, metadata')
      .eq('project_id', projectId)
      .limit(120);
    if (requirementError) throw new Error(requirementError.message);
    const requirements = (requirementRows || []).map((row: any) => ({
      id: row.id,
      requirementCode: row.requirement_code,
      originalText: row.original_text,
      kind: row.kind,
      metadata: row.metadata || {},
    }));
    if (!requirements.length) {
      return new Response(JSON.stringify({ findings: [] }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    const allowedIds = new Set(requirements.map((item: any) => String(item.id)));
    const payload = requirements.slice(0, 120).map((item: any) => ({
      id: String(item.id),
      code: String(item.requirementCode || ''),
      text: String(item.originalText || ''),
      kind: String(item.kind || ''),
      screens: item.metadata?.screens || [],
      components: item.metadata?.components || [],
      roles: item.metadata?.roles || [],
    }));

    const baseUrl = (Deno.env.get('LLM_BASE_URL') || 'https://api.groq.com/openai/v1').replace(/\/$/, '');
    const apiKey = Deno.env.get('LLM_API_KEY') || '';
    const model = Deno.env.get('LLM_MODEL') || 'openai/gpt-oss-120b';
    if (!apiKey) throw new Error('LLM_API_KEY is not configured.');

    const llm = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: JSON.stringify({ requirements: payload }) },
        ],
      }),
    });
    if (!llm.ok) throw new Error(`LLM request failed (${llm.status}).`);
    const response = await llm.json();
    const content = response?.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(content.replace(/^```[a-z]*\s*|\s*```$/g, ''));
    const raw = Array.isArray(parsed.findings) ? parsed.findings : [];
    const findings = raw
      .filter((item: any) => ['ambiguity', 'conflict', 'dependency'].includes(item?.type))
      .map((item: any) => {
        const affected = (Array.isArray(item.affectedRequirementIds) ? item.affectedRequirementIds : [])
          .map(String)
          .filter((id: string) => allowedIds.has(id));
        const evidenceIds = (Array.isArray(item.evidenceRequirementIds) ? item.evidenceRequirementIds : affected)
          .map(String)
          .filter((id: string) => allowedIds.has(id));
        if (!affected.length) return null;
        if (item.type === 'conflict' && affected.length < 2) return null;
        return {
          type: item.type,
          severity: ['low', 'medium', 'high', 'critical'].includes(item.severity) ? item.severity : 'medium',
          title: String(item.title || 'Requirement issue').slice(0, 160),
          detail: String(item.detail || '').slice(0, 1200),
          whyItMatters: String(item.whyItMatters || '').slice(0, 800),
          affectedRequirementIds: affected,
          evidenceRequirementIds: evidenceIds.length ? evidenceIds : affected,
          source: 'llm',
          status: 'pending_review',
        };
      })
      .filter(Boolean)
      .slice(0, 20);

    return new Response(JSON.stringify({ findings }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || 'Requirement review failed.' }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
