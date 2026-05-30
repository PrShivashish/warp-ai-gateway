import React from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { Scroll } from '@react-three/drei';
import { Terminal, ArrowUpRight } from 'lucide-react';

import { Sanctuary } from '../components/3D/Sanctuary';
import { IntelligenceReadout } from '../components/ui/IntelligenceReadout';
import { CodeTerminal } from '../components/ui/CodeTerminal';

const easeBrutal = [0.76, 0, 0.24, 1];

// Cinematic Reticle Cursor
const Reticle = () => {
    const [pos, setPos] = React.useState({ x: 0, y: 0 });
    
    React.useEffect(() => {
      const handleMove = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
      window.addEventListener('mousemove', handleMove);
      return () => window.removeEventListener('mousemove', handleMove);
    }, []);
  
    return (
      <motion.div 
        className="fixed top-0 left-0 w-10 h-10 pointer-events-none z-[999] hidden md:block"
        animate={{ x: pos.x - 20, y: pos.y - 20 }}
        transition={{ type: "spring", damping: 30, stiffness: 400, mass: 0.5 }}
      >
        <div className="w-full h-full border border-hyper-crimson/50 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-hyper-crimson rounded-full shadow-[0_0_10px_#FF003C]" />
        </div>
      </motion.div>
    );
  };

