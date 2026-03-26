import { useEffect, useCallback } from 'react';

/**
 * Custom hook for keyboard shortcuts
 * @param {Object} shortcuts - Object mapping key combinations to callbacks
 * Example: { 'ctrl+n': () => openNewModal(), 'escape': () => closeModal() }
 */
export const useKeyboardShortcuts = (shortcuts, enabled = true) => {
  const handleKeyDown = useCallback((event) => {
    if (!enabled) return;
    
    // Don't trigger shortcuts when typing in inputs
    if (event.target.tagName === 'INPUT' || 
        event.target.tagName === 'TEXTAREA' || 
        event.target.isContentEditable) {
      // Only allow Escape in inputs
      if (event.key !== 'Escape') return;
    }
    
    const key = event.key.toLowerCase();
    const ctrl = event.ctrlKey || event.metaKey;
    const shift = event.shiftKey;
    const alt = event.altKey;
    
    // Build key combination string
    let combo = '';
    if (ctrl) combo += 'ctrl+';
    if (shift) combo += 'shift+';
    if (alt) combo += 'alt+';
    combo += key;
    
    // Check if this combination has a handler
    if (shortcuts[combo]) {
      event.preventDefault();
      shortcuts[combo](event);
    }
  }, [shortcuts, enabled]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
};

/**
 * Common shortcuts reference:
 * - ctrl+n: New item
 * - ctrl+s: Save
 * - ctrl+f: Focus search
 * - escape: Close modal/cancel
 * - ctrl+enter: Submit form
 */

export default useKeyboardShortcuts;
