'use client';

import { useMemo, useState } from 'react';
import Layout from '@/components/Layout';
import { useFirestore } from '@/hooks/useFirestore';
import type { Client, Delivery } from '@/types';
import { toDate } from '@/lib/utils';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Calendar as CalendarIcon, History, Download, Filter } from 'lucide-react';

export default function HistoryPage() {
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [search, setSearch] = useState('');

  // Fetch all deliveries and clients; filter client-side for simplicity and to avoid composite indexes
  const { data: deliveries, loading: loadingDeliveries } = useFirestore<Delivery>(
    'deliveries',
    [],
    { cacheKey: 'all_deliveries', cacheDuration: 2 }
  );
  const { data: clients, loading: loadingClients } = useFirestore<Client>(
    'clients',
    [],
    { cacheKey: 'clients_list', cacheDuration: 2, realtime: true }
  );

  const clientMap = useMemo(() => {
    const map: Record<string, Client> = {} as any;
    clients.forEach((c) => {
      map[c.id] = c;
    });
    return map;
  }, [clients]);

  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);

  const rows = useMemo(() => {
    return deliveries
      .map((d) => ({
        ...d,
        dateObj: toDate((d as any).date),
      }))
      .filter((d) => d.dateObj >= monthStart && d.dateObj <= monthEnd)
      .map((d) => ({
        id: (d as any).id,
        date: d.dateObj,
        client: clientMap[d.clientId]?.name || 'Unknown',
        quantity: d.quantity,
        // priceId is stored; we don't refetch price here, but amount column can be omitted or computed elsewhere.
        // Keep amount blank if price unknown for historical rows; this page focuses on listing deliveries.
      }))
      .filter((r) =>
        r.client.toLowerCase().includes(search.toLowerCase()) ||
        format(r.date, 'dd/MM/yyyy').includes(search)
      )
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [deliveries, clientMap, monthStart, monthEnd, search]);

  const loading = loadingClients || loadingDeliveries;

  return (
    <Layout>
      <div className="space-y-8 px-4 md:px-8 py-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-100 to-blue-50 rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-4 py-1 bg-blue-50 rounded-full text-blue-700 text-sm font-medium">
                <History className="h-4 w-4" />
                Delivery History
              </div>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                All Deliveries
              </h1>
              <p className="text-slate-600 text-lg">Browse and filter deliveries for any month.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                  <CalendarIcon className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  type="month"
                  value={format(selectedMonth, 'yyyy-MM')}
                  onChange={(e) => setSelectedMonth(new Date(e.target.value))}
                  className="pl-9 pr-3 py-2 border border-slate-300 rounded-md bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                {format(selectedMonth, 'MMMM yyyy')}
              </Button>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 bg-white p-3 rounded-lg border border-slate-200 w-full md:max-w-sm">
            <svg className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by client or date (dd/mm/yyyy)"
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-slate-100 bg-white overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead className="font-semibold">Date</TableHead>
                <TableHead className="font-semibold">Client</TableHead>
                <TableHead className="font-semibold">Quantity (L)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8">
                    <div className="flex h-12 items-center justify-center gap-2 text-slate-600">
                      <div className="h-6 w-6 animate-spin rounded-full border-4 border-slate-200 border-t-slate-600" />
                      <span>Loading deliveries...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-10 text-slate-500">
                    No deliveries for {format(selectedMonth, 'MMMM yyyy')}.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r, idx) => (
                  <TableRow key={idx} className="hover:bg-slate-50/50">
                    <TableCell className="whitespace-nowrap">{format(r.date, 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.client}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.quantity}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </Layout>
  );
}


