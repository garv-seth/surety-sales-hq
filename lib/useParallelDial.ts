'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

export interface ParallelCallInfo {
  sid: string;
  phone: string;
  prospectId: string;
  prospectName: string;
  status: string;
  answeredBy?: string;
  answeredAt?: string;
  conferenceRoom: string;
}

export function useParallelDial() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [calls, setCalls] = useState<ParallelCallInfo[]>([]);
  const [dialing, setDialing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const answeredCalls = calls.filter(c => c.status === 'in-progress' && (!c.answeredBy || c.answeredBy === 'human'));
  const hasAnswer = answeredCalls.length > 0;

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const startPolling = useCallback((sid: string) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/twilio/parallel?sessionId=${sid}`);
        const data = await res.json();
        if (data.calls) {
          setCalls(data.calls);
          // Stop polling if all calls are done
          const allDone = data.calls.every((c: ParallelCallInfo) =>
            ['no-answer', 'busy', 'failed', 'completed', 'canceled'].includes(c.status)
          );
          if (allDone) stopPolling();
        }
      } catch {}
    }, 2000);
  }, [stopPolling]);

  const dialThree = useCallback(async (prospects: { id: string; name: string; phone: string }[]) => {
    setDialing(true);
    setError(null);
    setCalls([]);
    setSessionId(null);
    stopPolling();

    try {
      const res = await fetch('/api/twilio/parallel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospects: prospects.slice(0, 3) }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSessionId(data.sessionId);
      setCalls(data.calls || []);
      startPolling(data.sessionId);
    } catch (err) {
      setError(String(err));
    } finally {
      setDialing(false);
    }
  }, [startPolling, stopPolling]);

  // Connect to a specific answered call (join their conference room)
  const connectTo = useCallback(async (
    call: ParallelCallInfo,
    twilioDevice: any // Twilio Device instance
  ) => {
    // Drop the other active calls
    const dropSids = calls
      .filter(c => c.sid && c.sid !== call.sid && !['completed', 'canceled', 'failed'].includes(c.status))
      .map(c => c.sid);

    await fetch('/api/twilio/connect-to-conference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conferenceRoom: call.conferenceRoom, dropSids }),
    });

    // Connect browser WebRTC to the conference room
    if (twilioDevice) {
      await twilioDevice.connect({ params: { ConferenceName: call.conferenceRoom } });
    }

    stopPolling();
  }, [calls, stopPolling]);

  const cancelAll = useCallback(async () => {
    const activeSids = calls.filter(c => c.sid && !['completed', 'canceled', 'failed'].includes(c.status)).map(c => c.sid);
    if (activeSids.length) {
      await fetch('/api/twilio/connect-to-conference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conferenceRoom: '', dropSids: activeSids }),
      });
    }
    stopPolling();
    setCalls([]);
    setSessionId(null);
  }, [calls, stopPolling]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  return { sessionId, calls, dialing, error, hasAnswer, answeredCalls, dialThree, connectTo, cancelAll };
}
