'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  orderBy,
} from 'firebase/firestore';
import { Client, Delivery, Price } from '@/types';
import { toDate } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Button } from "@/components/ui/button";
import { Calculator, FileDown, Calendar as CalendarIcon } from "lucide-react";

interface DeliveryWithPrice extends Delivery {
  price: number;
}

interface ClientSummary {
  id: string;
  name: string;
  totalQuantity: number;
  totalAmount: number;
  deliveries: DeliveryWithPrice[];
}

const Calculations = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [prices, setPrices] = useState<Price[]>([]);
  const [summaries, setSummaries] = useState<ClientSummary[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch all clients
      const clientsSnapshot = await getDocs(collection(db, 'clients'));
      const clientsData = clientsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Client[];
      // Filter active and sort client-side
      const activeClients = clientsData
        .filter(c => (c as any).active !== false)
        .sort((a, b) => a.name.localeCompare(b.name));
      setClients(activeClients);

      // Fetch all prices (no orderBy to avoid index requirement)
      const pricesSnapshot = await getDocs(collection(db, 'prices'));
      const pricesData = pricesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        startDate: toDate(doc.data().startDate),
        endDate: doc.data().endDate ? toDate(doc.data().endDate) : null,
      })) as Price[];
      // Sort by startDate desc client-side
      pricesData.sort((a, b) => (b.startDate as Date).getTime() - (a.startDate as Date).getTime());
      setPrices(pricesData);

      // Calculate date range
      const start = startOfMonth(selectedMonth);
      const end = endOfMonth(selectedMonth);

      // Fetch deliveries for the month
      const deliveriesQuery = query(
        collection(db, 'deliveries'),
        where('date', '>=', Timestamp.fromDate(start)),
        where('date', '<=', Timestamp.fromDate(end)),
        orderBy('date')
      );
      const deliveriesSnapshot = await getDocs(deliveriesQuery);
      
      // Process deliveries and calculate summaries
      const clientSummaries: ClientSummary[] = clientsData.map((client) => ({
        id: client.id!,
        name: client.name,
        totalQuantity: 0,
        totalAmount: 0,
        deliveries: [],
      }));

      // First, collect all deliveries and deduplicate by client+date+milkType
      // If there are duplicates (from before we fixed replacement logic), keep only the most recent one
      const deliveriesByKey = new Map<string, DeliveryWithPrice & { docId: string; sortKey: number }>();
      
      deliveriesSnapshot.docs.forEach((doc) => {
        const delivery = doc.data() as Delivery;
        const clientSummary = clientSummaries.find((s) => s.id === delivery.clientId);
        if (!clientSummary) return;

        const deliveryDate = (delivery as any).date?.toDate
          ? (delivery as any).date.toDate()
          : toDate((delivery as any).date);

        const deliveryMilkType = delivery.milkType || 'cow';
        
        // Create a unique key: clientId + date (normalized to start of day) + milkType
        const dateKey = format(deliveryDate, 'yyyy-MM-dd');
        const uniqueKey = `${delivery.clientId}:${dateKey}:${deliveryMilkType}`;
        
        const applicablePrice = prices.find((p) => {
          const start = toDate(p.startDate as any);
          const end = p.endDate ? toDate(p.endDate as any) : null;
          const priceMilkType = p.milkType || 'cow';
          return (
            priceMilkType === deliveryMilkType &&
            deliveryDate >= start && 
            (!end || deliveryDate <= end)
          );
        });

        const priceAmount = applicablePrice?.amount ?? delivery.priceAtDelivery ?? 0;

        // Get createdAt timestamp for sorting (prefer createdAt, fallback to date, then doc.id)
        const createdAt = doc.data().createdAt 
          ? ((doc.data().createdAt as any)?.toDate ? (doc.data().createdAt as any).toDate() : doc.data().createdAt)
          : deliveryDate;

        const deliveryWithPrice = {
          ...(delivery as any),
          date: deliveryDate,
          price: priceAmount,
          docId: doc.id,
          sortKey: createdAt.getTime ? createdAt.getTime() : new Date(createdAt).getTime(),
        } as DeliveryWithPrice & { docId: string; sortKey: number };

        // If we already have a delivery for this key, keep the most recent one (by sortKey, then doc.id)
        const existing = deliveriesByKey.get(uniqueKey);
        if (!existing) {
          deliveriesByKey.set(uniqueKey, deliveryWithPrice);
        } else {
          // Compare by sortKey (timestamp), then by doc.id as tiebreaker
          const existingSortKey = existing.sortKey;
          const newSortKey = deliveryWithPrice.sortKey;
          if (newSortKey > existingSortKey || (newSortKey === existingSortKey && doc.id > existing.docId)) {
            deliveriesByKey.set(uniqueKey, deliveryWithPrice);
          }
        }
      });

      // Now process the deduplicated deliveries
      deliveriesByKey.forEach((delivery) => {
        const clientSummary = clientSummaries.find((s) => s.id === delivery.clientId);
        if (!clientSummary) return;

        clientSummary.deliveries.push(delivery);
        clientSummary.totalQuantity += delivery.quantity;
        clientSummary.totalAmount += delivery.quantity * delivery.price;
      });

      // Sort deliveries by date for each client summary
      clientSummaries.forEach((summary) => {
        summary.deliveries.sort((a, b) => a.date.getTime() - b.date.getTime());
      });

      setSummaries(clientSummaries);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = async () => {
    try {
      setGenerating(true);
      const doc = new jsPDF();

      // Add title
      doc.setFontSize(16);
      doc.text(
        `Monthly Statement - ${format(selectedMonth, 'MMMM yyyy')}`,
        20,
        20
      );

      // Generate summary table
      const summaryData = summaries
        .filter((summary) => summary.totalQuantity > 0)
        .map((summary) => [
          summary.name,
          summary.totalQuantity.toString(),
          `₹${summary.totalAmount.toFixed(2)}`,
        ]);

      (doc as any).autoTable({
        startY: 30,
        head: [['Client Name', 'Total Quantity (L)', 'Total Amount']],
        body: summaryData,
      });

      // Generate detailed tables for each client
      let yPos = (doc as any).lastAutoTable?.finalY || 30;

      for (const summary of summaries) {
        if (summary.totalQuantity > 0) {
          // Add space between tables
          yPos += 15;

          // Check if we need a new page
          if (yPos > 250) {
            doc.addPage();
            yPos = 20;
          }

          // Add client name as subtitle
          doc.setFontSize(12);
          doc.text(`${summary.name} - Detailed Statement`, 20, yPos);

          // Generate detailed table
          const detailData = summary.deliveries.map((delivery) => [
            format(delivery.date, 'dd/MM/yyyy'),
            delivery.quantity.toString(),
            `₹${delivery.price.toFixed(2)}`,
            `₹${(delivery.quantity * delivery.price).toFixed(2)}`,
          ]);

          (doc as any).autoTable({
            startY: yPos + 5,
            head: [['Date', 'Quantity (L)', 'Rate', 'Amount']],
            body: detailData,
          });

          yPos = (doc as any).lastAutoTable?.finalY || yPos;
        }
      }

      // Save the PDF
      doc.save(`milk-statement-${format(selectedMonth, 'yyyy-MM')}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      setError('Failed to generate PDF');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-8 px-4 md:px-8 py-6 max-w-7xl mx-auto">
        <div className="bg-gradient-to-r from-slate-100 to-blue-50 rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-4 py-1 bg-blue-50 rounded-full text-blue-700 text-sm font-medium">
                <Calculator className="h-4 w-4" />
                Monthly Calculations
              </div>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                Statements and Totals
              </h1>
              <p className="text-slate-600 text-lg">Review monthly quantities and amounts per client.</p>
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
              <Button
                onClick={generatePDF}
                disabled={generating || loading || summaries.length === 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {generating ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <FileDown className="mr-2 h-4 w-4" />
                    Export PDF
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-md">{error}</div>
        )}

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex items-center space-x-2 text-slate-600">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-600" />
              <span>Loading calculations...</span>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Summary Table */}
            <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-slate-100">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Client Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Total Quantity (L)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Total Amount (₹)
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {summaries.filter((s) => s.totalQuantity > 0).length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-10 text-center text-slate-500">
                        No data for {format(selectedMonth, 'MMMM yyyy')}.
                      </td>
                    </tr>
                  ) : (
                    summaries
                      .filter((summary) => summary.totalQuantity > 0)
                      .map((summary) => (
                        <tr key={summary.id} className="hover:bg-slate-50/50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{summary.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{summary.totalQuantity}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">₹{summary.totalAmount.toFixed(2)}</td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Detailed Tables */}
            {summaries
              .filter((summary) => summary.totalQuantity > 0)
              .map((summary) => (
                <div key={summary.id} className="bg-white shadow-sm rounded-xl overflow-hidden border border-slate-100">
                  <div className="px-6 py-4 border-b border-slate-100">
                    <h2 className="text-lg font-semibold text-slate-900">{summary.name} - Detailed Statement</h2>
                  </div>
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Quantity (L)
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Rate (₹)
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Amount (₹)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                      {summary.deliveries.map((delivery, index) => (
                        <tr key={index} className="hover:bg-slate-50/50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                            {format(delivery.date, 'dd/MM/yyyy')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                            {delivery.quantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                            ₹{delivery.price.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                            ₹{(delivery.quantity * delivery.price).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Calculations;
