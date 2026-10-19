export const INSECURE_MEDIA_REASON =
  'This browser blocks mic and camera on http. Use the https coach QR from the laptop.';
export const MEDIA_UNAVAILABLE_REASON =
  'Microphone blocked or missing. You can still watch the board.';
export const CAMERA_ONLY_BLOCKED_REASON = 'Camera blocked or missing. Voice still works.';

export type PrimedMedia = {
  mic: boolean;
  camera: boolean;
  reason: string | null;
};

export function mediaBlockedReason(secure: boolean, hasGetUserMedia: boolean): string | null {
  if (!secure) return INSECURE_MEDIA_REASON;
  if (!hasGetUserMedia) return MEDIA_UNAVAILABLE_REASON;
  return null;
}

export async function primeLocalMedia(
  media: Pick<Navigator, 'mediaDevices'> | undefined = globalThis.navigator,
  secure = typeof window === 'undefined' ? true : window.isSecureContext
): Promise<PrimedMedia> {
  const blocked = mediaBlockedReason(secure, Boolean(media?.mediaDevices?.getUserMedia));
  if (blocked) {
    return { mic: false, camera: false, reason: blocked };
  }
  try {
    const stream = await media!.mediaDevices.getUserMedia({ audio: true, video: true });
    stream.getTracks().forEach((track) => track.stop());
    return { mic: true, camera: true, reason: null };
  } catch {
    try {
      const stream = await media!.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      return { mic: true, camera: false, reason: CAMERA_ONLY_BLOCKED_REASON };
    } catch {
      return { mic: false, camera: false, reason: MEDIA_UNAVAILABLE_REASON };
    }
  }
}
