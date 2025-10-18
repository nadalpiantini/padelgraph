'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Hls from 'hls.js';

interface SmartMediaProps {
  src: string;
  alt?: string;
  className?: string;
}

export function SmartMedia({ src, alt = 'Media content', className }: SmartMediaProps) {
  const isVideo = /\.(m3u8|mp4|webm)$/i.test(src);

  if (!isVideo) {
    return (
      <div className={className}>
        <Image
          src={src}
          alt={alt}
          width={0}
          height={0}
          sizes="100vw"
          style={{ width: '100%', height: 'auto' }}
          loading="lazy"
          className="rounded-xl"
        />
      </div>
    );
  }

  return <SmartVideo src={src} alt={alt} className={className} />;
}

function SmartVideo({
  src,
  alt = 'Video content',
  className
}: {
  src: string;
  alt?: string;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return undefined;

    if (Hls.isSupported() && src.endsWith('.m3u8')) {
      const hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => setReady(true));
      hls.on(Hls.Events.ERROR, () => setError(true));
      return () => hls.destroy();
    } else {
      setReady(true);
      return undefined;
    }
  }, [src]);

  if (error) {
    return (
      <div className={className} role="alert">
        <div className="p-4 text-sm text-red-400">Error loading video</div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className={className} role="status" aria-live="polite">
        <div className="p-4 text-sm text-slate-500">Loading video…</div>
      </div>
    );
  }

  return (
    <div className={className}>
      <video
        ref={ref}
        controls
        playsInline
        preload="metadata"
        aria-label={alt}
        className="w-full max-h-[560px] rounded-xl"
      >
        {!src.endsWith('.m3u8') && <source src={src} />}
      </video>
    </div>
  );
}
