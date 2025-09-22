'use client';

import { useState, useEffect } from 'react';
import { useSession } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import CalendarView from '@/components/CalendarView';
import Filters, { FilterParams } from '@/components/Filters';
import Header from '@/components/Header';
import NewAssignmentModal from '@/components/NewAssignmentModal';

export default function CalendarPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [filters, setFilters] = useState<FilterParams>({ roleIds: [] });
  const [isNewAssignmentModalOpen, setIsNewAssignmentModalOpen] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  if (!session) return null;

  const handleAssignmentCreated = () => {
    // This will trigger a refresh of the CalendarView component
    window.location.reload(); // Simple refresh for now
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">


        {/* Filters */}
        <Filters onFiltersChange={setFilters} />

        {/* Calendar View */}
        <CalendarView 
          filters={filters} 
          onNewAssignment={() => setIsNewAssignmentModalOpen(true)}
        />

        {/* New Assignment Modal */}
        <NewAssignmentModal
          isOpen={isNewAssignmentModalOpen}
          onClose={() => setIsNewAssignmentModalOpen(false)}
          onAssignmentCreated={handleAssignmentCreated}
        />
      </div>
    </div>
  );
} 