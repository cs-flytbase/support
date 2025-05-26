import React from 'react';
import { CustomerDetails } from '../types';

interface CustomerInfoCardProps {
  customer: CustomerDetails;
  onEdit: () => void;
  formatDate: (date: string | null) => string;
}

export const CustomerInfoCard: React.FC<CustomerInfoCardProps> = ({ 
  customer, 
  onEdit, 
  formatDate 
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6 sm:mb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3 sm:gap-0">
        <h2 className="text-lg sm:text-xl font-semibold">Customer Information</h2>
        <button
          onClick={onEdit}
          className="px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          Edit Company
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <div>
          <p className="text-xs sm:text-sm text-gray-500">Name</p>
          <p className="text-base sm:text-lg break-words">{customer.name}</p>
        </div>
        <div>
          <p className="text-xs sm:text-sm text-gray-500">Email</p>
          <p className="text-base sm:text-lg break-words">
            {customer.email ? (
              <a href={`mailto:${customer.email}`} className="text-blue-600 hover:underline">
                {customer.email}
              </a>
            ) : (
              'N/A'
            )}
          </p>
        </div>
        <div>
          <p className="text-xs sm:text-sm text-gray-500">Phone</p>
          <p className="text-base sm:text-lg">
            {customer.phone ? (
              <a href={`tel:${customer.phone}`} className="text-blue-600 hover:underline">
                {customer.phone}
              </a>
            ) : (
              'N/A'
            )}
          </p>
        </div>
        <div>
          <p className="text-xs sm:text-sm text-gray-500">Website</p>
          <p className="text-base sm:text-lg break-words">
            {customer.website ? (
              <a 
                href={customer.website.startsWith('http') ? customer.website : `https://${customer.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {customer.website.replace(/^https?:\/\//, '')}
              </a>
            ) : (
              'N/A'
            )}
          </p>
        </div>
        <div>
          <p className="text-xs sm:text-sm text-gray-500">Customer Type</p>
          <p className="text-base sm:text-lg">
            <span className="px-2 py-0.5 sm:py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
              {customer.customer_type?.replace('_', ' ') || 'Not Specified'}
            </span>
          </p>
        </div>
        <div>
          <p className="text-xs sm:text-sm text-gray-500">Industry</p>
          <p className="text-base sm:text-lg">{customer.industry || 'N/A'}</p>
        </div>
        {customer.address && (
          <div className="sm:col-span-2 lg:col-span-3">
            <p className="text-xs sm:text-sm text-gray-500">Address</p>
            <p className="text-base sm:text-lg break-words">{customer.address}</p>
          </div>
        )}
        <div>
          <p className="text-xs sm:text-sm text-gray-500">Created</p>
          <p className="text-base sm:text-lg">{formatDate(customer.created_at)}</p>
        </div>
        <div>
          <p className="text-xs sm:text-sm text-gray-500">Last Updated</p>
          <p className="text-base sm:text-lg">{formatDate(customer.updated_at)}</p>
        </div>
      </div>
    </div>
  );
};
