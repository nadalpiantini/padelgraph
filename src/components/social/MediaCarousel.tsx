'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Play, ImageOff } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface MediaCarouselProps {
  mediaUrls: string[];
  alt?: string;
}

type MediaType = 'image' | 'video';

interface MediaItem {
  url: string;
  type: MediaType;
}

const getMediaType = (url: string): MediaType => {
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov'];
  const lowerUrl = url.toLowerCase();
  return videoExtensions.some(ext => lowerUrl.includes(ext)) ? 'video' : 'image';
};

const parseMediaUrls = (urls: string[]): MediaItem[] => {
  return urls.map(url => ({
    url,
    type: getMediaType(url)
  }));
};

export function MediaCarousel({ mediaUrls, alt = 'Post media' }: MediaCarouselProps) {
  // Guard: return null if no media URLs provided or invalid
  if (!mediaUrls || !Array.isArray(mediaUrls) || mediaUrls.length === 0) {
    return null;
  }

  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadingStates, setLoadingStates] = useState<Record<number, boolean>>(
    Object.fromEntries(mediaUrls.map((_, i) => [i, true]))
  );
  const [errorStates, setErrorStates] = useState<Record<number, boolean>>({});

  const mediaItems = parseMediaUrls(mediaUrls);

  // Additional guard: verify mediaItems is valid
  if (!mediaItems || mediaItems.length === 0) {
    return null;
  }

  const currentMedia = mediaItems[currentIndex];

  // Guard: verify currentMedia exists
  if (!currentMedia) {
    return null;
  }

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? mediaItems.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === mediaItems.length - 1 ? 0 : prev + 1));
  };

  const handleImageLoad = (index: number) => {
    setLoadingStates(prev => ({ ...prev, [index]: false }));
  };

  const handleImageError = (index: number) => {
    setLoadingStates(prev => ({ ...prev, [index]: false }));
    setErrorStates(prev => ({ ...prev, [index]: true }));
  };

  return (
    <div className="relative group">
      {/* Main Media Container */}
      <div
        className="relative bg-slate-900/50"
        style={{ aspectRatio: '16/9' }}
      >
        {/* Loading Skeleton */}
        {loadingStates[currentIndex] && !errorStates[currentIndex] && (
          <Skeleton className="absolute inset-0" />
        )}

        {/* Error State */}
        {errorStates[currentIndex] && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-800/80">
            <ImageOff className="w-12 h-12 text-slate-500" />
            <p className="text-sm text-slate-400">Failed to load media</p>
          </div>
        )}

        {/* Media Content */}
        {!errorStates[currentIndex] && (
          <>
            {currentMedia.type === 'image' ? (
              <Image
                src={currentMedia.url}
                alt={`${alt} ${currentIndex + 1}`}
                fill
                className={`object-contain transition-opacity duration-300 ${
                  loadingStates[currentIndex] ? 'opacity-0' : 'opacity-100'
                }`}
                onLoad={() => handleImageLoad(currentIndex)}
                onError={() => handleImageError(currentIndex)}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
                priority={currentIndex === 0}
              />
            ) : (
              <div className="relative w-full h-full">
                {/* Video Thumbnail */}
                <video
                  className={`w-full h-full object-contain transition-opacity duration-300 ${
                    loadingStates[currentIndex] ? 'opacity-0' : 'opacity-100'
                  }`}
                  preload="metadata"
                  onLoadedMetadata={() => handleImageLoad(currentIndex)}
                  onError={() => handleImageError(currentIndex)}
                >
                  <source src={currentMedia.url} />
                </video>

                {/* Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center border-2 border-white/20 hover:bg-black/80 hover:scale-110 transition-all cursor-pointer">
                    <Play className="w-8 h-8 text-white ml-1" fill="currentColor" />
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Navigation Arrows (only show if multiple items) */}
        {mediaItems.length > 1 && (
          <>
            <button
              onClick={handlePrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-black/80 transition-all border border-white/10"
              aria-label="Previous media"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>

            <button
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-black/80 transition-all border border-white/10"
              aria-label="Next media"
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </button>
          </>
        )}

        {/* Media Type Indicator */}
        {currentMedia.type === 'video' && (
          <div className="absolute top-3 right-3 px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm text-xs text-white font-medium flex items-center gap-1">
            <Play className="w-3 h-3" />
            Video
          </div>
        )}
      </div>

      {/* Thumbnail Navigation (only show if multiple items) */}
      {mediaItems.length > 1 && (
        <div className="flex gap-2 mt-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
          {mediaItems.map((item, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                index === currentIndex
                  ? 'border-indigo-500 ring-2 ring-indigo-500/30'
                  : 'border-slate-700 hover:border-slate-600 opacity-60 hover:opacity-100'
              }`}
              aria-label={`View media ${index + 1}`}
            >
              {item.type === 'image' ? (
                <Image
                  src={item.url}
                  alt={`Thumbnail ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              ) : (
                <div className="relative w-full h-full bg-slate-800">
                  <video className="w-full h-full object-cover" preload="metadata">
                    <source src={item.url} />
                  </video>
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Play className="w-4 h-4 text-white" fill="currentColor" />
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Counter Indicator */}
      {mediaItems.length > 1 && (
        <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm text-xs text-white font-medium">
          {currentIndex + 1} / {mediaItems.length}
        </div>
      )}
    </div>
  );
}
