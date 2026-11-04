import React, { useState, useRef } from 'react';
import { generateOrEditImage, GenerateImageParams } from '../services/imageService';
import Button from './Button';
import Spinner from './Spinner';
import { X, Image as ImageIcon, Upload } from './icons';

interface Props {
  onClose: () => void;
}

const ImageGeneratorModal: React.FC<Props> = ({ onClose }) => {
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState<'gemini-3.1-flash-image-preview' | 'gemini-3-pro-image-preview'>('gemini-3.1-flash-image-preview');
  const [size, setSize] = useState<'512px' | '1K' | '2K' | '4K'>('1K');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '3:4' | '4:3' | '9:16' | '16:9'>('1:1');
  const [referenceImage, setReferenceImage] = useState<{ data: string; mimeType: string } | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (model === 'gemini-3-pro-image-preview' && size === '512px') {
      setSize('1K');
    }
  }, [model, size]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1];
        setReferenceImage({
          data: base64Data,
          mimeType: file.type,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!prompt) {
      setError('Prompt tidak boleh kosong.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const params: GenerateImageParams = {
        prompt,
        model,
        size,
        aspectRatio,
        referenceImage: referenceImage || undefined,
      };

      const imageUrl = await generateOrEditImage(params);
      setGeneratedImage(imageUrl);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage || 'Gagal membuat gambar.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col">
        <div className="flex justify-between items-center p-4 border-b bg-gray-50 rounded-t-xl">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Generator Gambar AI
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-1/2 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prompt</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                rows={4}
                placeholder="Deskripsikan gambar yang ingin Anda buat..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value as any)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
              >
                <option value="gemini-3.1-flash-image-preview">Nano Banana 2 (Flash)</option>
                <option value="gemini-3-pro-image-preview">Nano Banana Pro</option>
              </select>
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Ukuran</label>
                <select
                  value={size}
                  onChange={(e) => setSize(e.target.value as any)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                >
                  {model === 'gemini-3.1-flash-image-preview' && <option value="512px">512px</option>}
                  <option value="1K">1K</option>
                  <option value="2K">2K</option>
                  <option value="4K">4K</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Aspek Rasio</label>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value as any)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                >
                  <option value="1:1">1:1</option>
                  <option value="3:4">3:4</option>
                  <option value="4:3">4:3</option>
                  <option value="9:16">9:16</option>
                  <option value="16:9">16:9</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gambar Referensi (Opsional)</label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button variant="secondary" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2">
                  <Upload className="w-4 h-4" /> Pilih Gambar
                </Button>
                {referenceImage && (
                  <span className="text-sm text-green-600 flex items-center gap-1">
                    Gambar terpilih <button onClick={() => setReferenceImage(null)} className="text-red-500 hover:text-red-700"><X className="w-4 h-4" /></button>
                  </span>
                )}
              </div>
            </div>

            <Button onClick={handleGenerate} disabled={isLoading} className="w-full mt-4">
              {isLoading ? 'Membuat...' : 'Buat Gambar'}
            </Button>

            {error && (
              <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm mt-2">
                {error}
              </div>
            )}
          </div>

          <div className="w-full md:w-1/2 flex flex-col items-center justify-center bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 min-h-[300px] p-4">
            {isLoading ? (
              <Spinner message="Sedang membuat gambar..." />
            ) : generatedImage ? (
              <div className="relative w-full h-full flex flex-col items-center justify-center">
                <img src={generatedImage} alt="Generated" className="max-w-full max-h-full object-contain rounded-md shadow-md" />
                <a
                  href={generatedImage}
                  download="generated-image.png"
                  className="mt-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  Unduh Gambar
                </a>
              </div>
            ) : (
              <div className="text-gray-400 flex flex-col items-center">
                <ImageIcon className="w-12 h-12 mb-2 opacity-50" />
                <p>Pratinjau gambar akan muncul di sini</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageGeneratorModal;
