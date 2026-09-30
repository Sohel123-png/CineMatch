"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackText: string;
}

export default function ImageWithFallback({ src, alt, className, fallbackText, ...props }: ImageWithFallbackProps) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setError(false);
    setLoaded(false);
  }, [src]);

  const isInvalidSrc = !src || src.endsWith('null') || src.endsWith('undefined');

  if (error || isInvalidSrc) {
    return (
      <div className={cn("w-full h-full flex flex-col items-center justify-center p-4 text-center bg-surface border border-white/5", className)}>
        <span className="text-sm font-semibold text-muted/80 leading-snug tracking-tight">{fallbackText}</span>
      </div>
    );
  }

  return (
    <>
      {!loaded && (
        <div className={cn("absolute inset-0 bg-surface animate-pulse", className)} />
      )}
      <img
        src={src}
        alt={alt}
        className={cn(className, !loaded ? "opacity-0" : "opacity-100 transition-opacity duration-300")}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        {...props}
      />
    </>
  );
}
