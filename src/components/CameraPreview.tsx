interface CameraPreviewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  show?: boolean;
}

/**
 * Circular camera feed overlay with animated rotating gradient border.
 * The video element is always in the DOM (needed for face detection),
 * but visually hidden when show=false.
 */
export function CameraPreview({ videoRef, show = true }: CameraPreviewProps) {
  return (
    <div
      className={`absolute bottom-14 right-4 z-10 transition-opacity duration-300 ${
        show ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Glass border treatment — frosted edge matching app glass style */}
      <div
        className="relative w-56 h-56 rounded-full overflow-hidden"
        style={{
          border: '3px solid rgba(255, 255, 255, 0.55)',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.07), 0 0 16px rgba(43, 168, 154, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.75)',
          backdropFilter: 'blur(4px)',
        }}
      >
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
          playsInline
          muted
        />
      </div>
    </div>
  );
}
