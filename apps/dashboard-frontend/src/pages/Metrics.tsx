import { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
    Activity,
    Hash,
    Coins,
    Clock,
    TrendingUp,
    AlertTriangle,
    Timer,
    BarChart3,
    Layers,
    Inbox
} from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { DashboardLayout } from "@/components/DashboardLayout";

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

import { PRIMARY_API_URL } from "../lib/env";


async function fetchMetrics(path: string) {
    const res = await fetch(`${PRIMARY_API_URL}${path}`, { credentials: "include" });
    if (!res.ok) throw new Error(`Failed to fetch ${path}`);
    return res.json();
}


// ── Skeleton Loader ──────────────────────────────────────────────────

function ChartSkeleton() {
    return (
        <div className="animate-pulse space-y-3 px-2">
            <div className="flex items-end gap-1 h-48 pt-4">
                {Array.from({ length: 12 }).map((_, i) => (
                    <div
                        key={i}
                        className="flex-1 rounded-sm bg-muted/10"
                        style={{
                            height: `${20 + Math.random() * 70}%`,
                            animationDelay: `${i * 80}ms`,
                        }}
                    />
                ))}
            </div>
        </div>
    );
}

function CardSkeleton() {
    return (
        <Card className="animate-pulse h-32 bg-white/5 border-none shadow-none">
            <CardHeader className="pb-2">
                <div className="h-3 w-20 bg-white/5 rounded" />
            </CardHeader>
            <CardContent>
                <div className="h-10 w-24 bg-white/5 rounded mt-2" />
            </CardContent>
        </Card>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="flex flex-col items-center justify-center h-48 text-center bg-white/[0.01] rounded-2xl border border-dashed border-white/5">
            <Inbox className="size-5 text-white/10 mb-3" />
            <p className="text-[10px] font-mono uppercase tracking-widest text-white/20">{message}</p>
        </div>
    );
}

// ── SVG Chart Components ─────────────────────────────────────────────

const LineChart = memo(function LineChart({
    data,
    xKey,
    yKey,
    label,
    color = "#818cf8",
    formatValue,
}: {
    data: Record<string, any>[];
    xKey: string;
    yKey: string;
    label: string;
    color?: string;
    formatValue?: (v: number) => string;
}) {
    if (!data.length) {
        return <EmptyState message={`No ${label.toLowerCase()} available`} />;
    }

    const width = 600;
    const height = 200;
    const padX = 50;
    const padY = 30;
    const chartW = width - padX * 2;
    const chartH = height - padY * 2;

    const values = data.map((d) => Number(d[yKey]));
    const maxVal = Math.max(...values, 1);

    const points = data.map((d, i) => {
        const x = padX + (i / Math.max(data.length - 1, 1)) * chartW;
        const y = padY + chartH - (Number(d[yKey]) / maxVal) * chartH;
        return { x, y, label: d[xKey], value: Number(d[yKey]) };
    });

    const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    const areaD = `${pathD} L ${points[points.length - 1]!.x} ${padY + chartH} L ${points[0]!.x} ${padY + chartH} Z`;

    const fmt = formatValue ?? ((v: number) => String(Math.round(v)));

    return (
        <div className="relative group">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
                {/* Grid lines */}
                {[0, 0.5, 1].map((frac) => {
                    const y = padY + chartH - frac * chartH;
                    return (
                        <g key={frac} className="opacity-20 transition-opacity group-hover:opacity-40">
                            <line x1={padX} y1={y} x2={width - padX} y2={y} stroke="currentColor" className="text-white/10" strokeDasharray="4" />
                            <text x={padX - 12} y={y + 4} textAnchor="end" fill="currentColor" className="text-white/20 font-mono" fontSize="8">
                                {fmt(maxVal * frac)}
                            </text>
                        </g>
                    );
                })}

                {/* Area fill */}
                <motion.path
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.15 }}
                    transition={{ duration: 1.5, delay: 0.5 }}
                    d={areaD}
                    fill={color}
                />

                {/* Line */}
                <motion.path
                    initial={{ pathLength: 0, opacity: 0 }}
                    whileInView={{ pathLength: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.5, ease: [0.19, 1, 0.22, 1] }}
                    d={pathD}
                    fill="none"
                    stroke={color}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {/* Dynamic Markers */}
                {points.map((p, i) => (
                    <motion.circle
                        key={i}
                        cx={p.x}
                        cy={p.y}
                        initial={{ r: 0 }}
                        whileInView={{ r: 3 }}
                        transition={{ delay: 1 + i * 0.05, type: "spring", stiffness: 300, damping: 15 }}
                        viewport={{ once: true }}
                        fill={color}
                        className="drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]"
                    />
                ))}
            </svg>
        </div>
    );
});

