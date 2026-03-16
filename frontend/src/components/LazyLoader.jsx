import React from 'react';

export const LazyLoader = () => (
  <div className="min-h-screen bg-white flex items-center justify-center">
    <div className="text-center">
      <div className="w-8 h-8 border-2 border-[#4A3728] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
      <p className="text-sm text-gray-500">Loading...</p>
    </div>
  </div>
);

export default LazyLoader;
