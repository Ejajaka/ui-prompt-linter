import React from 'react';
import { ShieldCheck, Lock, Cpu, Clipboard, Users, Mail } from 'lucide-react';

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#FFFFFF] p-5 sm:p-6 rounded-xl border border-[#E5E2D8] shadow-xs">
      <div className="flex items-center gap-2 pb-3 border-b border-[#E5E2D8]">
        {icon}
        <h2 className="text-base font-bold text-[#283638]">{title}</h2>
      </div>
      <div className="pt-3 text-sm text-[#283638] leading-relaxed space-y-2">{children}</div>
    </div>
  );
}

export const PrivacyPage: React.FC = () => {
  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#283638] tracking-tight">Privacy Policy</h1>
        <p className="text-xs sm:text-sm text-[#737A72] mt-1">
          Last updated: November 12, 2026 · Applies to the web app, browser extension and Android app.
        </p>
      </div>

      <Section icon={<ShieldCheck className="w-4 h-4 text-[#49686C]" />} title="Data collection">
        <p>Prompt Linter collects <strong>no data</strong>. It does not:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>collect, store or transmit any prompt text, browsing history, or personal information;</li>
          <li>use analytics, trackers, or cookies;</li>
          <li>require an account or sign-in.</li>
        </ul>
        <p>
          Your prompt history and preferences are stored only in your device's local storage (or the app's local
          database on Android). You can clear them at any time in Settings.
        </p>
      </Section>

      <Section icon={<Cpu className="w-4 h-4 text-[#49686C]" />} title="How analysis works">
        <p>
          The deterministic <strong>Rules</strong> engine runs entirely on your device — in the browser (via
          Pyodide), in the extension popup, and on-device in the Android app. Your prompt never leaves your device
          for Rules-based analysis.
        </p>
        <p>
          The optional <strong>BERT</strong> engine loads a quantized DistilBERT model in your browser and runs
          locally. It does not upload your prompt.
        </p>
        <p>
          The optional <strong>LLM</strong> engine only runs if you add an OpenAI-compatible endpoint and API key in
          Settings. When you use it, your prompt is sent to that endpoint you configure — no other third party.
        </p>
      </Section>

      <Section icon={<Clipboard className="w-4 h-4 text-[#49686C]" />} title="Clipboard">
        <p>
          The web app and extension write to the clipboard only when you explicitly click “Copy prompt”, using the
          standard Clipboard API on that click.
        </p>
      </Section>

      <Section icon={<Users className="w-4 h-4 text-[#49686C]" />} title="Third parties">
        <p>
          No data is shared with any third party. The only exception is the LLM endpoint you choose to configure
          yourself in Settings.
        </p>
      </Section>

      <Section icon={<Mail className="w-4 h-4 text-[#49686C]" />} title="Contact">
        <p>
          For questions or issues, open an issue on the project repository:{' '}
          <a
            className="text-[#49686C] underline"
            href="https://github.com/Ejajaka/ui-prompt-linter"
            target="_blank"
            rel="noreferrer"
          >
            github.com/Ejajaka/ui-prompt-linter
          </a>
          .
        </p>
      </Section>

      <div className="flex items-start gap-2.5 bg-[#F6F4EC] border border-[#E5E2D8] rounded-xl p-4">
        <Lock className="w-4 h-4 text-[#49686C] shrink-0 mt-0.5" />
        <p className="text-xs text-[#737A72] leading-relaxed">
          This policy applies to the Prompt Linter website, browser extension and Android app. It does not cover the
          separate Streamlit full engine, which runs BERT and LLM features server-side.
        </p>
      </div>
    </div>
  );
};
