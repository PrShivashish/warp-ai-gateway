import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useElysiaClient } from "@/providers/Eden";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
    Card,
    CardHeader,
    CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Plus,
    Loader2,
    CheckCircle2,
    Copy,
    Trash2,
    ToggleLeft,
    ToggleRight,
    Key,
    Eye,
    EyeOff,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05,
            delayChildren: 0.1
        }
    }
};

const item = {
    hidden: { opacity: 0, y: 10 },
    show: { 
        opacity: 1, 
        y: 0,
        transition: { duration: 0.4, ease: [0.19, 1, 0.22, 1] }
    }
};

export function ApiKeys() {
    const elysiaClient = useElysiaClient();
    const queryClient = useQueryClient();
    const nameRef = useRef<HTMLInputElement>(null);
    const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());

    const apiKeysQuery = useQuery({
        queryKey: ["api-keys"],
        queryFn: async () => {
            const response = await elysiaClient["api-keys"].get();
            if (response.error) throw new Error("Failed to fetch API keys");
            return response.data;
        },
    });

    const createMutation = useMutation({
        mutationFn: async (name: string) => {
            const response = await elysiaClient["api-keys"].post({ name });
            if (response.error) {
                const errValue = response.error.value as { message?: string } | undefined;
                throw new Error(errValue?.message || "Failed to create API key");
            }
            return response.data;
        },
        onSuccess: (data) => {
            setNewlyCreatedKey(data?.apiKey ?? null);
            if (nameRef.current) nameRef.current.value = "";
            queryClient.invalidateQueries({ queryKey: ["api-keys"] });
        },
    });

    const toggleMutation = useMutation({
        mutationFn: async ({ id, disabled }: { id: string; disabled: boolean }) => {
            const response = await elysiaClient["api-keys"].put({ id, disabled });
            if (response.error) {
                const errValue = response.error.value as { message?: string } | undefined;
                throw new Error(errValue?.message || "Failed to update API key");
            }
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["api-keys"] });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const response = await elysiaClient["api-keys"]({ id }).delete();
            if (response.error) {
                const errValue = response.error.value as { message?: string } | undefined;
                throw new Error(errValue?.message || "Failed to delete API key");
            }
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["api-keys"] });
        },
    });

    const copyToClipboard = async (text: string, id: string) => {
        await navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const toggleReveal = (id: string) => {
        setRevealedKeys((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const apiKeys = apiKeysQuery.data?.apiKeys ?? [];

    return (
        <DashboardLayout>
            <div className="space-y-12 pb-20">
                {/* Header */}
                <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic">
                        Access Matrix
                    </h1>
                    <p className="text-[10px] text-white/30 mt-2 font-mono tracking-[0.3em] uppercase">
                        Secret Management & Authentication
                    </p>
                </motion.div>

                {/* Create new key */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <Card className="bg-white/[0.01] border-white/[0.03] overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-white/[0.01] blur-[80px] rounded-full" />
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Plus className="size-4 text-white/40" />
                                <span className="text-[11px] font-black tracking-[0.2em] uppercase italic opacity-40">Initialize Key</span>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <form
                                className="flex flex-col sm:flex-row gap-4"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    const name = nameRef.current?.value?.trim();
                                    if (name) createMutation.mutate(name);
                                }}
                            >
                                <div className="flex-1">
                                    <Input
                                        ref={nameRef}
                                        placeholder="Identification Name (e.g. CORE_PROD)"
                                        className="h-12 bg-white/[0.02] border-white/[0.05] font-mono text-xs uppercase tracking-widest focus:border-white/20"
                                        required
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    onClick={() => {
                                        const name = nameRef.current?.value?.trim();
                                        if (name) createMutation.mutate(name);
                                    }}
                                    className="h-12 px-8 bg-white text-black hover:bg-white/90 font-black uppercase tracking-tighter italic"
                                    disabled={createMutation.isPending}
                                >
                                    {createMutation.isPending ? (
                                        <Loader2 className="size-4 animate-spin" />
                                    ) : (
                                        "GENERATE_KEY"
                                    )}
                                </Button>
                            </form>

                            <AnimatePresence>
                                {newlyCreatedKey && (
                                    <motion.div 
                                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                        animate={{ opacity: 1, height: "auto", marginTop: 24 }}
                                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                        className="flex items-start gap-3 text-[10px] text-emerald-400 bg-emerald-500/[0.03] border border-emerald-500/10 rounded-xl px-4 py-4 font-mono uppercase tracking-widest leading-relaxed overflow-hidden"
                                    >
                                        <CheckCircle2 className="size-4 shrink-0 mt-0.5 text-emerald-500" />
                                        <div className="min-w-0 flex-1">
                                            <p className="font-black">Provisioning Success. Store this immediately.</p>
                                            <div className="flex items-center gap-3 mt-3 bg-black/40 p-2 rounded-lg border border-white/5">
                                                <code className="text-[11px] text-white/60 truncate block lowercase">
                                                    {newlyCreatedKey}
                                                </code>
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    className="hover:bg-white/10"
                                                    onClick={() => copyToClipboard(newlyCreatedKey, "new")}
                                                >
                                                    {copiedId === "new" ? (
                                                        <CheckCircle2 className="size-3.5" />
                                                    ) : (
                                                        <Copy className="size-3.5" />
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Keys list */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-[10px] font-black tracking-[0.4em] uppercase text-white/20">
                            REGISTRY_{!apiKeysQuery.isLoading ? apiKeys.length : "_"}_NODES
                        </h2>
                    </div>

                    {apiKeysQuery.isLoading ? (
                        <div className="flex items-center gap-3 text-white/20 text-[10px] font-mono uppercase tracking-widest py-12 px-4 border border-dashed border-white/5 rounded-2xl">
                            <Loader2 className="size-4 animate-spin" />
                            Syncing nodes...
                        </div>
                    ) : apiKeys.length === 0 ? (
                        <Card className="bg-white/[0.01] border-white/[0.03] border-dashed">
                            <CardContent className="pt-6">
                                <div className="text-center py-12">
                                    <Key className="size-8 text-white/10 mx-auto mb-4" />
                                    <p className="text-[10px] font-mono tracking-widest uppercase text-white/20">No active keys in matrix</p>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="rounded-2xl border border-white/[0.03] bg-white/[0.01] backdrop-blur-3xl overflow-hidden">
                            <table className="w-full text-[11px] uppercase tracking-wider font-mono">
                                <thead>
                                    <tr className="border-b border-white/[0.03]">
                                        <th className="text-left px-6 py-4 font-black text-white/20">Identifier</th>
                                        <th className="text-left px-6 py-4 font-black text-white/20">Vector</th>
                                        <th className="text-left px-6 py-4 font-black text-white/20">Condition</th>
                                        <th className="text-right px-6 py-4 font-black text-white/20">Units_Flux</th>
                                        <th className="text-right px-6 py-4 font-black text-white/20">Control</th>
                                    </tr>
                                </thead>
                                <motion.tbody 
                                    variants={container}
                                    initial="hidden"
                                    animate="show"
                                >
                                    {apiKeys.map((key) => (
                                        <motion.tr 
                                            key={key.id} 
                                            variants={item}
                                            className="border-b border-white/[0.02] last:border-0 group hover:bg-white/[0.01] transition-colors"
                                        >
                                            <td className="px-6 py-4 font-black text-white italic">{key.name}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <code className="text-[10px] text-white/40 lowercase">
                                                        {revealedKeys.has(key.id)
                                                            ? key.apiKey
                                                            : `${key.apiKey.slice(0, 8)}${"•".repeat(12)}`}
                                                    </code>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        className="opacity-0 group-hover:opacity-100 transition-all hover:bg-white/10"
                                                        onClick={() => toggleReveal(key.id)}
                                                    >
                                                        {revealedKeys.has(key.id) ? (
                                                            <EyeOff className="size-3" />
                                                        ) : (
                                                            <Eye className="size-3" />
                                                        )}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        className="opacity-0 group-hover:opacity-100 transition-all hover:bg-white/10"
                                                        onClick={() => copyToClipboard(key.apiKey, key.id)}
                                                    >
                                                        {copiedId === key.id ? (
                                                            <CheckCircle2 className="size-3 text-emerald-400" />
                                                        ) : (
                                                            <Copy className="size-3" />
                                                        )}
                                                    </Button>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span
                                                    className={`inline-flex items-center gap-2 font-black ${
                                                        key.disabled
                                                            ? "text-white/20"
                                                            : "text-emerald-400"
                                                    }`}
                                                >
                                                    <span
                                                        className={`size-1.5 rounded-full ${
                                                            key.disabled ? "bg-white/10" : "bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.4)]"
                                                        }`}
                                                    />
                                                    {key.disabled ? "OFFLINE" : "ACTIVE"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right tabular-nums text-white/60">
                                                {(key.credisConsumed ?? 0).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        className="hover:bg-white/10 transition-colors"
                                                        onClick={() =>
                                                            toggleMutation.mutate({
                                                                 id: key.id,
                                                                 disabled: !key.disabled,
                                                            })
                                                        }
                                                        disabled={toggleMutation.isPending}
                                                    >
                                                        {key.disabled ? (
                                                            <ToggleLeft className="size-4 text-white/20" />
                                                        ) : (
                                                            <ToggleRight className="size-4 text-emerald-400" />
                                                        )}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        className="hover:bg-white/10 transition-colors"
                                                        onClick={() => deleteMutation.mutate(key.id)}
                                                        disabled={deleteMutation.isPending}
                                                    >
                                                        <Trash2 className="size-3.5 text-white/10 hover:text-white" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </motion.tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}