const BarChartHorizontal = memo(function BarChartHorizontal({
    data,
    nameKey,
    valueKey,
    getColor,
}: {
    data: Record<string, any>[];
    nameKey: string;
    valueKey: string;
    getColor?: (name: string) => string;
}) {
    if (!data.length) {
        return <EmptyState message="Syncing data..." />;
    }

    const maxVal = Math.max(...data.map((d) => Number(d[valueKey])), 1);
    const defaultColor = "#818cf8";

    return (
        <div className="space-y-4">
            {data.map((d, i) => {
                const color = getColor ? getColor(d[nameKey]) : defaultColor;
                return (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        viewport={{ once: true }}
                    >
                        <div className="flex items-center justify-between text-[11px] mb-2 font-mono uppercase tracking-widest text-white/40">
                            <span className="truncate mr-4 text-white/60 font-bold italic">
                                {d[nameKey]}
                            </span>
                            <span className="tabular-nums font-black text-white/80">
                                {Number(d[valueKey]).toLocaleString()}
                            </span>
                        </div>
                        <div className="h-2 bg-white/[0.02] rounded-full overflow-hidden border border-white/5 p-[1.5px]">
                            <motion.div
                                initial={{ width: 0 }}
                                whileInView={{ width: `${(Number(d[valueKey]) / maxVal) * 100}%` }}
                                transition={{ duration: 1.2, ease: [0.19, 1, 0.22, 1], delay: 0.2 }}
                                viewport={{ once: true }}
                                className="h-full rounded-full"
                                style={{
                                    backgroundColor: color,
                                    boxShadow: `0 0 15px ${color}60`,
                                }}
                            />
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
});

const PROVIDER_COLORS: Record<string, string> = {
    openai: "#10a37f",
    anthropic: "#d97706",
    google: "#4285f4",
    meta: "#0668e1",
    mistral: "#f97316",
    cohere: "#8b5cf6",
};

const MODEL_COLORS: Record<string, string> = {
    "gpt-4": "#10a37f",
    "gpt-3.5": "#34d399",
    "claude-3": "#d97706",
    "gemini-pro": "#4285f4",
    "llama-3": "#0668e1",
    "mixtral": "#f97316",
};

export function Metrics() {
    const [range, setRange] = useState("7d");

    const summaryQuery = useQuery({
        queryKey: ["metrics-summary"],
        queryFn: () => fetchMetrics("/metrics/summary"),
        staleTime: 30_000,
    });

    const usageQuery = useQuery({
        queryKey: ["metrics-usage", range],
        queryFn: () => fetchMetrics(`/metrics/usage-over-time?range=${range}`),
        staleTime: 30_000,
    });

    const modelsQuery = useQuery({
        queryKey: ["metrics-models"],
        queryFn: () => fetchMetrics("/metrics/models"),
        staleTime: 30_000,
    });

    const providersQuery = useQuery({
        queryKey: ["metrics-providers"],
        queryFn: () => fetchMetrics("/metrics/providers"),
        staleTime: 30_000,
    });

    const throughputQuery = useQuery({
        queryKey: ["metrics-throughput"],
        queryFn: () => fetchMetrics("/metrics/throughput"),
        staleTime: 30_000,
    });

    const errorRateQuery = useQuery({
        queryKey: ["metrics-error-rate", range],
        queryFn: () => fetchMetrics(`/metrics/error-rate-over-time?range=${range}`),
        staleTime: 30_000,
    });

    const costQuery = useQuery({
        queryKey: ["metrics-cost", range],
        queryFn: () => fetchMetrics(`/metrics/cost-over-time?range=${range}`),
        staleTime: 30_000,
    });

    const latencyQuery = useQuery({
        queryKey: ["metrics-latency", range],
        queryFn: () => fetchMetrics(`/metrics/latency-over-time?range=${range}`),
        staleTime: 30_000,
    });

    const tokenQuery = useQuery({
        queryKey: ["metrics-tokens", range],
        queryFn: () => fetchMetrics(`/metrics/token-usage-over-time?range=${range}`),
        staleTime: 30_000,
    });

    const summary = summaryQuery.data;

    const rangeSelector = (
        <div className="flex items-center gap-1 bg-white/5 backdrop-blur-3xl rounded-xl p-1 border border-white/5">
            {["7d", "30d", "90d"].map((r) => (
                <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all duration-500 ${range === r
                        ? "bg-white/10 text-white shadow-lg"
                        : "text-white/40 hover:text-white"
                        }`}
                >
                    {r}
                </button>
            ))}
        </div>
    );

    return (
        <DashboardLayout>
            <div className="relative space-y-12 pb-20">
                {/* Visual Background Depth */}
                <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                    <motion.div
                        animate={{
                            opacity: [0.02, 0.05, 0.02],
                            scale: [1, 1.1, 1],
                        }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                        className="absolute top-[-20%] right-[-10%] w-full h-full bg-[radial-gradient(circle_at_50%_50%,_rgba(255,255,255,0.02)_0%,_transparent_60%)] blur-[120px]"
                    />
                </div>

                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6"
                >
                    <div>
                        <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic leading-none">
                            NEURAL_ANALYTICS
                        </h1>
                        <div className="flex items-center gap-3 mt-4">
                            <div className="h-1 w-8 bg-white/10" />
                            <p className="text-[10px] text-white/40 font-mono tracking-[0.4em] uppercase">
                                Real-time Throughput Monitoring v2.0
                            </p>
                        </div>
                    </div>
                    {rangeSelector}
                </motion.div>

                {/* Summary Cards */}
                {summaryQuery.isLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
                        {[1, 2, 3, 4].map(i => <CardSkeleton key={i} />)}
                    </div>
                ) : (
                    <motion.div
                        variants={container}
                        initial="hidden"
                        animate="show"
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10"
                    >
                        <motion.div variants={item}>
                            <Card className="hover:border-white/10 border-white/[0.04] bg-[#070707]/60 backdrop-blur-2xl transition-all duration-500">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-black tracking-[0.3em] text-white/30 uppercase font-mono">REQ_CYCLES</span>
                                        <Activity className="size-3.5 text-white/20" />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-4xl font-black tracking-tighter italic text-white">
                                        {(summary?.totalRequests ?? 0).toLocaleString()}
                                    </p>
                                </CardContent>
                            </Card>
                        </motion.div>

                        <motion.div variants={item}>
                            <Card className="hover:border-white/10 border-white/[0.04] bg-[#070707]/60 backdrop-blur-2xl">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-black tracking-[0.3em] text-white/30 uppercase font-mono">TOKEN_FLUX</span>
                                        <Hash className="size-3.5 text-white/20" />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-4xl font-black tracking-tighter italic text-white">
                                        {(summary?.totalTokens ?? 0).toLocaleString()}
                                    </p>
                                    <p className="text-[9px] font-mono text-white/20 mt-3 tracking-widest uppercase flex items-center gap-2">
                                        <span className="text-white/40">IN:</span> {(summary?.totalInputTokens ?? 0).toLocaleString()} <span className="text-white/10">/</span> <span className="text-white/40">OUT:</span> {(summary?.totalOutputTokens ?? 0).toLocaleString()}
                                    </p>
                                </CardContent>
                            </Card>
                        </motion.div>

                        <motion.div variants={item}>
                            <Card className="hover:border-white/10 border-white/[0.04] bg-[#070707]/60 backdrop-blur-2xl">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-black tracking-[0.3em] text-white/30 uppercase font-mono">ASSET_EXPENSE</span>
                                        <Coins className="size-3.5 text-white/20" />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-4xl font-black tracking-tighter italic text-white leading-none">
                                        {(summary?.totalCost ?? 0).toLocaleString()}
                                    </p>
                                    <p className="text-[9px] font-mono text-white/20 mt-3 tracking-widest uppercase">
                                        TOTAL_NETWORK_CREDITS
                                    </p>
                                </CardContent>
                            </Card>
                        </motion.div>

                        <motion.div variants={item}>
                            <Card className="hover:border-white/10 border-white/[0.04] bg-[#070707]/60 backdrop-blur-2xl">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-black tracking-[0.3em] text-white/30 uppercase font-mono">NETWORK_WAIT</span>
                                        <Clock className="size-3.5 text-white/20" />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-4xl font-black tracking-tighter italic text-white leading-none">
                                        {(summary?.avgLatencyMs ?? 0).toLocaleString()}
                                    </p>
                                    <p className="text-[9px] font-mono text-white/20 mt-3 tracking-widest uppercase">
                                        AVERAGE_LATENCY (ms)
                                    </p>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </motion.div>
                )}

                {/* Primary Chart */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1 }}
                    className="relative z-10"
                >
                    <Card className="bg-[#060606]/40 border-white/[0.04] backdrop-blur-3xl overflow-hidden relative group">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-white/[0.01] blur-[140px] rounded-full group-hover:bg-white/[0.02] transition-colors duration-1000" />
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="size-2 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)] animate-pulse" />
                                <TrendingUp className="size-4 text-white/40" />
                                <span className="text-[11px] font-black tracking-[0.4em] uppercase italic text-white/30">SYSTEM_PULSE_FLOW</span>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {usageQuery.isLoading ? (
                                <ChartSkeleton />
                            ) : (
                                <LineChart
                                    data={usageQuery.data ?? []}
                                    xKey="date"
                                    yKey="requests"
                                    label="Requests"
                                    color="#8b5cf6"
                                />
                            )}
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Micro Metrics Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                    >
                        <Card className="bg-[#060606]/40 border-white/[0.04] backdrop-blur-3xl">
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className="size-4 text-orange-500/40" />
                                    <span className="text-[11px] font-black tracking-[0.3em] uppercase italic text-white/30 font-mono">ENTROPY_RATE</span>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {errorRateQuery.isLoading ? <ChartSkeleton /> : (
                                    <LineChart
                                        data={errorRateQuery.data ?? []}
                                        xKey="date"
                                        yKey="errorRate"
                                        label="Error rate"
                                        color="#f97316"
                                        formatValue={(v) => `${v.toFixed(1)}%`}
                                    />
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                    >
                        <Card className="bg-[#060606]/40 border-white/[0.04] backdrop-blur-3xl">
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <Timer className="size-4 text-pink-500/40" />
                                    <span className="text-[11px] font-black tracking-[0.3em] uppercase italic text-white/30 font-mono">TEMPORAL_DRIFT</span>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {latencyQuery.isLoading ? <ChartSkeleton /> : (
                                    <LineChart
                                        data={latencyQuery.data ?? []}
                                        xKey="date"
                                        yKey="avgLatencyMs"
                                        label="Latency"
                                        color="#ec4899"
                                        formatValue={(v) => `${Math.round(v)}ms`}
                                    />
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>

                {/* System Distribution */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <Card className="bg-[#070707]/60 border-white/[0.04] backdrop-blur-3xl relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-1 h-full bg-white/5" />
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <BarChart3 className="size-4 text-white/40" />
                                    <span className="text-[11px] font-black tracking-[0.3em] uppercase italic text-white/30">INTEGRATION_LOAD</span>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-2">
                                {modelsQuery.isLoading ? <ChartSkeleton /> : (
                                    <BarChartHorizontal
                                        data={modelsQuery.data ?? []}
                                        nameKey="model"
                                        valueKey="requests"
                                        getColor={(name) => {
                                            const key = name.toLowerCase();
                                            for (const [mk, color] of Object.entries(MODEL_COLORS)) {
                                                if (key.includes(mk)) return color;
                                            }
                                            return "#8b5cf6";
                                        }}
                                    />
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <Card className="bg-[#070707]/60 border-white/[0.04] backdrop-blur-3xl relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-1 h-full bg-white/5" />
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <Layers className="size-4 text-white/40" />
                                    <span className="text-[11px] font-black tracking-[0.3em] uppercase italic text-white/30">PROVIDER_SYNC</span>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-2">
                                {providersQuery.isLoading ? <ChartSkeleton /> : (
                                    <BarChartHorizontal
                                        data={providersQuery.data ?? []}
                                        nameKey="provider"
                                        valueKey="requests"
                                        getColor={(name) => PROVIDER_COLORS[name.toLowerCase()] ?? "#8b5cf6"}
                                    />
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>

                {/* Final Kinetic Pulse */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.5 }}
                    className="relative z-10"
                >
                    <Card className="bg-[#060606]/40 border-white/[0.04] backdrop-blur-3xl overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <Activity className="size-4 text-white/40 group-hover:text-white transition-colors" />
                                <span className="text-[11px] font-black tracking-[0.4em] uppercase italic text-white/30">THROUGHPUT_VECTOR</span>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {throughputQuery.isLoading ? <ChartSkeleton /> : (
                                <LineChart
                                    data={throughputQuery.data ?? []}
                                    xKey="time"
                                    yKey="requestsPerMinute"
                                    label="Req/min"
                                    color="#f472b6"
                                />
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </DashboardLayout>
    );
}
