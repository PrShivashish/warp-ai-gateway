import { Link, useLocation } from "react-router";
import { cn } from "@/lib/utils";
import { useState, useCallback } from "react";
import {
    LayoutDashboard,
    Key,
    Wallet,
    BarChart3,
    MessageSquare,
    Zap,
    LogOut,
    BookOpen,
    ExternalLink,
    ShieldCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { LoadingOverlay } from "./LoadingOverlay";

import { DOCS_URL } from "../lib/env";



const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "API Keys", href: "/api-keys", icon: Key },
    { label: "Wallet", href: "/wallet", icon: Wallet },
    { label: "Metrics", href: "/metrics", icon: BarChart3 },
    { label: "Health", href: "/dashboard/provider-health", icon: ShieldCheck },
    { label: "Chat", href: "/chat", icon: MessageSquare },
    { label: "Docs", href: DOCS_URL, icon: BookOpen, external: true },
] as const;

export function DashboardLayout({ children }: { children: React.ReactNode }) {
    const location = useLocation();
    const [isNavigatingToDocs, setIsNavigatingToDocs] = useState(false);

    const prefetchDocs = useCallback(() => {
        const link = document.createElement("link");
        link.rel = "prefetch";
        link.href = DOCS_URL;
        document.head.appendChild(link);
    }, []);

    const handleDocsClick = (e: React.MouseEvent) => {
        setIsNavigatingToDocs(true);
        // We'll let the user see the animation for a moment even if it's fast
        setTimeout(() => {
            window.location.href = DOCS_URL;
        }, 800);
        e.preventDefault();
    };

    return (
        <div className="dark min-h-screen bg-background flex overflow-hidden">
            <LoadingOverlay isVisible={isNavigatingToDocs} />

            {/* Sidebar */}
            <motion.aside
                initial={{ x: -64, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.6, ease: [0.19, 1, 0.22, 1] }}
                className="w-64 flex flex-col bg-card/10 backdrop-blur-3xl relative z-20 border-r border-white/5"
            >
                {/* Brand */}
                <div className="px-6 h-20 flex items-center gap-3">
                    <div className="flex items-center justify-center size-9 rounded-xl bg-hyper-crimson/10 border border-hyper-crimson/20 shadow-[0_0_15px_rgba(255,0,60,0.1)]">
                        <Zap className="size-4 text-hyper-crimson" />
                    </div>
                    <span className="text-sm font-bold tracking-[0.2em] text-white uppercase opacity-80">
                        Warp
                    </span>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 py-6 space-y-2 relative">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.href;
                        const classes = cn(
                            "group flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wider uppercase transition-all duration-300 relative z-10",
                            isActive
                                ? "text-hyper-crimson"
                                : "text-white/40 hover:text-white"
                        );

                        const content = (
                            <>
                                <item.icon className={cn("size-3.5 transition-transform duration-300 group-hover:scale-110", isActive && "text-hyper-crimson")} />
                                {item.label}
                                {'external' in item && item.external && (
                                    <ExternalLink className="size-3 ml-auto opacity-20" />
                                )}
                                {isActive && (
                                    <motion.div
                                        layoutId="active-nav-glow"
                                        className="absolute inset-0 bg-white/5 rounded-xl -z-10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                            </>
                        );

                        if ('external' in item && item.external) {
                            return (
                                <a
                                    key={item.href}
                                    href={item.href}
                                    onClick={handleDocsClick}
                                    onMouseEnter={prefetchDocs}
                                    className={classes}
                                >
                                    {content}
                                </a>
                            );
                        }

                        return (
                            <Link
                                key={item.href}
                                to={item.href}
                                className={classes}
                            >
                                {content}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="px-4 py-6 space-y-4">
                    <div className="h-px bg-gradient-to-r from-transparent via-white/5 to-transparent mx-2" />
                    <Link
                        to="/signin"
                        className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wider uppercase text-white/30 hover:text-white hover:bg-white/5 transition-all duration-300"
                    >
                        <LogOut className="size-3.5" />
                        Sign out
                    </Link>
                </div>
            </motion.aside>

            {/* Main content */}
            <main className="flex-1 overflow-auto">
                <div className="max-w-5xl mx-auto px-8 py-8">
                    {children}
                </div>
            </main>
        </div>
    );
}