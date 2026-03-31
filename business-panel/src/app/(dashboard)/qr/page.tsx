'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, QrCode, Download, Maximize2, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useLocaleStore } from '@/lib/locale-store';
import Image from 'next/image';

const ROTATE_EVERY = 60; // seconds

export default function QrPage() {
  const businessId = useAuthStore((s) => s.businessId);
  const t = useLocaleStore((s) => s.t);
  const [campaignId, setCampaignId] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(ROTATE_EVERY);
  const [kiosk, setKiosk] = useState(false);

  const rotateRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: campaigns } = useQuery({
    queryKey: ['campaigns', businessId],
    queryFn: () => api.get(`/businesses/${businessId}/campaigns`).then((r) => r.data),
    enabled: !!businessId,
  });

  const selectedCampaign = campaigns?.find((c: any) => c.id === campaignId);

  const generate = useMutation({
    mutationFn: () =>
      api.post('/entries/qr/generate', {}, { params: { campaignId } }).then((r) => r.data),
    onSuccess: (data) => {
      setQrDataUrl(data.qrDataUrl);
      setCountdown(ROTATE_EVERY);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to generate QR code'),
  });

  const stopRotation = useCallback(() => {
    if (rotateRef.current) clearInterval(rotateRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    rotateRef.current = null;
    countdownRef.current = null;
  }, []);

  const startRotation = useCallback(() => {
    stopRotation();
    setCountdown(ROTATE_EVERY);

    // Countdown ticker
    countdownRef.current = setInterval(() => {
      setCountdown((c) => (c <= 1 ? ROTATE_EVERY : c - 1));
    }, 1000);

    // Auto-regenerate every 60s
    rotateRef.current = setInterval(() => {
      generate.mutate();
    }, ROTATE_EVERY * 1000);
  }, [stopRotation, generate]);

  // Start rotation after first successful generate
  useEffect(() => {
    if (qrDataUrl && !rotateRef.current) {
      startRotation();
    }
  }, [qrDataUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // Stop rotation when campaign changes
  useEffect(() => {
    stopRotation();
    setQrDataUrl(null);
  }, [campaignId, stopRotation]);

  // Cleanup on unmount
  useEffect(() => () => stopRotation(), [stopRotation]);

  const handleGenerate = () => {
    generate.mutate();
    // startRotation called via the useEffect above when qrDataUrl updates
  };

  const download = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `qr-${campaignId}.png`;
    a.click();
  };

  const circumference = 2 * Math.PI * 24; // radius=24
  const dashOffset = circumference * (1 - countdown / ROTATE_EVERY);

  if (kiosk && qrDataUrl) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50">
        <button
          onClick={() => setKiosk(false)}
          className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white"
        >
          <X className="h-5 w-5" />
        </button>

        {selectedCampaign && (
          <p className="text-amber-400 text-lg font-semibold mb-2 tracking-wide uppercase">
            {selectedCampaign.name}
          </p>
        )}
        <p className="text-white/50 text-sm mb-8">{t('qr_scan_hint')}</p>

        <div className="relative">
          <div className="rounded-2xl bg-white p-5 shadow-2xl">
            <Image src={qrDataUrl} alt="QR Code" width={300} height={300} unoptimized />
          </div>
          {/* Countdown ring overlay */}
          <svg className="absolute -inset-3 w-[calc(100%+24px)] h-[calc(100%+24px)]" viewBox="0 0 330 330">
            <circle
              cx="165" cy="165" r="155"
              fill="none" stroke="#ffffff10" strokeWidth="4"
            />
            <circle
              cx="165" cy="165" r="155"
              fill="none" stroke="#F5C518" strokeWidth="4"
              strokeDasharray={circumference * (155 / 24)}
              strokeDashoffset={dashOffset * (155 / 24)}
              strokeLinecap="round"
              transform="rotate(-90 165 165)"
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>
        </div>

        <div className="mt-8 flex items-center gap-2">
          <svg className="w-10 h-10" viewBox="0 0 52 52">
            <circle cx="26" cy="26" r="24" fill="none" stroke="#ffffff20" strokeWidth="3" />
            <circle
              cx="26" cy="26" r="24"
              fill="none" stroke="#F5C518" strokeWidth="3"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              transform="rotate(-90 26 26)"
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
            <text x="26" y="31" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">
              {countdown}
            </text>
          </svg>
          <span className="text-white/50 text-sm">{t('qr_refreshes')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-white">{t('qr_title')}</h1>
        <p className="text-[#6b6b80] text-sm mt-1">{t('qr_subtitle')}</p>
      </div>

      <Card>
        <CardHeader><CardTitle>{t('qr_setup')}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t('qr_campaign')}</Label>
            <select
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
              className="w-full rounded-md border border-[#2a2a3a] bg-[#12121a] text-white px-3 py-2 text-sm"
            >
              <option value="">{t('qr_select_campaign')}</option>
              {campaigns?.filter((c: any) => c.status === 'ACTIVE').map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <Button
            className="w-full"
            disabled={!campaignId || generate.isPending}
            onClick={handleGenerate}
          >
            {generate.isPending
              ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> {t('qr_generating')}</>
              : <><QrCode className="h-4 w-4 mr-2" /> {t('qr_start')}</>
            }
          </Button>
        </CardContent>
      </Card>

      {!campaignId && !qrDataUrl && (
        <p className="text-center text-[#6b6b80] text-sm">{t('qr_no_campaign')}</p>
      )}

      {qrDataUrl && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-8">
            {selectedCampaign && (
              <p className="text-amber-400 font-semibold text-lg">{selectedCampaign.name}</p>
            )}

            {/* QR with countdown ring */}
            <div className="relative">
              <div className="rounded-xl bg-white p-4 shadow-xl">
                <Image src={qrDataUrl} alt="QR Code" width={220} height={220} unoptimized />
              </div>
              <svg className="absolute -inset-2 w-[calc(100%+16px)] h-[calc(100%+16px)]" viewBox="0 0 260 260">
                <circle cx="130" cy="130" r="126" fill="none" stroke="#ffffff10" strokeWidth="3" />
                <circle
                  cx="130" cy="130" r="126"
                  fill="none" stroke="#F5C518" strokeWidth="3"
                  strokeDasharray={circumference * (126 / 24)}
                  strokeDashoffset={dashOffset * (126 / 24)}
                  strokeLinecap="round"
                  transform="rotate(-90 130 130)"
                  style={{ transition: 'stroke-dashoffset 1s linear' }}
                />
              </svg>
            </div>

            {/* Countdown */}
            <div className="flex items-center gap-2">
              <svg className="w-8 h-8" viewBox="0 0 52 52">
                <circle cx="26" cy="26" r="24" fill="none" stroke="#2a2a3a" strokeWidth="3" />
                <circle
                  cx="26" cy="26" r="24"
                  fill="none" stroke="#F5C518" strokeWidth="3"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="round"
                  transform="rotate(-90 26 26)"
                  style={{ transition: 'stroke-dashoffset 1s linear' }}
                />
                <text x="26" y="31" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">
                  {countdown}
                </text>
              </svg>
              <span className="text-[#6b6b80] text-sm">{t('qr_auto_refresh').replace('{n}', String(countdown))}</span>
            </div>

            <div className="flex gap-2 w-full">
              <Button variant="outline" className="flex-1" onClick={() => setKiosk(true)}>
                <Maximize2 className="h-4 w-4 mr-2" /> {t('qr_kiosk')}
              </Button>
              <Button variant="outline" className="flex-1" onClick={download}>
                <Download className="h-4 w-4 mr-2" /> {t('qr_download')}
              </Button>
            </div>

            <p className="text-[#6b6b80] text-xs text-center">
              {t('qr_refreshes')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
