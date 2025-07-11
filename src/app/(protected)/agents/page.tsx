"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { supabaseClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Search, User, Phone, Mail, Calendar, ArrowUpDown, Plus, Pencil, Trash } from 'lucide-react';
import { toast } from "sonner";

// Define types for our agent data
type Agent = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  title: string | null;
  status: string | null;
  hire_date: string | null;
  metadata: any | null;
  created_at: string;
  updated_at: string | null;
};

// Agent Form Component
const AgentForm = ({ 
  agent, 
  onSubmit, 
  onCancel 
}: { 
  agent?: Agent; 
  onSubmit: (data: Partial<Agent>) => void; 
  onCancel: () => void;
}) => {
  const [formData, setFormData] = useState<Partial<Agent>>(
    agent || {
      name: '',
      email: '',
      phone: '',
      role: '',
      title: '',
      status: 'active',
      hire_date: new Date().toISOString().split('T')[0],
    }
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="mb-4">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name || ''}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
            Phone
          </label>
          <input
            type="text"
            id="phone"
            name="phone"
            value={formData.phone || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Title
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
            Role
          </label>
          <select
            id="role"
            name="role"
            value={formData.role || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Role</option>
            <option value="account_manager">Account Manager</option>
            <option value="support_specialist">Support Specialist</option>
            <option value="sales_representative">Sales Representative</option>
            <option value="manager">Manager</option>
            <option value="admin">Administrator</option>
          </select>
        </div>
        
        <div className="mb-4">
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            id="status"
            name="status"
            value={formData.status || 'active'}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="on_leave">On Leave</option>
          </select>
        </div>
        
        <div className="mb-4">
          <label htmlFor="hire_date" className="block text-sm font-medium text-gray-700 mb-1">
            Hire Date
          </label>
          <input
            type="date"
            id="hire_date"
            name="hire_date"
            value={formData.hire_date ? new Date(formData.hire_date).toISOString().split('T')[0] : ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      
      <div className="flex justify-end space-x-4 mt-6">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
        >
          {agent ? 'Update Agent' : 'Create Agent'}
        </Button>
      </div>
    </form>
  );
};

// Main Agent Page Component
export default function AgentsPage() {
  // Client-side state
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Agent, direction: 'asc' | 'desc' }>({ 
    key: 'name', 
    direction: 'asc' 
  });
  
  const router = useRouter();
  const supabase = supabaseClient;
  
  // Load agents
  const loadAgents = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      
      setAgents(data || []);
    } catch (err: any) {
      console.error('Error loading agents:', err);
      setError(err.message || 'Failed to load agents');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Load agents on component mount
  useEffect(() => {
    loadAgents();
  }, []);
  
  // Create or update agent
  const saveAgent = async (agentData: Partial<Agent>) => {
    try {
      if (editingAgent) {
        // Update existing agent
        const { error } = await supabase
          .from('agents')
          .update({
            ...agentData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingAgent.id);
        
        if (error) throw error;
        
        toast.success('Agent Updated', {
          description: 'The agent has been updated successfully.'
        });
      } else {
        // Create new agent
        const { error } = await supabase
          .from('agents')
          .insert([
            {
              ...agentData,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ]);
        
        if (error) throw error;
        
        toast.success('Agent Created', {
          description: 'The new agent has been created successfully.'
        });
      }
      
      // Reset form state and reload agents
      setShowForm(false);
      setEditingAgent(null);
      await loadAgents();
    } catch (err: any) {
      console.error('Error saving agent:', err);
      toast.error('Error', {
        description: err.message || 'There was an error saving the agent.'
      });
    }
  };
  
  // Delete agent
  const deleteAgent = async (id: string) => {
    try {
      const { error } = await supabase
        .from('agents')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('Agent Deleted', {
        description: 'The agent has been deleted successfully.'
      });
      
      // Reset state and reload agents
      setDeleteConfirmId(null);
      await loadAgents();
    } catch (err: any) {
      console.error('Error deleting agent:', err);
      toast.error('Error', {
        description: err.message || 'There was an error deleting the agent.'
      });
    }
  };
  
  // Sort agents
  const handleSort = (key: keyof Agent) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };
  
  // Filter and sort agents
  const filteredAndSortedAgents = useMemo(() => {
    // First filter by search term
    let result = agents;
    
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      result = result.filter(agent => {
        return (
          (agent.name && agent.name.toLowerCase().includes(lowerSearchTerm)) ||
          (agent.email && agent.email.toLowerCase().includes(lowerSearchTerm)) ||
          (agent.title && agent.title.toLowerCase().includes(lowerSearchTerm)) ||
          (agent.role && agent.role.toLowerCase().includes(lowerSearchTerm))
        );
      });
    }
    
    // Then filter by status
    if (statusFilter !== 'all') {
      result = result.filter(agent => agent.status === statusFilter);
    }
    
    // Then filter by role
    if (roleFilter !== 'all') {
      result = result.filter(agent => agent.role === roleFilter);
    }
    
    // Then sort
    return [...result].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (aValue === null) return sortConfig.direction === 'asc' ? -1 : 1;
      if (bValue === null) return sortConfig.direction === 'asc' ? 1 : -1;
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      
      return 0;
    });
  }, [agents, searchTerm, statusFilter, roleFilter, sortConfig]);
  
  // Generate status badge
  const getStatusBadge = (status: string | null) => {
    if (!status) return <Badge variant="outline">Unknown</Badge>;
    
    switch (status.toLowerCase()) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>;
      case 'on_leave':
        return <Badge className="bg-yellow-100 text-yellow-800">On Leave</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'MMM d, yyyy');
  };
  
  // Get unique agent roles for filter
  const uniqueRoles = useMemo(() => {
    const roles = new Set(agents.map(a => a.role).filter(Boolean) as string[]);
    return Array.from(roles);
  }, [agents]);
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Agents</h1>
        <Button
          onClick={() => {
            setEditingAgent(null);
            setShowForm(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Add New Agent
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Agent Management</CardTitle>
          <CardDescription>View, add, edit, and manage your support agents</CardDescription>
        </CardHeader>
        
        <CardContent>
          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="text"
                placeholder="Search agents..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="on_leave">On Leave</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {uniqueRoles.map(role => (
                  <SelectItem key={role} value={role}>{role.replace('_', ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Agents Table */}
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-10">
              <div className="text-red-500 mb-2">{error}</div>
              <Button onClick={loadAgents}>Try Again</Button>
            </div>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center">
                        Name
                        <ArrowUpDown className="ml-1 h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => handleSort('role')}
                    >
                      <div className="flex items-center">
                        Role / Title
                        <ArrowUpDown className="ml-1 h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center">
                        Status
                        <ArrowUpDown className="ml-1 h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer"
                      onClick={() => handleSort('hire_date')}
                    >
                      <div className="flex items-center">
                        Hire Date
                        <ArrowUpDown className="ml-1 h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                
                <TableBody>
                  {filteredAndSortedAgents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-gray-500">
                        No agents found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAndSortedAgents.map((agent) => (
                      <TableRow key={agent.id}>
                        <TableCell>
                          <div className="flex items-center">
                            <User className="mr-2 h-4 w-4 text-gray-400" />
                            {agent.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {agent.email && (
                              <div className="flex items-center text-sm">
                                <Mail className="mr-1 h-3.5 w-3.5 text-gray-400" />
                                <a href={`mailto:${agent.email}`} className="text-blue-600 hover:underline">
                                  {agent.email}
                                </a>
                              </div>
                            )}
                            {agent.phone && (
                              <div className="flex items-center text-sm">
                                <Phone className="mr-1 h-3.5 w-3.5 text-gray-400" />
                                <a href={`tel:${agent.phone}`} className="text-blue-600 hover:underline">
                                  {agent.phone}
                                </a>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            {agent.title && (
                              <div className="font-medium">{agent.title}</div>
                            )}
                            {agent.role && (
                              <div className="text-sm text-gray-500">{agent.role?.replace('_', ' ') || 'No role'}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(agent.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Calendar className="mr-2 h-4 w-4 text-gray-400" />
                            {formatDate(agent.hire_date)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingAgent(agent);
                                setShowForm(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteConfirmId(agent.id)}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Agent Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingAgent ? 'Edit Agent' : 'Add New Agent'}</DialogTitle>
            <DialogDescription>
              {editingAgent 
                ? 'Update the details for this agent.' 
                : 'Create a new agent by filling out the form below.'}
            </DialogDescription>
          </DialogHeader>
          
          <AgentForm 
            agent={editingAgent || undefined}
            onSubmit={saveAgent}
            onCancel={() => {
              setShowForm(false);
              setEditingAgent(null);
            }}
          />
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this agent? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmId(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && deleteAgent(deleteConfirmId)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
