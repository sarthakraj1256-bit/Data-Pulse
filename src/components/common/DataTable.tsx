import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Search, Eye, Filter } from 'lucide-react';
import { ColumnProfile } from '../../types';

interface DataTableProps {
  records: Record<string, any>[];
  columns: ColumnProfile[];
  title?: string;
  subtitle?: string;
  rawRecords?: Record<string, any>[];
  enableComparison?: boolean;
}

export const DataTable: React.FC<DataTableProps> = ({
  records,
  columns,
  title,
  subtitle,
  rawRecords,
  enableComparison = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [viewMode, setViewMode] = useState<'cleaned' | 'raw' | 'diff'>('cleaned');

  const filteredRecords = useMemo(() => {
    const activeData = viewMode === 'raw' && rawRecords ? rawRecords : records;
    if (!searchTerm.trim()) return activeData;

    const term = searchTerm.toLowerCase();
    return activeData.filter(row => {
      return Object.values(row).some(val => {
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(term);
      });
    });
  }, [records, rawRecords, searchTerm, viewMode]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  return (
    <div className="bg-[#FFF8EF] border border-[#D9A0AE]/30 rounded-2xl overflow-hidden shadow-sm">
      {/* Table Header Controls */}
      <div className="p-4 sm:p-5 border-b border-[#D9A0AE]/30 bg-[#F8EFE5]/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          {title && (
            <h3 className="text-base font-bold text-[#29212A] flex items-center gap-2">
              {title}
              <span className="text-xs font-normal font-mono px-2 py-0.5 rounded-full bg-[#D9A0AE]/20 text-[#641B32]">
                {filteredRecords.length} records
              </span>
            </h3>
          )}
          {subtitle && (
            <p className="text-xs text-[#756772] mt-0.5">{subtitle}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Comparison Mode Toggle */}
          {enableComparison && rawRecords && (
            <div className="flex rounded-lg p-0.5 bg-[#FFF8EF] border border-[#D9A0AE]/30 text-xs">
              <button
                onClick={() => setViewMode('cleaned')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  viewMode === 'cleaned'
                    ? 'bg-[#641B32] text-[#FFF8EF]'
                    : 'text-[#756772] hover:text-[#29212A]'
                }`}
              >
                Cleaned Data
              </button>
              <button
                onClick={() => setViewMode('raw')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  viewMode === 'raw'
                    ? 'bg-[#641B32] text-[#FFF8EF]'
                    : 'text-[#756772] hover:text-[#29212A]'
                }`}
              >
                Raw Snapshot
              </button>
            </div>
          )}

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#756772]" />
            <input
              type="text"
              placeholder="Filter values..."
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="pl-8 pr-3 py-1.5 text-xs bg-[#FFF8EF] border border-[#D9A0AE]/40 rounded-lg text-[#29212A] placeholder-[#756772] focus:outline-none focus:border-[#641B32]"
            />
          </div>

          {/* Page Size */}
          <select
            value={pageSize}
            onChange={e => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="text-xs bg-[#FFF8EF] border border-[#D9A0AE]/40 rounded-lg px-2 py-1.5 text-[#29212A] focus:outline-none focus:border-[#641B32]"
          >
            <option value={10}>10 rows</option>
            <option value={25}>25 rows</option>
            <option value={50}>50 rows</option>
          </select>
        </div>
      </div>

      {/* Table Data Matrix */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#D9A0AE]/30 bg-[#F8EFE5] text-[#29212A]">
              <th className="py-2.5 px-3 font-semibold text-[11px] text-[#756772] w-12 text-center">
                #
              </th>
              {columns.map(col => (
                <th key={col.name} className="py-2.5 px-3 font-semibold text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span>{col.name}</span>
                    <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-[#FFF8EF] text-[#756772] border border-[#D9A0AE]/20 font-mono">
                      {col.inferredType}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D9A0AE]/20 font-mono text-[11px]">
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="py-8 text-center text-[#756772] font-sans">
                  No records match the active criteria.
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, rowIdx) => {
                const globalIndex = (currentPage - 1) * pageSize + rowIdx;
                return (
                  <tr
                    key={rowIdx}
                    className="hover:bg-[#F8EFE5]/60 transition-colors"
                  >
                    <td className="py-2.5 px-3 text-center text-[#756772] text-[10px]">
                      {globalIndex + 1}
                    </td>
                    {columns.map(col => {
                      const val = row[col.name];
                      const isNull = val === null || val === undefined || val === '' || String(val).trim() === '';

                      return (
                        <td key={col.name} className="py-2.5 px-3 max-w-[200px] truncate">
                          {isNull ? (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-[#B4233D]/10 text-[#B4233D] font-sans font-medium">
                              (null)
                            </span>
                          ) : typeof val === 'boolean' ? (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] ${
                                val ? 'bg-[#277A58]/10 text-[#277A58]' : 'bg-[#756772]/10 text-[#756772]'
                              }`}
                            >
                              {String(val)}
                            </span>
                          ) : (
                            <span className="text-[#29212A]">{String(val)}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      <div className="p-3 border-t border-[#D9A0AE]/30 bg-[#F8EFE5]/40 flex items-center justify-between text-xs text-[#756772]">
        <div>
          Showing {filteredRecords.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
          {Math.min(currentPage * pageSize, filteredRecords.length)} of {filteredRecords.length} records
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1 rounded border border-[#D9A0AE]/40 bg-[#FFF8EF] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F8EFE5] transition-colors"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-mono text-xs text-[#29212A]">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1 rounded border border-[#D9A0AE]/40 bg-[#FFF8EF] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F8EFE5] transition-colors"
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
