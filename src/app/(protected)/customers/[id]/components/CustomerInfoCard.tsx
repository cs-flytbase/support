import React from 'react';
import { CustomerDetails } from '../types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, Globe, Phone, Home, Building2, Calendar } from 'lucide-react';

interface CustomerInfoCardProps {
  customer: CustomerDetails;
  onEdit: () => void;
  formatDate: (date: string | null) => string;
}

export const CustomerInfoCard = ({ customer, onEdit, formatDate }: CustomerInfoCardProps) => {
  return (
    <Card className="shadow-md transition-all hover:shadow-lg">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-xl font-bold">{customer.name}</CardTitle>
            <CardDescription className="text-muted-foreground">
              {customer.customer_type || 'Customer'}
            </CardDescription>
          </div>
          <Button variant="outline" onClick={onEdit} className="ml-auto">
            Edit Details
          </Button>
        </div>
      </CardHeader>

      <CardContent className="grid gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Email */}
          <div className="flex items-center space-x-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Email</p>
              <p className="text-sm text-muted-foreground">
                {customer.email ? (
                  <a href={`mailto:${customer.email}`} className="text-blue-600 hover:underline">
                    {customer.email}
                  </a>
                ) : (
                  'Not provided'
                )}
              </p>
            </div>
          </div>

          {/* Phone */}
          <div className="flex items-center space-x-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Phone</p>
              <p className="text-sm text-muted-foreground">
                {customer.phone ? (
                  <a href={`tel:${customer.phone}`} className="text-blue-600 hover:underline">
                    {customer.phone}
                  </a>
                ) : (
                  'Not provided'
                )}
              </p>
            </div>
          </div>

          {/* Website */}
          <div className="flex items-center space-x-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Website</p>
              <p className="text-sm text-muted-foreground">
                {customer.website ? (
                  <a
                    href={customer.website.startsWith('http') ? customer.website : `https://${customer.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {customer.website}
                  </a>
                ) : (
                  'Not provided'
                )}
              </p>
            </div>
          </div>

          {/* Customer Type */}
          <div className="flex items-center space-x-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Type</p>
              <p className="text-sm text-muted-foreground">{customer.customer_type || 'Not specified'}</p>
            </div>
          </div>
        </div>

        {/* Address (if available) */}
        {customer.address && (
          <div className="flex items-start space-x-2 pt-2 border-t">
            <Home className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">Address</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{customer.address}</p>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between text-xs text-muted-foreground border-t pt-4">
        <div className="flex items-center space-x-1">
          <Calendar className="h-3 w-3" />
          <span>Added: {customer.created_at ? formatDate(customer.created_at) : 'Unknown'}</span>
        </div>
        <span>ID: {customer.id}</span>
      </CardFooter>
    </Card>
  );
};
