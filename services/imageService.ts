export interface GenerateImageParams {
  prompt: string;
  model: 'gemini-3.1-flash-image-preview' | 'gemini-3-pro-image-preview' | string;
  size: '512px' | '1K' | '2K' | '4K';
  aspectRatio?: '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
  referenceImage?: {
    data: string; // base64
    mimeType: string;
  };
}

export async function generateOrEditImage(params: GenerateImageParams): Promise<string> {
  const response = await fetch('/api/gemini/generate-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    let errorMsg = `Server error (${response.status}): ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson && errJson.error) {
        errorMsg = errJson.error;
      }
    } catch {
      // response might not be json
    }
    throw new Error(errorMsg);
  }

  const data = await response.json();
  if (!data.imageUrl) {
    throw new Error("Tidak ada data gambar yang diterima dari server.");
  }

  return data.imageUrl;
}
