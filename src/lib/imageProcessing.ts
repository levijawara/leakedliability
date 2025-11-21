/**
 * Blurs the top portion of an image (identity section above PSCS line)
 * @param file - The image file to process
 * @param blurHeight - Percentage of image height to blur (default: 0.30)
 * @returns Processed blob ready for upload
 */
export async function blurIdentitySection(
  file: File,
  blurHeight: number = 0.30
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };

    img.onload = () => {
      try {
        // Create main canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          throw new Error('Could not get canvas context');
        }

        // Set canvas to image dimensions
        canvas.width = img.width;
        canvas.height = img.height;

        // Draw original image
        ctx.drawImage(img, 0, 0);

        // Calculate blur region height
        const blurRegionHeight = Math.floor(img.height * blurHeight);

        // Create temporary canvas for blurred section
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        
        if (!tempCtx) {
          throw new Error('Could not get temp canvas context');
        }

        tempCanvas.width = img.width;
        tempCanvas.height = blurRegionHeight;

        // Draw the top section to temp canvas
        tempCtx.drawImage(
          img,
          0, 0, img.width, blurRegionHeight,
          0, 0, img.width, blurRegionHeight
        );

        // Apply blur filter
        tempCtx.filter = 'blur(25px)';
        tempCtx.drawImage(tempCanvas, 0, 0);

        // Draw blurred section back onto main canvas
        ctx.drawImage(tempCanvas, 0, 0);

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob'));
            }
          },
          'image/png',
          1.0
        );
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}
