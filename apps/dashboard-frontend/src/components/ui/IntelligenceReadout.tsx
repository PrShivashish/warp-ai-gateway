import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Shield, Database, Key } from 'lucide-react';

const easeBrutal = [0.76, 0, 0.24, 1];

export const IntelligenceReadout = () => {
  const features = [
    {
      title: "DYNAMIC ARBITRAGE",
      description: "Intelligent request orchestration. Fall back between Groq and Gemini transparently as latencies fluctuate.",
      icon: <Zap className="w-5 h-5 text-hyper-crimson" />,
      tag: "CORE_V1"
    },
    {
      title: "100% SSE NATIVE",
      description: "Pure OpenAI specification mapping. Every stream is perfectly structured for your existing toolsets.",
      icon: <Shield className="w-5 h-5 text-hyper-crimson" />,
      tag: "SYNC_PROTOCOL"
    },
    {
      title: "ATOMIC TOKENOMICS",
      description: "Input and output tokens billed against centralized Postgres balances to the exact micro-cent.",
      icon: <Database className="w-5 h-5 text-hyper-crimson" />,
      tag: "FINANCIAL_PLANE"
    },
    {
      title: "TOTAL FLEET CONTROL",
      description: "Revokable API keys and root provider rotation with unified latency telemetry.",
      icon: <Key className="w-5 h-5 text-hyper-crimson" />,
      tag: "ADMIN_ROOT"
    }
  ];

  return (
    <div className="w-full max-w-7xl mx-auto py-8 md:py-12 px-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-1 px-1 bg-white/5 border border-white/10">
        {features.map((f, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scaleY: 0 }}
            whileInView={{ opacity: 1, scaleY: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: easeBrutal, delay: i * 0.1 }}
            className="group relative bg-obsidian p-8 lg:p-10 border border-white/5 origin-top hover:bg-white/[0.02] transition-colors overflow-hidden"
          >
            {/* Background Kinetic Number with Scroll Reveal */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: i * 0.1, ease: easeBrutal }}
              className="absolute right-4 bottom-4 text-7xl font-black text-white/5 select-none pointer-events-none group-hover:text-hyper-crimson/[0.08] transition-all duration-700"
            >
              0{i+1}
            </motion.div>

            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-2 border border-hyper-crimson/30 rounded-sm">
                  {f.icon}
                </div>
                <span className="font-mono text-[10px] tracking-[0.2em] text-ash/40 uppercase">
                  {f.tag}
                </span>
              </div>
              
              <h3 className="text-3xl md:text-4xl font-black tracking-tighter mb-6 group-hover:text-hyper-crimson transition-colors">
                {f.title}
              </h3>
              
              <p className="text-ash/60 leading-relaxed font-mono text-sm max-w-md">
                {f.description}
              </p>
            </div>

            {/* Brutalist Detail: Decorative corners */}
            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-white/20 group-hover:border-hyper-crimson transition-colors" />
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-white/20 group-hover:border-hyper-crimson transition-colors" />
          </motion.div>
        ))}
      </div>
    </div>
  );
};
