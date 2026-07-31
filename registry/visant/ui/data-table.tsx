'use client';

import * as React from 'react';

import {
  type ColumnDef,
  type VisibilityState,
  type ColumnPinningState,
  type RowSelectionState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { InlineEdit } from './inline-edit';
import { Input } from './input';
import {
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuCheckboxItem,
  ContextMenuShortcut,
  ContextMenuLabel,
} from '@/components/ui/context-menu';
import { ArrowUpDown, ArrowUp, ArrowDown, Trash, Columns, EyeOff, Copy, Search, Pin, PinOff, ArrowLeft, ArrowRight } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/use-media-query';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: TData) => void;
  className?: string;
  /** Compact style (px-3 py-2) for admin tables. Default true. */
  compact?: boolean;
  /** Optional footer (e.g. <TableRow>...</TableRow>) */
  footer?: React.ReactNode;
  /** Optional callback for deleting a row via context menu */
  onDeleteRow?: (row: TData) => void;
  onDuplicateRow?: (row: TData) => void;
  /** Optional extra context-menu items rendered at the top of the row menu. */
  renderRowContextMenu?: (row: TData) => React.ReactNode;
  /** Enable a leading checkbox column with shift-click range selection. */
  enableRowSelection?: boolean;
  /** Stable row id (e.g. the issue id) so selection survives re-sorts/refetches. */
  getRowId?: (row: TData) => string;
  /** Rendered above the table when ≥1 row is selected. */
  renderBatchBar?: (selected: TData[], clear: () => void) => React.ReactNode;
  /**
   * The ID of the column that should be treated as "primary".
   * This column will have width: auto (hug content/fill) and take remaining space.
   */
  primaryColumnId?: string;
  /** Optional callback for updating a cell value inline (only for admins) */
  onCellUpdate?: (row: TData, columnId: string, value: any) => Promise<void>;
  initialColumnVisibility?: VisibilityState;
  /**
   * Initial column pinning (e.g. `{ right: ['actions'] }` to freeze an actions
   * column to the right edge). Opt-in — admin tables are unaffected when omitted.
   */
  initialColumnPinning?: ColumnPinningState;
  /**
   * Desliga a ordenação por cabeçalho. Use quando a tela já tem um controle de
   * ordenação próprio — dois eixos de ordenação sobre a mesma tabela se
   * contradizem (o controle externo continua dizendo "Prazo" enquanto a tabela
   * já reordenou por outra coluna).
   */
  disableSorting?: boolean;
  /**
   * Title for the table toolbar (optional)
   */
  title?: string;
  /**
   * Optional initial page size. Default 20.
   */
  pageSize?: number;
  /**
   * Hide pagination controls. Default false.
   */
  hidePagination?: boolean;
  /**
   * Hide the built-in toolbar search box. Use when the parent already provides
   * its own search input feeding the data (avoids two competing search fields).
   * Default false.
   */
  hideToolbarSearch?: boolean;
  /**
   * Render the batch action bar in normal flow (full-width, wraps and pushes the
   * table down) instead of the default absolute overlay. Only safe when the
   * toolbar search is hidden; otherwise the bar collides with the search box.
   * Default false (absolute overlay).
   */
  batchBarInFlow?: boolean;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading = false,
  emptyMessage = 'Nenhum resultado.',
  onRowClick,
  className,
  compact = true,
  footer,
  onDeleteRow,
  onDuplicateRow,
  renderRowContextMenu,
  enableRowSelection = false,
  getRowId,
  renderBatchBar,
  primaryColumnId,
  onCellUpdate,
  initialColumnVisibility = {},
  initialColumnPinning,
  disableSorting = false,
  title,
  pageSize = 20,
  hidePagination = false,
  hideToolbarSearch = false,
  batchBarInFlow = false,
}: DataTableProps<TData, TValue>) {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === 'admin';
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize sorting from URL
  const [sorting, setSorting] = React.useState<SortingState>(() => {
    const sortParam = searchParams.get('sort');
    if (sortParam) {
      const [id = '', desc] = sortParam.split('.');
      if (id) return [{ id, desc: desc === 'desc' }];
    }
    return [];
  });
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(initialColumnVisibility);
  const [columnPinning, setColumnPinning] = React.useState<ColumnPinningState>(initialColumnPinning ?? {});

  // Simplified Width State: Default to "Fit" (true) on Desktop, always false on Mobile
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Sync sorting to URL
  React.useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());

    const sort = sorting[0];
    if (sort) {
      params.set('sort', `${sort.id}.${sort.desc ? 'desc' : 'asc'}`);
    } else {
      params.delete('sort');
    }

    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(newUrl, { scroll: false });
  }, [sorting, pathname, router, searchParams]);


  const [globalFilter, setGlobalFilter] = React.useState('');
  const [editingCell, setEditingCell] = React.useState<{ rowId: string; colId: string } | null>(null);
  const [tempValue, setTempValue] = React.useState<any>(null);
  const [undoToast, setUndoToast] = React.useState<string | null>(null);

  // Undo stack: stores previous values before onCellUpdate commits them
  type UndoEntry = { row: TData; columnId: string; oldValue: any; label: string };
  const undoStack = React.useRef<UndoEntry[]>([]);
  const previousValue = React.useRef<any>(null);

  const pushUndo = React.useCallback((entry: UndoEntry) => {
    undoStack.current = [...undoStack.current.slice(-19), entry]; // keep last 20
  }, []);

  const handleUndo = React.useCallback(async () => {
    if (!onCellUpdate || undoStack.current.length === 0) return;
    const entry = undoStack.current[undoStack.current.length - 1]!;
    undoStack.current = undoStack.current.slice(0, -1);
    await onCellUpdate(entry.row, entry.columnId, entry.oldValue);
    setUndoToast(`Desfeito: ${entry.label}`);
    setTimeout(() => setUndoToast(null), 2200);
  }, [onCellUpdate]);

  // Shift+Scroll → horizontal scroll; Ctrl+Z → undo
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.shiftKey && e.deltaY !== 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  React.useEffect(() => {
    if (!onCellUpdate) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onCellUpdate, handleUndo]);

  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const lastSelectedIndex = React.useRef<number | null>(null);

  // Shift-click selects the range between the last toggled row and this one.
  const handleSelectClick = React.useCallback(
    (e: React.MouseEvent, row: any, rows: any[]) => {
      const idx = rows.findIndex((r) => r.id === row.id);
      const want = !row.getIsSelected();
      if (e.shiftKey && lastSelectedIndex.current !== null && idx !== -1) {
        const a = Math.min(lastSelectedIndex.current, idx);
        const b = Math.max(lastSelectedIndex.current, idx);
        for (let i = a; i <= b; i++) rows[i]?.toggleSelected(want);
      } else {
        row.toggleSelected(want);
      }
      lastSelectedIndex.current = idx;
    },
    []
  );

  const tableColumns = React.useMemo<ColumnDef<TData, TValue>[]>(() => {
    if (!enableRowSelection) return columns;
    const selectCol: ColumnDef<TData, TValue> = {
      id: '__select',
      enableSorting: false,
      enableHiding: false,
      size: 36,
      header: ({ table }) => (
        <div className="px-1" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() ? 'indeterminate' : false)
            }
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
            aria-label="Selecionar todos"
          />
        </div>
      ),
      cell: ({ row, table }) => (
        <div
          className="px-1"
          onClick={(e) => {
            e.stopPropagation();
            handleSelectClick(e, row, table.getRowModel().rows);
          }}
        >
          <Checkbox
            checked={row.getIsSelected()}
            aria-label="Selecionar linha"
            className="pointer-events-none"
          />
        </div>
      ),
    };
    return [selectCol, ...columns];
  }, [columns, enableRowSelection, handleSelectClick]);

  // Mobile: colunas marcadas com `meta.hideOnMobile` somem — menos scroll
  // horizontal por linha. Não toca no estado base: voltando ao desktop, a
  // visibilidade escolhida pelo usuário reaparece intacta.
  // <640 (sm), NÃO o isMobile de 768 acima: 640–768 é "desktop" pro resto
  // do app e o comportamento ali não pode mudar.
  const isNarrow = useMediaQuery('(max-width: 639px)');
  const effectiveColumnVisibility = React.useMemo<VisibilityState>(() => {
    if (!isNarrow) return columnVisibility;
    const forced: VisibilityState = {};
    for (const col of tableColumns) {
      if ((col.meta as any)?.hideOnMobile) {
        const id = col.id ?? (col as any).accessorKey;
        if (id) forced[id] = false;
      }
    }
    return { ...columnVisibility, ...forced };
  }, [isNarrow, columnVisibility, tableColumns]);

  const table = useReactTable({
    data,
    columns: tableColumns,
    ...(getRowId ? { getRowId } : {}),
    enableRowSelection,
    enableSorting: !disableSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableColumnResizing: false,
    state: {
      sorting,
      columnVisibility: effectiveColumnVisibility,
      globalFilter,
      columnPinning,
      rowSelection,
    },
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    onColumnPinningChange: setColumnPinning,
    initialState: {
      pagination: {
        pageSize: pageSize,
      },
    },
  });

  const cellClass = compact ? 'px-3 py-2' : 'p-4';
  const headClass = compact ? 'px-3 py-2' : 'p-4';

  // Loading não apaga a moldura: o <thead> tem os headers de coluna (estáticos,
  // vêm de `columns`) e a toolbar/título são conhecidos antes do dado. Só o
  // corpo vira skeleton rows — a tabela já "parece" a final, sem spinner solto.
  const skeletonRowCount = Math.min(pageSize, 8);
  // Larguras variadas por coluna (determinístico) pra não virar um grid de
  // barras idênticas — lê como dado tabular de verdade.
  const SKELETON_WIDTHS = ['70%', '45%', '85%', '55%', '35%', '65%'];

  return (
    <div className={cn('space-y-2 relative', className)}>
      {/* Undo toast */}
      {undoToast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
          <span className="text-muted-foreground">{undoToast}</span>
          {undoStack.current.length > 0 && (
            <button
              className="text-foreground font-medium hover:underline underline-offset-2"
              onClick={handleUndo}
            >
              Desfazer mais
            </button>
          )}
        </div>
      )}
      {/* Table Toolbar - Hidden on Mobile if empty, or just hides the toggle */}
      {(title || !hideToolbarSearch || (enableRowSelection && renderBatchBar)) && (
      <div className="relative flex items-center justify-between gap-2">
        {title && <h3 className="font-semibold text-sm">{title}</h3>}

        {/* Built-in search — skip when the parent owns search (hideToolbarSearch). */}
        {!hideToolbarSearch && (
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Pesquisar..."
                value={globalFilter ?? ''}
                onChange={(event) => setGlobalFilter(event.target.value)}
                className="h-8 w-[150px] lg:w-[200px] pl-8 text-xs bg-background/50"
              />
            </div>
          </div>
        )}

        {/* Batch action bar. Default: absolute overlay (zero flow space, never
            shifts the toolbar — safe alongside a visible search box). Opt-in
            `batchBarInFlow` renders it full-width in normal flow, which wraps
            cleanly on mobile but must only be used when the search is hidden. */}
        {enableRowSelection && renderBatchBar && table.getSelectedRowModel().rows.length > 0 && (
          <div className={cn(batchBarInFlow ? "w-full min-w-0 z-30" : "absolute inset-x-0 top-1/2 -translate-y-1/2 z-30")}>
            {renderBatchBar(
              table.getSelectedRowModel().rows.map((r) => r.original),
              () => table.resetRowSelection()
            )}
          </div>
        )}
      </div>
      )}

      <div
        ref={scrollContainerRef}
        className={cn(
          'group relative w-full max-w-full min-w-0 overflow-x-auto overflow-y-auto max-h-[calc(100vh-10rem)] rounded-md border touch-pan-x',
          // Custom Scrollbar for better UX
          'scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent'
        )}
      >
        <table
          className={cn(
            "w-full caption-bottom text-sm table-auto min-w-full w-max"
          )}
        >
          <TableHeader className="sticky top-0 z-20">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="bg-background hover:bg-background group/row"
              >
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      'relative transition-[background-color,box-shadow] duration-200',
                      headClass,
                      header.column.getIsPinned() && "z-20 bg-background/95 backdrop-blur-sm",
                      header.column.getIsPinned() === 'left' && "sticky left-0 shadow-[1px_0_0_0_hsl(var(--border))]",
                      header.column.getIsPinned() === 'right' && "sticky right-0 shadow-[-1px_0_0_0_hsl(var(--border))]"
                    )}
                    style={{
                      left: header.column.getIsPinned() === 'left' ? header.column.getStart('left') : undefined,
                      right: header.column.getIsPinned() === 'right' ? header.column.getAfter('right') : undefined,
                      width: header.column.columnDef.size !== 150 ? header.column.getSize() : undefined,
                      minWidth: header.column.columnDef.minSize
                    }}
                  >
                    {header.isPlaceholder ? null : (
                      <ContextMenu>
                        <ContextMenuTrigger asChild>
                          <div className="flex h-full items-center">
                            <button
                              type="button"
                              onClick={header.column.getToggleSortingHandler()}
                              className={cn(
                                'group flex w-full items-center gap-1 text-xs font-medium text-muted-foreground transition-colors',
                                header.column.getCanSort() && 'cursor-pointer hover:text-foreground'
                              )}
                            >
                              <span className="truncate">
                                {flexRender(header.column.columnDef.header, header.getContext())}
                              </span>
                              {header.column.getCanSort() && (
                                <span
                                  className={cn(
                                    'ml-1 inline-flex h-3.5 w-3.5 items-center justify-center text-xs transition-[color,opacity]',
                                    header.column.getIsSorted()
                                      ? 'text-foreground opacity-100'
                                      : 'text-muted-foreground/40 opacity-0 group-hover:opacity-100'
                                  )}
                                >
                                  {header.column.getIsSorted() === 'asc' && <ArrowUp className="h-3 w-3" />}
                                  {header.column.getIsSorted() === 'desc' && (
                                    <ArrowDown className="h-3 w-3" />
                                  )}
                                  {!header.column.getIsSorted() && (
                                    <ArrowUpDown className="h-3 w-3 opacity-60" />
                                  )}
                                </span>
                              )}
                              {header.column.getIsPinned() && (
                                <Pin className="h-3 w-3 ml-1 text-primary opacity-60" fill="currentColor" />
                              )}
                            </button>
                          </div>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                          <ContextMenuLabel>Opções da Coluna</ContextMenuLabel>
                          <ContextMenuSeparator />

                          <ContextMenuSub>
                            <ContextMenuSubTrigger>
                              <Pin className="mr-2 h-4 w-4" />
                              Fixar / Congelar
                            </ContextMenuSubTrigger>
                            <ContextMenuSubContent className="w-48">
                              <ContextMenuItem
                                onClick={() => header.column.pin('left')}
                                disabled={header.column.getIsPinned() === 'left'}
                              >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Fixar à Esquerda
                              </ContextMenuItem>
                              <ContextMenuItem
                                onClick={() => header.column.pin('right')}
                                disabled={header.column.getIsPinned() === 'right'}
                              >
                                <ArrowRight className="mr-2 h-4 w-4" />
                                Fixar à Direita
                              </ContextMenuItem>
                              {header.column.getIsPinned() && (
                                <>
                                  <ContextMenuSeparator />
                                  <ContextMenuItem onClick={() => header.column.pin(false)}>
                                    <PinOff className="mr-2 h-4 w-4" />
                                    Desafixar
                                  </ContextMenuItem>
                                </>
                              )}
                            </ContextMenuSubContent>
                          </ContextMenuSub>

                          <ContextMenuSeparator />
                          {header.column.getCanSort() && (
                            <>
                              <ContextMenuItem onClick={() => header.column.toggleSorting(false)}>
                                <ArrowUp className="mr-2 h-4 w-4" />
                                Ordem Crescente
                              </ContextMenuItem>
                              <ContextMenuItem onClick={() => header.column.toggleSorting(true)}>
                                <ArrowDown className="mr-2 h-4 w-4" />
                                Ordem Decrescente
                              </ContextMenuItem>
                              <ContextMenuItem onClick={() => header.column.clearSorting()}>
                                <ArrowUpDown className="mr-2 h-4 w-4" />
                                Limpar Ordenação
                              </ContextMenuItem>
                              <ContextMenuSeparator />
                            </>
                          )}
                          {header.column.getCanHide() && (
                            <ContextMenuItem onClick={() => header.column.toggleVisibility(false)}>
                              <EyeOff className="mr-2 h-4 w-4" />
                              Esconder Coluna
                            </ContextMenuItem>
                          )}
                        </ContextMenuContent>
                      </ContextMenu>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: skeletonRowCount }).map((_, i) => (
                <TableRow key={`sk-${i}`} className="hover:bg-transparent">
                  {table.getVisibleLeafColumns().map((col, ci) => (
                    <TableCell key={col.id} className={cellClass}>
                      <Skeleton
                        className="h-4"
                        style={{ width: SKELETON_WIDTHS[(i + ci) % SKELETON_WIDTHS.length] }}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : !table.getRowModel().rows?.length ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className={cn('h-24 text-center text-muted-foreground', cellClass)}
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <ContextMenu key={row.id}>
                  <ContextMenuTrigger asChild>
                    <TableRow
                      data-state={row.getIsSelected() && 'selected'}
                      className={cn(
                        onRowClick && 'cursor-pointer',
                        'hover:bg-muted/30 transition-colors'
                      )}
                      onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                      onKeyDown={
                        onRowClick
                          ? (e) => {
                            if (e.key !== 'Enter' && e.key !== ' ') return;
                            e.preventDefault();
                            onRowClick(row.original);
                          }
                          : undefined
                      }
                      tabIndex={onRowClick ? 0 : undefined}
                      role={onRowClick ? 'button' : undefined}
                    >
                      {row.getVisibleCells().map((cell) => {
                        const isEditable = isAdmin && !!onCellUpdate && (cell.column.columnDef.meta as any)?.editable;
                        const isEditing = editingCell?.rowId === row.id && editingCell.colId === cell.id;

                        return (
                          <TableCell
                            key={cell.id}
                            className={cn(
                              cellClass,
                              'overflow-hidden transition-[background-color,box-shadow] duration-200',
                              cell.column.getIsPinned() && "z-10 bg-background/95 backdrop-blur-sm",
                              cell.column.getIsPinned() === 'left' && "sticky left-0 shadow-[1px_0_0_0_hsl(var(--border))]",
                              cell.column.getIsPinned() === 'right' && "sticky right-0 shadow-[-1px_0_0_0_hsl(var(--border))]",
                              isEditable && "cursor-text"
                            )}
                            style={{
                              left: cell.column.getIsPinned() === 'left' ? cell.column.getStart('left') : undefined,
                              right: cell.column.getIsPinned() === 'right' ? cell.column.getAfter('right') : undefined,
                            }}
                            onClick={(e) => {
                              if (isEditable) e.stopPropagation();
                            }}
                          >
                            {isEditable ? (
                              <InlineEdit
                                value={flexRender(cell.column.columnDef.cell, cell.getContext())}
                                isEditing={isEditing}
                                onStartEdit={() => {
                                  previousValue.current = cell.getValue();
                                  setEditingCell({ rowId: row.id, colId: cell.id });
                                  setTempValue(cell.getValue());
                                }}
                                onSave={async () => {
                                  if (tempValue !== previousValue.current) {
                                    pushUndo({
                                      row: row.original,
                                      columnId: cell.column.id,
                                      oldValue: previousValue.current,
                                      label: `${cell.column.id}: ${String(previousValue.current ?? '–')}`,
                                    });
                                  }
                                  await onCellUpdate(row.original, cell.column.id, tempValue);
                                  setEditingCell(null);
                                }}
                                onCancel={() => setEditingCell(null)}
                              >
                                <Input
                                  value={tempValue ?? ''}
                                  onChange={(e) => setTempValue(e.target.value)}
                                  onBlur={async () => {
                                    if (tempValue !== previousValue.current) {
                                      pushUndo({
                                        row: row.original,
                                        columnId: cell.column.id,
                                        oldValue: previousValue.current,
                                        label: `${cell.column.id}: ${String(previousValue.current ?? '–')}`,
                                      });
                                      await onCellUpdate(row.original, cell.column.id, tempValue);
                                    }
                                    setEditingCell(null);
                                  }}
                                  className="h-7 text-xs"
                                  autoFocus
                                />
                              </InlineEdit>
                            ) : (
                              flexRender(cell.column.columnDef.cell, cell.getContext())
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  </ContextMenuTrigger>
                  <ContextMenuContent className="w-64">
                    {renderRowContextMenu && (
                      <>
                        {renderRowContextMenu(row.original)}
                        <ContextMenuSeparator />
                      </>
                    )}
                    <ContextMenuItem
                      onClick={() => {
                        if (typeof navigator !== 'undefined') {
                          navigator.clipboard.writeText(JSON.stringify(row.original, null, 2));
                        }
                      }}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copiar Dados (JSON)
                    </ContextMenuItem>
                    {onDuplicateRow && (
                      <ContextMenuItem onClick={() => onDuplicateRow(row.original)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Duplicar linha
                      </ContextMenuItem>
                    )}
                    <ContextMenuSeparator />
                    {onDeleteRow && (
                      <>
                        <ContextMenuItem
                          className="text-destructive focus:text-destructive focus:bg-destructive/10"
                          onClick={() => onDeleteRow(row.original)}
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          Apagar linha
                          <ContextMenuShortcut>DEL</ContextMenuShortcut>
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                      </>
                    )}
                    <ContextMenuSub>
                      <ContextMenuSubTrigger>
                        <Columns className="mr-2 h-4 w-4" />
                        Colunas
                      </ContextMenuSubTrigger>
                      <ContextMenuSubContent className="w-48">
                        {table
                          .getAllColumns()
                          .filter((column) => column.getCanHide())
                          // No mobile, colunas forçadas por hideOnMobile saem do
                          // menu: o toggle gravaria no estado base sem efeito
                          // visível (checkbox que "não funciona").
                          .filter((column) => !(isNarrow && (column.columnDef.meta as any)?.hideOnMobile))
                          .map((column) => {
                            return (
                              <ContextMenuCheckboxItem
                                key={column.id}
                                className="capitalize"
                                checked={column.getIsVisible()}
                                onCheckedChange={(value) =>
                                  column.toggleVisibility(!!value)
                                }
                              >
                                {typeof column.columnDef.header === 'string'
                                  ? column.columnDef.header
                                  : column.id}
                              </ContextMenuCheckboxItem>
                            );
                          })}
                      </ContextMenuSubContent>
                    </ContextMenuSub>
                  </ContextMenuContent>
                </ContextMenu>
              ))
            )}
          </TableBody>
          {footer && <TableFooter>{footer}</TableFooter>}
        </table>
      </div>

      {!hidePagination && table.getPageCount() > 1 && (
        <div className="flex items-center justify-between px-2 py-1">
          <div className="flex-1 text-xs text-muted-foreground whitespace-nowrap">
            {table.getFilteredRowModel().rows.length} total • Pág. {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <Button
                variant="outline"
                className="hidden h-7 w-7 p-0 lg:flex"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Primeira página</span>
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-7 w-7 p-0"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Página anterior</span>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-7 w-7 p-0"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Próxima página</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="hidden h-7 w-7 p-0 lg:flex"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Última página</span>
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
            <select
              value={table.getState().pagination.pageSize}
              onChange={e => {
                table.setPageSize(Number(e.target.value))
              }}
              className="h-7 rounded-md border border-input bg-background px-2 py-1 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {[20, 30, 40, 50].map(pageSize => (
                <option key={pageSize} value={pageSize}>
                  {pageSize} / pág
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
