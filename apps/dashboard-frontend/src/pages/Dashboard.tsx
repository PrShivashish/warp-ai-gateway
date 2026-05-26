import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useElysiaClient } from "@/providers/Eden";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { 
    Activity, 
    Shield, 
    Zap, 
    Key, 
    Coins, 
    ArrowRight, 
    ChevronRight,
    Plus,
    Layers
} from "lucide-react";
import { cn } from "@/lib/utils";

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
    hidden: { opacity: 0, y: 15 },
    show: { 
        opacity: 1, 
        y: 0,
        transition: { duration: 0.5, ease: [0.19, 1, 0.22, 1] }
    }
};

export function Dashboard() {
    const elysiaClient = useElysiaClient();

    const apiKeysQuery = useQuery({
        queryKey: ["api-keys"],
        queryFn: async () => {
            const response = await elysiaClient["api-keys"].get();
            if (response.error) throw new Error("Failed to fetch API keys");
            return response.data;
        },
    });

    const modelsQuery = useQuery({
        queryKey: ["models"],
        queryFn: async () => {
            const response = await elysiaClient.models.get();
            if (response.error) throw new Error("Failed to fetch models");
            return response.data;
        },
    });

    const apiKeys = apiKeysQuery.data?.apiKeys ?? [];
    const activeKeys = apiKeys.filter((k) => !k.disabled);
    const totalCreditsUsed = apiKeys.reduce(
        (sum, k) => sum + (k.credisConsumed ?? 0),
        0
    );
    const modelCount = modelsQuery.data?.models?.length ?? 0;
    const isLoading = apiKeysQuery.isLoading;

    return (
        <DashboardLayout>
            <div className="space-y-12 pb-12">
                {/* Header */}
                <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, ease: [0.19, 1, 0.22, 1] }}
                >
                    <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic">
                        Neural Hub
                    </h1>
                    <p className="text-[10px] text-white/30 mt-2 font-mono tracking-[0.3em] uppercase">
                        Core System Status : 100% Operational
                    </p>
                </motion.div>

                {/* Stats */}
                {isLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-32 rounded-2xl bg-white/5 animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <motion.div 
                        variants={container}
                        initial="hidden"
                        animate="show"
                        className="grid grid-cols-1 sm:grid-cols-3 gap-6"
                    >
                        <motion.div variants={item}>
                            <Card className="hover:border-white/10 transition-colors duration-500">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold tracking-widest text-white/30 uppercase font-mono">Nodes_Active</span>
                                        <Key className="size-3.5 text-white/20" />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-4xl font-black tracking-tighter italic">
                                        {activeKeys.length}
                                    </p>
                                    <p className="text-[9px] font-mono text-white/10 mt-2 tracking-widest uppercase">
                                        {apiKeys.length} active instances
                                    </p>
                                </CardContent>
                            </Card>
                        </motion.div>

                        <motion.div variants={item}>
                            <Card className="hover:border-white/10 transition-colors duration-500">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold tracking-widest text-white/30 uppercase font-mono">Neural_Load</span>
                                        <Coins className="size-3.5 text-white/20" />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-4xl font-black tracking-tighter italic">
                                        {totalCreditsUsed.toLocaleString()}
                                    </p>
                                    <p className="text-[9px] font-mono text-white/10 mt-2 tracking-widest uppercase">
                                        credits consumed
                                    </p>
                                </CardContent>
                            </Card>
                        </motion.div>

                        <motion.div variants={item}>
                            <Card className="hover:border-white/10 transition-colors duration-500">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold tracking-widest text-white/30 uppercase font-mono">Library_Sync</span>
                                        <Layers className="size-3.5 text-white/20" />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-4xl font-black tracking-tighter italic">
                                        {modelCount}
                                    </p>
                                    <p className="text-[9px] font-mono text-white/10 mt-2 tracking-widest uppercase">
                                        available providers
                                    </p>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </motion.div>
                )}

                {/* Quick actions */}
                <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, ease: [0.19, 1, 0.22, 1] }}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-6"
                >
                    <Card className="hover:bg-white/[0.03] transition-all duration-700 group cursor-pointer relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 blur-3xl rounded-full translate-x-12 -translate-y-12" />
                        <CardContent className="pt-8 relative z-10">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="size-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-700 group-hover:rotate-6">
                                        <Plus className="size-5 text-white/60" />
                                    </div>
                                    <h3 className="font-extrabold text-[11px] tracking-[0.2em] uppercase italic">Provision Node</h3>
                                    <p className="text-[11px] text-white/30 mt-3 leading-relaxed max-w-[220px]">
                                        Initialize a new cryptographic gateway for model access.
                                    </p>
                                </div>
                                <Button variant="ghost" size="icon" className="rounded-full hover:bg-white hover:text-black transition-all duration-700" asChild>
                                    <Link to="/api-keys">
                                        <ArrowRight className="size-4" />
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="hover:bg-white/[0.03] transition-all duration-700 group cursor-pointer relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 blur-3xl rounded-full translate-x-12 -translate-y-12" />
                        <CardContent className="pt-8 relative z-10">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="size-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-700 group-hover:-rotate-6">
                                        <Coins className="size-5 text-white/60" />
                                    </div>
                                    <h3 className="font-extrabold text-[11px] tracking-[0.2em] uppercase italic">Neural Liquidity</h3>
                                    <p className="text-[11px] text-white/30 mt-3 leading-relaxed max-w-[220px]">
                                        Inject computing credits into your infrastructure.
                                    </p>
                                </div>
                                <Button variant="ghost" size="icon" className="rounded-full hover:bg-white hover:text-black transition-all duration-700" asChild>
                                    <Link to="/wallet">
                                        <ArrowRight className="size-4" />
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Recent API keys */}
                {apiKeys.length > 0 && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        transition={{ duration: 1 }}
                        viewport={{ once: true }}
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-[11px] font-black tracking-[0.3em] uppercase italic opacity-40">Active Nodes</h2>
                            <Button variant="ghost" size="sm" className="text-[10px] uppercase font-bold tracking-widest hover:text-white" asChild>
                                <Link to="/api-keys" className="gap-2">
                                    Explore All
                                    <ArrowRight className="size-3" />
                                </Link>
                            </Button>
                        </div>
                        <div className="rounded-2xl border border-white/[0.04] bg-card/10 backdrop-blur-3xl overflow-hidden">
                            <table className="w-full text-[11px]">
                                <thead>
                                    <tr className="border-b border-white/[0.04]">
                                        <th className="text-left px-6 py-4 font-mono font-bold tracking-[0.2em] text-white/20 uppercase">Core_Name</th>
                                        <th className="text-left px-6 py-4 font-mono font-bold tracking-[0.2em] text-white/20 uppercase">Credential</th>
                                        <th className="text-left px-6 py-4 font-mono font-bold tracking-[0.2em] text-white/20 uppercase">State</th>
                                        <th className="text-right px-6 py-4 font-mono font-bold tracking-[0.2em] text-white/20 uppercase">Consumption</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {apiKeys.slice(0, 5).map((key, idx) => (
                                        <motion.tr 
                                            key={key.id} 
                                            initial={{ opacity: 0, x: -10 }}
                                            whileInView={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            viewport={{ once: true }}
                                            className="border-b border-white/[0.02] last:border-0 hover:bg-white/[0.01] transition-colors"
                                        >
                                            <td className="px-6 py-4 font-black text-white italic tracking-tight">{key.name}</td>
                                            <td className="px-6 py-4 font-mono text-white/30">
                                                {key.apiKey.slice(0, 12)}...{key.apiKey.slice(-4)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className={cn("size-1.5 rounded-full shadow-[0_0_5px]", key.disabled ? "bg-white/20 shadow-white/10" : "bg-emerald-500 shadow-emerald-500/50")} />
                                                    <span className={cn("font-bold tracking-widest uppercase text-[9px]", key.disabled ? "text-white/20" : "text-emerald-500/80")}>
                                                        {key.disabled ? "Disabled" : "Operational"}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right tabular-nums font-mono text-white">
                                                {(key.credisConsumed ?? 0).toLocaleString()}
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}
            </div>
        </DashboardLayout>
    );
}