'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  query,
  orderBy,
  Timestamp,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { useFirestore } from '@/hooks/useFirestore';
import type { Price } from '@/types';
import { format } from 'date-fns';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { 
  DollarSign, 
  Plus, 
  TrendingUp, 
  Calendar, 
  CheckCircle, 
  Clock,
  IndianRupee,
  Loader2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toDate } from "@/lib/utils";

const Prices = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPrice, setNewPrice] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Use our custom hook with caching for prices
  const { data: rawPrices, loading, error, refetch } = useFirestore<Price>(
    'prices',
    [], // No constraints to avoid index requirements
    { cacheKey: 'milk_prices', cacheDuration: 5 }
  );

  // Sort prices by startDate on the client side
  const prices = rawPrices.sort((a, b) => {
    try {
      const dateA = a.startDate?.toDate ? a.startDate.toDate() : toDate(a.startDate);
      const dateB = b.startDate?.toDate ? b.startDate.toDate() : toDate(b.startDate);
      return dateB.getTime() - dateA.getTime();
    } catch (error) {
      console.warn('Error sorting prices:', error);
      return 0;
    }
  });

  const currentPrice = prices.find(price => !price.endDate);
  const historicalPrices = prices.filter(price => price.endDate);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPrice <= 0) {
      toast({
        title: "Invalid Price",
        description: "Please enter a valid price greater than 0.",
        variant: "destructive"
      });
      return;
    }

    try {
      setSaving(true);
      console.log('Starting price update process...');

      // Update the end date of the current active price
      if (currentPrice) {
        console.log('Updating current price end date...', currentPrice.id);
        await updateDoc(doc(db, 'prices', currentPrice.id!), {
          endDate: Timestamp.now(),
        });
        console.log('Current price end date updated successfully');
      }

      // Add new price
      console.log('Adding new price...', newPrice);
      const newPriceData = {
        amount: newPrice,
        startDate: Timestamp.now(),
        endDate: null,
      };
      console.log('New price data:', newPriceData);
      
      const docRef = await addDoc(collection(db, 'prices'), newPriceData);
      console.log('New price added with ID:', docRef.id);

      toast({
        title: "Success",
        description: "New price has been set successfully."
      });

      setIsModalOpen(false);
      setNewPrice(0);
      refetch();
    } catch (error: any) {
      console.error('Error saving price:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      let errorMessage = "Failed to save price. Please try again.";
      
      if (error.code === 'permission-denied') {
        errorMessage = "Permission denied. Please check your Firebase security rules.";
      } else if (error.code === 'unavailable') {
        errorMessage = "Service temporarily unavailable. Please try again later.";
      } else if (error.code === 'unauthenticated') {
        errorMessage = "Authentication required. Please log in again.";
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  // Show loading state while data is being fetched
  if (loading) {
    return (
      <Layout>
        <div className="space-y-8 px-4 md:px-8 py-6 max-w-7xl mx-auto">
          <div className="flex h-64 items-center justify-center">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-600" />
              <p className="text-lg text-slate-600">Loading prices...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8 px-4 md:px-8 py-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-100 to-blue-50 rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100">
          <div className="text-center md:text-left space-y-3">
            <div className="inline-block px-4 py-1 bg-blue-50 rounded-full text-blue-700 text-sm font-medium mb-2">
              Price Management
            </div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                  Milk Prices
                </h1>
                <p className="text-slate-600 text-lg mt-2">
                  Manage milk pricing and track price history
                </p>
              </div>
              <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all duration-200">
                    <Plus className="mr-2 h-4 w-4" />
                    Set New Price
                  </Button>
                </DialogTrigger>
                <DialogContent 
                  className="sm:max-w-lg p-0 gap-0 overflow-hidden"
                  onInteractOutside={(e) => e.preventDefault()}
                >
                  {/* Header with gradient background */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-6 border-b border-slate-200">
                    <DialogHeader className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <DollarSign className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <DialogTitle className="text-xl font-semibold text-slate-900">
                            Set New Price
                          </DialogTitle>
                          <DialogDescription className="text-slate-600 mt-1">
                            Enter the new milk price per liter. This will end the current price period.
                          </DialogDescription>
                        </div>
                      </div>
                    </DialogHeader>
                  </div>

                  {/* Form content */}
                  <div className="px-6 py-6 bg-white">
                    <form onSubmit={handleSubmit} className="space-y-6">
                      {/* Current price info */}
                      {currentPrice && (
                        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-slate-700">Current Price</p>
                              <p className="text-xs text-slate-500">
                                Active since {currentPrice.startDate ? format(toDate(currentPrice.startDate), 'MMM d, yyyy') : 'Loading...'}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-slate-900">
                                ₹{currentPrice.amount}
                              </p>
                              <p className="text-xs text-slate-500">per liter</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* New price input */}
                      <div className="space-y-3">
                        <Label htmlFor="price" className="text-sm font-semibold text-slate-700">
                          New Price per Liter
                        </Label>
                        <div className="relative">
                          <IndianRupee className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                          <Input
                            id="price"
                            type="number"
                            step="0.01"
                            value={newPrice || ''}
                            onChange={(e) => setNewPrice(parseFloat(e.target.value) || 0)}
                            className="pl-12 h-12 text-lg font-medium border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                            placeholder="0.00"
                            required
                            min="0"
                            autoComplete="off"
                            autoFocus
                          />
                        </div>
                        <p className="text-xs text-slate-500">
                          Enter the price in rupees (e.g., 45.50)
                        </p>
                      </div>

                      {/* Price change indicator */}
                      {currentPrice && newPrice > 0 && (
                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <TrendingUp className="h-4 w-4 text-blue-600" />
                              <span className="text-sm font-medium text-blue-900">Price Change</span>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-slate-600">₹{currentPrice.amount}</span>
                                <span className="text-slate-400">→</span>
                                <span className="text-lg font-semibold text-blue-900">₹{newPrice}</span>
                              </div>
                              <p className="text-xs text-blue-700">
                                {newPrice > currentPrice.amount ? '+' : ''}
                                {((newPrice - currentPrice.amount) / currentPrice.amount * 100).toFixed(1)}% change
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </form>
                  </div>

                  {/* Footer with action buttons */}
                  <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
                    <DialogFooter className="gap-3 sm:gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsModalOpen(false);
                          setNewPrice(0);
                        }}
                        className="flex-1 sm:flex-none"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={saving || newPrice <= 0}
                        className="bg-blue-600 hover:bg-blue-700 flex-1 sm:flex-none shadow-lg hover:shadow-xl transition-all duration-200"
                        onClick={handleSubmit}
                      >
                        {saving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Setting Price...
                          </>
                        ) : (
                          <>
                            <DollarSign className="mr-2 h-4 w-4" />
                            Set New Price
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Current Price Card */}
        {currentPrice && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-green-900">Current Price</h3>
                  <p className="text-sm text-green-700">
                    Active since {currentPrice.startDate ? format(toDate(currentPrice.startDate), 'MMM d, yyyy') : 'Loading...'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-green-900">
                  ₹{currentPrice.amount}
                </div>
                <div className="text-sm text-green-600">per liter</div>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-red-400">⚠️</span>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Prices Table */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
            <h2 className="text-lg font-semibold text-slate-900">Price History</h2>
            <p className="text-sm text-slate-600 mt-1">
              Complete history of milk price changes
            </p>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead className="font-semibold">Price (₹)</TableHead>
                <TableHead className="font-semibold">Start Date</TableHead>
                <TableHead className="font-semibold">End Date</TableHead>
                <TableHead className="font-semibold">Duration</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : prices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="flex flex-col items-center text-slate-500">
                      <DollarSign className="h-8 w-8 mb-2" />
                      <p>No prices found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                prices.map((price, index) => {
                  let duration = 0;
                  try {
                    const startDate = toDate(price.startDate);
                    const endDate = price.endDate ? toDate(price.endDate) : new Date();
                    duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                  } catch (error) {
                    console.warn('Error calculating duration for price:', price.id, error);
                    duration = 0;
                  }
                  
                  return (
                    <TableRow key={price.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <IndianRupee className="h-4 w-4 text-slate-400" />
                          <span className="text-lg font-semibold">{price.amount}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-slate-400" />
                          {price.startDate ? format(toDate(price.startDate), 'MMM d, yyyy') : 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {price.endDate ? (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-slate-400" />
                            {price.endDate ? format(toDate(price.endDate), 'MMM d, yyyy') : 'N/A'}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-slate-400" />
                          {duration} day{duration !== 1 ? 's' : ''}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={!price.endDate ? "default" : "secondary"}
                          className={!price.endDate 
                            ? "bg-green-100 text-green-800 hover:bg-green-100" 
                            : "bg-slate-100 text-slate-800 hover:bg-slate-100"
                          }
                        >
                          <div className="flex items-center gap-1">
                            {!price.endDate ? (
                              <CheckCircle className="h-3 w-3" />
                            ) : (
                              <Clock className="h-3 w-3" />
                            )}
                            {!price.endDate ? 'Current' : 'Historical'}
                          </div>
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </Layout>
  );
};

export default Prices;