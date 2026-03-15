"use client";

import { 
  BookOpen, 
  Terminal, 
  Copy, 
  Check, 
  ExternalLink,
  Github,
  Monitor
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface SimulationGuideProps {
  projectId: string;
}

export function SimulationGuide({ projectId }: SimulationGuideProps) {
  const [copied, setCopied] = useState(false);

  const envContent = `PROJECT_ID=${projectId}
AETHERA_API_URL=http://localhost:3002/api
POLLING_INTERVAL=30000`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(envContent);
    setCopied(true);
    toast.success("Environment configuration copied");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
      <div className="p-5 border-b border-zinc-200 bg-zinc-50/50 flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Terminal className="w-4 h-4 text-zinc-500" />
          IoT Simulation Guide
        </h3>
        <a 
          href="https://github.com/aethera/solar-stellar/tree/main/packages/iot-agent" 
          target="_blank"
          className="text-xs text-zinc-500 hover:text-zinc-900 flex items-center gap-1 transition-colors"
        >
          <Github className="w-3 h-3" />
          View Source
        </a>
      </div>
      
      <div className="p-6 space-y-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px]">1</div>
            Install Dependencies
          </div>
          <pre className="bg-zinc-900 text-zinc-300 p-3 rounded-xl text-xs font-mono overflow-x-auto">
            pnpm install
          </pre>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px]">2</div>
            Configure Environment
          </div>
          <div className="relative group">
            <button 
              onClick={copyToClipboard}
              className="absolute top-3 right-3 p-1.5 rounded-lg bg-zinc-800 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-white"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <pre className="bg-zinc-900 text-zinc-300 p-4 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed">
              {envContent}
            </pre>
          </div>
          <p className="text-[10px] text-zinc-500 italic">
            Create a <code>.env</code> file in <code>packages/iot-agent/</code> with these values.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px]">3</div>
            Run Simulation
          </div>
          <pre className="bg-zinc-900 text-zinc-300 p-3 rounded-xl text-xs font-mono overflow-x-auto">
            pnpm --filter iot-agent start
          </pre>
        </div>

        <div className="pt-4 border-t border-zinc-200">
          <div className="flex items-start gap-3 p-4 bg-blue-50/50 rounded-xl border border-blue-100">
            <BookOpen className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-semibold text-blue-900 mb-1">How it works</h4>
              <p className="text-[11px] text-blue-700 leading-relaxed">
                The agent generates a unique Stellar Keypair on first run. After registering its Public Key in the "IoT Devices" section above, it will start sending signed production data. The project status will automatically transition to <strong>Active</strong> upon the first successful packet.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
