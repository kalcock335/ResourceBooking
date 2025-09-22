import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import AdminPanel from '@/components/AdminPanel';
import Header from '@/components/Header';

export default async function AdminPage() {
  const session = await auth();
  
  // Check if user is authenticated and has admin role
  if (!session?.user) {
    redirect('/auth/signin');
  }
  if (!session.user.roles?.includes('admin')) {
    redirect('/');
  }
  
  // For demo purposes, we'll consider any authenticated user as admin
  // In a real app, you'd check for a specific role field
  // if (session.user.role !== 'admin') {
  //   redirect('/matrix');
  // }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Panel</h1>
          <p className="text-gray-600">
            Manage resources and projects for the resource allocation system.
          </p>
        </div>
        
        <AdminPanel />
      </div>
    </div>
  );
} 