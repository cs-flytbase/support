import React from 'react';
import Link from 'next/link';

export default function AIAgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow-sm">
        <div className="container mx-auto">
          <div className="flex items-center space-x-6 p-4 overflow-x-auto">
            <Link href="/ai-agent/knowledge-base">
              <span className="text-gray-800 hover:text-blue-600 font-medium cursor-pointer whitespace-nowrap">
                Knowledge Base
              </span>
            </Link>
            {/* Add more AI agent related links here as you expand */}
          </div>
        </div>
      </div>
      <main>{children}</main>
    </div>
  );
}
