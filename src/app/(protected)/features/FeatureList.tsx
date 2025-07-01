'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type Feature = {
  id: string;
  feature_name: string;
  category?: string;
  description?: string;
  product?: string;
  use_case?: string;
};

type AddFormType = {
  product: string;
  feature_name: string;
  description: string;
  category: string;
  use_case: string;
  integration_type: string;
  instructions_tags: string[];
  value_proposition: string;
  behaviour: string;
  snippets: string[];
};

const PRODUCT_OPTIONS = ['flytbase', 'air', 'verkos'];

export default function FeatureList() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const selectedId = pathname.split('/').pop();
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState<AddFormType>({
    product: '',
    feature_name: '',
    description: '',
    category: '',
    use_case: '',
    integration_type: '',
    instructions_tags: [],
    value_proposition: '',
    behaviour: '',
    snippets: [],
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const tagInputRef = useRef<HTMLInputElement>(null);
  const snippetInputRef = useRef<HTMLInputElement>(null);

  // Move fetchFeatures out so it can be reused
  async function fetchFeatures() {
    setLoading(true);
    const { data } = await supabase
      .from('features')
      .select('id,feature_name,category,description,product,use_case')
      .order('category', { ascending: true })
      .order('feature_name', { ascending: true });
    setFeatures(data || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchFeatures();
  }, []);

  async function handleAddFeature(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAddLoading(true);
    setAddError('');
    if (!addForm.product || !addForm.feature_name) {
      setAddError('Product and Feature Name are required.');
      setAddLoading(false);
      return;
    }
    const { error } = await supabase.from('features').insert({
      ...addForm,
      instructions_tags: addForm.instructions_tags.length ? addForm.instructions_tags : null,
      snippets: addForm.snippets.length ? addForm.snippets : null,
    });
    if (error) {
      setAddError(error.message);
      setAddLoading(false);
      return;
    }
    setShowAddModal(false);
    setAddForm({
      product: '',
      feature_name: '',
      description: '',
      category: '',
      use_case: '',
      integration_type: '',
      instructions_tags: [],
      value_proposition: '',
      behaviour: '',
      snippets: [],
    });
    setAddLoading(false);
    await fetchFeatures();
  }

  function handleAddTag(e: React.FormEvent<HTMLButtonElement>) {
    e.preventDefault();
    const value = tagInputRef.current?.value.trim() ?? '';
    if (!value || addForm.instructions_tags.includes(value)) return;
    setAddForm(f => ({ ...f, instructions_tags: [...f.instructions_tags, value] }));
    if (tagInputRef.current) tagInputRef.current.value = '';
  }
  function handleRemoveTag(tag: string) {
    setAddForm(f => ({ ...f, instructions_tags: f.instructions_tags.filter(t => t !== tag) }));
  }
  function handleAddSnippet(e: React.FormEvent<HTMLButtonElement>) {
    e.preventDefault();
    const value = snippetInputRef.current?.value.trim() ?? '';
    if (!value || addForm.snippets.includes(value)) return;
    setAddForm(f => ({ ...f, snippets: [...f.snippets, value] }));
    if (snippetInputRef.current) snippetInputRef.current.value = '';
  }
  function handleRemoveSnippet(snippet: string) {
    setAddForm(f => ({ ...f, snippets: f.snippets.filter(s => s !== snippet) }));
  }

  const formatDate = (id: string) => {
    // Simple date formatting - you can customize this based on your needs
    return new Date().toLocaleDateString();
  };

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="w-full h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Features</h1>
            <p className="text-sm text-gray-600 mt-1">View and manage feature configurations</p>
          </div>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            onClick={() => setShowAddModal(true)}
          >
            + Add Feature
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white border-b px-6 py-3">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search features..."
              className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>All Categories</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white mx-6 mt-4 rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Feature Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {features.map((feature, index) => (
              <tr 
                key={feature.id}
                className={`hover:bg-gray-50 cursor-pointer ${
                  selectedId === feature.id ? 'bg-blue-50' : ''
                }`}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
                    {formatDate(feature.id)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link href={`/features/${feature.id}`} className="text-blue-600 hover:text-blue-800">
                    {feature.feature_name}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {feature.product || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {feature.category || 'Uncategorized'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                  {feature.description || 'No description available'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    index % 3 === 0 ? 'bg-green-100 text-green-800' :
                    index % 3 === 1 ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {index % 3 === 0 ? 'Active' : index % 3 === 1 ? 'Pending' : 'Draft'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div
            className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg relative max-h-[90vh] overflow-y-auto"
          >
            <button
              type="button"
              className="absolute top-2 right-2 text-2xl text-gray-400 hover:text-black"
              onClick={() => setShowAddModal(false)}
              aria-label="Close"
            >&times;</button>
            <h3 className="text-lg font-bold mb-4">Add Feature</h3>
            {addError && <div className="text-red-600 mb-2">{addError}</div>}
            
            <div className="space-y-4">
              <div>
                <label className="block font-medium mb-1">Product *</label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={addForm.product}
                  onChange={e => setAddForm(f => ({ ...f, product: e.target.value }))}
                  required
                >
                  <option value="">Select product</option>
                  {PRODUCT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              
              <div>
                <label className="block font-medium mb-1">Feature Name *</label>
                <input
                  className="w-full border rounded px-3 py-2"
                  value={addForm.feature_name}
                  onChange={e => setAddForm(f => ({ ...f, feature_name: e.target.value }))}
                  required
                />
              </div>
              
              <div>
                <label className="block font-medium mb-1">Description</label>
                <textarea
                  className="w-full border rounded px-3 py-2"
                  value={addForm.description}
                  onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                />
              </div>
              
              <div>
                <label className="block font-medium mb-1">Category</label>
                <input
                  className="w-full border rounded px-3 py-2"
                  value={addForm.category}
                  onChange={e => setAddForm(f => ({ ...f, category: e.target.value }))}
                />
              </div>
              
              <div>
                <label className="block font-medium mb-1">Use Case</label>
                <input
                  className="w-full border rounded px-3 py-2"
                  value={addForm.use_case}
                  onChange={e => setAddForm(f => ({ ...f, use_case: e.target.value }))}
                />
              </div>
              
              <div>
                <label className="block font-medium mb-1">Integration Type</label>
                <input
                  className="w-full border rounded px-3 py-2"
                  value={addForm.integration_type}
                  onChange={e => setAddForm(f => ({ ...f, integration_type: e.target.value }))}
                />
              </div>
              
              <div>
                <label className="block font-medium mb-1">Instructions Tags</label>
                <div className="flex gap-2 mb-2">
                  <input ref={tagInputRef} className="flex-1 border rounded px-3 py-2" placeholder="Add tag" />
                  <button type="button" className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300" onClick={handleAddTag}>Add</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {addForm.instructions_tags.map(tag => (
                    <span key={tag} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm flex items-center gap-1">
                      {tag}
                      <button type="button" className="ml-1 text-xs" onClick={() => handleRemoveTag(tag)}>&times;</button>
                    </span>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block font-medium mb-1">Value Proposition</label>
                <textarea
                  className="w-full border rounded px-3 py-2"
                  value={addForm.value_proposition}
                  onChange={e => setAddForm(f => ({ ...f, value_proposition: e.target.value }))}
                  rows={3}
                />
              </div>
              
              <div>
                <label className="block font-medium mb-1">Behaviour</label>
                <textarea
                  className="w-full border rounded px-3 py-2"
                  value={addForm.behaviour}
                  onChange={e => setAddForm(f => ({ ...f, behaviour: e.target.value }))}
                  rows={3}
                />
              </div>
              
              <div>
                <label className="block font-medium mb-1">Snippets</label>
                <div className="flex gap-2 mb-2">
                  <input ref={snippetInputRef} className="flex-1 border rounded px-3 py-2" placeholder="Add snippet" />
                  <button type="button" className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300" onClick={handleAddSnippet}>Add</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {addForm.snippets.map(snippet => (
                    <span key={snippet} className="bg-green-100 text-green-700 px-2 py-1 rounded text-sm flex items-center gap-1">
                      {snippet}
                      <button type="button" className="ml-1 text-xs" onClick={() => handleRemoveSnippet(snippet)}>&times;</button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
            
            <button
              type="button"
              className="w-full mt-6 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700"
              disabled={addLoading}
              onClick={(e) => {
                e.preventDefault();
                handleAddFeature(e as any);
              }}
            >
              {addLoading ? 'Adding...' : 'Add Feature'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}