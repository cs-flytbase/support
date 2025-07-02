import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createClient } from "@/utils/supabase/client";

interface CustomerEditTabProps {
  customer: any;
  customerId: string;
  onCustomerUpdate: (updatedCustomer: any) => void;
}

export const CustomerEditTab: React.FC<CustomerEditTabProps> = ({
  customer,
  customerId,
  onCustomerUpdate
}) => {
  const supabase = createClient();
  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [tableColumns, setTableColumns] = useState<any[]>([]);

  // Initialize form data when customer changes
  useEffect(() => {
    if (customer) {
      setFormData({ ...customer });
    }
  }, [customer]);

  // Fetch table schema to get all columns
  useEffect(() => {
    fetchTableSchema();
  }, []);

  const fetchTableSchema = async () => {
    try {
      // This is a workaround to get table structure
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .limit(1);
      
      if (data && data.length > 0) {
        const columns = Object.keys(data[0]).map(key => ({
          name: key,
          type: getFieldType(key, data[0][key]),
          nullable: true // Assume nullable for now
        }));
        setTableColumns(columns);
      }
    } catch (err) {
      console.error('Error fetching table schema:', err);
    }
  };

  // Helper function to determine field type
  const getFieldType = (columnName: string, value: any) => {
    if (columnName.includes('email')) return 'email';
    if (columnName.includes('phone')) return 'tel';
    if (columnName.includes('website') || columnName.includes('url')) return 'url';
    if (columnName.includes('date') || columnName.includes('time')) return 'datetime-local';
    if (columnName.includes('_id') || columnName === 'id') return 'uuid';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'checkbox';
    if (columnName.includes('address') || columnName.includes('description') || columnName.includes('profile')) return 'textarea';
    return 'text';
  };

  // Helper function to sanitize data before saving
  const sanitizeDataForSave = (data: any) => {
    const sanitized = { ...data };
    
    // Handle UUID fields - convert empty strings to null
    Object.keys(sanitized).forEach(key => {
      if (key.includes('_id') || key === 'id') {
        if (sanitized[key] === '') {
          sanitized[key] = null;
        }
      }
      
      // Handle number fields - convert empty strings to null
      if (typeof sanitized[key] === 'string' && sanitized[key] === '' && 
          (key.includes('amount') || key.includes('score') || key.includes('won') || key.includes('pipeline'))) {
        sanitized[key] = null;
      }
    });
    
    return sanitized;
  };

  // Handle input changes
  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: value
    }));
    
    // Clear messages when user starts editing
    if (error) setError(null);
    if (successMessage) setSuccessMessage(null);
  };

  // Format field name for display
  const formatFieldName = (fieldName: string) => {
    return fieldName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Save changes
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Prepare data for update - remove read-only fields
      const updateData = { ...formData };
      delete updateData.id;
      delete updateData.created_at;
      
      // Set updated_at to current timestamp
      updateData.updated_at = new Date().toISOString();

      // Sanitize data to handle UUIDs and other special fields
      const sanitizedData = sanitizeDataForSave(updateData);

      console.log('Sanitized data for update:', sanitizedData); // Debug log

      const { data, error: updateError } = await supabase
        .from('customers')
        .update(sanitizedData)
        .eq('id', customerId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Update parent component
      onCustomerUpdate(data);
      setSuccessMessage('Customer updated successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Error updating customer:', err);
      setError(err.message || 'Failed to update customer');
    } finally {
      setSaving(false);
    }
  };

  // Reset form to original values
  const handleReset = () => {
    setFormData({ ...customer });
    setError(null);
    setSuccessMessage(null);
  };

  // Render input field based on type
  const renderField = (column: any) => {
    const { name, type } = column;
    const value = formData[name] || '';
    const isReadOnly = ['id', 'created_at'].includes(name);

    if (type === 'checkbox') {
      return (
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id={name}
            checked={Boolean(value)}
            onChange={(e) => handleInputChange(name, e.target.checked)}
            disabled={isReadOnly}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
          />
          <label htmlFor={name} className="text-sm font-medium text-gray-700">
            {formatFieldName(name)}
          </label>
        </div>
      );
    }

    if (type === 'textarea') {
      return (
        <div>
          <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
            {formatFieldName(name)}
          </label>
          <textarea
            id={name}
            value={value || ''}
            onChange={(e) => handleInputChange(name, e.target.value)}
            disabled={isReadOnly}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:opacity-50"
            placeholder={`Enter ${formatFieldName(name).toLowerCase()}`}
          />
        </div>
      );
    }

    if (type === 'datetime-local') {
      // Convert ISO string to datetime-local format
      let dateValue = '';
      if (value) {
        try {
          const date = new Date(value);
          dateValue = date.toISOString().slice(0, 16);
        } catch (e) {
          dateValue = '';
        }
      }

      return (
        <div>
          <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
            {formatFieldName(name)}
          </label>
          <input
            type="datetime-local"
            id={name}
            value={dateValue}
            onChange={(e) => {
              const isoString = e.target.value ? new Date(e.target.value).toISOString() : null;
              handleInputChange(name, isoString);
            }}
            disabled={isReadOnly}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:opacity-50"
          />
        </div>
      );
    }

    if (type === 'uuid') {
      return (
        <div>
          <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
            {formatFieldName(name)}
            {isReadOnly && <span className="text-xs text-gray-500 ml-1">(Read-only)</span>}
          </label>
          <input
            type="text"
            id={name}
            value={value || ''}
            onChange={(e) => {
              const newValue = e.target.value.trim();
              handleInputChange(name, newValue === '' ? null : newValue);
            }}
            disabled={isReadOnly}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:opacity-50"
            placeholder={isReadOnly ? 'System generated' : 'Enter UUID or leave empty for null'}
          />
          <p className="text-xs text-gray-500 mt-1">
            {isReadOnly ? 'This field is system-generated' : 'UUID format or leave empty for null'}
          </p>
        </div>
      );
    }

    return (
      <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
          {formatFieldName(name)}
        </label>
        <input
          type={type}
          id={name}
          value={value || ''}
          onChange={(e) => {
            let newValue;
            if (type === 'number') {
              newValue = e.target.value === '' ? null : Number(e.target.value);
            } else {
              newValue = e.target.value === '' ? null : e.target.value;
            }
            handleInputChange(name, newValue);
          }}
          disabled={isReadOnly}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:opacity-50"
          placeholder={`Enter ${formatFieldName(name).toLowerCase()}`}
        />
        {isReadOnly && (
          <p className="text-xs text-gray-500 mt-1">This field is read-only</p>
        )}
      </div>
    );
  };

  // Group fields into categories
  const basicFields = ['name', 'email', 'phone', 'website'];
  const locationFields = ['address', 'country', 'region'];
  const businessFields = ['customer_type', 'industry', 'partner_org_id'];
  const metricsFields = ['closed_won', 'Contracted', 'totalPipelineAmount', 'Weighted_Pipeline', 'call_sentiment_score'];
  const profileFields = ['customer_profile', 'customer_profile_update_time'];
  const systemFields = ['id', 'created_at', 'updated_at', 'primary_contact_id'];

  const getFieldCategory = (fieldName: string) => {
    if (basicFields.includes(fieldName)) return 'Basic Information';
    if (locationFields.includes(fieldName)) return 'Location';
    if (businessFields.includes(fieldName)) return 'Business Details';
    if (metricsFields.includes(fieldName)) return 'Business Metrics';
    if (profileFields.includes(fieldName)) return 'Profile';
    if (systemFields.includes(fieldName)) return 'System Fields';
    return 'Other';
  };

  // Group columns by category
  const groupedColumns = tableColumns.reduce((acc, column) => {
    const category = getFieldCategory(column.name);
    if (!acc[category]) acc[category] = [];
    acc[category].push(column);
    return acc;
  }, {} as Record<string, typeof tableColumns>);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Edit Customer</h2>
          <p className="text-gray-600">Modify all customer fields and properties</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={saving}
          >
            Reset
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Form Fields by Category */}
      <div className="space-y-8">
        {Object.entries(groupedColumns).map(([category, columns]) => (
          <Card key={category} className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
              {category}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(columns as typeof tableColumns).map((column: typeof tableColumns[0]) => (
                <div key={column.name}>
                  {renderField(column)}
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {/* Additional Actions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => handleInputChange('customer_type', 'Enterprise')}
            size="sm"
          >
            Set as Enterprise
          </Button>
          <Button
            variant="outline"
            onClick={() => handleInputChange('customer_type', 'SMB')}
            size="sm"
          >
            Set as SMB
          </Button>
          <Button
            variant="outline"
            onClick={() => handleInputChange('call_sentiment_score', 5)}
            size="sm"
          >
            Reset Sentiment Score
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const now = new Date().toISOString();
              handleInputChange('customer_profile_update_time', now);
            }}
            size="sm"
          >
            Update Profile Timestamp
          </Button>
        </div>
      </Card>

      {/* Save Button (Bottom) */}
      <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={saving}
        >
          Reset All Changes
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {saving ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
              Saving...
            </div>
          ) : (
            'Save All Changes'
          )}
        </Button>
      </div>
    </div>
  );
};