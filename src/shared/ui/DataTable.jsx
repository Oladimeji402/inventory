import EmptyState from './EmptyState';

/**
 * columns: [{ key, header, render?: (row) => node, align?: 'left'|'right' }]
 */
export default function DataTable({ columns, rows, onRowClick, loading = false, skeletonRows = 4, empty }) {
  if (!loading && (!rows || rows.length === 0)) {
    return empty ? <EmptyState {...empty} /> : null;
  }

  return (
    <div className="mx-table-wrap">
      <table className="mx-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={col.align === 'right' ? { textAlign: 'right' } : undefined}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: skeletonRows }).map((_, i) => (
                <tr key={`skeleton-${i}`}>
                  {columns.map((col) => (
                    <td key={col.key}>
                      <span className="mx-skeleton" style={{ display: 'block', height: 14, width: '70%' }} />
                    </td>
                  ))}
                </tr>
              ))
            : rows.map((row, i) => (
                <tr
                  key={row.id ?? i}
                  className={onRowClick ? 'clickable' : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((col) => (
                    <td key={col.key} style={col.align === 'right' ? { textAlign: 'right' } : undefined}>
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
}
