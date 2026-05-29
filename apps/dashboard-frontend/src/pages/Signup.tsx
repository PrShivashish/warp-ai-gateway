import { useElysiaClient } from "@/providers/Eden";
import { useMutation } from "@tanstack/react-query";
import { useRef } from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardHeader,
    CardContent,
    CardFooter,
} from "@/components/ui/card";
import { ArrowRight, Mail, Lock, Loader2, Zap, BookOpen, ShieldCheck, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { DOCS_URL } from "../lib/env";



export function Signup() {
    const emailRef = useRef<HTMLInputElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);
    const elysiaClient = useElysiaClient();
    const navigate = useNavigate();

    const mutation = useMutation({
        mutationFn: async ({
            email,
            password,
        }: {
            email: string;
            password: string;
        }) => {
            const response = await elysiaClient.auth["sign-up"].post({
                email,
                password,
            });
            if (response.error) {
                const errValue = response.error.value as { message?: string } | undefined;
                throw new Error(errValue?.message || "Failed to create account");
            }
            return response.data;
        },
        onSuccess: () => {
            setTimeout(() => navigate("/signin"), 1200);
        },
    });

    return (
        <div className="dark h-screen w-screen relative flex items-center justify-center bg-[#010101] overflow-hidden p-2 font-sans no-scrollbar">
            {/* Background Layer 1: Dot Grid Pattern */}
            <div
                className="absolute inset-0 opacity-[0.2] z-0 pointer-events-none"
                style={{
                    backgroundImage: `radial-gradient(#ffffff 0.8px, transparent 0.8px)`,
                    backgroundSize: '30px 30px'
                }}
            />

            {/* Background Layer 2: Neon Orbital Atmospheric Glow Engine */}
            <div className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden">
                <motion.div
                    animate={{
                        x: ["-25vw", "5vw", "25vw", "5vw", "-25vw"],
                        y: ["-20vh", "20vh", "5vh", "-20vh", "-20vh"],
                        opacity: [0.5, 0.75, 0.55, 0.75, 0.5],
                        scale: [1, 1.5, 1.2, 1.6, 1]
                    }}
                    transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1100px] h-[1100px] bg-[radial-gradient(circle_at_50%_50%,_rgba(0,136,255,0.6)_0%,_transparent_75%)] blur-[160px] mix-blend-screen"
                />

                <motion.div
                    animate={{
                        x: ["25vw", "-5vw", "-25vw", "-5vw", "25vw"],
                        y: ["20vh", "-20vh", "-5vh", "20vh", "20vh"],
                        opacity: [0.5, 0.75, 0.55, 0.75, 0.5],
                        scale: [1.3, 1.6, 1.1, 1.5, 1.3]
                    }}
                    transition={{ duration: 40, repeat: Infinity, ease: "linear", delay: 1 }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1100px] h-[1100px] bg-[radial-gradient(circle_at_50%_50%,_rgba(255,68,0,0.6)_0%,_transparent_75%)] blur-[160px] mix-blend-screen"
                />
            </div>

            {/* Main Content Container - Zoomed out to 0.85 for perfect framing */}
            <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 15 }}
                animate={{ opacity: 1, scale: 0.85, y: 0 }}
                transition={{ duration: 1.2, ease: [0.165, 0.84, 0.44, 1] }}
                className="relative z-10 w-full max-w-[440px] flex flex-col items-center"
            >
                {/* Branding Header - Compressed for absolute visibility */}
                <div className="flex flex-col items-center mb-4 text-center">
                    <motion.div
                        whileHover={{ scale: 1.05, rotate: 5 }}
                        className="size-10 rounded-xl bg-[#080808] border border-white/[0.15] flex items-center justify-center mb-3 shadow-[0_0_35px_rgba(255,0,60,0.2)]"
                    >
                        <Zap className="size-5 text-[#ff003c] fill-[#ff003c]" />
                    </motion.div>
                    <div className="flex items-center gap-2">
                        <span className="text-xl font-medium tracking-tight text-white mb-0.5">Warp</span>
                    </div>
                    <a
                        href={DOCS_URL}
                        target="_blank"
                        className="flex items-center gap-1.5 text-[9px] font-mono tracking-widest text-white/40 hover:text-white/80 transition-all scale-95"
                    >
                        <BookOpen className="size-3" /> architecture <ExternalLink className="size-2 opacity-50" />
                    </a>
                </div>

                <Card className="bg-[#080808]/98 border-white/[0.1] backdrop-blur-3xl shadow-[0_45px_130px_rgba(0,0,0,1)] overflow-hidden relative rounded-[32px] w-full">
                    {/* Inner Card Top-Left Red Shade */}
                    <div className="absolute top-[-8%] left-[-8%] w-72 h-72 bg-[radial-gradient(circle_at_0%_0%,_rgba(255,0,60,0.6)_0%,_transparent_80%)] pointer-events-none opacity-100 z-20" />

                    <CardHeader className="space-y-1 pt-12 pb-4 px-10 text-center relative z-30">
                        <h2 className="text-[32px] font-black tracking-[-0.04em] text-white uppercase italic leading-none whitespace-nowrap drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">
                            REGISTRATION
                        </h2>
                        <p className="text-[9px] font-mono font-black tracking-[0.5em] uppercase text-white/25 mt-6 pl-1.5">
                            neural_registry_module
                        </p>
                    </CardHeader>

                    <CardContent className="px-10 pb-6 pt-12 relative z-30">
                        <form
                            className="space-y-6"
                            onSubmit={(e) => {
                                e.preventDefault();
                                mutation.mutate({
                                    email: emailRef.current!.value,
                                    password: passwordRef.current!.value,
                                });
                            }}
                        >
                            <div className="space-y-4">
                                <div className="space-y-2.5">
                                    <label className="text-[10px] font-bold uppercase tracking-[0.06em] text-white/40 ml-1">Email</label>
                                    <div className="relative group/input">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-500 transition-colors group-focus-within/input:text-[#ff003c]" />
                                        <Input
                                            ref={emailRef}
                                            type="email"
                                            placeholder="user@warp.local"
                                            className="pl-11 h-12 bg-[#0c0c0c]/80 border border-white/[0.05] text-white placeholder:text-white/20 rounded-xl focus-visible:ring-2 focus-visible:ring-[#ff003c]/40 font-semibold shadow-inner"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2.5">
                                    <label className="text-[10px] font-bold uppercase tracking-[0.06em] text-white/40 ml-1">Password</label>
                                    <div className="relative group/input">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-500 transition-colors group-focus-within/input:text-[#ff003c]" />
                                        <Input
                                            ref={passwordRef}
                                            type="password"
                                            placeholder="•••••"
                                            className="pl-11 h-12 bg-[#0c0c0c]/80 border border-white/[0.05] text-white placeholder:text-white/20 rounded-xl focus-visible:ring-2 focus-visible:ring-[#ff003c]/40 font-semibold shadow-inner"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-12 bg-[#ff003c] text-white hover:bg-[#ff003c]/90 rounded-xl shadow-[0_8px_30px_rgba(255,0,60,0.45)] border-none transition-all active:scale-[0.97] group font-black text-[13px] uppercase tracking-widest mt-4"
                            >
                                Sign up
                                <ArrowRight className="size-4 ml-2 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </form>
                    </CardContent>

                    <CardFooter className="px-10 pb-12 pt-0 flex flex-col items-center relative z-30">
                        <p className="text-[11px] font-bold tracking-tighter text-white/30 flex items-center gap-1.5 uppercase letter-spacing-[0.05em]">
                            Already established?
                            <Link to="/signin" className="text-white hover:text-[#ff003c] transition-all underline underline-offset-4 decoration-white/20 hover:decoration-[#ff003c]/50 font-bold">Sign in</Link>
                        </p>
                    </CardFooter>
                </Card>
            </motion.div>
        </div>
    );
}