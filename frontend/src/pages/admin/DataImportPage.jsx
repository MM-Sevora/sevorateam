import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import { 
  Upload, Database, FileJson, CheckCircle2, AlertCircle, 
  RefreshCw, Download, ArrowLeft, Package, Users, Factory, Building2, Activity
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_BACKEND_URL;

const COLLECTION_INFO = {
  sourcing_brands: {
    name: 'Brands',
    icon: Package,
    description: 'Brand database for sourcing',
    color: 'bg-blue-100 text-blue-700'
  },
  sourcing_contacts: {
    name: 'Contacts',
    icon: Users,
    description: 'Contact information for brands/suppliers',
    color: 'bg-green-100 text-green-700'
  },
  sourcing_suppliers: {
    name: 'Suppliers',
    icon: Building2,
    description: 'Supplier database',
    color: 'bg-purple-100 text-purple-700'
  },
  sourcing_manufacturers: {
    name: 'Manufacturers',
    icon: Factory,
    description: 'Manufacturer database',
    color: 'bg-orange-100 text-orange-700'
  },
  sourcing_activity_logs: {
    name: 'Activity Logs',
    icon: Activity,
    description: 'Activity history logs',
    color: 'bg-gray-100 text-gray-700'
  }
};

const DataImportPage = () => {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [collections, setCollections] = useState([]);
  const [collectionCounts, setCollectionCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState({});
  const [importMode, setImportMode] = useState('merge');

  useEffect(() => {
    fetchCollections();
  }, []);

  const fetchCollections = async () => {
    try {
      const token = localStorage.getItem('sevora_token');
      
      // Get available collections
      const res = await fetch(`${API}/api/data-import/collections`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setCollections(data.collections || []);
        
        // Get counts for each collection
        const counts = {};
        for (const coll of data.collections || []) {
          try {
            const countRes = await fetch(`${API}/api/data-import/status/${coll}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (countRes.ok) {
              const countData = await countRes.json();
              counts[coll] = countData.document_count;
            }
          } catch (e) {
            counts[coll] = 'N/A';
          }
        }
        setCollectionCounts(counts);
      }
    } catch (error) {
      console.error('Failed to fetch collections:', error);
      toast.error('Failed to load collections');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (collectionName, event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast.error('Please upload a JSON file');
      return;
    }

    setUploading(prev => ({ ...prev, [collectionName]: true }));

    try {
      const token = localStorage.getItem('sevora_token');
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(
        `${API}/api/data-import/upload/${collectionName}?mode=${importMode}`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        }
      );

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(
          `Imported ${data.imported} new, updated ${data.updated}, skipped ${data.skipped}`
        );
        // Refresh counts
        fetchCollections();
      } else {
        toast.error(data.detail || 'Import failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed');
    } finally {
      setUploading(prev => ({ ...prev, [collectionName]: false }));
      // Reset file input
      event.target.value = '';
    }
  };

  const handleExport = async (collectionName) => {
    try {
      const token = localStorage.getItem('sevora_token');
      const res = await fetch(`${API}/api/data-import/export/${collectionName}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${collectionName}_export.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        toast.success(`${collectionName} exported successfully`);
      } else {
        toast.error('Export failed');
      }
    } catch (error) {
      toast.error('Export failed');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-[#8B7355]" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-[#4A3728] flex items-center gap-2">
            <Database className="w-6 h-6" />
            Data Import
          </h1>
          <p className="text-sm text-gray-600">
            Import JSON data into your database collections
          </p>
        </div>
      </div>

      {/* Import Mode Selection */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Import Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-[#4A3728]">Import Mode:</span>
            <Select value={importMode} onValueChange={setImportMode}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="merge">
                  <div className="flex flex-col">
                    <span className="font-medium">Merge</span>
                    <span className="text-xs text-gray-500">Add new, update existing (recommended)</span>
                  </div>
                </SelectItem>
                <SelectItem value="replace">
                  <div className="flex flex-col">
                    <span className="font-medium">Replace All</span>
                    <span className="text-xs text-gray-500">Delete existing, import fresh</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          {importMode === 'replace' && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Replace mode will delete all existing data in the collection before importing!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export / Download Section */}
      <Card className="mb-6 border-green-200 bg-green-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Download className="w-5 h-5 text-green-600" />
            Export Data (Download from this environment)
          </CardTitle>
          <CardDescription>
            Download your data as JSON files
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline"
              onClick={() => handleExport('sourcing_brands')}
              className="gap-2"
            >
              <FileJson className="w-4 h-4 text-blue-600" />
              Export Brands
            </Button>
            <Button 
              variant="outline"
              onClick={() => handleExport('sourcing_contacts')}
              className="gap-2"
            >
              <FileJson className="w-4 h-4 text-green-600" />
              Export Contacts
            </Button>
            <Button 
              variant="outline"
              onClick={() => handleExport('sourcing_suppliers')}
              className="gap-2"
            >
              <FileJson className="w-4 h-4 text-purple-600" />
              Export Suppliers
            </Button>
            <Button 
              variant="outline"
              onClick={() => handleExport('sourcing_manufacturers')}
              className="gap-2"
            >
              <FileJson className="w-4 h-4 text-orange-600" />
              Export Manufacturers
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Collection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {collections.map(collectionName => {
          const info = COLLECTION_INFO[collectionName] || {
            name: collectionName,
            icon: Database,
            description: '',
            color: 'bg-gray-100 text-gray-700'
          };
          const Icon = info.icon;
          const count = collectionCounts[collectionName];
          const isUploading = uploading[collectionName];

          return (
            <Card key={collectionName} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${info.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{info.name}</CardTitle>
                      <CardDescription>{info.description}</CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-sm">
                    {count !== undefined ? `${count} docs` : 'Loading...'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => handleFileUpload(collectionName, e)}
                    className="hidden"
                    id={`file-${collectionName}`}
                    disabled={isUploading}
                  />
                  <label
                    htmlFor={`file-${collectionName}`}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                      isUploading 
                        ? 'bg-gray-100 border-gray-300 cursor-not-allowed' 
                        : 'border-[#E8D5C4] hover:border-[#8B7355] hover:bg-[#F5EBE0]/50'
                    }`}
                  >
                    {isUploading ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin text-[#8B7355]" />
                        <span className="text-sm text-gray-600">Importing...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 text-[#8B7355]" />
                        <span className="text-sm text-[#4A3728]">
                          Click to upload JSON file
                        </span>
                      </>
                    )}
                  </label>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Instructions */}
      <Card className="mt-6 bg-[#F5EBE0]/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            How to Import
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm text-[#5D4A3A]">
            <li>Download the JSON export files from the blue box above</li>
            <li>Select import mode (Merge recommended for first import)</li>
            <li>Click the upload area for each collection and select the corresponding JSON file</li>
            <li>Wait for the import to complete - you'll see a success message</li>
            <li>Verify data by checking the document count or visiting the Sourcing pages</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
};

export default DataImportPage;
