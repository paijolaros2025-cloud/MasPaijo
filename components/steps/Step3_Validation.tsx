
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

import { analyzeABCDIndicator } from '../../services/questionUtils';

const Step3Validation: React.FC<Props> = ({ appState, setAppState, handleNext, handleBack }) => {
  const { kisiKisi, validationResults, isLoading, error } = appState;
  const [isValidating, setIsValidating] = useState(false);
  const [isFixing, setIsFixing] = useState(false);

  const isArabic = appState.userInput?.bahasa === Bahasa.Arab;
  const isJavanese = appState.userInput?.bahasa === Bahasa.JawaHanacaraka;

  const augmentedValidationResults = validationResults.map((result, index) => {
    if (!result) return result;
    
    const indicatorText = kisiKisi[index]?.indikator || '';
    const abcdCheck = analyzeABCDIndicator(indicatorText);

    // Merge server ABCD evaluation with local pattern heuristics
    const audienceValid = result.abcd ? result.abcd.audience : abcdCheck.hasAudience;
    const behaviorValid = result.abcd ? result.abcd.behavior : abcdCheck.hasBehavior;
    const conditionValid = result.abcd ? result.abcd.condition : abcdCheck.hasCondition;
    const degreeValid = result.abcd ? result.abcd.degree : abcdCheck.hasDegree;

    const isAbcdComplete = audienceValid && behaviorValid && conditionValid && degreeValid;

    const reasons = [...(result.reasons || [])];

    // If ABCD is not strictly complete, ensure specific reasons are listed
    if (!conditionValid && !reasons.some(r => r.toLowerCase().includes('condition') || r.toLowerCase().includes('stimulus'))) {
      reasons.push('Unsur Condition (C) belum terpenuhi: Indikator wajib diawali kondisi/stimulus pengantar (misal: "Disajikan teks...", "Diberikan tabel data...").');
    }
    if (!audienceValid && !reasons.some(r => r.toLowerCase().includes('audience') || r.toLowerCase().includes('peserta didik'))) {
      reasons.push('Unsur Audience (A) belum terpenuhi: Subjek "peserta didik" wajib disebutkan secara eksplisit.');
    }
    if (!behaviorValid && !reasons.some(r => r.toLowerCase().includes('behavior') || r.toLowerCase().includes('kko'))) {
      reasons.push('Unsur Behavior (B) belum terpenuhi: Wajib menggunakan Kata Kerja Operasional (KKO) Bloom yang terukur beserta materi spesifik.');
    }
    if (!degreeValid && !reasons.some(r => r.toLowerCase().includes('degree') || r.toLowerCase().includes('tingkat ketepatan'))) {
      reasons.push('Unsur Degree (D) belum terpenuhi: Wajib memuat kriteria tingkat ketepatan atau standar keberhasilan (misal: "dengan tepat", "dengan benar").');
    }

    if (isArabic) {
      const harakatCheck = validateArabicHarakat(indicatorText);
      if (!harakatCheck.isValid) {
        reasons.push(harakatCheck.message!);
      }
    }

    const strictlyValid = result.isValid && isAbcdComplete && (!isArabic || validateArabicHarakat(indicatorText).isValid);

    return {
      isValid: strictlyValid,
      reasons,
      abcd: {
        audience: audienceValid,
        behavior: behaviorValid,
        condition: conditionValid,
        degree: degreeValid,
      }
    };
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
                newValidationResults[indexToUpdate] = {
                  isValid: true,
                  reasons: [],
                  abcd: { audience: true, behavior: true, condition: true, degree: true }
                };
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
    return <Spinner message="Sedang mengaudit kelengkapan kaidah ABCD indikator soal..." />;
  }

  return (
    <Card>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
        <div>
          <h2 className="text-2xl font-bold text-green-800">Validasi Indikator Soal (Standar ABCD)</h2>
          <p className="text-xs text-gray-500 mt-1">
            Audit ketat kepatuhan 4 pilar mutlak: <strong>Condition (C)</strong>, <strong>Audience (A)</strong>, <strong>Behavior (B)</strong>, dan <strong>Degree (D)</strong>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {allValid ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-300">
              <CheckCircle className="w-3.5 h-3.5" />
              Semua Indikator Lolos ABCD
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
              Perlu Penyesuaian ABCD
            </span>
          )}
        </div>
      </div>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md mb-6 flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-red-500" />
          <p>{error}</p>
        </div>
      )}

      <div className="space-y-6">
        {kisiKisi.map((item, index) => {
          const res = augmentedValidationResults[index];
          const abcd = res?.abcd || { audience: false, behavior: false, condition: false, degree: false };
          const isValid = res?.isValid ?? false;

          return (
            <div
              key={index}
              className={`border rounded-xl p-5 transition-all ${
                isValid
                  ? 'border-green-200 bg-white hover:border-green-300 shadow-xs'
                  : 'border-red-300 bg-red-50/30 ring-1 ring-red-200 shadow-xs'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-mono">
                    Soal #{item.noSoal}
                  </span>
                  <span className="text-xs font-medium text-gray-500">
                    Bentuk: <strong className="text-gray-700">{item.bentukSoal}</strong>
                  </span>
                  <span className="text-xs font-medium text-gray-500">·</span>
                  <span className="text-xs font-medium text-gray-500">
                    Level: <strong className="text-gray-700">{item.levelBloom}</strong>
                  </span>
                </div>

                {isValid ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Kaidah ABCD Lengkap
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Struktur Belum Sempurna
                  </span>
                )}
              </div>

              <div className="mb-3">
                <span className="text-xs font-semibold text-gray-500 block uppercase tracking-wider mb-1">
                  Teks Indikator:
                </span>
                <div className={`text-gray-800 font-medium whitespace-pre-line leading-relaxed ${langClass} ${textDirClass}`} dir={isArabic ? 'rtl' : 'ltr'}>
                  {item.indikator}
                </div>
              </div>

              {/* Detail 4 Pilar ABCD Audit */}
              <div className="mt-4 pt-3 border-t border-gray-200/80">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-2 font-sans">
                  Status 4 Pilar ABCD:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-sans text-xs">
                  <div className={`p-2 rounded-lg border flex flex-col justify-between ${
                    abcd.condition
                      ? 'bg-blue-50/80 border-blue-200 text-blue-900'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[11px]">[C] Condition</span>
                      <span className="font-bold text-[11px]">{abcd.condition ? '✓ Ada' : '✗ Belum'}</span>
                    </div>
                    <span className="text-[10px] text-gray-500 mt-1">Stimulus Awal</span>
                  </div>

                  <div className={`p-2 rounded-lg border flex flex-col justify-between ${
                    abcd.audience
                      ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[11px]">[A] Audience</span>
                      <span className="font-bold text-[11px]">{abcd.audience ? '✓ Ada' : '✗ Belum'}</span>
                    </div>
                    <span className="text-[10px] text-gray-500 mt-1">Peserta Didik</span>
                  </div>

                  <div className={`p-2 rounded-lg border flex flex-col justify-between ${
                    abcd.behavior
                      ? 'bg-indigo-50/80 border-indigo-200 text-indigo-900'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[11px]">[B] Behavior</span>
                      <span className="font-bold text-[11px]">{abcd.behavior ? '✓ Ada' : '✗ Belum'}</span>
                    </div>
                    <span className="text-[10px] text-gray-500 mt-1">KKO & Materi</span>
                  </div>

                  <div className={`p-2 rounded-lg border flex flex-col justify-between ${
                    abcd.degree
                      ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[11px]">[D] Degree</span>
                      <span className="font-bold text-[11px]">{abcd.degree ? '✓ Ada' : '✗ Belum'}</span>
                    </div>
                    <span className="text-[10px] text-gray-500 mt-1">Kriteria Ketepatan</span>
                  </div>
                </div>
              </div>

              {/* Alasan & Catatan Perbaikan jika tidak valid */}
              {!isValid && res && (res.reasons || []).length > 0 && (
                <div className="mt-3.5 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 font-sans">
                  <div className="flex items-center gap-1.5 font-bold text-red-900 mb-1.5">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    Catatan Perbaikan Kaidah Indikator:
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-red-700 pl-1">
                    {res.reasons.map((reason, rIdx) => (
                      <li key={rIdx} className="leading-relaxed">{reason}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
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
