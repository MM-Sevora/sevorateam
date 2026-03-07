import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { Toaster } from '../components/ui/sonner';
import { Sparkles, CheckCircle } from 'lucide-react';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const LeadCapturePage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [partnerData, setPartnerData] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    occasion: '',
    city: '',
    notes: '',
  });

  const qrId = searchParams.get('qr');
  const source = searchParams.get('source') || 'Website';
  const partnerId = searchParams.get('partner');
  const campaignId = searchParams.get('campaign');

  useEffect(() => {
    if (qrId) {
      fetchQRData();
    }
  }, [qrId]);

  const fetchQRData = async () => {
    try {
      const response = await axios.get(`${API_URL}/qrcodes/${qrId}`);
      setQrData(response.data);
    } catch (error) {
      console.error('QR code not found');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API_URL}/public/lead${qrId ? `?qr_code_id=${qrId}` : ''}`, {
        ...formData,
        source: qrData?.source_type || source,
        source_details: qrData?.name || null,
        campaign_id: qrData?.campaign_id || campaignId || null,
        partner_id: qrData?.partner_id || partnerId || null,
      });
      setSubmitted(true);
      toast.success('Thank you! Our stylist will contact you soon.');
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#FDFCFA] flex items-center justify-center p-6" data-testid="capture-success">
        <Toaster position="top-center" />
        <Card className="max-w-md w-full p-8 text-center border border-border">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-heading text-foreground mb-2">Thank You!</h1>
          <p className="text-muted-foreground mb-6">
            Your information has been received. One of our stylists will reach out to you soon to help you with your fashion needs.
          </p>
          <Button
            onClick={() => window.location.href = 'https://sevora.com'}
            className="rounded-sm uppercase tracking-wider text-xs"
          >
            Explore Sevora
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCFA]" data-testid="lead-capture-page">
      <Toaster position="top-center" />
      
      {/* Header */}
      <div className="bg-primary text-white py-6 px-6">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-heading">Sevora</h1>
            <p className="text-xs text-white/70 uppercase tracking-widest">Stylist-Led Fashion</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-md mx-auto p-6">
        {qrData && (
          <div className="mb-6 p-4 bg-gold/10 border border-gold/30">
            <p className="text-sm text-muted-foreground">
              You're connecting from: <span className="font-medium text-foreground">{qrData.name}</span>
            </p>
          </div>
        )}

        <Card className="p-6 border border-border">
          <h2 className="text-xl font-heading mb-2">Get Styled by Experts</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Share your details and our fashion stylists will help you find the perfect outfits for your special occasions.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider">Your Name *</Label>
              <Input
                data-testid="capture-name-input"
                className="rounded-none"
                placeholder="Enter your name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider">Phone Number *</Label>
              <Input
                data-testid="capture-phone-input"
                className="rounded-none"
                placeholder="+91 9876543210"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider">Email (Optional)</Label>
              <Input
                data-testid="capture-email-input"
                type="email"
                className="rounded-none"
                placeholder="you@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider">Occasion</Label>
              <Select
                value={formData.occasion}
                onValueChange={(value) => setFormData({ ...formData, occasion: value })}
              >
                <SelectTrigger data-testid="capture-occasion-select" className="rounded-none">
                  <SelectValue placeholder="What's the occasion?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Wedding">Wedding</SelectItem>
                  <SelectItem value="Reception">Reception</SelectItem>
                  <SelectItem value="Engagement">Engagement</SelectItem>
                  <SelectItem value="Mehendi">Mehendi/Haldi</SelectItem>
                  <SelectItem value="Sangeet">Sangeet</SelectItem>
                  <SelectItem value="Festival">Festival</SelectItem>
                  <SelectItem value="Party">Party/Event</SelectItem>
                  <SelectItem value="Corporate">Corporate</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider">City</Label>
              <Input
                data-testid="capture-city-input"
                className="rounded-none"
                placeholder="Your city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider">Any specific requirements?</Label>
              <Textarea
                data-testid="capture-notes-input"
                className="rounded-none"
                rows={3}
                placeholder="Tell us what you're looking for..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            <Button
              type="submit"
              data-testid="capture-submit-btn"
              className="w-full rounded-sm uppercase tracking-wider text-xs py-6"
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Connect with a Stylist'}
            </Button>
          </form>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          By submitting, you agree to receive styling assistance from Sevora.
        </p>
      </div>
    </div>
  );
};

export default LeadCapturePage;
