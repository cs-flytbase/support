'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type Feature = {
  id: string;
  feature_name: string;
  category?: string;
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

  // Group by category
  const grouped = features.reduce<Record<string, Feature[]>>((acc, feature) => {
    const cat = feature.category || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(feature);
    return acc;
  }, {});

  // Move fetchFeatures out so it can be reused
  async function fetchFeatures() {
    setLoading(true);
    const { data } = await supabase
      .from('features')
      .select('id,feature_name,category')
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

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <aside className="w-80 border-r h-full overflow-y-auto bg-white">
      <div className="flex items-center justify-between p-4">
        <h2 className="text-xl font-bold">Features</h2>
        <button
          className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
          onClick={() => setShowAddModal(true)}
        >
          + Add Feature
        </button>
      </div>
      <div>
        {Object.entries(grouped).map(([category, feats]) => (
          <div key={category}>
            <div className="sticky top-0 z-10 bg-white px-4 py-2 font-semibold text-gray-700 border-b">
              {category}
            </div>
            <ul>
              {feats.map((feature) => (
                <li key={feature.id}>
                  <Link
                    href={`/features/${feature.id}`}
                    className={`block px-6 py-3 border-b hover:bg-blue-50 transition ${
                      selectedId === feature.id ? 'bg-blue-100 font-bold text-blue-700' : ''
                    }`}
                  >
                    {feature.feature_name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <form
            className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg relative"
            onSubmit={handleAddFeature}
          >
            <button
              type="button"
              className="absolute top-2 right-2 text-2xl text-gray-400 hover:text-black"
              onClick={() => setShowAddModal(false)}
              aria-label="Close"
            >&times;</button>
            <h3 className="text-lg font-bold mb-4">Add Feature</h3>
            {addError && <div className="text-red-600 mb-2">{addError}</div>}
            <div className="mb-2">
              <label className="block font-medium mb-1">Product *</label>
              <select
                className="w-full border rounded px-2 py-1"
                value={addForm.product}
                onChange={e => setAddForm(f => ({ ...f, product: e.target.value }))}
                required
              >
                <option value="">Select product</option>
                {PRODUCT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div className="mb-2">
              <label className="block font-medium mb-1">Feature Name *</label>
              <input
                className="w-full border rounded px-2 py-1"
                value={addForm.feature_name}
                onChange={e => setAddForm(f => ({ ...f, feature_name: e.target.value }))}
                required
              />
            </div>
            <div className="mb-2">
              <label className="block font-medium mb-1">Description</label>
              <textarea
                className="w-full border rounded px-2 py-1"
                value={addForm.description}
                onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="mb-2">
              <label className="block font-medium mb-1">Category</label>
              <input
                className="w-full border rounded px-2 py-1"
                value={addForm.category}
                onChange={e => setAddForm(f => ({ ...f, category: e.target.value }))}
              />
            </div>
            <div className="mb-2">
              <label className="block font-medium mb-1">Use Case</label>
              <input
                className="w-full border rounded px-2 py-1"
                value={addForm.use_case}
                onChange={e => setAddForm(f => ({ ...f, use_case: e.target.value }))}
              />
            </div>
            <div className="mb-2">
              <label className="block font-medium mb-1">Integration Type</label>
              <input
                className="w-full border rounded px-2 py-1"
                value={addForm.integration_type}
                onChange={e => setAddForm(f => ({ ...f, integration_type: e.target.value }))}
              />
            </div>
            <div className="mb-2">
              <label className="block font-medium mb-1">Instructions Tags</label>
              <div className="flex gap-2 mb-1">
                <input ref={tagInputRef} className="flex-1 border rounded px-2 py-1" placeholder="Add tag" />
                <button className="px-2 py-1 bg-gray-200 rounded" onClick={handleAddTag}>Add</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {addForm.instructions_tags.map(tag => (
                  <span key={tag} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs flex items-center gap-1">
                    {tag}
                    <button type="button" className="ml-1 text-xs" onClick={() => handleRemoveTag(tag)}>&times;</button>
                  </span>
                ))}
              </div>
            </div>
            <div className="mb-2">
              <label className="block font-medium mb-1">Value Proposition</label>
              <textarea
                className="w-full border rounded px-2 py-1"
                value={addForm.value_proposition}
                onChange={e => setAddForm(f => ({ ...f, value_proposition: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="mb-2">
              <label className="block font-medium mb-1">Behaviour</label>
              <textarea
                className="w-full border rounded px-2 py-1"
                value={addForm.behaviour}
                onChange={e => setAddForm(f => ({ ...f, behaviour: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="mb-2">
              <label className="block font-medium mb-1">Snippets</label>
              <div className="flex gap-2 mb-1">
                <input ref={snippetInputRef} className="flex-1 border rounded px-2 py-1" placeholder="Add snippet" />
                <button className="px-2 py-1 bg-gray-200 rounded" onClick={handleAddSnippet}>Add</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {addForm.snippets.map(snippet => (
                  <span key={snippet} className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs flex items-center gap-1">
                    {snippet}
                    <button type="button" className="ml-1 text-xs" onClick={() => handleRemoveSnippet(snippet)}>&times;</button>
                  </span>
                ))}
              </div>
            </div>
            <button
              type="submit"
              className="w-full mt-4 py-2 bg-blue-600 text-white rounded font-semibold"
              disabled={addLoading}
            >
              {addLoading ? 'Adding...' : 'Add Feature'}
            </button>
          </form>
        </div>
      )}
    </aside>
  );
} 