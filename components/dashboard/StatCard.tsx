import React from 'react';
import { DivideIcon as LucideIcon } from 'lucide-react';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ElementType;
    colorClass: string;
    trend?: {
        value: number;
        label: string;
        isPositive?: boolean;
    };
    isLoading?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
    title,
    value,
    icon: Icon,
    colorClass,
    trend,
    isLoading
}) => {
    if (isLoading) {
        return (
            <div className="bg-card p-6 rounded-3xl border border-border shadow-sm flex items-center gap-4 animate-pulse">
                <div className="w-14 h-14 rounded-2xl bg-surface border border-border" />
                <div className="flex-1 space-y-2">
                    <div className="h-3 bg-surface border border-border rounded w-1/2" />
                    <div className="h-6 bg-surface border border-border rounded w-1/3" />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-card p-6 rounded-3xl border border-border shadow-sm flex items-center gap-4 transition-all duration-300 hover:shadow-premium-hover hover:-translate-y-1 group relative overflow-hidden">
            {/* Decorative background element */}
            <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 blur-2xl ${colorClass}`} />

            <div className={`w-14 h-14 shrink-0 rounded-2xl ${colorClass} flex items-center justify-center text-white shadow-premium group-hover:scale-110 transition-transform duration-300`}>
                <Icon size={28} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[11px] font-black uppercase tracking-widest text-text-secondary truncate">{title}</p>
                <div className="flex items-baseline gap-2 mt-1">
                    <p className="text-3xl font-black text-text-primary leading-none">{value}</p>
                    {trend && (
                        <span className={`text-xs font-bold ${trend.isPositive !== false ? 'text-success' : 'text-red-500'} flex items-center gap-0.5`}>
                            {trend.isPositive !== false ? '↑' : '↓'}
                            {Math.abs(trend.value)}%
                        </span>
                    )}
                </div>
                {trend && <p className="text-[10px] text-text-secondary font-medium mt-0.5 truncate">{trend.label}</p>}
            </div>
        </div>
    );
};
