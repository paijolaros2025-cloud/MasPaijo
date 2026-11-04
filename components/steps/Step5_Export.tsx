
import React, { useState, useEffect, useRef } from 'react';
import { AppState, AnalisisSoal, UserInput, KisiKisiItem, AppStateSetter } from '../../types';
import { exportToXlsx, exportToDocx } from '../../services/exportService';
import { analyzeSoal } from '../../services/geminiService';
import Card from '../Card';
import Button from '../Button';
import Spinner from '../Spinner';
import { Download, CheckCircle, BarChart2, Printer } from '../icons';
import ExamPrintPreviewModal from '../ExamPrintPreviewModal';

interface Props {
  appState: AppState;
  setAppState: AppStateSetter;
  handleBack: () => void;
}

const Step5Export: React.FC<Props> = ({ appState, setAppState, handleBack }) => {
  const { userInput, kisiKisi, soal, analisis } = appState;
  const [isExporting, setIsExporting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const hasAutoExported = useRef(false);

  useEffect(() => {
    if (kisiKisi && kisiKisi.length > 0 && !hasAutoExported.current) {
      hasAutoExported.current = true;
      handleExportExcel(true);
    }
    
    if (soal && kisiKisi.length > 0 && userInput && !analisis && !isAnalyzing) {
      handleAnalyze();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kisiKisi, soal, userInput, analisis]);

  const handleAnalyze = async () => {
    if (!soal || !userInput || kisiKisi.length === 0) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeSoal(kisiKisi, soal, userInput);
      setAppState(prev => ({ ...prev, analisis: result }));
    } catch (err) {
      console.error("Gagal menganalisis soal:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExportExcel = (isAuto: boolean | React.MouseEvent = false) => {
    if (!kisiKisi || kisiKisi.length === 0) {
      setError("Data kisi-kisi tidak tersedia untuk diekspor.");
      return;
    }
    setIsExporting(true);
    setError(null);
    setSuccessMessage(null);
    try {
      exportToXlsx(kisiKisi, userInput?.mataPelajaran || 'kisi-kisi');
      setSuccessMessage(isAuto === true ? "Kisi-kisi berhasil diunduh otomatis." : "Kisi-kisi berhasil diunduh.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengekspor Excel.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportWord = () => {
    if (!soal || !userInput) {
      setError("Data soal tidak tersedia untuk diekspor.");
      return;
    }
    setIsExporting(true);
    setError(null);
    setSuccessMessage(null);
    try {
      exportToDocx(soal, userInput);
      setSuccessMessage("Soal berhasil diunduh.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengekspor Word.");
    } finally {
      setIsExporting(false);
    }
  };


  return (
    <Card>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-green-800 mb-2">Ekspor Dokumen</h2>
        <p className="text-gray-600 mb-8">Unduh kisi-kisi dalam format Excel dan soal dalam format Word.</p>
        
        {error && <p className="text-red-500 mb-4">{error}</p>}
        {successMessage && (
          <div className="bg-green-50 text-green-700 p-3 rounded-md mb-6 inline-flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="font-medium">{successMessage}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
          <Button 
            onClick={() => setShowPrintPreview(true)} 
            disabled={!soal} 
            className="w-full sm:w-auto bg-emerald-700 hover:bg-emerald-600 text-white shadow"
          >
            <Printer className="w-5 h-5"/>
            Pratinjau & Cetak Soal
          </Button>
          <Button onClick={handleExportExcel} disabled={isExporting || !kisiKisi || kisiKisi.length === 0} isLoading={isExporting} variant="secondary" className="w-full sm:w-auto">
            <Download className="w-5 h-5"/>
            Unduh Kisi-Kisi (.xlsx)
          </Button>
          <Button onClick={handleExportWord} disabled={isExporting || !soal} isLoading={isExporting} variant="secondary" className="w-full sm:w-auto">
            <Download className="w-5 h-5"/>
            Unduh Soal (.docx)
          </Button>
        </div>
      </div>

      {/* Print Preview Modal */}
      {showPrintPreview && soal && (
        <ExamPrintPreviewModal
          soal={soal}
          userInput={userInput}
          kisiKisi={kisiKisi}
          isOpen={showPrintPreview}
          onClose={() => setShowPrintPreview(false)}
        />
      )}

      <div className="mt-12 border-t border-gray-200 pt-8">
        <div className="flex items-center gap-3 mb-6">
          <BarChart2 className="w-6 h-6 text-green-600" />
          <h3 className="text-xl font-bold text-gray-800">Analisis Kualitas Soal</h3>
        </div>

        {isAnalyzing ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Spinner className="w-8 h-8 text-green-500 mb-4" />
            <p>Menganalisis keterbacaan, tingkat kognitif, dan kurikulum...</p>
          </div>
        ) : analisis ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-green-50 rounded-lg p-5 border border-green-100">
              <h4 className="font-semibold text-green-800 mb-2">Keterbacaan</h4>
              <p className="text-gray-700 text-sm leading-relaxed">{analisis.keterbacaan}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-5 border border-blue-100">
              <h4 className="font-semibold text-blue-800 mb-2">Tingkat Kognitif</h4>
              <p className="text-gray-700 text-sm leading-relaxed">{analisis.tingkatKognitif}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-5 border border-purple-100">
              <h4 className="font-semibold text-purple-800 mb-2">Kecocokan Kurikulum</h4>
              <p className="text-gray-700 text-sm leading-relaxed">{analisis.kecocokanKurikulum}</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-5 border border-amber-100">
              <h4 className="font-semibold text-amber-800 mb-2">Kesimpulan</h4>
              <p className="text-gray-700 text-sm leading-relaxed font-medium">{analisis.kesimpulan}</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
            <p>Analisis tidak tersedia.</p>
            <Button onClick={handleAnalyze} variant="secondary" className="mt-4">Coba Analisis Ulang</Button>
          </div>
        )}
      </div>
      
      <div className="flex justify-start mt-12">
        <Button onClick={handleBack} variant="secondary">Kembali</Button>
      </div>
    </Card>
  );
};

export default Step5Export;
