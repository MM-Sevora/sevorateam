/**
 * Shared hook for fetching departments from HR API
 * Use this hook across modules to ensure dynamic department data
 */
import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';

export const useDepartments = (options = {}) => {
  const { includeInactive = false, autoFetch = true } = options;
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = includeInactive ? '?include_inactive=true' : '';
      const res = await api.get(`/hr/departments${params}`);
      setDepartments(res.data || []);
    } catch (err) {
      console.error('Failed to fetch departments:', err);
      setError(err.message || 'Failed to fetch departments');
      // Fallback to workos endpoint if hr endpoint fails
      try {
        const fallbackRes = await api.get('/workos/departments');
        setDepartments(fallbackRes.data || []);
      } catch (fallbackErr) {
        console.error('Fallback also failed:', fallbackErr);
      }
    }
    setLoading(false);
  }, [includeInactive]);

  useEffect(() => {
    if (autoFetch) {
      fetchDepartments();
    }
  }, [autoFetch, fetchDepartments]);

  return {
    departments,
    loading,
    error,
    refetch: fetchDepartments,
    // Helper to get department name by id
    getDepartmentName: (id) => departments.find(d => d.id === id)?.name || null,
    // Helper to get department options for Select components
    departmentOptions: departments.map(d => ({ value: d.id, label: d.name }))
  };
};

export default useDepartments;
