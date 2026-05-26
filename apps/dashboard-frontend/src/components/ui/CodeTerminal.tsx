import React, { useState, useEffect } from 'react';
import { motion, useInView } from 'framer-motion';

const CodeLine = ({ children, delay = 0, trigger }: { children: React.ReactNode, delay?: number, trigger: boolean }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -5 }}
      animate={trigger ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.3, delay, ease: "easeOut" }}
      className="code-line whitespace-pre"
    >
      {children}
    </motion.div>
  );
};

export const CodeTerminal = () => {
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <div ref={ref} className="glass-panel rounded-xl overflow-hidden shadow-2xl w-full max-w-2xl mx-auto border border-white/5 relative z-10">
      <div className="flex items-center px-4 py-3 border-b border-white/5 bg-black/40">
        <div className="flex gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/60 shadow-[0_0_8px_rgba(239,68,68,0.3)]"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60 shadow-[0_0_8px_rgba(234,179,8,0.3)]"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/60 shadow-[0_0_8px_rgba(34,197,94,0.3)]"></div>
        </div>
        <div className="mx-auto text-white/30 text-[9px] font-mono tracking-widest uppercase">openai_client.py</div>
      </div>
      
      <div className="p-8 bg-black/80 overflow-x-auto text-[13px] font-mono leading-relaxed text-left">
        <CodeLine trigger={isInView} delay={0.1}>
          <span className="text-purple-400">import</span> { "openai" }
        </CodeLine>
        <CodeLine trigger={isInView} delay={0.2}>
          <span className="text-ash/40"># Initialize Warp Gateway</span>
        </CodeLine>
        <CodeLine trigger={isInView} delay={0.3}>
          client = <span className="text-blue-300">OpenAI</span>(
        </CodeLine>
        <CodeLine trigger={isInView} delay={0.4}>
          {"  "}base_url=<span className="text-green-300">"https://wrp-nodes.io/v1"</span>,
        </CodeLine>
        <CodeLine trigger={isInView} delay={0.5}>
          {"  "}api_key=<span className="text-green-300">"wrp_live_x9fk2..."</span>
        </CodeLine>
        <CodeLine trigger={isInView} delay={0.6}>
          )
        </CodeLine>
        <br />
        <CodeLine trigger={isInView} delay={0.8}>
          <span className="text-ash/40"># Stream through Neural Mesh</span>
        </CodeLine>
        <CodeLine trigger={isInView} delay={0.9}>
          stream = client.chat.completions.<span className="text-blue-300">create</span>(
        </CodeLine>
        <CodeLine trigger={isInView} delay={1.0}>
          {"  "}model=<span className="text-hyper-crimson font-bold">"neural/all-sync"</span>,
        </CodeLine>
        <CodeLine trigger={isInView} delay={1.1}>
          {"  "}messages=[{'{'}<span className="text-ash/60">"role"</span>: <span className="text-green-300">"user"</span>, <span className="text-ash/60">"content"</span>: <span className="text-green-300">"Hello World"</span>{'}'}],
        </CodeLine>
        <CodeLine trigger={isInView} delay={1.2}>
          {"  "}stream=<span className="text-orange-300">True</span>
        </CodeLine>
        <CodeLine trigger={isInView} delay={1.3}>
          )
        </CodeLine>
        
        <CodeLine trigger={isInView} delay={1.5}>
          <motion.span 
             animate={{ opacity: [0, 1, 0] }} 
             transition={{ repeat: Infinity, duration: 0.8 }}
             className="inline-block w-2 h-4 bg-hyper-crimson ml-1 align-middle"
          />
        </CodeLine>
      </div>
      
      {/* Decorative Blur Background for the Terminal */}
      <div className="absolute -inset-4 bg-hyper-crimson/5 blur-3xl rounded-full -z-10 pointer-events-none" />
    </div>
  );
};
