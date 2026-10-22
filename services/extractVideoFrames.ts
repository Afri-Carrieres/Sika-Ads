import type { SupabaseClient } from '@supabase/supabase-js';

const FRAME_POSITIONS = [0.25, 0.5, 0.75];

function waitForVideoEvent(video: HTMLVideoElement, eventName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for video ${eventName}.`));
    }, 15_000);

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      video.removeEventListener(eventName, onSuccess);
      video.removeEventListener('error', onError);
    };
    const onSuccess = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error('Unable to load or seek the video.'));
    };

    video.addEventListener(eventName, onSuccess, { once: true });
    video.addEventListener('error', onError, { once: true });
  });
}

function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Unable to encode the video frame as JPEG.'));
      }
    }, 'image/jpeg', 0.85);
  });
}

export async function extractVideoFrames(source: File | string): Promise<Blob[]> {
  const video = document.createElement('video');
  const isFile = source instanceof File;
  const sourceUrl = isFile ? URL.createObjectURL(source) : source;

  video.preload = 'auto';
  video.muted = true;
  video.playsInline = true;
  if (!isFile) {
    video.crossOrigin = 'anonymous';
  }

  try {
    const metadataLoaded = waitForVideoEvent(video, 'loadedmetadata');
    video.src = sourceUrl;
    await metadataLoaded;

    if (!Number.isFinite(video.duration) || video.duration <= 0 || !video.videoWidth || !video.videoHeight) {
      throw new Error('The video has no usable duration or dimensions.');
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Unable to create a canvas context for video extraction.');
    }

    const frames: Blob[] = [];
    for (const position of FRAME_POSITIONS) {
      const seeked = waitForVideoEvent(video, 'seeked');
      video.currentTime = video.duration * position;
      await seeked;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      frames.push(await canvasToJpeg(canvas));
    }

    return frames;
  } finally {
    video.pause();
    video.removeAttribute('src');
    video.load();
    if (isFile) {
      URL.revokeObjectURL(sourceUrl);
    }
  }
}

export async function extractAndUploadFrames(
  supabase: SupabaseClient,
  source: File | string,
  folder: string,
): Promise<string[]> {
  const storage = supabase.storage.from('proofs');
  let frames: Blob[];
  try {
    let videoSource = source;
    if (typeof source === 'string') {
      let storagePath: string | undefined;
      try {
        const sourceUrl = new URL(source);
        const pathMatch = sourceUrl.pathname.match(
          /\/storage\/v1\/object\/public\/proofs\/(.+)$/,
        );
        if (pathMatch) {
          storagePath = decodeURIComponent(pathMatch[1]);
        }
      } catch {
        storagePath = source;
      }

      if (storagePath) {
        const { data, error } = await storage.download(storagePath);
        if (error) {
          throw error;
        }
        const fileName = storagePath.split('/').pop() || 'proof-video.mp4';
        videoSource = new File([data], fileName, { type: data.type });
      }
    }

    frames = await extractVideoFrames(videoSource);
  } catch (error) {
    console.warn('Video frame extraction failed; continuing without video frames.', error);
    return [];
  }

  const uploadedPaths: string[] = [];
  const frameUrls: string[] = [];

  try {
    for (const [index, frame] of frames.entries()) {
      const path = `${folder}/video-frame-${index + 1}-${crypto.randomUUID()}.jpg`;
      const { error } = await storage.upload(path, frame, {
        cacheControl: '3600',
        contentType: 'image/jpeg',
        upsert: false,
      });
      if (error) {
        throw error;
      }

      uploadedPaths.push(path);
      frameUrls.push(storage.getPublicUrl(path).data.publicUrl);
    }

    return frameUrls;
  } catch (error) {
    console.warn('Video frame upload failed; continuing without video frames.', error);
    if (uploadedPaths.length > 0) {
      const { error: cleanupError } = await storage.remove(uploadedPaths);
      if (cleanupError) {
        console.warn('Unable to remove partially uploaded video frames.', cleanupError);
      }
    }
    return [];
  }
}
