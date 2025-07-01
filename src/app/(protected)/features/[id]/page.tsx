'use client';
import { use, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function FeatureDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const [feature, setFeature] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [images, setImages] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [modalImage, setModalImage] = useState<any>(null);
  const [editDesc, setEditDesc] = useState<string>('');
  const [editMode, setEditMode] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const snippetInputRef = useRef<HTMLInputElement>(null);
  const [copiedSnippetIdx, setCopiedSnippetIdx] = useState<number | null>(null);
  const [copiedImage, setCopiedImage] = useState(false);
  const [editingSnippetIdx, setEditingSnippetIdx] = useState<number | null>(null);
  const [editingSnippetValue, setEditingSnippetValue] = useState('');
  const router = useRouter();
  const [deletingFeature, setDeletingFeature] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const PRODUCT_OPTIONS = ['flytbase', 'air', 'verkos'];

  // Handle click outside to close sidebar
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        router.push('/features');
      }
    }

    // Only add event listener on mobile/tablet
    if (window.innerWidth < 1024) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [router]);

  // Handle escape key to close sidebar
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        router.push('/features');
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [router]);

  useEffect(() => {
    async function fetchFeature() {
      setLoading(true);
      const { data } = await supabase
        .from('features')
        .select('*')
        .eq('id', id)
        .single();
      setFeature(data);
      setLoading(false);
    }
    fetchFeature();
  }, [id]);

  useEffect(() => {
    async function fetchImages() {
      const { data } = await supabase
        .from('feature_images')
        .select('*')
        .eq('feature_id', id)
        .order('created_at', { ascending: true });
      setImages(data || []);
    }
    if (id) fetchImages();
  }, [id, uploading, modalImage]);

  useEffect(() => {
    if (!fullscreen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setFullscreen(false);
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [fullscreen]);

  useEffect(() => {
    if (feature) {
      setEditForm({
        product: feature.product || '',
        feature_name: feature.feature_name || '',
        description: feature.description || '',
        category: feature.category || '',
        use_case: feature.use_case || '',
        integration_type: feature.integration_type || '',
        instructions_tags: feature.instructions_tags || [],
        value_proposition: feature.value_proposition || '',
        behaviour: feature.behaviour || '',
        snippets: feature.snippets || [],
      });
    }
  }, [feature]);

  async function uploadImage(file: File) {
    setUploading(true);
    setErrorMsg(null);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${id}__${Date.now()}__${safeName}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('featureimages')
      .upload(filePath, file, { upsert: true });
    if (uploadError) {
      setErrorMsg('Upload failed: ' + uploadError.message);
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage
      .from('featureimages')
      .getPublicUrl(filePath);
    if (!urlData?.publicUrl) {
      setErrorMsg('Failed to get public URL for image.');
      setUploading(false);
      return;
    }
    const { error: dbError } = await supabase.from('feature_images').insert({
      feature_id: id,
      name: file.name,
      link: urlData.publicUrl,
    });
    if (dbError) {
      setErrorMsg('Failed to save image record: ' + dbError.message);
      setUploading(false);
      return;
    }
    setUploading(false);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadImage(file);
    e.target.value = '';
  }

  async function handleDeleteImage(image: any) {
    setDeleting(true);
    const filePath = image.link.split('/').pop();
    if (filePath) {
      await supabase.storage.from('featureimages').remove([filePath]);
    }
    await supabase.from('feature_images').delete().eq('id', image.id);
    setModalImage(null);
    setDeleting(false);
  }

  async function handleEditDescription(image: any) {
    await supabase.from('feature_images').update({ description: editDesc }).eq('id', image.id);
    setEditMode(false);
    setModalImage({ ...image, description: editDesc });
  }

  async function handleEditFeature(e: any) {
    e.preventDefault();
    if (!editForm.product || !editForm.feature_name) return;
    const { error } = await supabase.from('features').update({
      ...editForm,
      instructions_tags: editForm.instructions_tags.length ? editForm.instructions_tags : null,
      snippets: editForm.snippets.length ? editForm.snippets : null,
    }).eq('id', id);
    if (!error) {
      setEditMode(false);
      setFeature({ ...feature, ...editForm });
    }
  }

  function handleAddTag(e: React.FormEvent) {
    e.preventDefault();
    const value = tagInputRef.current?.value.trim() ?? '';
    if (!value || editForm.instructions_tags.includes(value)) return;
    setEditForm((f: any) => ({ ...f, instructions_tags: [...f.instructions_tags, value] }));
    if (tagInputRef.current) tagInputRef.current.value = '';
  }

  function handleRemoveTag(tag: string) {
    setEditForm((f: any) => ({ ...f, instructions_tags: f.instructions_tags.filter((t: string) => t !== tag) }));
  }

  function handleAddSnippet(e: React.FormEvent) {
    e.preventDefault();
    const value = snippetInputRef.current?.value.trim() ?? '';
    if (!value || editForm.snippets.includes(value)) return;
    setEditForm((f: any) => ({ ...f, snippets: [...f.snippets, value] }));
    if (snippetInputRef.current) snippetInputRef.current.value = '';
  }

  function handleRemoveSnippet(snippet: string) {
    setEditForm((f: any) => ({ ...f, snippets: f.snippets.filter((s: string) => s !== snippet) }));
  }

  function handleEditSnippet(index: number) {
    setEditingSnippetIdx(index);
    setEditingSnippetValue(feature.snippets[index]);
  }

  async function handleSaveSnippet(index: number) {
    const updatedSnippets = [...feature.snippets];
    updatedSnippets[index] = editingSnippetValue;
    
    const { error } = await supabase.from('features').update({
      snippets: updatedSnippets
    }).eq('id', id);
    
    if (!error) {
      setFeature({ ...feature, snippets: updatedSnippets });
      setEditingSnippetIdx(null);
      setEditingSnippetValue('');
    }
  }

  function handleCancelEdit() {
    setEditingSnippetIdx(null);
    setEditingSnippetValue('');
  }

  async function copyToClipboard(text: string, index?: number) {
    await navigator.clipboard.writeText(text);
    if (index !== undefined) {
      setCopiedSnippetIdx(index);
      setTimeout(() => setCopiedSnippetIdx(null), 1200);
    }
  }

  if (loading) return null;
  if (!feature) return null;

  return (
    <>
      {/* Backdrop - only shows on mobile/smaller screens */}
      <div className="fixed inset-0 bg-black bg-opacity-30 z-40 lg:hidden"></div>
      
      {/* Sidebar */}
      <aside 
        ref={sidebarRef}
        className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 overflow-y-auto border-l border-gray-200 lg:max-w-md xl:max-w-lg"
        style={{
          transform: 'translateX(0)',
          transition: 'transform 0.3s ease-in-out'
        }}
      >
        {/* Header with close button */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold text-gray-900">Feature Details</h2>
          <button
            onClick={() => router.push('/features')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {/* Image upload and gallery section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Images</h3>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? 'Uploading...' : '+ Upload Image'}
              </button>
            </div>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              className="hidden"
              onChange={handleUpload}
            />
            {errorMsg && <div className="text-red-600 mb-4 text-sm">{errorMsg}</div>}
            
            <div className="grid grid-cols-3 gap-3">
              {images.length === 0 && (
                <div className="col-span-3 text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                  No images uploaded yet
                </div>
              )}
              {images.map(img => (
                <div
                  key={img.id}
                  className="aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-transparent hover:border-blue-400 cursor-pointer transition-all"
                  onClick={() => { setModalImage(img); setEditDesc(img.description || ''); setEditMode(false); }}
                >
                  <img src={img.link} alt={img.name} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>

          {!editMode ? (
            <>
              {/* Action buttons */}
              <div className="flex gap-3 mb-6">
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  onClick={() => setEditMode(true)}
                >
                  Edit Feature
                </button>
                <button
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={deletingFeature}
                >
                  {deletingFeature ? 'Deleting...' : 'Delete Feature'}
                </button>
              </div>

              {/* Feature details */}
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">{feature.feature_name}</h1>
                  <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                    {feature.product}
                  </div>
                </div>

                {feature.description && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{feature.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {feature.category && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">Category</h4>
                      <p className="text-gray-600">{feature.category}</p>
                    </div>
                  )}
                  {feature.use_case && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">Use Case</h4>
                      <p className="text-gray-600">{feature.use_case}</p>
                    </div>
                  )}
                  {feature.integration_type && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">Integration Type</h4>
                      <p className="text-gray-600">{feature.integration_type}</p>
                    </div>
                  )}
                </div>

                {Array.isArray(feature.instructions_tags) && feature.instructions_tags.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Instructions Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {feature.instructions_tags.map((tag: string) => (
                        <span key={tag} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {feature.value_proposition && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Value Proposition</h3>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{feature.value_proposition}</p>
                  </div>
                )}

                {feature.behaviour && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Behaviour</h3>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{feature.behaviour}</p>
                  </div>
                )}

                {Array.isArray(feature.snippets) && feature.snippets.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Code Snippets</h3>
                    <div className="space-y-3">
                      {feature.snippets.map((snippet: string, index: number) => (
                        <div key={index} className="bg-gray-900 rounded-lg overflow-hidden">
                          <div className="flex items-center justify-between px-4 py-2 bg-gray-800">
                            <span className="text-gray-300 text-sm font-medium">Snippet {index + 1}</span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditSnippet(index)}
                                className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                                title="Edit snippet"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => copyToClipboard(snippet, index)}
                                className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                                title="Copy to clipboard"
                              >
                                {copiedSnippetIdx === index ? (
                                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                )}
                              </button>
                            </div>
                          </div>
                          {editingSnippetIdx === index ? (
                            <div className="p-4">
                              <textarea
                                value={editingSnippetValue}
                                onChange={(e) => setEditingSnippetValue(e.target.value)}
                                className="w-full bg-gray-800 text-gray-100 p-3 rounded border border-gray-600 focus:border-blue-500 focus:outline-none resize-none"
                                rows={6}
                                style={{ fontFamily: 'Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }}
                              />
                              <div className="flex gap-2 mt-3">
                                <button
                                  onClick={() => handleSaveSnippet(index)}
                                  className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="px-3 py-1.5 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <pre className="p-4 text-gray-100 text-sm overflow-x-auto">
                              <code style={{ fontFamily: 'Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }}>
                                {snippet}
                              </code>
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t border-gray-200 text-sm text-gray-500">
                  <div>
                    <span className="font-medium">Created:</span> {feature.created_at ? new Date(feature.created_at).toLocaleString() : 'N/A'}
                  </div>
                  <div>
                    <span className="font-medium">Updated:</span> {feature.updated_at ? new Date(feature.updated_at).toLocaleString() : 'N/A'}
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Edit form remains the same but with improved styling */
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-bold mb-6">Edit Feature</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block font-medium mb-2 text-gray-700">Product *</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={editForm.product}
                    onChange={e => setEditForm((f: any) => ({ ...f, product: e.target.value }))}
                    required
                  >
                    <option value="">Select product</option>
                    {PRODUCT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                
                <div>
                  <label className="block font-medium mb-2 text-gray-700">Feature Name *</label>
                  <input
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={editForm.feature_name}
                    onChange={e => setEditForm((f: any) => ({ ...f, feature_name: e.target.value }))}
                    required
                  />
                </div>
                
                <div>
                  <label className="block font-medium mb-2 text-gray-700">Description</label>
                  <textarea
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={editForm.description}
                    onChange={e => setEditForm((f: any) => ({ ...f, description: e.target.value }))}
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium mb-2 text-gray-700">Category</label>
                    <input
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={editForm.category}
                      onChange={e => setEditForm((f: any) => ({ ...f, category: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <label className="block font-medium mb-2 text-gray-700">Use Case</label>
                    <input
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={editForm.use_case}
                      onChange={e => setEditForm((f: any) => ({ ...f, use_case: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block font-medium mb-2 text-gray-700">Integration Type</label>
                  <input
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={editForm.integration_type}
                    onChange={e => setEditForm((f: any) => ({ ...f, integration_type: e.target.value }))}
                  />
                </div>
                
                <div>
                  <label className="block font-medium mb-2 text-gray-700">Instructions Tags</label>
                  <div className="flex gap-2 mb-3">
                    <input 
                      ref={tagInputRef} 
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                      placeholder="Add tag" 
                    />
                    <button 
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors" 
                      onClick={handleAddTag}
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {editForm.instructions_tags.map((tag: string) => (
                      <span key={tag} className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                        {tag}
                        <button type="button" className="text-blue-500 hover:text-blue-700" onClick={() => handleRemoveTag(tag)}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block font-medium mb-2 text-gray-700">Value Proposition</label>
                  <textarea
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={editForm.value_proposition}
                    onChange={e => setEditForm((f: any) => ({ ...f, value_proposition: e.target.value }))}
                    rows={3}
                  />
                </div>
                
                <div>
                  <label className="block font-medium mb-2 text-gray-700">Behaviour</label>
                  <textarea
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={editForm.behaviour}
                    onChange={e => setEditForm((f: any) => ({ ...f, behaviour: e.target.value }))}
                    rows={3}
                  />
                </div>
                
                <div>
                  <label className="block font-medium mb-2 text-gray-700">Snippets</label>
                  <div className="flex gap-2 mb-3">
                    <input 
                      ref={snippetInputRef} 
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                      placeholder="Add snippet" 
                    />
                    <button 
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors" 
                      onClick={handleAddSnippet}
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {editForm.snippets.map((snippet: string) => (
                      <span key={snippet} className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                        {snippet.length > 50 ? snippet.substring(0, 50) + '...' : snippet}
                        <button type="button" className="text-green-500 hover:text-green-700" onClick={() => handleRemoveSnippet(snippet)}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleEditFeature}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setEditMode(false)}
                  className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Delete confirmation modal */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
              <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
                <div className="flex items-center mb-4">
                  <div className="flex-shrink-0 w-10 h-10 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-center mb-2">Delete Feature</h3>
                <p className="text-gray-600 text-center mb-6">Are you sure you want to delete this feature? This action cannot be undone.</p>
                <div className="flex gap-3">
                  <button
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deletingFeature}
                  >
                    Cancel
                  </button>
                  <button
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                    onClick={async () => {
                      setDeletingFeature(true);
                      await supabase.from('features').delete().eq('id', id);
                      setDeletingFeature(false);
                      setShowDeleteConfirm(false);
                      router.push('/features');
                    }}
                    disabled={deletingFeature}
                  >
                    {deletingFeature ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Image modal */}
          {modalImage && (
            <div
              className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"
              onClick={e => { if (e.target === e.currentTarget) setModalImage(null); }}
            >
              {fullscreen && (
                <div
                  className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50 animate-fade-in"
                  onClick={() => setFullscreen(false)}
                >
                  <img
                    src={modalImage.link}
                    alt={modalImage.name}
                    className="max-w-full max-h-full object-contain cursor-zoom-out"
                    style={{ boxShadow: '0 0 32px 8px rgba(0,0,0,0.7)' }}
                  />
                </div>
              )}
              <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6 relative animate-fade-in">
                <button
                  className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                  onClick={() => setModalImage(null)}
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                
                <img
                  src={modalImage.link}
                  alt={modalImage.name}
                  className="w-full max-h-[60vh] object-contain mb-4 rounded-lg cursor-zoom-in"
                  onClick={() => setFullscreen(true)}
                />
                
                <div className="flex items-center gap-2 mb-4">
                  <button
                    className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200 transition-colors"
                    onClick={async () => {
                      await navigator.clipboard.writeText(modalImage.link);
                      setCopiedImage(true);
                      setTimeout(() => setCopiedImage(false), 1200);
                    }}
                  >
                    {copiedImage ? 'Copied!' : 'Copy URL'}
                  </button>
                  <a 
                    href={modalImage.link} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
                  >
                    Open in New Tab
                  </a>
                </div>

                <div className="space-y-3 text-sm">
                  <div>
                    <span className="font-medium text-gray-900">File Name:</span> 
                    <span className="text-gray-600 ml-2">{modalImage.name}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">Uploaded:</span> 
                    <span className="text-gray-600 ml-2">
                      {modalImage.created_at ? new Date(modalImage.created_at).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">Description:</span>
                    {editMode ? (
                      <div className="mt-2">
                        <input
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          value={editDesc}
                          onChange={e => setEditDesc(e.target.value)}
                          placeholder="Enter description..."
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                            onClick={() => handleEditDescription(modalImage)}
                          >
                            Save
                          </button>
                          <button
                            className="px-3 py-1.5 bg-gray-200 text-gray-800 rounded-lg text-sm hover:bg-gray-300 transition-colors"
                            onClick={() => { setEditMode(false); setEditDesc(modalImage.description || ''); }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-gray-600">
                          {modalImage.description || 'No description'}
                        </span>
                        <button
                          className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs hover:bg-gray-200 transition-colors"
                          onClick={() => setEditMode(true)}
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
                  <button
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                    onClick={() => handleDeleteImage(modalImage)}
                    disabled={deleting}
                  >
                    {deleting ? 'Deleting...' : 'Delete Image'}
                  </button>
                  <button
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                    onClick={() => setModalImage(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}