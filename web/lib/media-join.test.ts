import { describe, expect, it, vi } from 'vitest';
import {
  CAMERA_ONLY_BLOCKED_REASON,
  INSECURE_MEDIA_REASON,
  MEDIA_UNAVAILABLE_REASON,
  mediaBlockedReason,
  primeLocalMedia,
} from '@/lib/media-join';

describe('primeLocalMedia', () => {
  it('blocks http pages that are not a secure context', async () => {
    expect(mediaBlockedReason(false, true)).toBe(INSECURE_MEDIA_REASON);
    const primed = await primeLocalMedia({ mediaDevices: {} as MediaDevices }, false);
    expect(primed).toEqual({ mic: false, camera: false, reason: INSECURE_MEDIA_REASON });
  });

  it('primes mic and camera from a user-gesture getUserMedia call', async () => {
    const stop = vi.fn();
    const getUserMedia = vi.fn().mockResolvedValue({
      getTracks: () => [{ stop }, { stop }],
    });
    const primed = await primeLocalMedia(
      { mediaDevices: { getUserMedia } as unknown as MediaDevices },
      true
    );
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true, video: true });
    expect(stop).toHaveBeenCalledTimes(2);
    expect(primed).toEqual({ mic: true, camera: true, reason: null });
  });

  it('keeps voice when only the camera is denied', async () => {
    const stop = vi.fn();
    const getUserMedia = vi
      .fn()
      .mockRejectedValueOnce(new Error('camera'))
      .mockResolvedValueOnce({ getTracks: () => [{ stop }] });
    const primed = await primeLocalMedia(
      { mediaDevices: { getUserMedia } as unknown as MediaDevices },
      true
    );
    expect(primed).toEqual({
      mic: true,
      camera: false,
      reason: CAMERA_ONLY_BLOCKED_REASON,
    });
  });

  it('returns unavailable when getUserMedia is missing', async () => {
    expect(mediaBlockedReason(true, false)).toBe(MEDIA_UNAVAILABLE_REASON);
  });
});
