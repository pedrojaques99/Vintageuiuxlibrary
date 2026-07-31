'use client';

import * as React from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface InlineEditProps {
    value: React.ReactNode;
    onSave: () => Promise<void>;
    onCancel: () => void;
    isEditing: boolean;
    onStartEdit: () => void;
    children: React.ReactNode;
    className?: string;
    triggerClassName?: string;
    showButtons?: boolean;
}

export function InlineEdit({
    value,
    onSave,
    onCancel,
    isEditing,
    onStartEdit,
    children,
    className,
    triggerClassName,
    showButtons = false,
}: InlineEditProps) {
    const [status, setStatus] = React.useState<'idle' | 'saving' | 'success' | 'error'>('idle');

    React.useEffect(() => {
        if (!isEditing) return;
        const onDocKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            e.preventDefault();
            e.stopPropagation();
            setStatus('idle');
            onCancel();
        };
        document.addEventListener('keydown', onDocKeyDown, true);
        return () => document.removeEventListener('keydown', onDocKeyDown, true);
    }, [isEditing, onCancel]);

    const handleSave = async (e?: React.FormEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (status === 'saving') return;
        setStatus('saving');
        try {
            await onSave();
            setStatus('success');
            setTimeout(() => setStatus('idle'), 2000);
        } catch (err) {
            console.error('InlineEdit Save Error:', err);
            setStatus('error');
            setTimeout(() => setStatus('idle'), 3000);
        }
    };

    const handleCancel = (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        setStatus('idle');
        onCancel();
    };

    const handleEditKeyDown = (e: React.KeyboardEvent) => {
        e.stopPropagation();
        const target = e.target as HTMLElement;
        if (e.key === 'Escape') {
            e.preventDefault();
            handleCancel();
            return;
        }
        if (e.key === 'Enter' && target instanceof HTMLInputElement) {
            e.preventDefault();
            handleSave();
        }
    };

    const feedbackColors = {
        idle: '',
        saving: 'ring-1 ring-primary/50 bg-primary/5',
        success: 'ring-1 ring-green-500/50 bg-green-500/5',
        error: 'ring-1 ring-destructive/50 bg-destructive/5',
    };

    return (
        <div className={cn('relative group min-w-[20px]', className)}>
            {!isEditing ? (
                <div className="flex items-center min-h-[32px]">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onStartEdit();
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') e.stopPropagation();
                        }}
                        className={cn(
                            'w-full text-left transition-colors duration-200 rounded px-1 -mx-1',
                            'hover:bg-muted/50 hover:ring-1 hover:ring-muted-foreground/20',
                            status === 'success' && 'text-green-600 dark:text-green-400 font-medium',
                            status === 'error' && 'text-destructive font-medium',
                            triggerClassName
                        )}
                    >
                        {value}
                    </button>
                    {status === 'success' && (
                        <span className="ml-2 text-green-500">
                            <Check className="h-3 w-3" />
                        </span>
                    )}
                </div>
            ) : (
                <div
                    className={cn(
                        'relative flex items-center gap-1 rounded-md transition-colors duration-200',
                        feedbackColors[status]
                    )}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={handleEditKeyDown}
                >
                    <div className="flex-1">
                        {children}
                    </div>
                    {status === 'saving' && (
                        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground shrink-0" />
                    )}
                    {showButtons && !status.match(/saving|success/) && (
                        <div className="flex items-center gap-0.5 px-1 bg-background/50 backdrop-blur-sm rounded-r-md border-l">
                            <button
                                type="button"
                                onClick={handleSave}
                                aria-label="Salvar"
                                className="p-1 hover:bg-green-500/20 text-green-600 rounded transition-colors"
                            >
                                <Check className="h-3 w-3" />
                            </button>
                            <button
                                type="button"
                                onClick={handleCancel}
                                aria-label="Cancelar"
                                className="p-1 hover:bg-destructive/20 text-destructive rounded transition-colors"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
