'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

export type CallStatus = 'idle' | 'initializing' | 'ready' | 'connecting' | 'ringing' | 'in-call' | 'ended' | 'error';

export function useTwilioCall() {
  const [status, setStatus] = useState<CallStatus>('idle');
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const deviceRef = useRef<any>(null);
  const callRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initializedRef = useRef(false);

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const initDevice = useCallback(async () => {
    if (initializedRef.current && deviceRef.current) return deviceRef.current;
    initializedRef.current = true;
    setStatus('initializing');
    try {
      // Dynamic import — voice SDK is browser-only
      const { Device } = await import('@twilio/voice-sdk');
      const tokenRes = await fetch('/api/twilio/token');
      const { token, error: tokenError } = await tokenRes.json();
      if (tokenError) throw new Error(tokenError);

      const device = new Device(token, { logLevel: 1, allowIncomingWhileBusy: false });
      await device.register();

      // Auto-refresh token before expiry
      device.on('tokenWillExpire', async () => {
        const res = await fetch('/api/twilio/token');
        const data = await res.json();
        if (data.token) device.updateToken(data.token);
      });

      device.on('error', (e: any) => {
        console.error('Twilio Device error:', e);
        setError(e.message || 'Device error');
        setStatus('error');
      });

      deviceRef.current = device;
      setStatus('ready');
      return device;
    } catch (err) {
      console.error('Twilio init error:', err);
      setError(String(err));
      setStatus('error');
      initializedRef.current = false;
      return null;
    }
  }, []);

  const call = useCallback(async (phone: string): Promise<boolean> => {
    setDuration(0);
    setError(null);
    stopTimer();

    let device = deviceRef.current;
    if (!device) {
      device = await initDevice();
    }
    if (!device) {
      setStatus('error');
      setError('Device not initialized');
      return false;
    }

    try {
      setStatus('connecting');
      // Clean phone number — digits and + only
      const cleanPhone = phone.replace(/[^\d+]/g, '');
      const conn = await device.connect({ params: { To: cleanPhone } });
      callRef.current = conn;

      conn.on('ringing', () => setStatus('ringing'));

      conn.on('accept', () => {
        setStatus('in-call');
        timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
      });

      conn.on('disconnect', () => {
        setStatus('ended');
        stopTimer();
      });

      conn.on('cancel', () => {
        setStatus('ended');
        stopTimer();
      });

      conn.on('error', (e: any) => {
        setStatus('error');
        setError(e.message || 'Call error');
        stopTimer();
      });

      return true;
    } catch (err) {
      console.error('Call error:', err);
      setError(String(err));
      setStatus('error');
      return false;
    }
  }, [initDevice]);

  const hangup = useCallback(() => {
    callRef.current?.disconnect();
    deviceRef.current?.disconnectAll();
    setStatus('ended');
    stopTimer();
  }, []);

  const reset = useCallback(() => {
    setStatus(deviceRef.current ? 'ready' : 'idle');
    setDuration(0);
    setError(null);
    stopTimer();
  }, []);

  // Pre-warm device on mount
  useEffect(() => {
    initDevice();
    return () => {
      stopTimer();
      deviceRef.current?.destroy();
    };
  }, [initDevice]);

  return { status, duration, error, call, hangup, reset, isReady: status === 'ready' };
}
