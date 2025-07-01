'use client';
import { use, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function FeatureDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

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
  const router = useRouter();
  const [deletingFeature, setDeletingFeature] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const PRODUCT_OPTIONS = ['flytbase', 'air', 'verkos'];

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
    // Sanitize file name: replace all non-alphanumeric, dot, underscore, or dash characters with underscores
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    // Use flat key structure to avoid folder issues
    const filePath = `${id}__${Date.now()}__${safeName}`;
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('featureimages')
      .upload(filePath, file, { upsert: true });
    if (uploadError) {
      setErrorMsg('Upload failed: ' + uploadError.message);
      setUploading(false);
      return;
    }
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('featureimages')
      .getPublicUrl(filePath);
    if (!urlData?.publicUrl) {
      setErrorMsg('Failed to get public URL for image.');
      setUploading(false);
      return;
    }
    // Insert into feature_images table
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
    // Remove from storage
    const filePath = image.link.split('/').pop(); // Only works if publicUrl is direct
    if (filePath) {
      await supabase.storage.from('featureimages').remove([filePath]);
    }
    // Remove from DB
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

  if (loading) return null;
  if (!feature) return null;

  return (
    <aside className="fixed right-0 top-0 h-full w-full max-w-xl bg-white shadow-lg z-50 p-6 overflow-y-auto animate-slide-in">
      {/* Image upload and gallery section */}
      <button
        className="px-4 py-2 bg-blue-600 text-white rounded mb-4"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? 'Uploading...' : 'Upload Image'}
      </button>
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        className="hidden"
        onChange={handleUpload}
      />
      {errorMsg && <div className="text-red-600 mb-2">{errorMsg}</div>}
      <div className="mt-6">
        <h3 className="font-semibold mb-2">Images</h3>
        <div className="flex flex-wrap gap-3">
          {images.length === 0 && <div className="text-gray-400">No images uploaded.</div>}
          {images.map(img => (
            <div
              key={img.id}
              className="w-28 h-28 bg-gray-100 rounded overflow-hidden flex items-center justify-center border cursor-pointer hover:ring-2 hover:ring-blue-400"
              onClick={() => { setModalImage(img); setEditDesc(img.description || ''); setEditMode(false); }}
            >
              <img src={img.link} alt={img.name} className="object-cover w-full h-full" />
            </div>
          ))}
        </div>
      </div>
      {/* End image upload and gallery section */}
      {!editMode ? (
        <>
          <div className="flex gap-2 mb-4 float-right">
            <button
              className="px-3 py-1 bg-blue-600 text-white rounded"
              onClick={() => setEditMode(true)}
            >Edit</button>
            <button
              className="px-3 py-1 bg-red-600 text-white rounded"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={deletingFeature}
            >{deletingFeature ? 'Deleting...' : 'Delete Feature'}</button>
          </div>
          {showDeleteConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
              <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
                <h3 className="text-lg font-bold mb-2">Delete Feature?</h3>
                <p className="mb-4">Are you sure you want to delete this feature? This action cannot be undone.</p>
                <div className="flex gap-2 justify-end">
                  <button
                    className="px-3 py-1 bg-gray-200 rounded"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deletingFeature}
                  >Cancel</button>
                  <button
                    className="px-3 py-1 bg-red-600 text-white rounded"
                    onClick={async () => {
                      setDeletingFeature(true);
                      await supabase.from('features').delete().eq('id', id);
                      setDeletingFeature(false);
                      setShowDeleteConfirm(false);
                      router.push('/features');
                    }}
                    disabled={deletingFeature}
                  >Delete</button>
                </div>
              </div>
            </div>
          )}
          <h2 className="text-2xl font-bold mb-2">{feature.feature_name}</h2>
          <div className="mb-2 text-gray-500"><span className="font-semibold">Product:</span> {feature.product}</div>
          <div className="mb-2"><span className="font-semibold">Description:</span> {feature.description || <span className="text-gray-400">None</span>}</div>
          <div className="mb-2"><span className="font-semibold">Category:</span> {feature.category || <span className="text-gray-400">None</span>}</div>
          <div className="mb-2"><span className="font-semibold">Use Case:</span> {feature.use_case || <span className="text-gray-400">None</span>}</div>
          <div className="mb-2"><span className="font-semibold">Integration Type:</span> {feature.integration_type || <span className="text-gray-400">None</span>}</div>
          <div className="mb-2"><span className="font-semibold">Instructions Tags:</span> {Array.isArray(feature.instructions_tags) && feature.instructions_tags.length > 0 ? (
            <span className="flex flex-wrap gap-2">{feature.instructions_tags.map((tag: string) => <span key={tag} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">{tag}</span>)}</span>
          ) : <span className="text-gray-400">None</span>}</div>
          <div className="mb-2"><span className="font-semibold">Value Proposition:</span> {feature.value_proposition || <span className="text-gray-400">None</span>}</div>
          <div className="mb-2"><span className="font-semibold">Behaviour:</span> {feature.behaviour || <span className="text-gray-400">None</span>}</div>
          <div className="mb-2"><span className="font-semibold">Snippets:</span> {Array.isArray(feature.snippets) && feature.snippets.length > 0 ? (
            <ul className="list-disc ml-6 text-sm">
              {feature.snippets.map((s: string, i: number) => (
                <li key={i} className="flex items-center gap-2">
                  <span>{s}</span>
                  <button
                    className="ml-2 px-2 py-1 bg-gray-100 rounded text-xs hover:bg-gray-200"
                    onClick={async () => {
                      await navigator.clipboard.writeText(s);
                      setCopiedSnippetIdx(i);
                      setTimeout(() => setCopiedSnippetIdx(null), 1200);
                    }}
                  >
                    {copiedSnippetIdx === i ? 'Copied!' : 'Copy'}
                  </button>
                </li>
              ))}
            </ul>
          ) : <span className="text-gray-400">None</span>}</div>
          <div className="mb-2"><span className="font-semibold">Created At:</span> {feature.created_at ? new Date(feature.created_at).toLocaleString() : <span className="text-gray-400">None</span>}</div>
          <div className="mb-4"><span className="font-semibold">Updated At:</span> {feature.updated_at ? new Date(feature.updated_at).toLocaleString() : <span className="text-gray-400">None</span>}</div>
        </>
      ) : (
        <form className="bg-white rounded-lg shadow p-4 mb-6" onSubmit={handleEditFeature}>
          <h3 className="text-lg font-bold mb-4">Edit Feature</h3>
          <div className="mb-2">
            <label className="block font-medium mb-1">Product *</label>
            <select
              className="w-full border rounded px-2 py-1"
              value={editForm.product}
              onChange={e => setEditForm((f: any) => ({ ...f, product: e.target.value }))}
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
              value={editForm.feature_name}
              onChange={e => setEditForm((f: any) => ({ ...f, feature_name: e.target.value }))}
              required
            />
          </div>
          <div className="mb-2">
            <label className="block font-medium mb-1">Description</label>
            <textarea
              className="w-full border rounded px-2 py-1"
              value={editForm.description}
              onChange={e => setEditForm((f: any) => ({ ...f, description: e.target.value }))}
              rows={2}
            />
          </div>
          <div className="mb-2">
            <label className="block font-medium mb-1">Category</label>
            <input
              className="w-full border rounded px-2 py-1"
              value={editForm.category}
              onChange={e => setEditForm((f: any) => ({ ...f, category: e.target.value }))}
            />
          </div>
          <div className="mb-2">
            <label className="block font-medium mb-1">Use Case</label>
            <input
              className="w-full border rounded px-2 py-1"
              value={editForm.use_case}
              onChange={e => setEditForm((f: any) => ({ ...f, use_case: e.target.value }))}
            />
          </div>
          <div className="mb-2">
            <label className="block font-medium mb-1">Integration Type</label>
            <input
              className="w-full border rounded px-2 py-1"
              value={editForm.integration_type}
              onChange={e => setEditForm((f: any) => ({ ...f, integration_type: e.target.value }))}
            />
          </div>
          <div className="mb-2">
            <label className="block font-medium mb-1">Instructions Tags</label>
            <div className="flex gap-2 mb-1">
              <input ref={tagInputRef} className="flex-1 border rounded px-2 py-1" placeholder="Add tag" />
              <button className="px-2 py-1 bg-gray-200 rounded" onClick={handleAddTag}>Add</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {editForm.instructions_tags.map((tag: string) => (
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
              value={editForm.value_proposition}
              onChange={e => setEditForm((f: any) => ({ ...f, value_proposition: e.target.value }))}
              rows={2}
            />
          </div>
          <div className="mb-2">
            <label className="block font-medium mb-1">Behaviour</label>
            <textarea
              className="w-full border rounded px-2 py-1"
              value={editForm.behaviour}
              onChange={e => setEditForm((f: any) => ({ ...f, behaviour: e.target.value }))}
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
              {editForm.snippets.map((snippet: string) => (
                <span key={snippet} className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs flex items-center gap-1">
                  {snippet}
                  <button type="button" className="ml-1 text-xs" onClick={() => handleRemoveSnippet(snippet)}>&times;</button>
                </span>
              ))}
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded font-semibold"
            >Save</button>
            <button
              type="button"
              className="px-4 py-2 bg-gray-200 rounded"
              onClick={() => setEditMode(false)}
            >Cancel</button>
          </div>
        </form>
      )}
      {/* Modal for image view/edit/delete */}
      {modalImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"
          tabIndex={-1}
          onClick={e => { if (e.target === e.currentTarget) setModalImage(null); }}
        >
          {/* Fullscreen overlay */}
          {fullscreen && (
            <div
              className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50 animate-fade-in"
              onClick={() => setFullscreen(false)}
              tabIndex={-1}
            >
              <img
                src={modalImage.link}
                alt={modalImage.name}
                className="max-w-full max-h-full object-contain cursor-zoom-out"
                style={{ boxShadow: '0 0 32px 8px rgba(0,0,0,0.7)' }}
              />
            </div>
          )}
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 relative animate-fade-in">
            <button
              className="absolute top-2 right-2 text-2xl text-gray-500 hover:text-black"
              onClick={() => setModalImage(null)}
              aria-label="Close"
            >
              &times;
            </button>
            <img
              src={modalImage.link}
              alt={modalImage.name}
              className="w-full max-h-[60vh] object-contain mb-4 rounded cursor-zoom-in"
              onClick={() => setFullscreen(true)}
            />
            <button
              className="mb-4 px-3 py-1 bg-gray-100 rounded text-sm hover:bg-gray-200"
              onClick={async () => {
                await navigator.clipboard.writeText(modalImage.link);
                setCopiedImage(true);
                setTimeout(() => setCopiedImage(false), 1200);
              }}
            >
              {copiedImage ? 'Copied!' : 'Copy Image URL'}
            </button>
            <div className="mb-2">
              <span className="font-semibold">Name:</span> {modalImage.name}
            </div>
            <div className="mb-2">
              <span className="font-semibold">Uploaded:</span> {modalImage.created_at ? new Date(modalImage.created_at).toLocaleString() : 'N/A'}
            </div>
            <div className="mb-2">
              <span className="font-semibold">Description:</span>{' '}
              {editMode ? (
                <>
                  <input
                    className="border rounded px-2 py-1 mr-2"
                    value={editDesc}
                    onChange={e => setEditDesc(e.target.value)}
                  />
                  <button
                    className="px-2 py-1 bg-blue-500 text-white rounded mr-2"
                    onClick={() => handleEditDescription(modalImage)}
                  >Save</button>
                  <button
                    className="px-2 py-1 bg-gray-200 rounded"
                    onClick={() => { setEditMode(false); setEditDesc(modalImage.description || ''); }}
                  >Cancel</button>
                </>
              ) : (
                <>
                  {modalImage.description || <span className="text-gray-400">No description</span>}
                  <button
                    className="ml-2 px-2 py-1 bg-gray-100 rounded text-sm hover:bg-gray-200"
                    onClick={() => setEditMode(true)}
                  >Edit</button>
                </>
              )}
            </div>
            <div className="mb-2">
              <span className="font-semibold">ID:</span> {modalImage.id}
            </div>
            <div className="mb-2">
              <span className="font-semibold">Feature ID:</span> {modalImage.feature_id}
            </div>
            <div className="mb-2">
              <span className="font-semibold">Link:</span> <a href={modalImage.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Open in new tab</a>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                className="px-4 py-2 bg-red-600 text-white rounded"
                onClick={() => handleDeleteImage(modalImage)}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
              <button
                className="px-4 py-2 bg-gray-200 rounded"
                onClick={() => setModalImage(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
} 