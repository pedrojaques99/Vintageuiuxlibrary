'use client';

import * as React from 'react';
import { Check, Loader2, Pencil, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Edição no lugar: o texto vira campo sem sair do lugar.
 *
 * Três defeitos moravam aqui, e todos eram do mesmo tipo — a peça não dizia o
 * que era e não ficava parada:
 *
 * 1. Nada indicava que aquilo era editável. A única pista era `hover:bg-muted`,
 *    ou seja, uma afordância que só existe DEPOIS que a pessoa já passou o
 *    mouse por cima por acaso. No celular ela nunca existe. Agora o repouso
 *    carrega a marca: sublinhado tracejado embaixo do texto e um lápis do lado.
 *    O lápis ocupa o espaço dele SEMPRE (só a opacidade muda no hover), senão
 *    aparecer no hover empurraria o texto.
 * 2. O texto quebrava em duas linhas e o vizinho pulava junto. Quem consome
 *    (a Mesa de trabalho) teve que escrever `whitespace-nowrap` do lado de fora
 *    pra segurar o cabeçalho — remendo no consumidor pra defeito do componente.
 *    Agora é `truncate` aqui dentro: uma linha, reticências, ponto final.
 * 3. Entrar em edição mudava o tamanho da caixa. Altura, porque leitura tinha
 *    `min-h-[32px]` e edição não tinha nada; largura, porque a caixa encolhia
 *    pro tamanho do input. Numa linha de tabela ou num cabeçalho em flex isso
 *    é a interface inteira dando um pulo a cada clique. Agora os dois estados
 *    compartilham uma altura (`--ie-h`) e a largura da leitura fica congelada
 *    enquanto edita — mesma caixa, conteúdo diferente.
 *
 * A largura é medida em vez de renderizada duas vezes de propósito: `value` é um
 * ReactNode que vem do consumidor (no data-table é um `flexRender` de célula) e
 * renderizar isso escondido só pra medir cobraria o dobro em toda linha da tabela.
 */
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

    // Largura da caixa em repouso, guardada a cada render de leitura. No render em
    // que `isEditing` vira true ela já está aqui, então a caixa não encolhe nem
    // por um frame — nada de medir depois e corrigir (isso É o pulo).
    const readBoxRef = React.useRef<HTMLDivElement>(null);
    const readWidth = React.useRef<number>(0);
    React.useLayoutEffect(() => {
        if (!isEditing && readBoxRef.current) readWidth.current = readBoxRef.current.offsetWidth;
    });

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

    const feedbackRing = {
        idle: '',
        saving: 'ring-1 ring-primary/40',
        success: 'ring-1 ring-emerald-500/40',
        error: 'ring-1 ring-destructive/40',
    }[status];

    return (
        <div
            className={cn('relative max-w-full min-w-[20px] [--ie-h:2rem]', className)}
            // `width`, não `minWidth`: com mínimo a caixa ainda CRESCIA ~18px na
            // edição (a borda e o padding do input do consumidor são maiores que os
            // do texto), e crescer empurra o vizinho exatamente como encolher. Só
            // na edição — em repouso a caixa manda na própria largura.
            style={isEditing && readWidth.current ? { width: readWidth.current } : undefined}
        >
            {!isEditing ? (
                <div ref={readBoxRef} className="flex h-[var(--ie-h)] items-center">
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
                            'group/ie flex h-full w-full items-center gap-1.5 rounded-[var(--r-control,0.5rem)] px-1.5 text-left',
                            // Escopo explícito em vez de `transition-all`: a caixa
                            // também anima largura quando o valor muda, e deixar a
                            // largura entrar na transição faz o vizinho tremer.
                            'transition-[background-color,color] [transition-duration:var(--dur-fast,160ms)] [transition-timing-function:var(--ease-out,cubic-bezier(0.23,1,0.32,1))]',
                            'hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            status === 'error' && 'text-destructive',
                            triggerClassName
                        )}
                    >
                        {/*
                          O sublinhado tracejado é a afordância em repouso — a
                          convenção de "isto é um campo" que o texto solto não
                          tinha. `truncate` mora aqui e não no consumidor.
                        */}
                        <span className="min-w-0 flex-1 truncate border-b border-dashed border-muted-foreground/35 group-hover/ie:border-muted-foreground/60">
                            {value}
                        </span>
                        {/*
                          Espaço do ícone reservado SEMPRE. Se ele só existisse no
                          hover, cada passada de mouse empurraria o texto — o pulo
                          que este conserto está tirando da peça.
                        */}
                        <span className="shrink-0 text-muted-foreground">
                            {status === 'success' ? (
                                <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                                <Pencil
                                    className={cn(
                                        'h-3 w-3 opacity-40',
                                        'transition-opacity [transition-duration:var(--dur-fast,160ms)] [transition-timing-function:var(--ease-out,cubic-bezier(0.23,1,0.32,1))]',
                                        'group-hover/ie:opacity-90 group-focus-visible/ie:opacity-90'
                                    )}
                                />
                            )}
                        </span>
                    </button>
                </div>
            ) : (
                <div
                    className={cn(
                        // Mesma altura da leitura: `h-[var(--ie-h)]`, não "o que o
                        // input pedir". É o que impede a linha de crescer no clique.
                        'flex h-[var(--ie-h)] items-center gap-1 rounded-[var(--r-control,0.5rem)]',
                        'transition-[box-shadow] [transition-duration:var(--dur-fast,160ms)] [transition-timing-function:var(--ease-out,cubic-bezier(0.23,1,0.32,1))]',
                        feedbackRing
                    )}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={handleEditKeyDown}
                >
                    <div className="min-w-0 flex-1">{children}</div>
                    {status === 'saving' && (
                        <Loader2 className="h-3 w-3 shrink-0 animate-spin text-muted-foreground" />
                    )}
                    {showButtons && status !== 'saving' && status !== 'success' && (
                        // Sem `backdrop-blur`: desfoque é linguagem de camada que
                        // flutua sobre a página (dialog, sheet). Aqui é um controle
                        // dentro da linha — ele pertence ao plano, não paira sobre ele.
                        <div className="flex shrink-0 items-center gap-0.5 border-l border-border pl-1">
                            <button
                                type="button"
                                onClick={handleSave}
                                aria-label="Salvar"
                                className="rounded p-1 text-emerald-600 transition-colors [transition-duration:var(--dur-press,120ms)] hover:bg-emerald-500/15 dark:text-emerald-400"
                            >
                                <Check className="h-3 w-3" />
                            </button>
                            <button
                                type="button"
                                onClick={handleCancel}
                                aria-label="Cancelar"
                                className="rounded p-1 text-destructive transition-colors [transition-duration:var(--dur-press,120ms)] hover:bg-destructive/15"
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
