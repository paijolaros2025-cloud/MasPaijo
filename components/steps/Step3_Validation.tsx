
import React, { useEffect, useState, useCallback } from 'react';
import { AppState, AppStateSetter, Bahasa } from '../../types';
import { validateIndicators, fixAllInvalidIndicators } from '../../services/geminiService';
import Card from '../Card';
import Button from '../Button';
import Spinner from '../Spinner';
import { AlertTriangle, CheckCircle } from '../icons';

const validateArabicHarakat = (text: string): { isValid: boolean; message?: string } => {
  if (!text) return { isValid: true };
  
  const arabicWords = text.match(/[\u0621-\u064A\u064B-\u065F\u0670]+/g) || [];
  if (arabicWords.length === 0) return { isValid: true };

  const exceptions = [
    'الله', 'لله', 'بالله', 'والله', 'تالله', 'فالله', 'اللهم', 'إلخ',
    'من', 'في', 'عن', 'على', 'إلى', 'حتى', 'بلى', 'نعم', 'لا', 'يا', 'ما',
    'إن', 'أن', 'هل', 'قد', 'بل', 'لو', 'لم', 'لن', 'كي', 'أو', 'أم', 'عسى',
    'ثم', 'الذي', 'التي', 'الذين', 'هذا', 'هذه', 'ذلك', 'تلك', 'هؤلاء'
  ];

  const wordsWithMissingHarakat = arabicWords.filter(word => {
    // 1. Cek daftar pengecualian (seperti lafadz Allah, partikel umum)
    const baseWord = word.replace(/[\u064B-\u065F\u0670]/g, '');
    if (exceptions.includes(baseWord)) {
      return false;
    }

    const letters: { char: string; diacritics: number[] }[] = [];
    
    for (let i = 0; i < word.length; i++) {
        const char = word[i];
        const code = char.charCodeAt(0);
        
        // Kumpulkan huruf dasar Arab
        if (code >= 0x0621 && code <= 0x064A) {
            letters.push({ char, diacritics: [] });
        } else if ((code >= 0x064B && code <= 0x065F) || code === 0x0670) {
            // Kumpulkan diakritik untuk huruf terakhir
            if (letters.length > 0) {
                letters[letters.length - 1].diacritics.push(code);
            }
        }
    }

    let invalidCount = 0;

    for (let i = 0; i < letters.length; i++) {
        const l = letters[i];
        
        // Cek apakah huruf ini memiliki harakat yang valid (vokal/sukun/tanwin)
        // Tasydid (0x0651), Hamzah (0x0654, 0x0655) tidak dihitung sebagai harakat mandiri tanpa vokal
        const hasValidHarakat = l.diacritics.some(code => 
            (code >= 0x064B && code <= 0x0650) || 
            code === 0x0652 || 
            code === 0x0670
        );

        if (hasValidHarakat) continue;

        // Kata dengan 1 huruf wajib memiliki harakat penuh (seperti وَ, بِ, كَ, فَ)
        if (letters.length === 1) {
            invalidCount++;
            continue;
        }

        // Pengecualian huruf yang lazim ditulis tanpa harakat:
        
        // a. Awalan (prefix) yang sering tidak di-harakati: wa, fa, bi, ka, li
        // Pengetatan: panjang huruf kata harus > 2 agar tidak overlap dengan kata pendek.
        if (i === 0 && letters.length > 2 && ['و', 'ف', 'ب', 'ك', 'ل'].includes(l.char)) continue;

        // b. Alif, Alif Maksura, Alif Madda, dan Hamzah 
        if (['ا', 'آ', 'ى', 'أ', 'إ', 'ؤ', 'ئ'].includes(l.char)) continue;
        
        // c. Waw dan Ya di tengah/akhir kata (sering sebagai huruf madd/panjang)
        if (['و', 'ي'].includes(l.char) && i > 0) continue;
        
        // d. Lam dalam awalan "Al-" (Alif Lam Syamsiyyah/Qamariyyah)
        if (l.char === 'ل' && i > 0 && letters[i - 1].char === 'ا') continue;
        
        // e. Huruf terakhir dari kata (sering posisi waqaf/sukun yang disiratkan)
        if (i === letters.length - 1) continue;

        invalidCount++;
    }

    // Jika ada pelanggaran harakat, anggap kata ini kurang harakat
    return invalidCount > 0;
  });

  if (wordsWithMissingHarakat.length > 0) {
    return {
      isValid: false,
      message: `Teks Arab kurang harakat (tashkeel) pada kata: ${wordsWithMissingHarakat.slice(0, 5).join(', ')}${wordsWithMissingHarakat.length > 5 ? '...' : ''}`
    };
  }

  return { isValid: true };
};

interface Props {
  appState: AppState;
  setAppState: AppStateSetter;
  handleNext: () => void;
  handleBack: () => void;
}

