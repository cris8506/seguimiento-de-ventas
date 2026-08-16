import React, { useState, useEffect } from 'react';
import {
  Search,
  PlusCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Sale } from '../types.js';
import { MetaStatusBadge, HotmartStatusBadge } from '../components/StatusBadge.js';
import { apiFetch } from '../lib/apiClient.js';

interface SalesPageProps {
  onSelectSale: (saleId: string) => void;
  onOpenAddManual: () => void;
  onOpenSync: () => void;
}

export const SalesPage: React.FC<SalesPageProps> = ({
  onSelectSale,
  onOpenAddManual,
  onOpenSync,
}) => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Filters
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (sourceFilter !== 'all') params.append('source', sourceFilter);
      if (statusFilter !== 'all') params.append('metaStatus', statusFilter);
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      params.append('page', String(page));
      params.append('limit', '20');

      const res = await apiFetch(`/api/sales?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSales(data.items || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.warn('Error fetching sales:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [sourceFilter, statusFilter, debouncedSearch, startDate, endDate, page]);

  return (
    <div className="space-y-6">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Libro de Ventas y Conversiones</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {total} {total === 1 ? 'venta registrada en el ledger' : 'ventas registradas en el ledger'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="btn-sales-sync"
            onClick={onOpenSync}
            className="px-3.5 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium flex items-center gap-2 cursor-pointer transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Sincronizar Hotmart</span>
          </button>

          <button
            id="btn-sales-add-manual"
            onClick={onOpenAddManual}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 text-xs font-bold rounded-lg flex items-center gap-2 shadow-xs cursor-pointer transition-colors"
          >
            <PlusCircle className="w-4 h-4 text-slate-900" />
            <span>Agregar venta manual</span>
          </button>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              id="input-sales-search"
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Buscar por ID, email, producto..."
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-slate-800"
            />
          </div>

          {/* Source filter */}
          <div>
            <select
              id="select-sales-source-filter"
              value={sourceFilter}
              onChange={(e) => {
                setSourceFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-slate-800"
            >
              <option value="all">Origen: Todos</option>
              <option value="hotmart">Solo Hotmart</option>
              <option value="manual">Solo Manuales</option>
            </select>
          </div>

          {/* Meta status filter */}
          <div>
            <select
              id="select-sales-meta-filter"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-slate-800"
            >
              <option value="all">Estado Meta: Todos</option>
              <option value="sent">Enviadas a Meta</option>
              <option value="not_sent">No enviadas</option>
              <option value="retry">Reintento pendiente</option>
              <option value="failed">Con error</option>
              <option value="ignored">Ignoradas</option>
            </select>
          </div>

          {/* Date range inputs */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="w-1/2 px-2.5 py-2 border border-slate-200 rounded-lg text-xs text-slate-700"
              placeholder="Desde"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="w-1/2 px-2.5 py-2 border border-slate-200 rounded-lg text-xs text-slate-700"
              placeholder="Hasta"
            />
          </div>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Cargando ventas...</div>
        ) : sales.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-sm font-medium text-slate-600">No se encontraron ventas con los filtros seleccionados.</p>
            <button
              onClick={() => {
                setSourceFilter('all');
                setStatusFilter('all');
                setSearchQuery('');
                setStartDate('');
                setEndDate('');
              }}
              className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-50 cursor-pointer"
            >
              Limpiar filtros
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 uppercase font-bold tracking-wider text-[10px] border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-6">Fecha</th>
                  <th className="py-3.5 px-4">ID / Transacción</th>
                  <th className="py-3.5 px-4">Producto</th>
                  <th className="py-3.5 px-4">Origen</th>
                  <th className="py-3.5 px-4">Cliente</th>
                  <th className="py-3.5 px-4">Valor</th>
                  <th className="py-3.5 px-4">Hotmart</th>
                  <th className="py-3.5 px-4">Estado Meta</th>
                  <th className="py-3.5 px-6 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {sales.map((sale) => (
                  <tr
                    key={sale.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td
                      onClick={() => onSelectSale(sale.id)}
                      className="py-3.5 px-6 text-slate-500 whitespace-nowrap cursor-pointer font-medium"
                    >
                      {new Date(sale.saleDate).toLocaleDateString()}
                    </td>
                    <td
                      onClick={() => onSelectSale(sale.id)}
                      className="py-3.5 px-4 font-mono font-medium text-slate-900 cursor-pointer"
                    >
                      {sale.transactionId || sale.id.slice(0, 12)}
                    </td>
                    <td
                      onClick={() => onSelectSale(sale.id)}
                      className="py-3.5 px-4 font-medium text-slate-900 max-w-[150px] truncate cursor-pointer"
                    >
                      {sale.productName || 'Producto Digital'}
                    </td>
                    <td onClick={() => onSelectSale(sale.id)} className="py-3.5 px-4 cursor-pointer">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-medium capitalize">
                          {sale.source === 'hotmart' ? 'Hotmart' : `Manual (${sale.manualOrigin || 'WSP'})`}
                        </span>
                        {sale.isTest && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            TEST
                          </span>
                        )}
                      </div>
                    </td>
                    <td
                      onClick={() => onSelectSale(sale.id)}
                      className="py-3.5 px-4 font-mono text-[11px] text-slate-600 cursor-pointer"
                    >
                      {sale.buyer.email || sale.buyer.phone || '-'}
                    </td>
                    <td
                      onClick={() => onSelectSale(sale.id)}
                      className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap cursor-pointer"
                    >
                      {sale.amount} {sale.currency}
                    </td>
                    <td onClick={() => onSelectSale(sale.id)} className="py-3.5 px-4 cursor-pointer">
                      <HotmartStatusBadge status={sale.hotmartStatus} />
                    </td>
                    <td onClick={() => onSelectSale(sale.id)} className="py-3.5 px-4 cursor-pointer">
                      <MetaStatusBadge status={sale.metaStatus} duplicateBlocked={sale.duplicateBlocked} />
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <button
                        onClick={() => onSelectSale(sale.id)}
                        className="px-3 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold cursor-pointer transition-colors"
                      >
                        Detalle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50 text-xs">
            <span className="text-slate-500 font-medium">
              Página {page} de {totalPages} ({total} ventas)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
