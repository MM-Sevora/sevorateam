import React, { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { toast } from 'sonner';

/**
 * Export utility functions and component for data export
 */

// Convert data to CSV format
export const exportToCSV = (data, filename, columns = null) => {
  if (!data || data.length === 0) {
    toast.error('No data to export');
    return;
  }

  // Use provided columns or extract from first row
  const headers = columns 
    ? columns.map(c => c.label || c.key) 
    : Object.keys(data[0]);
  
  const keys = columns 
    ? columns.map(c => c.key) 
    : Object.keys(data[0]);

  // Build CSV content
  const csvRows = [
    headers.join(','), // Header row
    ...data.map(row => 
      keys.map(key => {
        let value = getNestedValue(row, key);
        // Handle special cases
        if (value === null || value === undefined) value = '';
        if (typeof value === 'object') value = JSON.stringify(value);
        // Escape quotes and wrap in quotes if contains comma
        value = String(value).replace(/"/g, '""');
        if (value.includes(',') || value.includes('\n') || value.includes('"')) {
          value = `"${value}"`;
        }
        return value;
      }).join(',')
    )
  ];

  const csvContent = csvRows.join('\n');
  downloadFile(csvContent, `${filename}.csv`, 'text/csv');
  toast.success(`Exported ${data.length} records to CSV`);
};

// Convert data to JSON format
export const exportToJSON = (data, filename) => {
  if (!data || data.length === 0) {
    toast.error('No data to export');
    return;
  }

  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(jsonContent, `${filename}.json`, 'application/json');
  toast.success(`Exported ${data.length} records to JSON`);
};

// Convert data to Excel-compatible format (TSV)
export const exportToExcel = (data, filename, columns = null) => {
  if (!data || data.length === 0) {
    toast.error('No data to export');
    return;
  }

  const headers = columns 
    ? columns.map(c => c.label || c.key) 
    : Object.keys(data[0]);
  
  const keys = columns 
    ? columns.map(c => c.key) 
    : Object.keys(data[0]);

  // Build TSV content (Excel-friendly)
  const tsvRows = [
    headers.join('\t'),
    ...data.map(row => 
      keys.map(key => {
        let value = getNestedValue(row, key);
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value).replace(/\t/g, ' ').replace(/\n/g, ' ');
      }).join('\t')
    )
  ];

  const tsvContent = tsvRows.join('\n');
  downloadFile(tsvContent, `${filename}.xls`, 'application/vnd.ms-excel');
  toast.success(`Exported ${data.length} records to Excel`);
};

// Helper to get nested object values (e.g., "user.email")
const getNestedValue = (obj, path) => {
  return path.split('.').reduce((current, key) => 
    current && current[key] !== undefined ? current[key] : null, obj
  );
};

// Download file helper
const downloadFile = (content, filename, mimeType) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Export Button Component
 * @param {Object} props
 * @param {Array} props.data - Data to export
 * @param {string} props.filename - Base filename (without extension)
 * @param {Array} props.columns - Optional column definitions [{key, label}]
 * @param {boolean} props.loading - Show loading state
 * @param {string} props.variant - Button variant
 * @param {string} props.size - Button size
 */
export const ExportButton = ({ 
  data, 
  filename = 'export', 
  columns = null,
  loading = false,
  variant = 'outline',
  size = 'sm',
  className = '',
  onExport = null
}) => {
  const [exporting, setExporting] = useState(false);

  const handleExport = async (format) => {
    setExporting(true);
    
    try {
      // Allow custom export handler
      const exportData = onExport ? await onExport() : data;
      
      if (!exportData || exportData.length === 0) {
        toast.error('No data to export');
        return;
      }

      switch (format) {
        case 'csv':
          exportToCSV(exportData, filename, columns);
          break;
        case 'excel':
          exportToExcel(exportData, filename, columns);
          break;
        case 'json':
          exportToJSON(exportData, filename);
          break;
        default:
          exportToCSV(exportData, filename, columns);
      }
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const isLoading = loading || exporting;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={variant} 
          size={size} 
          disabled={isLoading}
          className={className}
          data-testid="export-btn"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-white">
        <DropdownMenuItem onClick={() => handleExport('csv')} data-testid="export-csv">
          <FileText className="h-4 w-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('excel')} data-testid="export-excel">
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Export as Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('json')} data-testid="export-json">
          <FileText className="h-4 w-4 mr-2" />
          Export as JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ExportButton;
