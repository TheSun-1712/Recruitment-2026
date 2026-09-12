import React, { useState, useRef, useCallback, useEffect } from 'react';
import ReactCrop from 'react-image-crop';

export default function ImageEditorModal({ imageSrc, onClose, onSave }) {
  const [crop, setCrop] = useState({
    unit: '%',
    x: 5,
    y: 5,
    width: 90,
    height: 90,
  });
  const [completedCrop, setCompletedCrop] = useState(null);
  const [scale, setScale] = useState(1);
  const [rotate, setRotate] = useState(0);
  const [imgLoaded, setImgLoaded] = useState(false);
  const imgRef = useRef(null);

  // Initialize completedCrop once image loads so "Save Crop" works even without moving the handle
  const onImageLoad = useCallback((e) => {
    setImgLoaded(true);
    const { width, height } = e.currentTarget;
    setCompletedCrop({
      x: width * 0.05,
      y: height * 0.05,
      width: width * 0.90,
      height: height * 0.90,
      unit: 'px',
    });
  }, []);

  async function handleSave() {
    if (!imgRef.current) return;
    const image = imgRef.current;

    // If user never moved the crop, use full image bounds
    const cropArea = completedCrop || {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height,
      unit: 'px',
    };

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = Math.round(cropArea.width * scaleX);
    canvas.height = Math.round(cropArea.height * scaleY);

    if (canvas.width === 0 || canvas.height === 0) {
      // fallback: export full image
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      ctx.drawImage(image, 0, 0);
    } else {
      ctx.drawImage(
        image,
        cropArea.x * scaleX,
        cropArea.y * scaleY,
        cropArea.width * scaleX,
        cropArea.height * scaleY,
        0,
        0,
        canvas.width,
        canvas.height
      );
    }

    canvas.toBlob(
      (blob) => {
        if (!blob) { onClose(); return; }
        const file = new File([blob], 'cropped_image.jpg', { type: 'image/jpeg' });
        onSave(file);
      },
      'image/jpeg',
      0.92
    );
  }

  // Stop background scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', zIndex: 99999, padding: 20,
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #1e1433 0%, #12101e 100%)',
          border: '1px solid rgba(249,115,22,0.3)',
          borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column',
          gap: 20, maxWidth: '92vw', maxHeight: '92vh', overflow: 'hidden',
          boxShadow: '0 25px 80px rgba(0,0,0,0.7)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ margin: 0, color: '#f1f5f9', fontSize: 18, fontWeight: 700 }}>
              ✂️ Crop &amp; Edit Image
            </h3>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 12 }}>
              Drag the handles to crop. Adjust scale and rotation below.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#94a3b8', borderRadius: 8, width: 32, height: 32, cursor: 'pointer',
              fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >✕</button>
        </div>

        {/* Crop Area */}
        <div style={{
          overflow: 'auto', background: '#08060f', borderRadius: 10,
          padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: 200, maxHeight: 'calc(92vh - 260px)',
          border: '1px solid rgba(255,255,255,0.07)',
        }}>
          {!imgLoaded && (
            <div style={{ color: '#64748b', fontSize: 13 }}>Loading image...</div>
          )}
          <ReactCrop
            crop={crop}
            onChange={(pixelCrop, percentCrop) => setCrop(percentCrop)}
            onComplete={(pixelCrop) => setCompletedCrop(pixelCrop)}
            style={{ maxWidth: '100%' }}
          >
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Edit"
              onLoad={onImageLoad}
              crossOrigin="anonymous"
              style={{
                maxWidth: '75vw',
                maxHeight: 'calc(92vh - 280px)',
                display: 'block',
                transform: `scale(${scale}) rotate(${rotate}deg)`,
                transformOrigin: 'center',
                transition: 'transform 0.2s',
              }}
            />
          </ReactCrop>
        </div>

        {/* Controls */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6, fontWeight: 600 }}>
              🔍 Scale: {Math.round(scale * 100)}%
            </label>
            <input
              type="range" min="0.5" max="3" step="0.05"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: '#f97316' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6, fontWeight: 600 }}>
              🔄 Rotate: {rotate}°
            </label>
            <input
              type="range" min="-180" max="180" step="1"
              value={rotate}
              onChange={(e) => setRotate(parseInt(e.target.value, 10))}
              style={{ width: '100%', accentColor: '#f97316' }}
            />
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => { setScale(1); setRotate(0); }}
            style={{
              padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#94a3b8', cursor: 'pointer',
            }}
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#94a3b8', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            style={{
              padding: '8px 22px', borderRadius: 8, fontSize: 13, fontWeight: 700,
              background: 'linear-gradient(135deg, #f97316, #dc2626)',
              border: 'none', color: '#fff', cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(249,115,22,0.4)',
            }}
          >
            ✓ Save Crop
          </button>
        </div>
      </div>
    </div>
  );
}
