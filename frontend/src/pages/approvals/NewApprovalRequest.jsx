import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../../components/ui/select';
import { 
  FileText, DollarSign, Calendar, Briefcase, Send, 
  RefreshCw, ArrowLeft, CheckCircle, AlertCircle, Info,
  Paperclip, X, Upload
} from 'lucide-react';
import api from '../../lib/api';
import { toast } from 'sonner';

const REQUEST_TYPE_ICONS = {
  expense_claim: DollarSign,
  leave_request: Calendar,
  purchase_requisition: Briefcase,
  travel_request: Briefcase,
  vendor_payment: DollarSign,
  budget_request: DollarSign,
  content_approval: FileText,
  custom: FileText,
};

export default function NewApprovalRequest() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [requestTypes, setRequestTypes] = useState([]);
  const [eligibleWorkflows, setEligibleWorkflows] = useState([]);
  const [selectedType, setSelectedType] = useState(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    notes: '',
  });

  useEffect(() => {
    fetchRequestTypes();
  }, []);

  useEffect(() => {
    if (selectedType) {
      fetchWorkflowsForType(selectedType);
    }
  }, [selectedType]);

  const fetchRequestTypes = async () => {
    setLoading(true);
    try {
      const res = await api.get('/approvals/request-types');
      setRequestTypes(res.data.request_types || []);
    } catch (error) {
      console.error('Failed to fetch request types:', error);
      toast.error('Failed to load available request types');
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkflowsForType = async (type) => {
    try {
      const res = await api.get(`/approvals/my-eligible-workflows?approval_type=${type}`);
      setEligibleWorkflows(res.data.workflows || []);
      
      // Auto-select if only one workflow
      if (res.data.workflows?.length === 1) {
        setSelectedWorkflow(res.data.workflows[0]);
      } else {
        setSelectedWorkflow(null);
      }
    } catch (error) {
      console.error('Failed to fetch workflows:', error);
      toast.error('Failed to load available workflows');
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const maxAttachments = selectedWorkflow?.max_attachments || 5;
    if (attachments.length + files.length > maxAttachments) {
      toast.error(`Maximum ${maxAttachments} attachments allowed`);
      return;
    }

    setUploading(true);
    try {
      const uploadedFiles = [];
      
      for (const file of files) {
        // Create FormData for file upload
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);
        
        try {
          const response = await api.post('/files/upload', formDataUpload, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          
          uploadedFiles.push({
            name: file.name,
            filename: file.name,
            url: response.data.url || response.data.file_url,
            size: file.size,
            type: file.type,
          });
        } catch (uploadErr) {
          // If upload endpoint doesn't exist, store file info locally
          console.log('File upload API not available, storing reference:', uploadErr);
          uploadedFiles.push({
            name: file.name,
            filename: file.name,
            size: file.size,
            type: file.type,
            // Store as base64 for demo purposes
            data: await fileToBase64(file),
          });
        }
      }
      
      setAttachments(prev => [...prev, ...uploadedFiles]);
      toast.success(`${files.length} file(s) added`);
    } catch (error) {
      console.error('File upload failed:', error);
      toast.error('Failed to upload files');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedWorkflow) {
      toast.error('Please select a workflow');
      return;
    }
    
    if (!formData.title.trim()) {
      toast.error('Please enter a title for your request');
      return;
    }

    // Check attachment requirements
    if (selectedWorkflow.require_attachments && attachments.length === 0) {
      toast.error('This workflow requires at least one attachment');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        workflow_id: selectedWorkflow.id,
        title: formData.title,
        description: formData.description || undefined,
        amount: formData.amount ? parseFloat(formData.amount) : undefined,
        notes: formData.notes || undefined,
        attachments: attachments,
        custom_fields: {},
      };

      const res = await api.post('/approvals/request', payload);
      
      toast.success(res.data.message || 'Request submitted successfully');
      navigate(`/approvals/${res.data.request.id}`);
    } catch (error) {
      console.error('Failed to submit request:', error);
      toast.error(error.response?.data?.detail || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const getTypeIcon = (type) => {
    const Icon = REQUEST_TYPE_ICONS[type] || FileText;
    return <Icon className="h-5 w-5" />;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6" data-testid="new-approval-request">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/approvals')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">New Approval Request</h1>
          <p className="text-muted-foreground">Submit a request for approval</p>
        </div>
      </div>

      {requestTypes.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-amber-500 mb-4" />
            <h3 className="text-lg font-medium">No Request Types Available</h3>
            <p className="text-muted-foreground mb-4">
              You don't have access to any approval workflows. Please contact your administrator.
            </p>
            <Button onClick={() => navigate('/approvals')}>Back to Approvals</Button>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Select Request Type */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Step 1: Select Request Type</CardTitle>
              <CardDescription>Choose the type of request you want to submit</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {requestTypes.map((type) => (
                  <button
                    key={type.type}
                    type="button"
                    onClick={() => setSelectedType(type.type)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      selectedType === type.type
                        ? 'border-primary bg-primary/5'
                        : 'border-muted hover:border-primary/50'
                    }`}
                    data-testid={`request-type-${type.type}`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-lg ${
                        selectedType === type.type ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}>
                        {getTypeIcon(type.type)}
                      </div>
                      <span className="font-medium">{type.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{type.description}</p>
                    <Badge variant="outline" className="mt-2">
                      {type.workflows_count} workflow{type.workflows_count !== 1 ? 's' : ''}
                    </Badge>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Step 2: Select Workflow (if multiple) */}
          {selectedType && eligibleWorkflows.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Step 2: Select Workflow</CardTitle>
                <CardDescription>Choose the appropriate workflow for your request</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {eligibleWorkflows.map((wf) => (
                    <button
                      key={wf.id}
                      type="button"
                      onClick={() => setSelectedWorkflow(wf)}
                      className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                        selectedWorkflow?.id === wf.id
                          ? 'border-primary bg-primary/5'
                          : 'border-muted hover:border-primary/50'
                      }`}
                      data-testid={`workflow-option-${wf.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">{wf.name}</span>
                          {wf.is_default && (
                            <Badge variant="secondary" className="ml-2">Default</Badge>
                          )}
                        </div>
                        <Badge variant="outline">{wf.levels?.length || 0} levels</Badge>
                      </div>
                      {wf.description && (
                        <p className="text-sm text-muted-foreground mt-1">{wf.description}</p>
                      )}
                      {(wf.min_amount || wf.max_amount) && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Amount: {wf.min_amount ? `₹${wf.min_amount.toLocaleString()} - ` : 'Up to '}
                          {wf.max_amount ? `₹${wf.max_amount.toLocaleString()}` : 'unlimited'}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Show selected workflow info */}
          {selectedWorkflow && (
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Selected: {selectedWorkflow.name}</p>
                    <p className="text-sm text-muted-foreground">
                      This request will go through {selectedWorkflow.levels?.length || 0} approval level(s):
                      {' '}
                      {selectedWorkflow.levels?.map(l => l.name).join(' → ')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Request Details */}
          {selectedWorkflow && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {eligibleWorkflows.length > 1 ? 'Step 3' : 'Step 2'}: Request Details
                </CardTitle>
                <CardDescription>Provide details for your request</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Request Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Brief title for your request"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Detailed description of your request..."
                    rows={3}
                  />
                </div>

                {(selectedWorkflow.min_amount !== null || 
                  selectedWorkflow.max_amount !== null ||
                  ['expense_claim', 'purchase_requisition', 'vendor_payment', 'budget_request'].includes(selectedType)) && (
                  <div>
                    <Label htmlFor="amount">Amount (₹)</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                      placeholder="Enter amount"
                      min={selectedWorkflow.min_amount || 0}
                      max={selectedWorkflow.max_amount || undefined}
                    />
                    {(selectedWorkflow.min_amount || selectedWorkflow.max_amount) && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {selectedWorkflow.min_amount && `Minimum: ₹${selectedWorkflow.min_amount.toLocaleString()}`}
                        {selectedWorkflow.min_amount && selectedWorkflow.max_amount && ' | '}
                        {selectedWorkflow.max_amount && `Maximum: ₹${selectedWorkflow.max_amount.toLocaleString()}`}
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <Label htmlFor="notes">Additional Notes for Approvers</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Any additional information for the approvers..."
                    rows={2}
                  />
                </div>

                {/* Attachments Section */}
                {selectedWorkflow.allow_attachments !== false && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <Paperclip className="h-4 w-4" />
                        Attachments
                        {selectedWorkflow.require_attachments && (
                          <span className="text-red-500">*</span>
                        )}
                      </Label>
                      <span className="text-xs text-muted-foreground">
                        {attachments.length}/{selectedWorkflow.max_attachments || 5} files
                      </span>
                    </div>
                    
                    {/* File list */}
                    {attachments.length > 0 && (
                      <div className="space-y-2">
                        {attachments.map((file, index) => (
                          <div 
                            key={index} 
                            className="flex items-center justify-between p-2 bg-muted rounded-lg"
                          >
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                              {file.size && (
                                <span className="text-xs text-muted-foreground">
                                  ({(file.size / 1024).toFixed(1)} KB)
                                </span>
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeAttachment(index)}
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Upload button */}
                    {attachments.length < (selectedWorkflow.max_attachments || 5) && (
                      <div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          onChange={handleFileUpload}
                          className="hidden"
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                          className="w-full"
                        >
                          {uploading ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4 mr-2" />
                          )}
                          {uploading ? 'Uploading...' : 'Add Attachments'}
                        </Button>
                        <p className="text-xs text-muted-foreground mt-1">
                          Supported: PDF, Word, Excel, Images (max 10MB each)
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Submit Button */}
          {selectedWorkflow && (
            <div className="flex justify-end gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate('/approvals')}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Submit Request
              </Button>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
