"use client";

import { useState, useEffect } from 'react';
import { supabaseClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

interface KnowledgeBase {
  id: string;
  title: string;
  description: string | null;
  type: string;
  link: string | null;
  created_at: string;
  updated_at: string;
}

export default function KnowledgeBasePage() {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newKnowledgeBase, setNewKnowledgeBase] = useState({
    title: '',
    description: '',
    type: 'link',
    link: ''
  });
  
  const router = useRouter();

  // Load knowledge bases
  useEffect(() => {
    async function loadKnowledgeBases() {
      setLoading(true);
      setError(null);
      
      try {
        const { data, error } = await supabaseClient
          .from('knowledge_bases')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setKnowledgeBases(data || []);
      } catch (err: any) {
        console.error('Error loading knowledge bases:', err);
        setError(err.message || 'Failed to load knowledge bases');
      } finally {
        setLoading(false);
      }
    }
    
    loadKnowledgeBases();
  }, []);

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'MMM d, yyyy h:mm a');
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewKnowledgeBase(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newKnowledgeBase.title || !newKnowledgeBase.type) {
      toast.error('Title and type are required');
      return;
    }
    
    if (newKnowledgeBase.type === 'link' && !newKnowledgeBase.link) {
      toast.error('Link URL is required');
      return;
    }
    
    try {
      const { data, error } = await supabaseClient
        .from('knowledge_bases')
        .insert([
          {
            title: newKnowledgeBase.title,
            description: newKnowledgeBase.description || null,
            type: newKnowledgeBase.type,
            link: newKnowledgeBase.link || null
          }
        ])
        .select();
      
      if (error) throw error;
      
      toast.success('Knowledge base added successfully');
      setShowAddModal(false);
      setNewKnowledgeBase({
        title: '',
        description: '',
        type: 'link',
        link: ''
      });
      
      // Refresh the list
      if (data) {
        setKnowledgeBases(prev => [data[0], ...prev]);
      }
    } catch (err: any) {
      console.error('Error adding knowledge base:', err);
      toast.error(err.message || 'Failed to add knowledge base');
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">AI Agent Knowledge Base</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Add Knowledge Base
        </button>
      </div>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
          <p>{error}</p>
        </div>
      )}
      
      {/* Knowledge Bases List */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow-md">
          {knowledgeBases.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No knowledge bases found. Click "Add Knowledge Base" to create one.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Link
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created At
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {knowledgeBases.map((kb) => (
                  <tr key={kb.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{kb.title}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500">{kb.description || 'No description'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${kb.type === 'link' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                        {kb.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {kb.link ? (
                        <a 
                          href={kb.link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {kb.link.length > 30 ? kb.link.substring(0, 30) + '...' : kb.link}
                        </a>
                      ) : (
                        <span className="text-gray-400">No link</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(kb.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
      
      {/* Add Knowledge Base Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-semibold mb-4">Add Knowledge Base</h2>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="title">
                  Title *
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={newKnowledgeBase.title}
                  onChange={handleInputChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="Enter knowledge base title"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="description">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={newKnowledgeBase.description}
                  onChange={handleInputChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="Enter description (optional)"
                  rows={3}
                ></textarea>
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="type">
                  Type *
                </label>
                <select
                  id="type"
                  name="type"
                  value={newKnowledgeBase.type}
                  onChange={handleInputChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                >
                  <option value="link">Link (URL)</option>
                </select>
              </div>
              
              {newKnowledgeBase.type === 'link' && (
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="link">
                    URL *
                  </label>
                  <input
                    type="url"
                    id="link"
                    name="link"
                    value={newKnowledgeBase.link}
                    onChange={handleInputChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    placeholder="https://example.com"
                    required
                  />
                </div>
              )}
              
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Add Knowledge Base
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
