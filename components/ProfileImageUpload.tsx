'use client';

import { useState, useCallback, useRef } from 'react';
import Cropper, { Area, Point } from 'react-easy-crop';
import { Camera, X, ZoomIn, ZoomOut, Trash2 } from 'lucide-react';
import { PROFILE_IMAGE_CONFIG } from '@/lib/profile-image';

interface ProfileImageUploadProps {
  currentImage: string | null;
  userName: string;
  onImageChange: (imageData: string | null) => Promise<void>;
}

export default function ProfileImageUpload({
  currentImage,
  userName,
  onImageChange,
}: ProfileImageUploadProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getInitials = () => {
    const parts = userName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }
    return userName.charAt(0).toUpperCase();
  };

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate file type
    if (!PROFILE_IMAGE_CONFIG.allowedTypes.includes(file.type)) {
      setError('Please select a JPEG, PNG, WebP, or GIF image.');
      return;
    }

    // Validate file size
    if (file.size > PROFILE_IMAGE_CONFIG.maxUploadSize) {
      const maxMB = PROFILE_IMAGE_CONFIG.maxUploadSize / (1024 * 1024);
      setError(`Image is too large. Maximum size is ${maxMB}MB.`);
      return;
    }

    // Read the file
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setIsModalOpen(true);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    };
    reader.readAsDataURL(file);

    // Reset input so same file can be selected again
    e.target.value = '';
  }, []);

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createCroppedImage = async (): Promise<string | null> => {
    if (!imageSrc || !croppedAreaPixels) return null;

    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }

        // Set canvas size to our target output size
        const outputSize = PROFILE_IMAGE_CONFIG.outputSize;
        canvas.width = outputSize;
        canvas.height = outputSize;

        // Draw the cropped area scaled to output size
        ctx.drawImage(
          image,
          croppedAreaPixels.x,
          croppedAreaPixels.y,
          croppedAreaPixels.width,
          croppedAreaPixels.height,
          0,
          0,
          outputSize,
          outputSize
        );

        // Convert to JPEG with quality setting
        const dataUrl = canvas.toDataURL('image/jpeg', PROFILE_IMAGE_CONFIG.outputQuality);
        resolve(dataUrl);
      };
      image.src = imageSrc;
    });
  };

  const handleSave = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const croppedImage = await createCroppedImage();
      if (!croppedImage) {
        setError('Failed to process image. Please try again.');
        return;
      }

      await onImageChange(croppedImage);
      setIsModalOpen(false);
      setImageSrc(null);
    } catch (err) {
      console.error('Error saving image:', err);
      setError('Failed to save image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm('Are you sure you want to remove your profile photo?')) return;

    setIsProcessing(true);
    setError(null);

    try {
      await onImageChange(null);
    } catch (err) {
      console.error('Error removing image:', err);
      setError('Failed to remove image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setImageSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setError(null);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Current Avatar Display */}
      <div className="relative group">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="relative w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center cursor-pointer transition-transform hover:scale-105"
          disabled={isProcessing}
        >
          {currentImage ? (
            <img
              src={currentImage}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-3xl font-bold text-white">{getInitials()}</span>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera className="w-8 h-8 text-white" />
          </div>
        </button>

        {/* Remove button */}
        {currentImage && (
          <button
            onClick={handleRemove}
            disabled={isProcessing}
            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors"
            title="Remove photo"
          >
            <Trash2 className="w-4 h-4 text-white" />
          </button>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={PROFILE_IMAGE_CONFIG.allowedTypes.join(',')}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Upload button text */}
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isProcessing}
        className="text-sm text-brand-primary hover:text-brand-primary-light transition-colors"
      >
        {currentImage ? 'Change photo' : 'Upload photo'}
      </button>

      {/* Error display */}
      {error && (
        <p className="text-sm text-red-400 text-center">{error}</p>
      )}

      {/* Crop Modal */}
      {isModalOpen && imageSrc && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-zinc-800 bg-black">
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <h2 className="text-lg font-semibold text-white">Crop Photo</h2>
            <button
              onClick={handleSave}
              disabled={isProcessing}
              className="px-4 py-2 bg-brand-primary hover:bg-brand-primary-light rounded-lg font-medium transition-colors disabled:opacity-50 text-white"
            >
              {isProcessing ? 'Saving...' : 'Save'}
            </button>
          </div>

          {/* Cropper area - takes remaining space */}
          <div className="flex-1 relative min-h-0">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>

          {/* Zoom controls - fixed at bottom */}
          <div className="flex-shrink-0 p-4 border-t border-zinc-800 bg-black" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
            <div className="flex items-center justify-center gap-4 max-w-xs mx-auto">
              <button
                onClick={() => setZoom(Math.max(1, zoom - 0.1))}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-brand-primary"
              />
              <button
                onClick={() => setZoom(Math.min(3, zoom + 0.1))}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-500 text-center mt-2">
              Drag to reposition, pinch or use slider to zoom
            </p>
            {/* Error in modal */}
            {error && (
              <p className="text-sm text-red-400 text-center mt-2">{error}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
