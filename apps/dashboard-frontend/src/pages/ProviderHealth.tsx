import { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { 
    Activity, 
    ShieldCheck, 
    ShieldAlert, 
    ShieldEllipsis, 
    Zap, 
    CheckCircle2, 
    AlertCircle, 
    Loader2, 
    Inbox,
    Timer,
    Clock,
    AlertTriangle
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

const API_BASE = "http://localhost:3000";

async function fetchHealth(path: string) {
    const res = await fetch(`${API_BASE}${path}`, { credentials: "include" });
    if (!res.ok) throw new Error(`Failed to fetch ${path}`);
    return res.json();
}

function ChartSkeleton() {
    return (
        <div className="animate-pulse space-y-3 px-2">
            <div className="flex items-end gap-1 h-48 pt-4">
                {Array.from({ length: 12 }).map((_, i) => (
                    <div
                        key={i}
                        className="flex-1 rounded-sm bg-white/5"
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

function EmptyState({ message }: { message: string }) {
    return (
        <div className="flex flex-col items-center justify-center h-48 text-center bg-white/[0.01] rounded-2xl border border-dashed border-white/5">
            <Inbox className="size-5 text-white/10 mb-3" />
            <p className="text-[10px] font-mono uppercase tracking-widest text-white/20">{message}</p>
        </div>
    );
}

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

                <motion.path 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.1 }}
                    transition={{ duration: 1.5, delay: 0.5 }}
                    d={areaD} 
                    fill={color} 
                />

                <motion.path 
                    initial={{ pathLength: 0, opacity: 0 }}
                    whileInView={{ pathLength: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.5, ease: [0.19, 1, 0.22, 1] }}
                    d={pathD} 
                    fill="none" 
                    stroke={color} 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                />

                {points.map((p, i) => (
                    <motion.circle 
                        key={i} 
                        cx={p.x} 
                        cy={p.y} 
                        initial={{ r: 0 }}
                        whileInView={{ r: 2.5 }}
                        transition={{ delay: 1 + i * 0.05 }}
                        viewport={{ once: true }}
                        fill={color} 
                        className="drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]"
                    />
                ))}
            </svg>
        </div>
    );
});

export function ProviderHealth() {
    const [range, setRange] = useState("24h");

    const summaryQuery = useQuery({
        queryKey: ["health-summary"],
        queryFn: () => fetchHealth("/admin/provider-health/summary"),
        staleTime: 30_000,
    });

    const timeseriesQuery = useQuery({
        queryKey: ["health-timeseries", range],
        queryFn: () => fetchHealth(`/admin/provider-health/timeseries?range=${range}`),
        staleTime: 30_000,
    });

    const providers = summaryQuery.data || [];

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "Healthy": return <ShieldCheck className="size-4 text-emerald-400" />;
            case "Degraded": return <ShieldEllipsis className="size-4 text-amber-400" />;
            case "Down": return <ShieldAlert className="size-4 text-white/40" />;
            default: return null;
        }
    };

    return (
        <DashboardLayout>
            <div className="relative space-y-12 pb-20">
                {/* Visual Background Depth - Neutral Obsidian */}
                <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                    <motion.div
                        animate={{ 
                            opacity: [0.01, 0.03, 0.01],
                            scale: [1, 1.1, 1],
                        }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                        className="absolute bottom-[-5%] left-[-5%] w-full h-full bg-[radial-gradient(circle_at_50%_50%,_rgba(255,255,255,0.02)_0%,_transparent_60%)] blur-[120px]"
                    />
                </div>

                <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="relative z-10"
                >
                    <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic leading-none">
                        NODE_STATE
                    </h1>
                    <div className="flex items-center gap-3 mt-4">
                        <div className="h-1 w-8 bg-white/40" />
                        <p className="text-[10px] text-white/40 font-mono tracking-[0.4em] uppercase">
                            Real-time Provider Integrity Check
                        </p>
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
                    {summaryQuery.isLoading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                            <Card key={i} className="animate-pulse bg-white/[0.02] border-white/[0.04] h-40" />
                        ))
                    ) : (
                        <motion.div 
                            variants={container}
                            initial="hidden"
                            animate="show"
                            className="contents"
                        >
                            {providers.map((p: any) => {
                                const statusColor = p.status === "Healthy" ? "#10a37f" : p.status === "Degraded" ? "#d97706" : "#ffffff";
                                return (
                                    <motion.div key={p.provider} variants={item}>
                                        <Card 
                                            className="transition-all duration-500 overflow-hidden group bg-white/[0.02] backdrop-blur-3xl border-white/[0.04] hover:shadow-[0_0_40px_rgba(0,0,0,0.4)]"
                                            style={{ borderLeft: `2px solid ${statusColor}20` }}
                                        >
                                            <CardHeader className="pb-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.05] group-hover:bg-white/[0.05] transition-colors">
                                                            {getStatusIcon(p.status)}
                                                        </div>
                                                        <span className="font-black tracking-tight text-white/70 italic group-hover:text-white transition-colors text-lg uppercase">
                                                            {p.provider}
                                                        </span>
                                                    </div>
                                                    <div 
                                                        className="text-[9px] font-mono font-black px-2 py-0.5 rounded-full border tracking-tighter uppercase transition-colors"
                                                        style={{ 
                                                            backgroundColor: `${statusColor}05`,
                                                            borderColor: `${statusColor}10`,
                                                            color: statusColor === "#ffffff" ? "#ffffff40" : statusColor
                                                        }}
                                                    >
                                                        {p.status}
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="grid grid-cols-2 gap-6 bg-white/[0.01] p-4 rounded-xl border border-white/[0.02] group-hover:bg-white/[0.02] transition-colors">
                                                    <div>
                                                        <div className="text-[9px] text-white/20 flex items-center gap-2 uppercase tracking-[0.2em] font-mono mb-1">
                                                            <Activity className="size-3" /> Error
                                                        </div>
                                                        <div className="font-black text-xl italic tracking-tighter text-white/80">{p.errorRate}%</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[9px] text-white/20 flex items-center gap-2 uppercase tracking-[0.2em] font-mono mb-1">
                                                            <Clock className="size-3" /> Latency
                                                        </div>
                                                        <div className="font-black text-xl italic tracking-tighter text-white/80">{p.avgLatency}ms</div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                );
                            })}
                        </motion.div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <Card className="bg-white/[0.02] border-white/[0.04] backdrop-blur-3xl">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <Timer className="size-4 text-white/10" />
                                    <span className="text-[11px] font-black tracking-[0.4em] uppercase italic text-white/30 font-mono">TEMPORAL_SYNC</span>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {timeseriesQuery.isLoading ? <ChartSkeleton /> : (
                                    <LineChart
                                        data={timeseriesQuery.data || []}
                                        xKey="timestamp"
                                        yKey="latency"
                                        label="Latency"
                                        color="#ffffff"
                                        formatValue={(v) => `${Math.round(v)}ms`}
                                    />
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                    >
                        <Card className="bg-white/[0.02] border-white/[0.04] backdrop-blur-3xl">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <AlertTriangle className="size-4 text-white/10" />
                                    <span className="text-[11px] font-black tracking-[0.4em] uppercase italic text-white/30 font-mono">FAULT_ENTROPY</span>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {timeseriesQuery.isLoading ? <ChartSkeleton /> : (
                                    <LineChart
                                        data={timeseriesQuery.data || []}
                                        xKey="timestamp"
                                        yKey="errorRate"
                                        label="Error rate"
                                        color="#ffffff"
                                        formatValue={(v) => `${v.toFixed(1)}%`}
                                    />
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </div>
        </DashboardLayout>
    );
}