export const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-obsidian min-h-screen text-paper selection:bg-hyper-crimson selection:text-white overflow-hidden">
      <Reticle />
      
      {/* THE 3D SANCTUARY */}
      <Sanctuary>
        <Scroll html>
            <div className="w-screen h-[380vh] flex flex-col relative">
                {/* Fixed Navigation */}
                <nav className="fixed top-0 left-0 w-full p-8 flex justify-between items-center z-50 mix-blend-difference">
                    <motion.div 
                        initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                        className="flex items-center gap-3 cursor-pointer group"
                    >
                        <div className="w-8 h-8 border border-paper flex items-center justify-center group-hover:border-hyper-crimson transition-colors">
                            <Terminal size={14} />
                        </div>
                        <span className="font-black text-lg tracking-tighter uppercase">WRP.CORE</span>
                    </motion.div>
                    
                    <div className="flex gap-8 font-mono text-[9px] tracking-[0.4em] uppercase">
                        <button onClick={() => navigate('/signin')} className="hover:text-hyper-crimson transition-colors">Auth_Link</button>
                        <button onClick={() => navigate('/signup')} className="px-4 py-2 border border-paper/10 hover:border-hyper-crimson transition-colors shadow-crimson-glow">Initialize</button>
                    </div>
                </nav>

                {/* HERO SECTION: Split Layout */}
                <section className="h-screen flex items-center px-10 md:px-24">
                   <div className="grid grid-cols-12 w-full max-w-[1800px] mx-auto">
                      <div className="col-span-12 lg:col-span-7 pt-20">
                         <motion.div 
                            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                            className="inline-block mb-10 text-[10px] font-mono text-hyper-crimson border-l-2 border-hyper-crimson pl-4 py-1"
                         >
                            PROTOCOL_X_LOADED // NEURAL_GATEWAY: ACTIVE
                         </motion.div>
                         
                         <h1 className="text-[min(14vw,10rem)] font-black leading-[0.85] tracking-tighter uppercase mb-12">
                            <div className="text-mask-reveal overflow-hidden">
                                <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} transition={{ duration: 1.2, ease: easeBrutal }}>ONE API</motion.div>
                            </div>
                            <div className="text-mask-reveal overflow-hidden">
                                <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} transition={{ duration: 1.2, delay: 0.1, ease: easeBrutal }} className="text-outline">FOR ALL</motion.div>
                            </div>
                            <div className="text-mask-reveal overflow-hidden">
                                <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} transition={{ duration: 1.2, delay: 0.2, ease: easeBrutal }}>MODELS</motion.div>
                            </div>
                         </h1>
                         
                         <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
                            className="flex flex-col md:flex-row gap-12 items-start"
                         >
                            <p className="font-mono text-[10px] text-white/30 max-w-xs uppercase tracking-[0.3em] leading-loose">
                                Re-engineering the data plane for distributed neural networks. 
                                Zero latency packet routing. 100% SSE compatibility.
                            </p>
                            <button 
                                onClick={() => navigate('/signup')}
                                className="px-12 py-6 bg-paper text-obsidian font-black uppercase text-sm flex items-center gap-3 hover:bg-hyper-crimson hover:text-white transition-all duration-500 shadow-[0_20px_60px_rgba(255,0,60,0.15)]"
                            >
                                Start_Warp <ArrowUpRight size={18} />
                            </button>
                         </motion.div>
                      </div>
                      
                      {/* The right side (5 columns) will be filled by the NeuralCore from R3F Sanctuary */}
                      <div className="hidden lg:block lg:col-span-5" />
                   </div>
                </section>

                {/* SPECS SECTION */}
                <section className="h-[180vh] flex flex-col justify-center bg-transparent py-16">
                   <div className="px-10 md:px-24 mt-16 mb-20 flex flex-col md:flex-row justify-between items-baseline gap-4 w-full mx-auto max-w-[1800px]">
                      <h2 className="text-7xl md:text-[8rem] font-black tracking-tighter uppercase leading-none">Specs</h2>
                      <span className="font-mono text-xs text-hyper-crimson uppercase tracking-[0.5em]">System_Readout_v1.0</span>
                   </div>
                   
                   <div className="bg-obsidian/30 backdrop-blur-2xl border-y border-white/5 py-12 relative overflow-visible w-full">
                      {/* Kinetic background line */}
                      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-hyper-crimson/50 to-transparent" />
                      <IntelligenceReadout />
                   </div>
                </section>

                {/* INTEGRATION SECTION */}
                <section className="h-screen flex flex-col relative w-full pt-20">
                   <div className="flex-1 flex items-center px-10 md:px-24">
                       <div className="flex flex-col lg:flex-row gap-32 items-center justify-between w-full max-w-[1800px] mx-auto">
                          <div className="max-w-2xl">
                             <h2 className="text-6xl md:text-[7rem] font-black tracking-tighter uppercase mb-12 leading-[0.8]">
                                Zero <br/> <span className="text-hyper-crimson">Latency</span> <br/> Logic
                             </h2>
                             <p className="font-mono text-xs text-white/40 uppercase tracking-[0.2em] leading-loose mb-16 max-w-lg">
                                Warp doesn't just proxy; it orchestrates. 
                                The latency cost is near-theoretical minimum. 
                                Your tools work without modifications.
                             </p>
                             <div className="flex gap-16">
                                <div>
                                   <div className="text-hyper-crimson text-4xl font-black mb-2 tracking-tighter">0.1ms</div>
                                   <div className="text-[10px] font-mono text-white/20 uppercase tracking-widest">Router_Overhead</div>
                                </div>
                                <div>
                                   <div className="text-paper text-4xl font-black mb-2 tracking-tighter">100%</div>
                                   <div className="text-[10px] font-mono text-white/20 uppercase tracking-widest">Spec_Alignment</div>
                                </div>
                             </div>
                          </div>
                          <div className="w-full lg:w-1/2 flex justify-center lg:justify-end mt-16 lg:mt-0">
                             <div className="scale-100 lg:scale-110 origin-center lg:origin-right w-full max-w-[650px]">
                                <CodeTerminal />
                             </div>
                          </div>
                       </div>
                   </div>

                   {/* MINIMAL FOOTER / FINAL CALL */}
                   <div className="py-4 px-10 md:px-24 bg-paper text-obsidian border-t-[4px] border-hyper-crimson flex justify-between items-center w-full mt-auto">
                       <span className="font-mono text-[8px] md:text-[10px] uppercase tracking-[0.4em] font-bold opacity-70">Initialization Sequence Terminated // WARP</span>
                       <button 
                           onClick={() => navigate('/signup')}
                           className="font-black text-[10px] md:text-xs uppercase tracking-[0.2em] hover:text-hyper-crimson transition-colors"
                       >
                           Establish_Connection
                       </button>
                   </div>
                </section>
            </div>
        </Scroll>
      </Sanctuary>

      {/* Cinematic HUD elements */}
      <div className="fixed top-0 right-0 p-12 pb-24 h-screen flex flex-col justify-end pointer-events-none z-40 mix-blend-difference">
        <div className="flex flex-col gap-2 items-end opacity-40 font-mono text-[8px] tracking-[0.2em] text-paper uppercase">
          <div className="flex items-center gap-2">NET: WARP_MAIN_NODE <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" /></div>
          <div>STABILITY: 99.99%</div>
          <div>NODES: 4,102 ACTIVE</div>
          <div className="mt-4 flex gap-1 h-12">
             {[1,2,3,4,5,6].map(i => (
                 <motion.div 
                    key={i} 
                    className="w-1 bg-hyper-crimson" 
                    animate={{ height: [`${20+Math.random()*20}%`, `${60+Math.random()*40}%`, `${30+Math.random()*20}%`] }} 
                    transition={{ repeat: Infinity, duration: 2.5, delay: i * 0.15 }} 
                 />
             ))}
          </div>
        </div>
      </div>
    </div>
  );
};