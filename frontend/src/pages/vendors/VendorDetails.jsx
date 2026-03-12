import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner';
import {
  ArrowLeft, Building2, User, Phone, Mail, MapPin, FileText, Clock,
  CheckCircle, DollarSign, Star, Loader2, ExternalLink, Package,
  Instagram, Youtube, Twitter, Linkedin, Globe, RefreshCw, Calendar
} from 'lucide-react';

const VendorDetails = () => {
  const { vendorId } = useParams();
  const navigate = useNavigate();
  const { api } = useAuth();
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchVendorDetails();
  }, [vendorId]);

  const fetchVendorDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/vendors/${vendorId}`);
      setVendor(res.data);
    } catch (error) {
      console.error('Failed to fetch vendor:', error);
      toast.error('Failed to load vendor details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-emerald-100 text-emerald-700',
      inactive: 'bg-gray-100 text-gray-600',
      under_review: 'bg-amber-100 text-amber-700',
      blacklisted: 'bg-red-100 text-red-700'
    };
    return <Badge className={styles[status] || 'bg-gray-100'}>{status?.replace(/_/g, ' ')}</Badge>;
  };

  const getWorkOrderStatusBadge = (status) => {
    const styles = {
      assigned: 'bg-blue-100 text-blue-700',
      in_progress: 'bg-amber-100 text-amber-700',
      delivered: 'bg-purple-100 text-purple-700',
      completed: 'bg-emerald-100 text-emerald-700',
      cancelled: 'bg-red-100 text-red-700'
    };
    return <Badge className={styles[status] || 'bg-gray-100'}>{status?.replace(/_/g, ' ')}</Badge>;
  };

  const getPlatformIcon = (platform) => {
    const icons = {
      instagram: Instagram,
      youtube: Youtube,
      twitter: Twitter,
      linkedin: Linkedin
    };
    return icons[platform] || Globe;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  const formatCurrency = (amount) => {
    if (!amount) return '₹0';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen bg-[#FDF8F3]">
        <Loader2 className="w-8 h-8 animate-spin text-[#4A3728]" />
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="p-6 bg-[#FDF8F3] min-h-screen">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <div className="text-center py-12 text-[#8B7355]">Vendor not found</div>
      </div>
    );
  }

  const PlatformIcon = getPlatformIcon(vendor.platform);
  const isCreator = vendor.vendor_type === 'freelancer' || vendor.vendor_type === 'influencer';

  return (
    <div className="p-6 space-y-6 bg-[#FDF8F3] min-h-screen" data-testid="vendor-details">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => navigate('/vendors/database')} className="text-[#8B7355] hover:text-[#4A3728]" data-testid="back-btn">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Vendors
      </Button>

      {/* Header Card */}
      <Card className="bg-white border-[#E8D5C4]">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isCreator ? 'bg-gradient-to-br from-pink-500 to-purple-600' : 'bg-[#4A3728]'}`}>
                {isCreator ? (
                  <PlatformIcon className="w-8 h-8 text-white" />
                ) : (
                  <Building2 className="w-8 h-8 text-white" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h1 className="text-2xl font-bold text-[#4A3728]">{vendor.name}</h1>
                  {getStatusBadge(vendor.status)}
                  <Badge variant="outline" className="border-[#D4BBA6]">
                    {vendor.vendor_type || 'vendor'}
                  </Badge>
                </div>
                <p className="text-sm text-[#8B7355]">{vendor.vendor_id} • {vendor.category}</p>
                {isCreator && vendor.handle && (
                  <p className="text-sm text-purple-600 flex items-center gap-1 mt-1">
                    <PlatformIcon className="w-4 h-4" /> {vendor.handle}
                    {vendor.followers && <span className="text-[#8B7355]">• {vendor.followers.toLocaleString()} followers</span>}
                  </p>
                )}
              </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-[#F5EDE5] rounded-lg">
                <p className="text-2xl font-bold text-[#4A3728]">{vendor.statistics?.total_work_orders || 0}</p>
                <p className="text-xs text-[#8B7355]">Work Orders</p>
              </div>
              <div className="text-center p-3 bg-emerald-50 rounded-lg">
                <p className="text-2xl font-bold text-emerald-600">{vendor.statistics?.completed_orders || 0}</p>
                <p className="text-xs text-emerald-700">Completed</p>
              </div>
              <div className="text-center p-3 bg-amber-50 rounded-lg">
                <p className="text-2xl font-bold text-amber-600">{vendor.statistics?.in_progress_orders || 0}</p>
                <p className="text-xs text-amber-700">In Progress</p>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(vendor.statistics?.total_payments || 0)}</p>
                <p className="text-xs text-blue-700">Total Paid</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-[#F5EDE5]">
          <TabsTrigger value="overview" className="data-[state=active]:bg-[#4A3728] data-[state=active]:text-white">Overview</TabsTrigger>
          <TabsTrigger value="work-orders" className="data-[state=active]:bg-[#4A3728] data-[state=active]:text-white">
            Work Orders ({vendor.work_orders?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="proposals" className="data-[state=active]:bg-[#4A3728] data-[state=active]:text-white">
            Proposals ({vendor.proposals?.length || 0})
          </TabsTrigger>
          {isCreator && (
            <TabsTrigger value="payments" className="data-[state=active]:bg-[#4A3728] data-[state=active]:text-white">
              Creator Payments ({vendor.creator_payments?.length || 0})
            </TabsTrigger>
          )}
          <TabsTrigger value="recurring" className="data-[state=active]:bg-[#4A3728] data-[state=active]:text-white">
            Recurring ({vendor.recurring_work?.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Contact Information */}
            <Card className="bg-white border-[#E8D5C4]">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-[#4A3728]">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {vendor.contact_person && (
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-[#8B7355]" />
                    <span className="text-sm text-[#4A3728]">{vendor.contact_person}</span>
                  </div>
                )}
                {vendor.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-[#8B7355]" />
                    <span className="text-sm text-[#4A3728]">{vendor.phone}</span>
                  </div>
                )}
                {vendor.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-[#8B7355]" />
                    <span className="text-sm text-[#4A3728]">{vendor.email}</span>
                  </div>
                )}
                {vendor.address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-[#8B7355] mt-1" />
                    <span className="text-sm text-[#4A3728]">{vendor.address}</span>
                  </div>
                )}
                {vendor.gst_tax_id && (
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-[#8B7355]" />
                    <span className="text-sm text-[#4A3728]">GST: {vendor.gst_tax_id}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Services / Creator Info */}
            <Card className="bg-white border-[#E8D5C4]">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-[#4A3728]">
                  {isCreator ? 'Creator Information' : 'Services'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isCreator ? (
                  <div className="space-y-3">
                    {vendor.platform && (
                      <div className="flex items-center gap-3">
                        <PlatformIcon className="w-4 h-4 text-purple-600" />
                        <span className="text-sm text-[#4A3728] capitalize">{vendor.platform}</span>
                      </div>
                    )}
                    {vendor.creator_category && (
                      <div className="flex items-center gap-3">
                        <Package className="w-4 h-4 text-[#8B7355]" />
                        <span className="text-sm text-[#4A3728]">{vendor.creator_category}</span>
                      </div>
                    )}
                    {vendor.rate_card && (
                      <div className="flex items-start gap-3">
                        <DollarSign className="w-4 h-4 text-[#8B7355] mt-1" />
                        <span className="text-sm text-[#4A3728]">{vendor.rate_card}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {vendor.services?.map((service, idx) => (
                      <Badge key={idx} variant="outline" className="border-[#D4BBA6]">
                        {service}
                      </Badge>
                    ))}
                    {!vendor.services?.length && (
                      <span className="text-sm text-[#8B7355]">No services listed</span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Notes */}
          {vendor.notes && (
            <Card className="bg-white border-[#E8D5C4]">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-[#4A3728]">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[#8B7355]">{vendor.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Rating */}
          {vendor.rating && (
            <Card className="bg-white border-[#E8D5C4]">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                  <span className="text-xl font-bold text-[#4A3728]">{vendor.rating.toFixed(1)}</span>
                </div>
                <span className="text-sm text-[#8B7355]">
                  Based on {vendor.total_ratings || 0} ratings
                </span>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Work Orders Tab */}
        <TabsContent value="work-orders" className="mt-4">
          {vendor.work_orders?.length > 0 ? (
            <div className="space-y-4">
              {/* Summary Card */}
              <Card className="bg-gradient-to-r from-[#4A3728] to-[#5D4A3A] border-0">
                <CardContent className="p-4">
                  <div className="grid grid-cols-4 gap-4 text-white">
                    <div className="text-center">
                      <p className="text-2xl font-bold">{vendor.work_orders.length}</p>
                      <p className="text-xs text-white/70">Total Orders</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">
                        {formatCurrency(vendor.work_orders.reduce((sum, wo) => sum + (wo.agreed_amount || 0), 0))}
                      </p>
                      <p className="text-xs text-white/70">Total Order Value</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-emerald-300">
                        {formatCurrency(vendor.work_orders.reduce((sum, wo) => {
                          const paid = wo.payments?.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount || 0), 0) || 0;
                          return sum + paid;
                        }, 0))}
                      </p>
                      <p className="text-xs text-white/70">Total Paid</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-amber-300">
                        {formatCurrency(vendor.work_orders.reduce((sum, wo) => {
                          const paid = wo.payments?.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount || 0), 0) || 0;
                          return sum + ((wo.agreed_amount || 0) - paid);
                        }, 0))}
                      </p>
                      <p className="text-xs text-white/70">Pending</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Work Orders List */}
              {vendor.work_orders.map((wo) => {
                const totalPaid = wo.payments?.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount || 0), 0) || 0;
                const totalPending = wo.payments?.filter(p => p.status === 'pending').reduce((s, p) => s + (p.amount || 0), 0) || 0;
                const orderAmount = wo.agreed_amount || 0;
                const remaining = orderAmount - totalPaid;

                return (
                  <Card key={wo.id} className="bg-white border-[#E8D5C4] hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                        {/* Order Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="font-semibold text-[#4A3728]">{wo.work_order_id}</span>
                            {getWorkOrderStatusBadge(wo.status)}
                            {wo.payments?.length > 0 && (
                              <Badge variant="outline" className="border-blue-300 text-blue-600">
                                {wo.payments.length} payment{wo.payments.length > 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-[#8B7355] mb-1">{wo.work_description}</p>
                          <p className="text-xs text-[#8B7355]">
                            {wo.department} • Created: {formatDate(wo.created_at)}
                          </p>
                        </div>

                        {/* Amount Summary */}
                        <div className="flex flex-col gap-2 min-w-[200px]">
                          <div className="grid grid-cols-3 gap-2 p-3 bg-[#F5EDE5] rounded-lg text-center">
                            <div>
                              <p className="text-xs text-[#8B7355]">Order</p>
                              <p className="font-bold text-[#4A3728]">{formatCurrency(orderAmount)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-emerald-600">Paid</p>
                              <p className="font-bold text-emerald-600">{formatCurrency(totalPaid)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-amber-600">Balance</p>
                              <p className="font-bold text-amber-600">{formatCurrency(remaining > 0 ? remaining : 0)}</p>
                            </div>
                          </div>

                          {/* Payment History */}
                          {wo.payments?.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-xs text-[#8B7355] font-medium">Payment History:</p>
                              {wo.payments.map((p, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded">
                                  <div className="flex items-center gap-2">
                                    <Badge className={`text-[10px] px-1.5 py-0 ${
                                      p.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                                      p.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                      'bg-gray-100 text-gray-600'
                                    }`}>
                                      {p.status}
                                    </Badge>
                                    <span className="text-[#8B7355] capitalize">{p.payment_type?.replace(/_/g, ' ')}</span>
                                  </div>
                                  <span className={`font-medium ${p.status === 'paid' ? 'text-emerald-600' : 'text-[#4A3728]'}`}>
                                    {formatCurrency(p.amount)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* View Button */}
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => navigate(`/vendors/work-orders`)}
                          className="text-[#8B7355] self-start"
                        >
                          View <ExternalLink className="w-3 h-3 ml-1" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="bg-white border-[#E8D5C4]">
              <CardContent className="p-8 text-center text-[#8B7355]">
                <Package className="w-12 h-12 mx-auto mb-3 text-[#D4BBA6]" />
                <p>No work orders yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Proposals Tab */}
        <TabsContent value="proposals" className="mt-4">
          {vendor.proposals?.length > 0 ? (
            <div className="space-y-3">
              {vendor.proposals.map((p) => (
                <Card key={p.id} className={`bg-white border-[#E8D5C4] ${p.status === 'selected' ? 'border-l-4 border-l-emerald-500' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-[#4A3728]">{formatCurrency(p.amount)}</span>
                          <Badge className={
                            p.status === 'selected' ? 'bg-emerald-100 text-emerald-700' :
                            p.status === 'rejected' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-600'
                          }>
                            {p.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-[#8B7355]">
                          Requirement: {p.requirement_id} • Delivery: {p.delivery_days || '-'} days
                        </p>
                        <p className="text-xs text-[#8B7355] mt-1">Submitted: {formatDate(p.created_at)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-white border-[#E8D5C4]">
              <CardContent className="p-8 text-center text-[#8B7355]">
                <FileText className="w-12 h-12 mx-auto mb-3 text-[#D4BBA6]" />
                <p>No proposals submitted</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Creator Payments Tab */}
        {isCreator && (
          <TabsContent value="payments" className="mt-4">
            {vendor.creator_payments?.length > 0 ? (
              <div className="space-y-3">
                {vendor.creator_payments.map((cp) => (
                  <Card key={cp.id} className="bg-white border-[#E8D5C4]">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-[#4A3728]">{cp.payment_id}</span>
                            <Badge className={
                              cp.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                              cp.status === 'ready_for_payment' ? 'bg-blue-100 text-blue-700' :
                              cp.status === 'payment_requested' ? 'bg-purple-100 text-purple-700' :
                              'bg-amber-100 text-amber-700'
                            }>
                              {cp.status?.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                          <p className="text-sm text-[#4A3728]">{cp.campaign_project}</p>
                          <p className="text-xs text-[#8B7355]">
                            {cp.deliverable_type} • {formatCurrency(cp.agreed_fee)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-[#4A3728]">{formatCurrency(cp.agreed_fee)}</p>
                          <p className="text-xs text-[#8B7355]">{cp.payment_type?.replace(/_/g, ' ')}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-white border-[#E8D5C4]">
                <CardContent className="p-8 text-center text-[#8B7355]">
                  <DollarSign className="w-12 h-12 mx-auto mb-3 text-[#D4BBA6]" />
                  <p>No creator payments yet</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        {/* Recurring Tab */}
        <TabsContent value="recurring" className="mt-4">
          {vendor.recurring_work?.length > 0 ? (
            <div className="space-y-3">
              {vendor.recurring_work.map((r) => (
                <Card key={r.id} className="bg-white border-[#E8D5C4]">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <RefreshCw className="w-4 h-4 text-[#8B7355]" />
                          <span className="font-medium text-[#4A3728]">{r.name}</span>
                          <Badge variant="outline" className="border-[#D4BBA6]">{r.frequency}</Badge>
                        </div>
                        <p className="text-sm text-[#8B7355]">{r.description}</p>
                        <p className="text-xs text-[#8B7355] mt-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Next due: {formatDate(r.next_due_date)}
                        </p>
                      </div>
                      {r.estimated_amount && (
                        <span className="font-bold text-[#4A3728]">{formatCurrency(r.estimated_amount)}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-white border-[#E8D5C4]">
              <CardContent className="p-8 text-center text-[#8B7355]">
                <RefreshCw className="w-12 h-12 mx-auto mb-3 text-[#D4BBA6]" />
                <p>No recurring work schedules</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VendorDetails;
