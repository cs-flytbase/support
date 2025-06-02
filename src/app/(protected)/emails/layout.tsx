import React from 'react';

export default function EmailsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      {children}
    </div>
  );
}
