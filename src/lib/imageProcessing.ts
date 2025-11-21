import * as StackBlur from 'stackblur-canvas';

/**
 * Blurs a specific rectangular region of an image
 * @param file - The image file to process
 * @param region - The rectangular region to blur { x, y, width, height }
 * @returns Processed blob ready for upload
 */
export async function blurIdentitySection(
  file: File,
  region: { x: number; y: number; width: number; height: number }
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        
        if (!ctx) {
          throw new Error('Could not get canvas context');
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // Apply StackBlur to the specific rectangular region only
        StackBlur.canvasRGBA(
          canvas,
          region.x,
          region.y,
          region.width,
          region.height,
          25
        );

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob'));
            }
          },
          "image/png",
          1.0
        );
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
