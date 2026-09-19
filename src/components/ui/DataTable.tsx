'use client';
interface Column<T> { key: string; label: string; render?: (row: T) => React.ReactNode; width?: string; }
interface DataTableProps<T> { columns: Column<T>[]; data: T[]; onRowClick?: (row: T) => void; emptyMessage?: string; }

export default function DataTable<T extends Record<string, unknown>>({ columns, data, onRowClick, emptyMessage = 'No data available' }: DataTableProps<T>) {
  if (!data.length) return <p className="text-mist-muted text-sm text-center py-8">{emptyMessage}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>{columns.map(c => (
            <th key={c.key} className="text-left px-3 py-3 text-[0.7rem] text-mist-muted uppercase tracking-wider font-semibold border-b border-white/[0.06]" style={c.width ? { width: c.width } : undefined}>
              {c.label}
            </th>
          ))}</tr>
        </thead>
        <tbody>{data.map((row, i) => (
          <tr key={i} onClick={() => onRowClick?.(row)} className={`border-b border-white/[0.04] hover:bg-orchid/[0.04] transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}>
            {columns.map(c => (
              <td key={c.key} className="px-3 py-3 text-[0.85rem] text-mist">
                {c.render ? c.render(row) : String(row[c.key] ?? '')}
              </td>
            ))}
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}
