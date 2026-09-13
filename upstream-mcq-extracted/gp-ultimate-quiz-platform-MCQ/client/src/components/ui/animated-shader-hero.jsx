import React from "react";

export default function AnimatedShaderHero({
  children,
  className = "",
  contentClassName = "",
  videoSrc = "/main.mp4",
}) {
  return (
    <div
      className={`relative min-h-screen w-full overflow-hidden bg-black text-white ${className}`.trim()}
    >
      <video
        src={videoSrc}
        autoPlay
        loop
        muted
        playsInline
        className="fixed inset-0 h-full w-full object-cover pointer-events-none"
      />

      <div className="fixed inset-0 pointer-events-none bg-black/45" />
      <div className="fixed inset-0 pointer-events-none bg-gradient-to-br from-orange-950/40 via-black/10 to-red-900/25" />

      <div
        className={`relative z-10 min-h-screen w-full ${contentClassName}`.trim()}
      >
        {children}
      </div>
    </div>
  );
}
