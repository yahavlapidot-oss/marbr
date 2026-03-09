'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Loader2, QrCode, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import Image from 'next/image';

export default function QrPage() {
  const businessId = useAuthStore((s) => s.businessId);
  const [campaignId, setCampaignId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const { data: campaigns } = useQuery({
    queryKey: ['campaigns', businessId],
    queryFn: () => api.get(`/campaigns?businessId=${businessId}`).then((r) => r.data),
    enabled: !!businessId,
  });

  const { data: branches } = useQuery({
    queryKey: ['branches', businessId],
    queryFn: () => api.get(`/branches?businessId=${businessId}`).then((r) => r.data),
    enabled: !!businessId,
  });

  const generate = useMutation({
    mutationFn: () => api.post('/entries/qr/generate', {}, { params: { campaignId, branchId } }).then((r) => r.data),
    onSuccess: (data) => setQrDataUrl(data.qrDataUrl),
    onError: (err: any) => alert(err?.response?.data?.message ?? 'Failed to generate QR code'),
  });

  const download = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `qr-${campaignId}.png`;
    a.click();
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-white">QR Code Generator</h1>
        <p className="text-[#6b6b80] text-sm mt-1">Generate entry QR codes for campaigns</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Generate QR</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Campaign</Label>
            <select
              value={campaignId}
              onChange={(e) => { setCampaignId(e.target.value); setQrDataUrl(null); }}
              className="w-full rounded-md border border-[#2a2a3a] bg-[#12121a] text-white px-3 py-2 text-sm"
            >
              <option value="">Select campaign…</option>
              {campaigns?.filter((c: any) => c.status === 'ACTIVE').map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label>Branch</Label>
            <select
              value={branchId}
              onChange={(e) => { setBranchId(e.target.value); setQrDataUrl(null); }}
              className="w-full rounded-md border border-[#2a2a3a] bg-[#12121a] text-white px-3 py-2 text-sm"
            >
              <option value="">Select branch…</option>
              {branches?.map((b: any) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <Button
            className="w-full"
            disabled={!campaignId || !branchId || generate.isPending}
            onClick={() => generate.mutate()}
          >
            {generate.isPending
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
              : <><QrCode className="h-4 w-4" /> Generate QR Code</>
            }
          </Button>
        </CardContent>
      </Card>

      {qrDataUrl && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-8">
            <div className="rounded-xl bg-white p-4 shadow-xl">
              <Image src={qrDataUrl} alt="QR Code" width={240} height={240} unoptimized />
            </div>
            <p className="text-[#6b6b80] text-sm text-center">
              This QR code expires in 5 minutes. Customers scan it to enter the campaign.
            </p>
            <Button variant="outline" onClick={download}>
              <Download className="h-4 w-4" /> Download PNG
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
