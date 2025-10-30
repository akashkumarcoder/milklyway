'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { Users, Truck, IndianRupee, CalendarDays, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const Dashboard = () => {
  const [totalClients, setTotalClients] = useState(0);
  const [todayDeliveries, setTodayDeliveries] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Get total active clients
        const clientsQuery = query(
          collection(db, 'clients'),
          where('active', '==', true)
        );
        const clientsSnapshot = await getDocs(clientsQuery);
        setTotalClients(clientsSnapshot.size);

        // Get today's deliveries and calculate revenue
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const deliveriesQuery = query(
          collection(db, 'deliveries'),
          where('date', '>=', Timestamp.fromDate(today)),
          where('date', '<', Timestamp.fromDate(tomorrow))
        );
        const deliveriesSnapshot = await getDocs(deliveriesQuery);
        setTodayDeliveries(deliveriesSnapshot.size);

        // Calculate total revenue
        let revenue = 0;
        deliveriesSnapshot.docs.forEach(doc => {
          const data = doc.data();
          revenue += (data.quantity || 0) * 50; // Assuming 50 is the price
        });
        setTotalRevenue(revenue);

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'text-blue-600':
        return { bg: 'bg-blue-50', text: 'text-blue-600' };
      case 'text-green-600':
        return { bg: 'bg-green-50', text: 'text-green-600' };
      case 'text-yellow-600':
        return { bg: 'bg-yellow-50', text: 'text-yellow-600' };
      case 'text-purple-600':
        return { bg: 'bg-purple-50', text: 'text-purple-600' };
      default:
        return { bg: 'bg-slate-50', text: 'text-slate-600' };
    }
  };

  const StatCard = ({ 
    title, 
    value, 
    description, 
    icon: Icon,
    loading,
    color = "text-slate-600",
    trend,
  }: { 
    title: string; 
    value: string | number;
    description?: string;
    icon: any;
    loading: boolean;
    color?: string;
    trend?: string;
  }) => {
    const colors = getColorClasses(color);
    
    return (
      <Card className="hover:shadow-lg transition-all duration-200 overflow-hidden bg-white border border-slate-100">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium text-slate-600">
            {title}
          </CardTitle>
          <div className={`p-2.5 rounded-xl ${colors.bg} transition-colors duration-200`}>
            <Icon className={`h-5 w-5 ${colors.text}`} />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-12 w-[100px]" />
          ) : (
            <>
              <div className="flex items-baseline space-x-3">
                <div className="text-2xl font-bold text-slate-900">{value}</div>
                {trend && (
                  <div className="flex items-center text-sm text-green-600">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    {trend}
                  </div>
                )}
              </div>
              {description && (
                <p className="text-sm text-slate-500 mt-2">
                  {description}
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Layout>
      <div className="space-y-8 px-4 md:px-8 py-6 max-w-7xl mx-auto">
        <div className="bg-gradient-to-r from-slate-100 to-blue-50 rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100">
          <div className="text-center md:text-left space-y-3">
            <div className="inline-block px-4 py-1 bg-blue-50 rounded-full text-blue-700 text-sm font-medium mb-2">
              Dashboard Overview
            </div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}!
            </h1>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <p className="text-slate-600 text-lg font-medium">
                Track your dairy business metrics at a glance
              </p>
              <div className="flex items-center justify-center md:justify-end space-x-2 text-sm text-slate-500">
                <CalendarDays className="h-4 w-4" />
                <span>
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Active Clients"
            value={totalClients}
            icon={Users}
            loading={loading}
            color="text-blue-600"
            description="Total active customers"
            trend="+2 this week"
          />
          <StatCard
            title="Today's Deliveries"
            value={todayDeliveries}
            icon={Truck}
            loading={loading}
            color="text-green-600"
            description="Total deliveries completed"
            trend="On track"
          />
          <StatCard
            title="Daily Revenue"
            value={`₹${totalRevenue.toFixed(2)}`}
            icon={IndianRupee}
            loading={loading}
            color="text-yellow-600"
            description="Revenue generated today"
            trend="+8% vs yesterday"
          />
          <StatCard
            title="Monthly Revenue"
            value={`₹${(totalRevenue * 15).toFixed(2)}`}
            icon={CalendarDays}
            loading={loading}
            color="text-purple-600"
            description="Total revenue this month"
            trend="+12% vs last month"
          />
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;

