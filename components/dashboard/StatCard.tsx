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
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4 animate-pulse">
                <div className="w-14 h-14 rounded-2xl bg-gray-200" />
                <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                    <div className="h-6 bg-gray-200 rounded w-1/3" />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group relative overflow-hidden">
            {/* Decorative background element */}
            <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 blur-2xl ${colorClass}`} />

            <div className={`w-14 h-14 shrink-0 rounded-2xl ${colorClass} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                <Icon size={28} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[11px] font-black uppercase tracking-widest text-gray-500 truncate">{title}</p>
                <div className="flex items-baseline gap-2 mt-1">
                    <p className="text-3xl font-black text-gray-800 leading-none">{value}</p>
                    {trend && (
                        <span className={`text-xs font-bold ${trend.isPositive !== false ? 'text-emerald-500' : 'text-rose-500'} flex items-center gap-0.5`}>
                            {trend.isPositive !== false ? '↑' : '↓'}
                            {Math.abs(trend.value)}%
                        </span>
                    )}
                </div>
                {trend && <p className="text-[10px] text-gray-400 font-medium mt-0.5 truncate">{trend.label}</p>}
            </div>
        </div>
    );
};