const Step3Validation: React.FC<Props> = ({ appState, setAppState, handleNext, handleBack }) => {
  const { kisiKisi, validationResults, isLoading, error } = appState;
  const [isValidating, setIsValidating] = useState(false);
  const [isFixing, setIsFixing] = useState(false);

  const isArabic = appState.userInput?.bahasa === Bahasa.Arab;
  const isJavanese = appState.userInput?.bahasa === Bahasa.JawaHanacaraka;

  const augmentedValidationResults = validationResults.map((result, index) => {
    if (!isArabic || !result) return result;
    
    const indicatorText = kisiKisi[index]?.indikator || '';
    const harakatCheck = validateArabicHarakat(indicatorText);
    
    if (!harakatCheck.isValid) {
      return {
        isValid: false,
        reasons: [...(result.reasons || []), harakatCheck.message!]
      };
    }
    return result;
  });

  const runValidation = useCallback(async () => {
    if (!kisiKisi || kisiKisi.length === 0) return;
    
    setIsValidating(true);
    setAppState(prev => ({ ...prev, isLoading: true, error: null, validationResults: [] }));

    try {
      const results = await validateIndicators(kisiKisi);
      setAppState(prev => ({
        ...prev,
        validationResults: results,
        isLoading: false,
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Gagal memvalidasi indikator';
      setAppState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
    } finally {
      setIsValidating(false);
    }
  }, [kisiKisi, setAppState]);

  useEffect(() => {
    if (kisiKisi.length > 0 && validationResults.length === 0) {
      runValidation();
    }
  }, [kisiKisi, validationResults.length, runValidation]);

  const handleFixAll = async () => {
    setIsFixing(true);
    setAppState(prev => ({ ...prev, isLoading: true, error: null }));

    const invalidItems = kisiKisi
        .map((item, index) => ({ item, feedback: augmentedValidationResults[index] }))
        .filter(data => data.feedback && !data.feedback.isValid);

    try {
        const fixedItems = await fixAllInvalidIndicators(invalidItems);
        
        const newKisiKisi = [...kisiKisi];
        const newValidationResults = [...validationResults];

        fixedItems.forEach(fixedItem => {
            const indexToUpdate = newKisiKisi.findIndex(k => k.noSoal === fixedItem.noSoal);
            if (indexToUpdate !== -1) {
                newKisiKisi[indexToUpdate] = fixedItem;
                newValidationResults[indexToUpdate] = { isValid: true, reasons: [] }; // Assume fixed is valid
            }
        });
        
        setAppState(prev => ({
            ...prev,
            kisiKisi: newKisiKisi,
            validationResults: newValidationResults,
            isLoading: false,
        }));

    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Gagal memperbaiki indikator';
        setAppState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
    } finally {
        setIsFixing(false);
    }
  };

  const allValid = augmentedValidationResults.length > 0 && augmentedValidationResults.every(r => r.isValid);
  const hasInvalidIndicators = augmentedValidationResults.length > 0 && augmentedValidationResults.some(r => !r.isValid);
  
  const textDirClass = isArabic ? 'text-right' : 'text-left';
  
  let langClass = '';
  if (isArabic) langClass = 'font-arabic text-xl leading-[2.5]';
  else if (isJavanese) langClass = 'font-javanese text-xl leading-[2.5]';
  else langClass = 'text-base';

  if (isValidating || (isLoading && !isFixing)) {
    return <Spinner message="Memvalidasi indikator..." />;
  }

  return (
    <Card>
      <h2 className="text-2xl font-bold text-center text-green-800 mb-6">Validasi Indikator Soal</h2>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md mb-6 flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-red-500" />
          <p>{error}</p>
        </div>
      )}

      <div className="space-y-6">
        {kisiKisi.map((item, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4">
            <p className="font-semibold text-gray-800">
              <span className="text-green-600">Indikator #{item.noSoal}:</span> 
              <span className={`block mt-2 font-normal ${langClass} ${textDirClass}`} dir={isArabic ? 'rtl' : 'ltr'}>{item.indikator}</span>
            </p>
            {augmentedValidationResults[index] && (
              <div className="mt-3">
                {augmentedValidationResults[index].isValid ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-semibold">Valid</span>
                  </div>
                ) : (
                  <div className="bg-red-50 p-3 rounded-md">
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertTriangle className="w-5 h-5" />
                      <span className="font-semibold">Tidak Valid</span>
                    </div>
                    <ul className="list-disc list-inside mt-2 text-sm text-red-700 space-y-1">
                      {(augmentedValidationResults[index].reasons || []).map((reason, rIndex) => (
                        <li key={rIndex}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center mt-8 flex-wrap gap-4">
        <Button onClick={handleBack} variant="secondary">Kembali</Button>
        <div className="flex gap-4 flex-wrap">
          <Button onClick={runValidation} variant="secondary">Validasi Ulang</Button>
          {hasInvalidIndicators && (
            <Button onClick={handleFixAll} isLoading={isFixing}>
              {isFixing ? 'Memperbaiki...' : 'Perbaiki Semua Otomatis'}
            </Button>
          )}
          <Button onClick={handleNext} disabled={!allValid || isLoading}>
            Lanjutkan Buat Soal
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default Step3Validation;
