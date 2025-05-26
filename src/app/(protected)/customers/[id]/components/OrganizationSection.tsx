import React from 'react';
import { OrgDetails } from '../types';

interface OrganizationSectionProps {
  orgs: OrgDetails[];
  isLoading: boolean;
  error: string | null;
  showForm: boolean;
  formData: Partial<OrgDetails>;
  editingOrg: OrgDetails | null;
  onShowForm: () => void;
  onFormChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSave: (e: React.FormEvent) => void;
  onEdit: (org: OrgDetails) => void;
  onDelete: (orgId: string) => void;
  onCancel: () => void;
  formatDate: (date: string | null) => string;
}

export const OrganizationSection: React.FC<OrganizationSectionProps> = ({
  orgs,
  isLoading,
  error,
  showForm,
  formData,
  editingOrg,
  onShowForm,
  onFormChange,
  onSave,
  onEdit,
  onDelete,
  onCancel,
  formatDate
}) => {
  return (
    <div className="mt-6 pt-6 border-t border-gray-200">
      <div className="flex justify-between mb-4">
        <h4 className="text-md font-medium mb-2">Organization IDs</h4>
        <button
          onClick={onShowForm}
          className="px-3 py-1 bg-green-100 text-green-600 rounded-md hover:bg-green-200 transition-colors"
        >
          Add Organization ID
        </button>
      </div>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
          <p>{error}</p>
        </div>
      )}
      
      {/* Organization Form */}
      {showForm && (
        <div className="p-4 border border-gray-200 rounded-md mb-4 bg-gray-50">
          <h5 className="text-md font-medium mb-3">{editingOrg ? 'Edit Organization ID' : 'Add Organization ID'}</h5>
          <form onSubmit={onSave} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organization ID *
                </label>
                <input
                  type="text"
                  name="org_id"
                  value={formData.org_id || ''}
                  onChange={onFormChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organization Name *
                </label>
                <input
                  type="text"
                  name="org_name"
                  value={formData.org_name || ''}
                  onChange={onFormChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onCancel}
                className="px-3 py-1 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {editingOrg ? 'Update' : 'Add'} Organization
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Organizations List */}
      {isLoading ? (
        <div className="p-4 text-center">
          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-1 text-sm text-gray-500">Loading organization data...</p>
        </div>
      ) : orgs.length === 0 ? (
        <div className="p-4 text-center text-gray-500">
          <p>No organization IDs found for this customer.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Organization ID
                </th>
                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Organization Name
                </th>
                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Updated
                </th>
                <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orgs.map((org) => (
                <tr key={org.org_id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{org.org_id}</div>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{org.org_name}</div>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{formatDate(org.updated_at)}</div>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => onEdit(org)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(org.org_id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
