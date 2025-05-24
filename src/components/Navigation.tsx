import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

const NavLink = ({ href, children, className = '' }: NavLinkProps) => {
  const pathname = usePathname();
  const isActive = pathname === href || pathname?.startsWith(`${href}/`);
  
  return (
    <Link 
      href={href} 
      className={`px-4 py-2 rounded-md transition-colors ${isActive 
        ? 'bg-blue-100 text-blue-800 font-medium' 
        : 'text-gray-700 hover:bg-gray-100'} ${className}`}
    >
      {children}
    </Link>
  );
};

export default function Navigation() {
  return (
    <nav className="flex items-center justify-between bg-white shadow-sm px-6 py-3">
      <div className="flex items-center space-x-1">
        <Link href="/" className="text-xl font-bold text-blue-600 mr-6">Support</Link>
        
        <NavLink href="/conversations">Conversations</NavLink>
        <NavLink href="/customers">Customers</NavLink>
        <NavLink href="/settings">Settings</NavLink>
      </div>
      
      <div className="flex items-center space-x-4">
        <UserButton afterSignOutUrl="/sign-in" />
      </div>
    </nav>
  );
}
