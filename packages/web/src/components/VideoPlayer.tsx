import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { Play } from "lucide-react";

interface VideoPlayerProps {
  src: string;
  poster?: string;
  fallbackUrl?: string;
  className?: string;
}

export default function VideoPlayer({ src, poster, fallbackUrl, className }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setFailed(false);
    let hls: Hls | null = null;

    const handleNativeError = () => {
      setFailed(true);
    };

    video.addEventListener("error", handleNativeError);

    if (src.endsWith(".m3u8")) {
      if (Hls.isSupported()) {
        hls = new Hls({
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
        });
        hls.loadSource(src);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          // ready to play, but we do not auto-play
        });
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                // If the manifest or segments can't load, treat as fatal
                setFailed(true);
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls?.recoverMediaError();
                break;
              default:
                setFailed(true);
                hls?.destroy();
                break;
            }
          }
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = src;
      } else {
        setFailed(true);
      }
    } else {
      video.src = src;
    }

    return () => {
      video.removeEventListener("error", handleNativeError);
      if (hls) {
        hls.destroy();
      }
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [src]);

  if (failed) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        {poster ? (
          <img src={poster} alt="Video thumbnail" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gray-900 flex items-center justify-center">
            <Play size={48} className="text-white opacity-50" />
          </div>
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 p-4 text-center">
          <p className="text-sm text-white font-medium mb-2">
            This video couldn't be loaded
          </p>
          <p className="text-xs text-white/70 mb-3">
            It may be blocked by a browser privacy extension or ad blocker.
          </p>
          {fallbackUrl && (
            <a
              href={fallbackUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <Play size={12} />
              Watch on original site
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      controls
      playsInline
      className={className}
      poster={poster}
      preload="metadata"
    />
  );
}
