import React, { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function TeamsCallback() {
  useEffect(() => {
    // Get the authorization code from URL
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');
    const errorDescription = params.get('error_description');
    
    // Send message to parent window
    if (window.opener) {
      window.opener.postMessage({
        type: 'teams_auth_callback',
        code: code,
        error: error,
        errorDescription: errorDescription
      }, window.location.origin);
    }
    
    // Close this window after a short delay
    setTimeout(() => {
      window.close();
    }, 1000);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5EBE0]">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#464EB8]" />
        <p className="mt-4 text-[#4A3728]">Completing authentication...</p>
        <p className="text-sm text-[#9C8C74]">This window will close automatically</p>
      </div>
    </div>
  );
}
