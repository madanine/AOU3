import React from 'react';
import { ResponsiveContainer } from 'recharts';
import { LucideIcon } from 'lucide-react';

interface ChartBlockProps {
    title: string;
    subtitle?: string;
    icon?: LucideIcon;
    children: React.ReactNode;
    isLoading?: boolean;
    isEmpty?: boolean;
    emptyMessage?: string;
    height?: number;
    className?: string;
}

export const ChartBlock: React.FC<ChartBlockProps> = ({
    title,
    subtitle,
    icon: Icon,
    children,
    isLoading,
    isEmpty,
    emptyMessage = 'No data available',
    height = 300,
    className = ''
}) => {
    return (
        <div className={`bg-white rounded-3xl border border-gray-100 shadow-sm p-6 transition-all hover:shadow-md ${className}`}>
            <div className="flex items-center gap-3 mb-6">
                {Icon && (
                    <div className="w-10 h-10 rounded-xl bg-[var(--primary)] bg-opacity-10 text-[var(--primary)] flex items-center justify-center">
                        <Icon size={20} />
                    </div>
                )}
                <div>
                    <h3 className="text-lg font-black text-gray-800 tracking-tight">{title}</h3>
                    {subtitle && <p className="text-xs font-semibold text-gray-400">{subtitle}</p>}
                </div>
            </div>

            <div style={{ height }} className="relative w-full">
                {isLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 z-10 animate-pulse">
                        <div className="w-full h-full bg-gray-50 rounded-2xl flex flex-col items-center justify-center space-y-4">
                            <div className="w-3/4 h-4 bg-gray-200 rounded" />
                            <div className="w-1/2 h-4 bg-gray-200 rounded" />
                            <div className="w-5/6 h-4 bg-gray-200 rounded" />
                            <div className="w-2/3 h-4 bg-gray-200 rounded" />
                        </div>
                    </div>
                ) : isEmpty ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                        <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-3">
                            <svg className="w-8 h-8 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </div>
                        <p className="font-semibold">{emptyMessage}</p>
                    </div>
                ) : (
                    <div className="w-full h-full animate-in fade-in duration-700">
                        <ResponsiveContainer width="100%" height="100%">
                            {children as any}
                        </ResponsiveContainer>
                    </div>
                )}
            </div>
        </div>
    );
};
