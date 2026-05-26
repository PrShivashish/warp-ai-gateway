import React from 'react';
import { Database, Zap, Shield, Key } from 'lucide-react';

export const BentoGrid = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto w-full text-left">
      {/* Feature 1: Provider Arbitrage */}
      <div className="animate-fade-in-up delay-100 glass-panel p-8 rounded-2xl md:col-span-2 flex flex-col justify-between group hover:border-blue-500/50 transition-colors">
        <div>
          <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-6">
            <Zap className="w-6 h-6 text-blue-400" />
          </div>
          <h3 className="text-2xl font-bold mb-3 text-frost group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-400 group-hover:to-cyan-400 transition-all">Dynamic Arbitrage</h3>
          <p className="text-ash leading-relaxed max-w-md">
            Warp intelligently routes requests between providers. If Groq hits a ratelimit, the gateway instantly falls back to Gemini 2.0 Flash or any configured provider transparently.
          </p>
        </div>
        <div className="mt-8 flex gap-3">
          <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-tech text-ash">Groq</span>
          <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-tech text-ash">Google Gemini</span>
          <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-tech text-ash">Future Expandable</span>
        </div>
      </div>

      {/* Feature 2: Protocol Matches */}
      <div className="animate-fade-in-up delay-200 glass-panel p-8 rounded-2xl flex flex-col justify-between group hover:border-blue-500/50 transition-colors">
        <div>
          <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center mb-6">
            <Shield className="w-6 h-6 text-purple-400" />
          </div>
          <h3 className="text-2xl font-bold mb-3 text-frost">100% SSE Native</h3>
          <p className="text-ash leading-relaxed">
            Every streaming response is perfectly structured to match the OpenAI spec. Zero vendor lock-in; your LangChain or Vercel AI SDKs work without modifications.
          </p>
        </div>
      </div>

      {/* Feature 3: Ledger */}
      <div className="animate-fade-in-up delay-300 glass-panel p-8 rounded-2xl flex flex-col justify-between group hover:border-blue-500/50 transition-colors">
        <div>
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6">
            <Database className="w-6 h-6 text-emerald-400" />
          </div>
          <h3 className="text-2xl font-bold mb-3 text-frost">Atomic Tokenomics</h3>
          <p className="text-ash leading-relaxed">
            Input and output tokens are parsed directly from the data plane and billed against a centralized wallet balance via PostgreSQL to the exact micro-cent.
          </p>
        </div>
      </div>

      {/* Feature 4: Admin Key Management */}
      <div className="animate-fade-in-up delay-400 glass-panel p-8 rounded-2xl md:col-span-2 flex flex-col justify-between group hover:border-blue-500/50 transition-colors relative overflow-hidden">
        <div className="absolute right-0 bottom-0 opacity-10 blur-xl translate-x-1/4 translate-y-1/4">
          <Key className="w-64 h-64 text-blue-500" />
        </div>
        <div className="relative z-10">
          <h3 className="text-2xl font-bold mb-3 text-frost">Total Fleet Control</h3>
          <p className="text-ash leading-relaxed max-w-lg mb-6">
            Issue revokable API keys, rotate root provider credentials dynamically, and track latency metrics per application instance. Maintain full data sovereignty over your AI infrastructure.
          </p>
        </div>
      </div>
    </div>
  );
};
