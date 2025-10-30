'use client';

import { useState, useCallback, useMemo } from 'react';
import Layout from '@/components/Layout';
import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  deleteDoc,
  query,
  orderBy
} from 'firebase/firestore';
import { useFirestore } from '@/hooks/useFirestore';
import { Client } from '@/types';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { Search, Plus, Users, Edit2, Trash2 } from 'lucide-react';

const Clients = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentClient, setCurrentClient] = useState<Partial<Client>>({});
  const { toast } = useToast();

  // Use our custom hook with caching
  const { data: clients, loading, error } = useFirestore<Client>(
    'clients',
    [orderBy('name')],
    { cacheKey: 'clients_list', cacheDuration: 5 }
  );

  const filteredClients = useMemo(() => 
    clients.filter(client =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone.includes(searchTerm)
    ),
    [clients, searchTerm]
  );

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (currentClient.id) {
        // Update existing client
        await updateDoc(doc(db, 'clients', currentClient.id), {
          name: currentClient.name,
          address: currentClient.address,
          phone: currentClient.phone,
          active: currentClient.active
        });
        toast({
          title: "Success",
          description: "Client updated successfully",
        });
      } else {
        // Add new client
        await addDoc(collection(db, 'clients'), {
          name: currentClient.name,
          address: currentClient.address,
          phone: currentClient.phone,
          active: true
        });
        toast({
          title: "Success",
          description: "New client added successfully",
        });
      }
      setIsDialogOpen(false);
      setCurrentClient({});
      // Clear cache to force refresh across pages
      sessionStorage.removeItem('clients_list');
      sessionStorage.removeItem('active_clients');
      window.location.reload();
    } catch (error) {
      console.error('Error saving client:', error);
      toast({
        title: "Error",
        description: "Failed to save client information",
        variant: "destructive"
      });
    }
  }, [currentClient, toast]);

  const handleDelete = useCallback(async (clientId: string) => {
    if (window.confirm('Are you sure you want to delete this client?')) {
      try {
        await deleteDoc(doc(db, 'clients', clientId));
        toast({
          title: "Success",
          description: "Client deleted successfully",
        });
        // Clear cache to force refresh across pages
        sessionStorage.removeItem('clients_list');
        sessionStorage.removeItem('active_clients');
        window.location.reload();
      } catch (error) {
        console.error('Error deleting client:', error);
        toast({
          title: "Error",
          description: "Failed to delete client",
          variant: "destructive"
        });
      }
    }
  }, [toast]);

  const handleFieldChange = useCallback((field: string, value: any) => {
    setCurrentClient(prev => ({ ...prev, [field]: value }));
  }, []);

  if (error) {
    return (
      <Layout>
        <div className="text-red-500">Error loading clients: {error.message}</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8 px-4 md:px-8 py-6 max-w-7xl mx-auto">
        <div className="bg-gradient-to-r from-slate-100 to-blue-50 rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100">
          <div className="text-center md:text-left space-y-3">
            <div className="inline-block px-4 py-1 bg-blue-50 rounded-full text-blue-700 text-sm font-medium mb-2">
              Client Management
            </div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                  Manage Clients
                </h1>
                <p className="text-slate-600 text-lg mt-2">
                  Add, edit, or manage your client information
                </p>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    onClick={() => setCurrentClient({})}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add New Client
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader className="space-y-3 pb-2">
                    <DialogTitle className="text-2xl font-semibold">
                      {currentClient.id ? 'Edit Client' : 'Add New Client'}
                    </DialogTitle>
                    <p className="text-sm text-slate-500">
                      {currentClient.id 
                        ? 'Update the client information below'
                        : 'Fill in the client information below'}
                    </p>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="bg-slate-50/50 rounded-lg p-6 space-y-4 border border-slate-100">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-medium text-slate-700">
                          Client Name
                        </Label>
                        <Input
                          id="name"
                          value={currentClient.name || ''}
                          onChange={(e) => handleFieldChange('name', e.target.value)}
                          className="w-full bg-white focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter client name"
                          autoComplete="off"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-sm font-medium text-slate-700">
                          Phone Number
                        </Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={currentClient.phone || ''}
                          onChange={(e) => handleFieldChange('phone', e.target.value)}
                          className="w-full bg-white focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter phone number"
                          autoComplete="off"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="address" className="text-sm font-medium text-slate-700">
                          Address
                        </Label>
                        <Input
                          id="address"
                          value={currentClient.address || ''}
                          onChange={(e) => handleFieldChange('address', e.target.value)}
                          className="w-full bg-white focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter address"
                          autoComplete="off"
                          required
                        />
                      </div>
                      {currentClient.id && (
                        <div className="flex items-center justify-between pt-2">
                          <Label htmlFor="active" className="text-sm font-medium text-slate-700">
                            Active Status
                          </Label>
                          <Switch
                            id="active"
                            checked={currentClient.active}
                            onCheckedChange={(checked) => handleFieldChange('active', checked)}
                            className="data-[state=checked]:bg-green-500"
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                        className="px-4 hover:bg-slate-100"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit"
                        className="px-4 bg-blue-600 hover:bg-blue-700"
                      >
                        {currentClient.id ? 'Update' : 'Add'} Client
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 bg-white p-4 rounded-lg border border-slate-200">
          <Search className="h-5 w-5 text-slate-400" />
          <Input
            placeholder="Search by name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
            autoComplete="off"
          />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead className="font-semibold">Name</TableHead>
                <TableHead className="font-semibold">Phone</TableHead>
                <TableHead className="font-semibold">Address</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="text-right font-semibold">Actions</TableHead>
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
              ) : filteredClients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="flex flex-col items-center text-slate-500">
                      <Users className="h-8 w-8 mb-2" />
                      <p>No clients found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredClients.map((client) => (
                  <TableRow key={client.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>{client.phone}</TableCell>
                    <TableCell>{client.address}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          client.active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {client.active ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setCurrentClient(client);
                            setIsDialogOpen(true);
                          }}
                          className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(client.id)}
                          className="text-red-600 hover:text-red-900 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </Layout>
  );
};

export default Clients;