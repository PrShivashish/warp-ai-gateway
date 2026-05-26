import { useQuery } from "@tanstack/react-query";
import { useElysiaClient } from "@/providers/Eden";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
    Card,
    CardHeader,
    CardContent,
} from "@/components/ui/card";
import {
    Coins,
    Loader2,
    TrendingUp,
    Sparkles,
    Zap,
} from "lucide-react";
import { motion } from "framer-motion";

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.1
        }
    }
};

const item = {
    hidden: { opacity: 0, scale: 0.95, y: 10 },
    show: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { duration: 0.4, ease: [0.19, 1, 0.22, 1] }
    }
};

export function Credits() {
    const elysiaClient = useElysiaClient();

    const apiKeysQuery = useQuery({
        queryKey: ["api-keys"],
        queryFn: async () => {
            const response = await elysiaClient["api-keys"].get();
            if (response.error) throw new Error("Failed to fetch API keys");
            return response.data;
        },
    });

    const userProfileQuery = useQuery({
        queryKey: ["user-profile"],
        queryFn: async() => {
            const response = await elysiaClient["auth"].profile.get();
            if (response.error) throw new Error("Error while fetching user details")
                return response.data;
        }
    });

    const apiKeys = apiKeysQuery.data?.apiKeys ?? [];
    const walletBalance = userProfileQuery.data?.walletBalance;

    return (
        <DashboardLayout>
            <div className="space-y-12 pb-20">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic">
                        Digital Ledger
                    </h1>
                    <p className="text-[10px] text-white/30 mt-2 font-mono tracking-[0.3em] uppercase">
                        Asset Liquidity &amp; Usage Credits
                    </p>
                </motion.div>

                {/* ── Portfolio Showcase Banner ─────────────────────────────── */}
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: [0.19, 1, 0.22, 1] }}
                >
                    <div className="relative overflow-hidden rounded-2xl border border-amber-400/20 bg-amber-400/[0.03] px-6 py-5">
                        {/* Ambient glow */}
                        <div className="pointer-events-none absolute -top-10 -right-10 w-48 h-48 rounded-full bg-amber-400/10 blur-[60px]" />
                        <div className="pointer-events-none absolute -bottom-6 -left-6 w-32 h-32 rounded-full bg-amber-300/5 blur-[40px]" />

                        <div className="relative flex items-start gap-4">
                            <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10">
                                <Sparkles className="size-4 text-amber-400" />
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className="text-[9px] font-black font-mono tracking-[0.35em] uppercase text-amber-400/80">
                                        Portfolio_Showcase
                                    </span>
                                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[8px] font-black font-mono tracking-widest uppercase text-amber-300">
                                        <Zap className="size-2.5" />
                                        Live
                                    </span>
                                </div>
                                <p className="text-sm font-semibold text-white/80 leading-relaxed">
                                    Your account has been credited with a{" "}
                                    <span className="font-black text-amber-300">$0.10 Seed Grant</span>{" "}
                                    to test the Warp API Gateway.
                                </p>
                                <p className="mt-1.5 text-[10px] font-mono text-white/30 leading-relaxed">
                                    Point any OpenAI-compatible SDK at{" "}
                                    <span className="text-white/50">api.warp.local/v1</span>{" "}
                                    with your API key — zero code changes required.
                                </p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Balance & usage */}
                <motion.div
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-1 sm:grid-cols-2 gap-6"
                >
                    <motion.div variants={item}>
                        <Card className="hover:border-white/10 transition-colors border-white/[0.03] bg-white/[0.01]">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black font-mono tracking-widest text-white/20 uppercase">Available_Liquidity</span>
                                    <TrendingUp className="size-3.5 text-white/20" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-4xl font-black tracking-tighter italic">
                                    {userProfileQuery.isLoading ? (
                                        <Loader2 className="size-6 animate-spin text-white/10" />
                                    ) : (
                                        `$${(walletBalance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`
                                    )}
                                </p>
                                <p className="text-[9px] font-mono text-white/10 mt-3 tracking-[0.2em] uppercase">
                                    active on {apiKeys.length} nodes
                                </p>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div variants={item}>
                        <Card className="hover:border-white/10 transition-colors border-white/[0.03] bg-white/[0.01]">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black font-mono tracking-widest text-white/20 uppercase">Node_Allocation</span>
                                    <Coins className="size-3.5 text-white/20" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                {apiKeysQuery.isLoading ? (
                                    <Loader2 className="size-6 animate-spin text-white/10" />
                                ) : apiKeys.length === 0 ? (
                                    <p className="text-[10px] uppercase font-mono text-white/20">No active allocations</p>
                                ) : (
                                    <div className="space-y-3 pt-1">
                                        {apiKeys.slice(0, 3).map((key) => (
                                            <div key={key.id} className="flex items-center justify-between text-[11px] font-mono">
                                                <span className="text-white/40 group-hover:text-white transition-colors">{key.name}</span>
                                                <span className="tabular-nums font-black text-white/80">
                                                    {(key.credisConsumed ?? 0).toLocaleString()}
                                                </span>
                                            </div>
                                        ))}
                                        {apiKeys.length > 3 && (
                                            <p className="text-[9px] font-mono text-white/10 uppercase tracking-widest pt-1">
                                                +{apiKeys.length - 3} matrix nodes
                                            </p>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                </motion.div>
            </div>
        </DashboardLayout>
    );
}