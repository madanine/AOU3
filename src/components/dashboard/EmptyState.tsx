import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    icon: Icon,
    title,
    description
}) => {
    return (
        <div className="flex flex-col items-center justify-center p-10 text-center bg-gray-50 rounded-3xl border border-dashed border-gray-200">
            <div className="w-20 h-20 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-400 mb-4 animate-in zoom-in duration-500">
                <Icon size={32} />
            </div>
            <h3 className="text-xl font-black text-gray-800 tracking-tight">{title}</h3>
            <p className="text-sm font-semibold text-gray-500 mt-2 max-w-sm mx-auto leading-relaxed">
                {description}
            </p>
        </div>
    );
};
