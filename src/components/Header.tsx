'use client';

import SignInButton from "./SignInButton";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from '@/hooks/useAuth';

export default function Header() {
  const pathname = usePathname();
  const { data: session } = useSession();

  // Debug log for session
  console.log("SESSION DEBUG", session);

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <img src="/globe.svg" alt="Logo" className="h-8 w-8 mr-2" />
            <h1 className="text-xl font-semibold text-gray-900">
              Resource Allocation
            </h1>
            
            {/* Navigation */}
            <nav className="flex space-x-1">
              <Link
                href="/"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname === '/'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                Matrix View
              </Link>
              <Link
                href="/calendar"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname === '/calendar'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                Calendar View
              </Link>
              {session?.user?.roles?.includes('admin') && (
              <Link
                href="/admin"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname === '/admin'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                Admin
              </Link>
              )}
              <Link href="/project-planning" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100">
                Project Planning
              </Link>
            </nav>
          </div>
          
          <div className="flex items-center space-x-4">
            <SignInButton />
          </div>
        </div>
      </div>
    </header>
  );
} 