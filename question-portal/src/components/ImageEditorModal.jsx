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
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(10, 18, 22, 0.88)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: 24,
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #1B313B 0%, #122027 100%)',
          border: '1px solid rgba(42, 157, 143, 0.35)',
          borderRadius: 16,
          padding: 26,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          maxWidth: '92vw',
          maxHeight: '92vh',
          overflow: 'hidden',
          boxShadow: '0 25px 80px rgba(0, 0, 0, 0.75)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ margin: 0, color: '#F1F5F9', fontSize: 18, fontWeight: 800, letterSpacing: '-0.01em' }}>
              ✂️ Crop &amp; Edit Image
            </h3>
            <p style={{ margin: '4px 0 0', color: '#9CB6BF', fontSize: 13 }}>
              Drag the bounding handles to crop. Adjust zoom scale and rotation angle below.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(38, 70, 83, 0.5)',
              border: '1px solid rgba(42, 157, 143, 0.3)',
              color: '#9CB6BF',
              borderRadius: 8,
              width: 36,
              height: 36,
              cursor: 'pointer',
              fontSize: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s',
            }}
          >
            ✕
          </button>
        </div>

        {/* Crop Area */}
        <div style={{
          overflow: 'auto',
          background: '#0E1A20',
          borderRadius: 12,
          padding: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 220,
          maxHeight: 'calc(92vh - 270px)',
          border: '1px solid rgba(42, 157, 143, 0.2)',
        }}>
          {!imgLoaded && (
            <div style={{ color: '#9CB6BF', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="spinner" style={{ width: 16, height: 16 }} /> Loading image preview...
            </div>
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
                maxHeight: 'calc(92vh - 290px)',
                display: 'block',
                transform: `scale(${scale}) rotate(${rotate}deg)`,
                transformOrigin: 'center',
                transition: 'transform 0.2s',
              }}
            />
          </ReactCrop>
        </div>

        {/* Controls */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 20,
          background: 'rgba(18, 32, 39, 0.6)',
          padding: '16px 20px',
          borderRadius: 12,
          border: '1px solid rgba(42, 157, 143, 0.15)',
        }}>
          <div>
            <label style={{ fontSize: 12, color: '#9CB6BF', display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontWeight: 700 }}>
              <span>🔍 Zoom Scale</span>
              <span style={{ color: '#2A9D8F' }}>{Math.round(scale * 100)}%</span>
            </label>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.05"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: '#2A9D8F', cursor: 'pointer' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#9CB6BF', display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontWeight: 700 }}>
              <span>🔄 Rotate Angle</span>
              <span style={{ color: '#E76F51' }}>{rotate}°</span>
            </label>
            <input
              type="range"
              min="-180"
              max="180"
              step="1"
              value={rotate}
              onChange={(e) => setRotate(parseInt(e.target.value, 10))}
              style={{ width: '100%', accentColor: '#E76F51', cursor: 'pointer' }}
            />
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => { setScale(1); setRotate(0); }}
            style={{ padding: '9px 18px', fontSize: 13, fontWeight: 700 }}
          >
            Reset
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            style={{ padding: '9px 18px', fontSize: 13, fontWeight: 700 }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            style={{ padding: '9px 24px', fontSize: 13, fontWeight: 800 }}
          >
            ✓ Save Cropped Image
          </button>
        </div>
      </div>
    </div>
  );
}
