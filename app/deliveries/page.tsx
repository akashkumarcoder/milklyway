'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { db } from '@/lib/firebase';
import {
  collection,
  where,
  addDoc,
  Timestamp,
  orderBy,
  limit,
} from 'firebase/firestore';
import { useFirestore } from '@/hooks/useFirestore';
import type { Client, Delivery } from '@/types';
import { format } from 'date-fns';
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { CalendarIcon, Loader2, Truck, IndianRupee } from "lucide-react";
import { cn } from "@/lib/utils";

// Quantity options up to 5 liters in 0.25L increments
const QUANTITY_OPTIONS = Array.from({ length: 21 }, (_, i) => i * 0.25);

const Deliveries = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [deliveries, setDeliveries] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Load all clients in realtime, filter/sort client-side to avoid index requirements
  const { data: allClients, loading: loadingClients } = useFirestore<Client>(
    'clients',
    [],
    { cacheKey: 'clients_list', cacheDuration: 1, realtime: true }
  );
  const clients = allClients
    .filter(c => c.active !== false)
    .sort((a, b) => a.name.localeCompare(b.name));

  // Use our custom hook with caching for current price
  const { data: prices, loading: loadingPrices } = useFirestore(
    'prices',
    [where('endDate', '==', null), limit(1)],
    { cacheKey: 'current_price', cacheDuration: 5 }
  );

  const currentPrice = prices[0];

  // Use our custom hook for today's deliveries
  const startOfDay = new Date(selectedDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(selectedDate);
  endOfDay.setHours(23, 59, 59, 999);

  const { data: existingDeliveries, loading: loadingDeliveries } = useFirestore<Delivery>(
    'deliveries',
    [
      where('date', '>=', Timestamp.fromDate(startOfDay)),
      where('date', '<', Timestamp.fromDate(endOfDay))
    ],
    {
      cacheKey: `deliveries_${format(selectedDate, 'yyyy-MM-dd')}`,
      cacheDuration: 5
    }
  );

  // Set initial deliveries from existing data
  useEffect(() => {
    const initialDeliveries: Record<string, number> = {};
    existingDeliveries.forEach(delivery => {
      initialDeliveries[delivery.clientId] = delivery.quantity;
    });
    setDeliveries(initialDeliveries);
  }, [existingDeliveries]);

  const handleQuantityChange = (clientId: string, quantity: number) => {
    setDeliveries(prev => ({
      ...prev,
      [clientId]: quantity
    }));
  };

  const handleSave = async () => {
    if (!currentPrice) {
      toast({
        title: "Error",
        description: "No active price found. Please set a price first.",
        variant: "destructive"
      });
      return;
    }

    try {
      setSaving(true);
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);

      // Save deliveries for each client
      const savePromises = Object.entries(deliveries).map(([clientId, quantity]) => {
        if (quantity > 0) {
          return addDoc(collection(db, 'deliveries'), {
            clientId,
            date: Timestamp.fromDate(startOfDay),
            quantity,
            priceId: currentPrice.id,
          });
        }
        return Promise.resolve();
      });

      await Promise.all(savePromises);

      toast({
        title: "Success",
        description: "Deliveries saved successfully."
      });

      // Clear cache to force refresh
      sessionStorage.removeItem(`deliveries_${format(selectedDate, 'yyyy-MM-dd')}`);
      
      // Reset deliveries
      setDeliveries({});
    } catch (error) {
      console.error('Error saving deliveries:', error);
      toast({
        title: "Error",
        description: "Failed to save deliveries.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const loading = loadingClients || loadingPrices || loadingDeliveries;

  return (
    <Layout>
      <div className="space-y-8 px-4 md:px-8 py-6 max-w-7xl mx-auto">
        <div className="bg-gradient-to-r from-slate-100 to-blue-50 rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100">
          <div className="text-center md:text-left space-y-3">
            <div className="inline-block px-4 py-1 bg-blue-50 rounded-full text-blue-700 text-sm font-medium mb-2">
              Daily Deliveries
            </div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                  Record Deliveries
                </h1>
                <p className="text-slate-600 text-lg mt-2">
                  Enter milk deliveries for {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal w-[240px]",
                        !selectedDate && "text-muted-foreground"
                      )}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-slate-500" />
                      {selectedDate ? (
                        format(selectedDate, "EEEE, MMMM d")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent 
                    className="w-auto p-0" 
                    align="start"
                    onInteractOutside={(e) => e.preventDefault()}
                  >
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      initialFocus
                      disabled={(date) => date > new Date()}
                    />
                  </PopoverContent>
                </Popover>
                <Button
                  onClick={handleSave}
                  disabled={saving || !currentPrice || loading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Truck className="mr-2 h-4 w-4" />
                      Save Deliveries
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {!currentPrice && !loading && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-yellow-400">⚠️</span>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  No active price set. Please set a price before recording deliveries.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead className="font-semibold">Client Name</TableHead>
                <TableHead className="font-semibold">Quantity (Liters)</TableHead>
                {currentPrice && <TableHead className="font-semibold">Amount (₹)</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : clients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8">
                    <div className="flex flex-col items-center text-slate-500">
                      <Truck className="h-8 w-8 mb-2" />
                      <p>No active clients found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                clients.map((client) => (
                  <TableRow key={client.id || client.name} className="hover:bg-slate-50/50">
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>
                      <Select
                        value={String(deliveries[client.id!] || 0)}
                        onValueChange={(value) => 
                          handleQuantityChange(client.id!, parseFloat(value))
                        }
                        onOpenChange={(open) => {
                          if (open) {
                            // Prevent event propagation when opening select
                            event?.stopPropagation();
                          }
                        }}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent 
                          onCloseAutoFocus={(e) => e.preventDefault()}
                        >
                          {QUANTITY_OPTIONS.map((qty) => (
                            <SelectItem 
                              key={qty} 
                              value={String(qty)}
                              onSelect={(e) => e.preventDefault()}
                            >
                              {qty}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    {currentPrice && (
                      <TableCell className="text-slate-600">
                        <div className="flex items-center">
                          <IndianRupee className="h-4 w-4 mr-1 text-slate-400" />
                          {((deliveries[client.id!] || 0) * currentPrice.amount).toFixed(2)}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving || !currentPrice || loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Truck className="mr-2 h-4 w-4" />
                Save Deliveries
              </>
            )}
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default Deliveries;