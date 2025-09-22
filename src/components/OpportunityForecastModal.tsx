import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { RESOURCE_ROLE_OPTIONS } from '../types/resourceRoles';

interface OpportunityForecastModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function OpportunityForecastModal({ isOpen, onClose }: OpportunityForecastModalProps) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      role: '',
      quantity: 1,
      daysPerWeek: 1,
      numWeeks: 1,
      startDate: '',
    },
  });
  const [suggestion, setSuggestion] = useState<string | null>(null);

  if (!isOpen) return null;

  const onForecastSubmit = (data: any) => {
    setSuggestion(
      `Suggesting ${data.quantity} ${data.role}(s) for ${data.daysPerWeek} days/week over ${data.numWeeks} weeks starting ${data.startDate}`
    );
  };

  return (
    <div className="fixed inset-0 bg-white/70 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Opportunity Forecast</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit(onForecastSubmit)} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
            <select
              {...register('role', { required: 'Role is required' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select role</option>
              {RESOURCE_ROLE_OPTIONS.filter(opt => !opt.isAdmin).map((role) => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
            {errors.role && <p className="text-red-500 text-xs mt-1">{errors.role.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
            <input
              type="number"
              {...register('quantity', { required: 'Quantity is required', min: 1 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            {errors.quantity && <p className="text-red-500 text-xs mt-1">{errors.quantity.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Days per Week *</label>
            <input
              type="number"
              {...register('daysPerWeek', { required: 'Days per week is required', min: 1, max: 5 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            {errors.daysPerWeek && <p className="text-red-500 text-xs mt-1">{errors.daysPerWeek.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Number of Weeks *</label>
            <input
              type="number"
              {...register('numWeeks', { required: 'Number of weeks is required', min: 1 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            {errors.numWeeks && <p className="text-red-500 text-xs mt-1">{errors.numWeeks.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
            <input
              type="date"
              {...register('startDate', { required: 'Start date is required' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            {errors.startDate && <p className="text-red-500 text-xs mt-1">{errors.startDate.message}</p>}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700">Suggest</button>
          </div>
          {suggestion && (
            <div className="mt-4 p-3 bg-blue-50 text-blue-800 rounded text-sm border border-blue-200">{suggestion}</div>
          )}
        </form>
      </div>
    </div>
  );
} 