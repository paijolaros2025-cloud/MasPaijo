
import React, { useEffect, useCallback, useState, useMemo } from 'react';
import { AppState, AppStateSetter, Soal, Bahasa, KisiKisiItem } from '../../types';
import { generateSoal, generateSingleSoal } from '../../services/geminiService';
import { exportToDocx } from '../../services/exportService';
import Card from '../Card';
import Button from '../Button';
import Spinner from '../Spinner';
import { AlertTriangle, X, RefreshCw, Info, Printer, Table, Check, Eye } from '../icons';
import ExamPrintPreviewModal from '../ExamPrintPreviewModal';
import BulkEditQuestionsModal from '../BulkEditQuestionsModal';
import QuestionLivePreviewCard, { SelectedQuestionData } from '../QuestionLivePreviewCard';
import {
  normalizeOptions,
  formatKunciJawaban,
  isCorrectOption,
  cleanStemText,
} from '../../services/questionUtils';

interface Props {
  appState: AppState;
  setAppState: AppStateSetter;
  handleNext: () => void;
  handleBack: () => void;
}

const Step4Soal: React.FC<Props> = ({ appState, setAppState, handleNext, handleBack }) => {
  const { kisiKisi, soal, isLoading, error } = appState;
  const [showPreview, setShowPreview] = useState(false);
  const [isConfirmRegenerateOpen, setIsConfirmRegenerateOpen] = useState(false);
  const [isContinuousNumbering, setIsContinuousNumbering] = useState(true);
  const [modalData, setModalData] = useState<{ soal: any; bentuk: string; kisiItem: any } | null>(null);
  const [activeTab, setActiveTab] = useState<'Semua' | 'LOTS' | 'MOTS' | 'HOTS'>('Semua');
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [saveNotification, setSaveNotification] = useState<string | null>(null);

  const handleSaveBulkEdit = (updatedSoal: Soal, updatedKisiKisi: KisiKisiItem[]) => {
    setAppState(prev => ({
      ...prev,
      soal: updatedSoal,
      kisiKisi: updatedKisiKisi,
    }));
    setSaveNotification('Perubahan butir soal, kunci jawaban, dan tingkat kognitif berhasil disimpan!');
    setTimeout(() => setSaveNotification(null), 5000);
  };

  const displayedSoal = useMemo(() => {
    if (!soal) return null;

    const newSoal: Soal = JSON.parse(JSON.stringify(soal));
    
    // Add originalNoSoal to all items regardless of isContinuousNumbering
    if (newSoal.pg) newSoal.pg.forEach(s => (s as any).originalNoSoal = s.noSoal);
    if (newSoal.pgKompleks) newSoal.pgKompleks.forEach(s => (s as any).originalNoSoal = s.noSoal);
    if (newSoal.isian) newSoal.isian.forEach(s => (s as any).originalNoSoal = s.noSoal);
    if (newSoal.uraian) newSoal.uraian.forEach(s => (s as any).originalNoSoal = s.noSoal);

    if (!isContinuousNumbering) return newSoal;

    let currentNo = 1;
    
    if (newSoal.pg) {
      newSoal.pg.forEach(s => s.noSoal = currentNo++);
    }
    if (newSoal.pgKompleks) {
      newSoal.pgKompleks.forEach(s => s.noSoal = currentNo++);
    }
    if (newSoal.isian) {
      newSoal.isian.forEach(s => s.noSoal = currentNo++);
    }
    if (newSoal.uraian) {
      newSoal.uraian.forEach(s => s.noSoal = currentNo++);
    }
    
    return newSoal;
  }, [soal, isContinuousNumbering]);

  const [selectedQuestionNo, setSelectedQuestionNo] = useState<number | null>(null);
  const [showLivePreview, setShowLivePreview] = useState<boolean>(true);

  const allFlattenedQuestions = useMemo(() => {
    if (!displayedSoal) return [];
    const list: SelectedQuestionData[] = [];

    if (displayedSoal.pg) {
      displayedSoal.pg.forEach(item => {
        const origNo = (item as any).originalNoSoal ?? item.noSoal;
        list.push({
          bentuk: 'Pilihan Ganda',
          displayNoSoal: item.noSoal,
          originalNoSoal: origNo,
          item,
          kisiItem: kisiKisi.find(k => k.noSoal === origNo),
        });
      });
    }

    if (displayedSoal.pgKompleks) {
      displayedSoal.pgKompleks.forEach(item => {
        const origNo = (item as any).originalNoSoal ?? item.noSoal;
        list.push({
          bentuk: 'Pilihan Ganda Kompleks',
          displayNoSoal: item.noSoal,
          originalNoSoal: origNo,
          item,
          kisiItem: kisiKisi.find(k => k.noSoal === origNo),
        });
      });
    }

    if (displayedSoal.isian) {
      displayedSoal.isian.forEach(item => {
        const origNo = (item as any).originalNoSoal ?? item.noSoal;
        list.push({
          bentuk: 'Isian Singkat',
          displayNoSoal: item.noSoal,
          originalNoSoal: origNo,
          item,
          kisiItem: kisiKisi.find(k => k.noSoal === origNo),
        });
      });
    }

    if (displayedSoal.uraian) {
      displayedSoal.uraian.forEach(item => {
        const origNo = (item as any).originalNoSoal ?? item.noSoal;
        list.push({
          bentuk: 'Uraian',
          displayNoSoal: item.noSoal,
          originalNoSoal: origNo,
          item,
          kisiItem: kisiKisi.find(k => k.noSoal === origNo),
        });
      });
    }

    return list;
  }, [displayedSoal, kisiKisi]);

  const currentSelectedQuestion = useMemo(() => {
    if (allFlattenedQuestions.length === 0) return null;
    if (selectedQuestionNo != null) {
      const found = allFlattenedQuestions.find(q => q.displayNoSoal === selectedQuestionNo);
      if (found) return found;
    }
    return allFlattenedQuestions[0];
  }, [allFlattenedQuestions, selectedQuestionNo]);

  const currentQuestionIndex = useMemo(() => {
    if (!currentSelectedQuestion) return 0;
    const idx = allFlattenedQuestions.findIndex(q => q.displayNoSoal === currentSelectedQuestion.displayNoSoal);
    return idx >= 0 ? idx : 0;
  }, [allFlattenedQuestions, currentSelectedQuestion]);

  const handleSelectPrev = () => {
    if (currentQuestionIndex > 0) {
      setSelectedQuestionNo(allFlattenedQuestions[currentQuestionIndex - 1].displayNoSoal);
    }
  };

  const handleSelectNext = () => {
    if (currentQuestionIndex < allFlattenedQuestions.length - 1) {
      setSelectedQuestionNo(allFlattenedQuestions[currentQuestionIndex + 1].displayNoSoal);
    }
  };

  const runSoalGeneration = useCallback(async () => {
    if (!kisiKisi || kisiKisi.length === 0) return;

    setAppState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const generatedSoal = await generateSoal(
        kisiKisi, 
        appState.userInput?.bahasa || 'Bahasa Indonesia',
        appState.userInput?.tingkatKesulitan || 'Sedang'
      );
      setAppState(prev => ({
        ...prev,
        soal: generatedSoal,
        isLoading: false,
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Gagal membuat soal';
      setAppState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kisiKisi, setAppState, appState.userInput?.bahasa, appState.userInput?.tingkatKesulitan]);

  useEffect(() => {
    if (kisiKisi.length > 0 && !soal) {
      runSoalGeneration();
    }
  }, [kisiKisi, soal, runSoalGeneration]);
  
  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newBahasa = e.target.value as Bahasa;
    setAppState(prev => ({
      ...prev,
      userInput: prev.userInput ? { ...prev.userInput, bahasa: newBahasa } : null,
      // We don't clear the soal immediately, let the user decide to regenerate
    }));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleRegenerateClick = () => {
    if (soal) {
      setIsConfirmRegenerateOpen(true);
    } else {
      runSoalGeneration();
    }
  };

  const handleConfirmRegenerate = () => {
    setIsConfirmRegenerateOpen(false);
    runSoalGeneration();
  };

  const handleSaveAndRegenerate = () => {
    try {
      if (displayedSoal && appState.userInput) {
        exportToDocx(displayedSoal, appState.userInput);
      }
    } catch(e) {
      console.error("Gagal mengekspor:", e);
      // We log error but proceed anyway? Actually better to alert.
      alert("Gagal menyimpan dokumen. Pastikan data lengkap.");
      return;
    }
    setIsConfirmRegenerateOpen(false);
    runSoalGeneration();
  };

  const handleRegenerateSingleSoal = async (originalNoSoal: number, bentukSoal: string) => {
    const kisiItem = kisiKisi.find(k => k.noSoal === originalNoSoal);
    if (!kisiItem) return;

    setAppState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const generatedSingleSoal = await generateSingleSoal(
        kisiItem, 
        appState.userInput?.bahasa || 'Bahasa Indonesia',
        appState.userInput?.tingkatKesulitan || 'Sedang'
      );
      
      setAppState(prev => {
        if (!prev.soal) return prev;
        
        const newSoal: Soal = JSON.parse(JSON.stringify(prev.soal));
        
        if (bentukSoal === 'Pilihan Ganda' && newSoal.pg) {
           const index = newSoal.pg.findIndex(s => s.noSoal === originalNoSoal);
           if (index !== -1) newSoal.pg[index] = generatedSingleSoal;
        } else if (bentukSoal === 'Pilihan Ganda Kompleks' && newSoal.pgKompleks) {
           const index = newSoal.pgKompleks.findIndex(s => s.noSoal === originalNoSoal);
           if (index !== -1) newSoal.pgKompleks[index] = generatedSingleSoal;
        } else if (bentukSoal === 'Isian Singkat' && newSoal.isian) {
           const index = newSoal.isian.findIndex(s => s.noSoal === originalNoSoal);
           if (index !== -1) newSoal.isian[index] = generatedSingleSoal;
        } else if (bentukSoal === 'Uraian' && newSoal.uraian) {
           const index = newSoal.uraian.findIndex(s => s.noSoal === originalNoSoal);
           if (index !== -1) newSoal.uraian[index] = generatedSingleSoal;
        }

        return { ...prev, soal: newSoal, isLoading: false };
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Gagal membuat ulang soal';
      setAppState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
    }
  };

  const handleOpenModal = (soalItem: any, bentukSoal: string) => {
    const kisiItem = kisiKisi.find(k => k.noSoal === soalItem.originalNoSoal);
    if (kisiItem) {
      setModalData({ soal: soalItem, bentuk: bentukSoal, kisiItem });
    }
  };

  const renderSoal = (soalData: Soal | null, isPreview: boolean = false) => {
    if (!soalData) return <p>Soal belum dibuat.</p>;
    
    const isArabic = appState.userInput?.bahasa === Bahasa.Arab;
    const isJavanese = appState.userInput?.bahasa === Bahasa.JawaHanacaraka;
    const isSunda = appState.userInput?.bahasa === Bahasa.Sunda;
    
    const textDirClass = isArabic ? 'text-right' : 'text-left';
    const listDirClass = isArabic ? 'pr-6 md:pr-8' : 'pl-6 md:pl-8';
    
    let langClass = '';
    if (isArabic) langClass = 'font-arabic text-2xl leading-[2.5]';
    else if (isJavanese) langClass = 'font-javanese text-2xl leading-[2.5]';
    else langClass = 'text-base leading-relaxed';

    const labels = {
        pg: isArabic ? "أ. اَلِاخْتِيَارُ مِنْ مُتَعَدِّدٍ" : (isJavanese ? "꧇꧑꧇꧈ꦥꦶꦭꦶꦲꦤ꧀ꦒꦤ꧀ꦢ" : "I. Pilihan Ganda"),
        pgk: isArabic ? "ب. اَلِاخْتِيَارُ مِنْ مُتَعَدِّدٍ الْمُرَكَّبُ" : (isJavanese ? "꧇꧒꧇꧈ꦥꦶꦭꦶꦲꦤ꧀ꦒꦤ꧀ꦢꦏꦺꦴꦩ꧀ꦥ꧀ꦭꦺꦏ꧀ꦱ꧀" : "II. Pilihan Ganda Kompleks"),
        isian: isArabic ? "ج. اَلْإِجَابَةُ الْقَصِيرَةُ" : (isJavanese ? "꧇꧓꧇꧈ꦆꦱꦶꦪꦤ꧀ꦱꦶꦁꦏꦠ꧀" : (isSunda ? "III. Eusian Singget" : "III. Isian Singkat")),
        uraian: isArabic ? "د. اَلْأَسْئِلَةُ الْمَقَالِيَّةُ" : (isJavanese ? "꧇꧔꧇꧈ꦈꦫꦲꦶꦪꦤ꧀" : (isSunda ? "IV. Pedaran" : "IV. Uraian")),
        kunci: isArabic ? "مِفْتَاحُ الْإِجَابَةِ" : (isJavanese ? "ꦏꦸꦚ꧀ꦕꦶ" : (isSunda ? "Konci" : "Kunci")),
        rubrik: isArabic ? "مَعَايِيرُ التَّقْيِيمِ" : (isJavanese ? "ꦫꦸꦧ꧀ꦫꦶꦏ꧀ꦥꦼꦤꦶꦭꦲꦶꦪꦤ꧀" : "Rubrik Penilaian")
    };

    const filterSoalByTab = (soalArray: any[] | undefined, tab: string) => {
        if (!soalArray) return [];
        if (tab === 'Semua') return soalArray;
        return soalArray.filter(s => {
            const kisiItem = kisiKisi.find(k => k.noSoal === s.originalNoSoal);
            if (!kisiItem) return false;
            if (tab === 'LOTS') return /C[12]/.test(kisiItem.levelBloom);
            if (tab === 'MOTS') return /C3/.test(kisiItem.levelBloom);
            if (tab === 'HOTS') return /C[456]/.test(kisiItem.levelBloom);
            return false;
        });
    };

    const filteredPg = isPreview ? (soalData.pg || []) : filterSoalByTab(soalData.pg, activeTab);
    const filteredPgk = isPreview ? (soalData.pgKompleks || []) : filterSoalByTab(soalData.pgKompleks, activeTab);
    const filteredIsian = isPreview ? (soalData.isian || []) : filterSoalByTab(soalData.isian, activeTab);
    const filteredUraian = isPreview ? (soalData.uraian || []) : filterSoalByTab(soalData.uraian, activeTab);

    return (
        <div className={`space-y-8 ${textDirClass} ${langClass}`} dir={isArabic ? 'rtl' : 'ltr'}>
            {!isPreview && (
              <div className="bg-blue-50 p-3 rounded-md text-sm text-blue-700 mb-4 text-left font-sans leading-normal" dir="ltr">
                <p><strong>Catatan:</strong> Jika Anda mengubah bahasa/aksara, klik tombol <strong>"Buat Ulang Soal"</strong> di bawah untuk memperbarui konten soal.</p>
              </div>
            )}
            
            {isPreview && (
              <div className="border-b-2 border-black pb-4 mb-8 flex flex-col md:flex-row justify-between items-start text-left font-sans leading-normal" dir="ltr">
                <div className="space-y-1 mb-4 md:mb-0">
                  <p className="font-bold uppercase text-lg">Penilaian Akhir Semester</p>
                  <p className="text-sm">Tahun Pelajaran 2025/2026</p>
                  <p className="text-sm font-semibold">Mata Pelajaran: {appState.userInput?.mataPelajaran || '-'}</p>
                </div>
                <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-3 text-sm items-end w-full md:w-auto">
                  <span className="font-medium whitespace-nowrap">Nama:</span>
                  <span className="border-b border-black w-full md:w-48 h-5 inline-block"></span>
                  <span className="font-medium whitespace-nowrap">No. Absen:</span>
                  <span className="border-b border-black w-full md:w-48 h-5 inline-block"></span>
                  <span className="font-medium whitespace-nowrap">Kelas:</span>
                  <span className="border-b border-black w-full md:w-48 h-5 inline-block"></span>
                </div>
              </div>
            )}
            {filteredPg.length > 0 && (
                <div className="break-inside-avoid-page">
                    <div className="flex items-center justify-between border-b-2 border-emerald-600 pb-2 mb-4">
                      <h3 className={`text-xl font-bold ${isPreview ? 'text-black' : 'text-emerald-800'}`}>
                        {labels.pg}
                      </h3>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-sans">
                        {filteredPg.length} Soal
                      </span>
                    </div>
                    <div className="space-y-4">
                        {filteredPg.map(s => {
                            const isSelected = currentSelectedQuestion?.displayNoSoal === s.noSoal;
                            const optionsList = normalizeOptions(s.options);
                            return (
                            <div 
                                key={s.noSoal} 
                                onClick={() => !isPreview && setSelectedQuestionNo(s.noSoal)}
                                className={`break-inside-avoid-page group relative transition-all ${
                                    !isPreview
                                        ? `p-4 rounded-xl border cursor-pointer ${
                                            isSelected
                                                ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20 shadow-sm'
                                                : 'border-neutral-200/90 hover:border-neutral-300 hover:bg-neutral-50/60 bg-white'
                                        }`
                                        : 'mb-4'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-3 mb-2.5">
                                  <div className="flex items-start gap-2.5 flex-1">
                                    <span className={`shrink-0 font-bold ${isSelected && !isPreview ? 'text-emerald-800' : 'text-neutral-900'}`}>{s.noSoal}.</span>
                                    <div className="flex-1">
                                      <div className={`whitespace-pre-line ${isSelected && !isPreview ? 'text-neutral-950 font-medium' : 'text-neutral-900'}`}>
                                        {cleanStemText(s.soal, true)}
                                      </div>
                                    </div>
                                  </div>
                                  {!isPreview && (
                                    <div className="shrink-0 flex items-center gap-1.5">
                                      {isSelected ? (
                                        <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-sans font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                                          <Eye className="w-3 h-3 text-emerald-700" />
                                          Live Preview
                                        </span>
                                      ) : (
                                        <button 
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedQuestionNo(s.noSoal);
                                          }}
                                          className="p-1 text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                                          title="Tampilkan di Live Preview"
                                        >
                                          <Eye className="w-4 h-4" />
                                        </button>
                                      )}
                                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenModal(s, 'Pilihan Ganda');
                                          }}
                                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md"
                                          title="Lihat Detail Soal"
                                        >
                                          <Info className="w-4 h-4" />
                                        </button>
                                        <button 
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleRegenerateSingleSoal((s as any).originalNoSoal, 'Pilihan Ganda');
                                          }}
                                          className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-md"
                                          title="Perbaiki/Buat ulang soal ini"
                                        >
                                          <RefreshCw className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Options List */}
                                <div className={`space-y-1.5 ${listDirClass}`}>
                                    {optionsList.map((opt) => {
                                      const isCorrect = !isPreview && isCorrectOption(opt.key, s.kunciJawaban);
                                      return (
                                        <div 
                                          key={opt.key} 
                                          className={`flex items-start gap-2 p-1.5 rounded-lg transition-colors text-sm ${
                                            isCorrect 
                                              ? 'bg-emerald-50/90 border border-emerald-300 font-medium text-emerald-950' 
                                              : (isPreview ? 'text-black' : 'text-neutral-800 hover:bg-neutral-50/80')
                                          }`}
                                        >
                                          <span className="shrink-0 font-bold w-5">{opt.key}.</span>
                                          <span className="flex-1 whitespace-pre-line">{opt.value}</span>
                                          {isCorrect && (
                                            <span className="shrink-0 text-[10px] font-sans font-bold text-emerald-800 bg-emerald-200/80 px-1.5 py-0.5 rounded">
                                              Kunci
                                            </span>
                                          )}
                                        </div>
                                      );
                                    })}
                                </div>

                                {!isPreview && (
                                    <div className={`${listDirClass} mt-2.5 pt-2 border-t border-dashed border-neutral-200 flex items-center justify-between text-xs font-sans text-neutral-600`}>
                                      <p className="font-semibold text-emerald-800">
                                        {labels.kunci}: <span className="font-bold underline">{formatKunciJawaban(s.kunciJawaban)}</span>
                                      </p>
                                    </div>
                                )}
                            </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {filteredPgk.length > 0 && (
                 <div className="break-inside-avoid-page mt-8">
                    <div className="flex items-center justify-between border-b-2 border-teal-600 pb-2 mb-4">
                      <h3 className={`text-xl font-bold ${isPreview ? 'text-black' : 'text-teal-800'}`}>
                        {labels.pgk}
                      </h3>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 font-sans">
                        {filteredPgk.length} Soal
                      </span>
                    </div>
                    <div className="space-y-4">
                        {filteredPgk.map(s => {
                            const isSelected = currentSelectedQuestion?.displayNoSoal === s.noSoal;
                            const optionsList = normalizeOptions(s.options);
                            return (
                            <div 
                                key={s.noSoal} 
                                onClick={() => !isPreview && setSelectedQuestionNo(s.noSoal)}
                                className={`break-inside-avoid-page group relative transition-all ${
                                    !isPreview
                                        ? `p-4 rounded-xl border cursor-pointer ${
                                            isSelected
                                                ? 'border-teal-500 bg-teal-50/40 ring-2 ring-teal-500/20 shadow-sm'
                                                : 'border-neutral-200/90 hover:border-neutral-300 hover:bg-neutral-50/60 bg-white'
                                        }`
                                        : 'mb-4'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-3 mb-1.5">
                                  <div className="flex items-start gap-2.5 flex-1">
                                    <span className={`shrink-0 font-bold ${isSelected && !isPreview ? 'text-teal-800' : 'text-neutral-900'}`}>{s.noSoal}.</span>
                                    <div className="flex-1">
                                      <div className={`whitespace-pre-line ${isSelected && !isPreview ? 'text-neutral-950 font-medium' : 'text-neutral-900'}`}>
                                        {cleanStemText(s.soal, true)}
                                      </div>
                                    </div>
                                  </div>
                                  {!isPreview && (
                                    <div className="shrink-0 flex items-center gap-1.5">
                                      {isSelected ? (
                                        <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-sans font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded">
                                          <Eye className="w-3 h-3 text-teal-700" />
                                          Live Preview
                                        </span>
                                      ) : (
                                        <button 
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedQuestionNo(s.noSoal);
                                          }}
                                          className="p-1 text-gray-400 hover:text-teal-700 hover:bg-teal-50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                                          title="Tampilkan di Live Preview"
                                        >
                                          <Eye className="w-4 h-4" />
                                        </button>
                                      )}
                                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenModal(s, 'Pilihan Ganda Kompleks');
                                          }}
                                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md"
                                          title="Lihat Detail Soal"
                                        >
                                          <Info className="w-4 h-4" />
                                        </button>
                                        <button 
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleRegenerateSingleSoal((s as any).originalNoSoal, 'Pilihan Ganda Kompleks');
                                          }}
                                          className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-md"
                                          title="Perbaiki/Buat ulang soal ini"
                                        >
                                          <RefreshCw className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {s.petunjuk && (
                                  <div className={`mb-3 ${listDirClass}`}>
                                    <span className="inline-flex items-center gap-1.5 text-xs italic text-teal-900 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-md font-sans">
                                      <Info className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                                      {s.petunjuk}
                                    </span>
                                  </div>
                                )}

                                {/* Checkbox Options */}
                                <div className={`space-y-1.5 ${listDirClass}`}>
                                    {optionsList.map((opt) => {
                                      const isCorrect = !isPreview && isCorrectOption(opt.key, s.kunciJawaban);
                                      return (
                                        <div 
                                          key={opt.key} 
                                          className={`flex items-start gap-2 p-1.5 rounded-lg transition-colors text-sm ${
                                            isCorrect 
                                              ? 'bg-teal-50/90 border border-teal-300 font-medium text-teal-950' 
                                              : (isPreview ? 'text-black' : 'text-neutral-800 hover:bg-neutral-50/80')
                                          }`}
                                        >
                                          <span className="font-mono text-neutral-500 font-bold shrink-0 w-6">
                                            {isCorrect ? '[✓]' : '[  ]'}
                                          </span>
                                          <span className="shrink-0 font-bold w-5">{opt.key}.</span>
                                          <span className="flex-1 whitespace-pre-line">{opt.value}</span>
                                          {isCorrect && (
                                            <span className="shrink-0 text-[10px] font-sans font-bold text-teal-800 bg-teal-200/80 px-1.5 py-0.5 rounded">
                                              Kunci Benar
                                            </span>
                                          )}
                                        </div>
                                      );
                                    })}
                                </div>

                                {!isPreview && (
                                    <div className={`${listDirClass} mt-2.5 pt-2 border-t border-dashed border-neutral-200 flex items-center justify-between text-xs font-sans text-neutral-600`}>
                                      <p className="font-semibold text-teal-800">
                                        {labels.kunci}: <span className="font-bold underline">{formatKunciJawaban(s.kunciJawaban)}</span>
                                      </p>
                                    </div>
                                )}
                            </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {filteredIsian.length > 0 && (
                 <div className="break-inside-avoid-page mt-8">
                    <div className="flex items-center justify-between border-b-2 border-amber-600 pb-2 mb-4">
                      <h3 className={`text-xl font-bold ${isPreview ? 'text-black' : 'text-amber-800'}`}>
                        {labels.isian}
                      </h3>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-sans">
                        {filteredIsian.length} Soal
                      </span>
                    </div>
                    <div className="space-y-4">
                        {filteredIsian.map(s => {
                            const isSelected = currentSelectedQuestion?.displayNoSoal === s.noSoal;
                            return (
                            <div 
                                key={s.noSoal} 
                                onClick={() => !isPreview && setSelectedQuestionNo(s.noSoal)}
                                className={`break-inside-avoid-page group relative transition-all ${
                                    !isPreview
                                        ? `p-4 rounded-xl border cursor-pointer ${
                                            isSelected
                                                ? 'border-amber-500 bg-amber-50/40 ring-2 ring-amber-500/20 shadow-sm'
                                                : 'border-neutral-200/90 hover:border-neutral-300 hover:bg-neutral-50/60 bg-white'
                                        }`
                                        : 'mb-4'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-3 mb-2">
                                  <div className="flex items-start gap-2.5 flex-1">
                                    <span className={`shrink-0 font-bold ${isSelected && !isPreview ? 'text-amber-800' : 'text-neutral-900'}`}>{s.noSoal}.</span>
                                    <div className="flex-1">
                                      <div className={`whitespace-pre-line ${isSelected && !isPreview ? 'text-neutral-950 font-medium' : 'text-neutral-900'}`}>
                                        {cleanStemText(s.soal, false)}
                                      </div>
                                    </div>
                                  </div>
                                  {!isPreview && (
                                    <div className="shrink-0 flex items-center gap-1.5">
                                      {isSelected ? (
                                        <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-sans font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                                          <Eye className="w-3 h-3 text-emerald-700" />
                                          Live Preview
                                        </span>
                                      ) : (
                                        <button 
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedQuestionNo(s.noSoal);
                                          }}
                                          className="p-1 text-gray-400 hover:text-amber-700 hover:bg-amber-50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                                          title="Tampilkan di Live Preview"
                                        >
                                          <Eye className="w-4 h-4" />
                                        </button>
                                      )}
                                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenModal(s, 'Isian Singkat');
                                          }}
                                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md"
                                          title="Lihat Detail Soal"
                                        >
                                          <Info className="w-4 h-4" />
                                        </button>
                                        <button 
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleRegenerateSingleSoal((s as any).originalNoSoal, 'Isian Singkat');
                                          }}
                                          className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-md"
                                          title="Perbaiki/Buat ulang soal ini"
                                        >
                                          <RefreshCw className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Answer field for Isian Singkat */}
                                <div className={`${listDirClass} mt-3`}>
                                  <div className="flex items-center gap-2 text-sm text-neutral-600 font-sans">
                                    <span className="font-semibold text-neutral-800">Jawaban:</span>
                                    <span className="border-b-2 border-dotted border-neutral-400 flex-1 h-5 tracking-widest text-transparent select-none">
                                      ......................................................................
                                    </span>
                                  </div>
                                </div>

                                {!isPreview && (
                                    <div className={`${listDirClass} mt-3 pt-2 border-t border-dashed border-neutral-200 flex items-center justify-between text-xs font-sans`}>
                                      <div className="p-2 bg-amber-50/80 border border-amber-200 rounded-md text-amber-900 w-full">
                                        <span className="font-bold">{labels.kunci}:</span>{' '}
                                        <span className="font-semibold text-neutral-900">{formatKunciJawaban(s.kunciJawaban)}</span>
                                      </div>
                                    </div>
                                )}
                            </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {filteredUraian.length > 0 && (
                 <div className="break-inside-avoid-page mt-8">
                    <div className="flex items-center justify-between border-b-2 border-indigo-600 pb-2 mb-4">
                      <h3 className={`text-xl font-bold ${isPreview ? 'text-black' : 'text-indigo-800'}`}>
                        {labels.uraian}
                      </h3>
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-sans">
                        {filteredUraian.length} Soal
                      </span>
                    </div>
                    <div className="space-y-4">
                        {filteredUraian.map(s => {
                            const isSelected = currentSelectedQuestion?.displayNoSoal === s.noSoal;
                            return (
                            <div 
                                key={s.noSoal} 
                                onClick={() => !isPreview && setSelectedQuestionNo(s.noSoal)}
                                className={`break-inside-avoid-page group relative transition-all ${
                                    !isPreview
                                        ? `p-4 rounded-xl border cursor-pointer ${
                                            isSelected
                                                ? 'border-indigo-500 bg-indigo-50/40 ring-2 ring-indigo-500/20 shadow-sm'
                                                : 'border-neutral-200/90 hover:border-neutral-300 hover:bg-neutral-50/60 bg-white'
                                        }`
                                        : 'mb-4'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-3 mb-2">
                                  <div className="flex items-start gap-2.5 flex-1">
                                    <span className={`shrink-0 font-bold ${isSelected && !isPreview ? 'text-indigo-800' : 'text-neutral-900'}`}>{s.noSoal}.</span>
                                    <div className="flex-1">
                                      <div className={`whitespace-pre-line ${isSelected && !isPreview ? 'text-neutral-950 font-medium' : 'text-neutral-900'}`}>
                                        {cleanStemText(s.soal, false)}
                                      </div>
                                    </div>
                                  </div>
                                  {!isPreview && (
                                    <div className="shrink-0 flex items-center gap-1.5">
                                      {isSelected ? (
                                        <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-sans font-bold text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded">
                                          <Eye className="w-3 h-3 text-emerald-700" />
                                          Live Preview
                                        </span>
                                      ) : (
                                        <button 
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedQuestionNo(s.noSoal);
                                          }}
                                          className="p-1 text-gray-400 hover:text-indigo-700 hover:bg-indigo-50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                                          title="Tampilkan di Live Preview"
                                        >
                                          <Eye className="w-4 h-4" />
                                        </button>
                                      )}
                                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenModal(s, 'Uraian');
                                          }}
                                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md"
                                          title="Lihat Detail Soal"
                                        >
                                          <Info className="w-4 h-4" />
                                        </button>
                                        <button 
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleRegenerateSingleSoal((s as any).originalNoSoal, 'Uraian');
                                          }}
                                          className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-md"
                                          title="Perbaiki/Buat ulang soal ini"
                                        >
                                          <RefreshCw className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Answer Ruled Space for Uraian */}
                                <div className={`${listDirClass} mt-3`}>
                                  {isPreview ? (
                                    <div className="space-y-4 my-3 font-sans">
                                      <div className="border-b border-dotted border-gray-400 w-full h-4"></div>
                                      <div className="border-b border-dotted border-gray-400 w-full h-4"></div>
                                      <div className="border-b border-dotted border-gray-400 w-full h-4"></div>
                                      <div className="border-b border-dotted border-gray-400 w-full h-4"></div>
                                    </div>
                                  ) : (
                                    s.rubrik && (
                                      <div className="mt-3 p-3.5 bg-neutral-50/90 border border-neutral-200 rounded-xl text-xs font-sans text-neutral-800 shadow-xs">
                                        <p className="font-bold text-indigo-900 mb-2.5 border-b border-neutral-200 pb-1.5 flex items-center justify-between">
                                          <span>{labels.rubrik}</span>
                                          <span className="text-[10px] text-neutral-500 font-normal">Pedoman Penskoran Guru</span>
                                        </p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                          <div className="p-2.5 bg-white rounded-lg border border-neutral-200">
                                            <span className="font-bold text-emerald-700">Skor 4 (Sangat Baik):</span>
                                            <p className="mt-0.5 text-neutral-700">{s.rubrik?.skor4 || '-'}</p>
                                          </div>
                                          <div className="p-2.5 bg-white rounded-lg border border-neutral-200">
                                            <span className="font-bold text-blue-700">Skor 3 (Baik):</span>
                                            <p className="mt-0.5 text-neutral-700">{s.rubrik?.skor3 || '-'}</p>
                                          </div>
                                          <div className="p-2.5 bg-white rounded-lg border border-neutral-200">
                                            <span className="font-bold text-amber-700">Skor 2 (Cukup):</span>
                                            <p className="mt-0.5 text-neutral-700">{s.rubrik?.skor2 || '-'}</p>
                                          </div>
                                          <div className="p-2.5 bg-white rounded-lg border border-neutral-200">
                                            <span className="font-bold text-rose-700">Skor 1 (Kurang):</span>
                                            <p className="mt-0.5 text-neutral-700">{s.rubrik?.skor1 || '-'}</p>
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  )}
                                </div>
                            </div>
                            );
                        })}
                    </div>
                </div>
            )}
            
            {(!filteredPg.length && !filteredPgk.length && !filteredIsian.length && !filteredUraian.length) && (
              <div className="text-center py-12 text-gray-500 font-sans bg-gray-50 rounded-xl border border-dashed border-gray-200" dir="ltr">
                <p className="font-medium">Tidak ada butir soal pada kategori {activeTab}.</p>
                <p className="text-xs text-gray-400 mt-1">Pilih tab "Semua Soal" untuk melihat seluruh butir soal.</p>
              </div>
            )}
        </div>
    );
  };

  return (
    <Card>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-bold text-green-800">Hasil Soal</h2>
          <Button
            onClick={() => setShowBulkEditModal(true)}
            variant="secondary"
            disabled={!displayedSoal || isLoading}
            className="flex items-center gap-2 border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 py-1.5 px-3 text-xs md:text-sm font-semibold shadow-sm"
          >
            <Table className="w-4 h-4 text-emerald-700" />
            Edit Massal (Tabel)
          </Button>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700 bg-gray-50 px-3 py-2 rounded-md border">
            <input 
              type="checkbox" 
              checked={isContinuousNumbering}
              onChange={(e) => setIsContinuousNumbering(e.target.checked)}
              className="rounded text-green-600 focus:ring-green-500 w-4 h-4"
            />
            Penomoran Berkelanjutan
          </label>
          <div className="flex items-center gap-2">
            <label htmlFor="lang-select" className="text-sm font-medium text-gray-600 whitespace-nowrap">Pilih Bahasa/Aksara:</label>
            <select
              id="lang-select"
              value={appState.userInput?.bahasa || Bahasa.Indonesia}
              onChange={handleLanguageChange}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm p-2 border"
            >
              {Object.values(Bahasa).map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {saveNotification && (
        <div className="bg-emerald-100 border-l-4 border-emerald-500 text-emerald-800 p-3 rounded-md mb-6 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="text-sm font-semibold">{saveNotification}</p>
          </div>
          <button onClick={() => setSaveNotification(null)} className="text-emerald-700 hover:text-emerald-900 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      
      {isLoading && <Spinner message="Sedang membuat soal..." />}

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md mb-6 flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-red-500" />
          <p>{error}</p>
        </div>
      )}

      {!isLoading && !error && displayedSoal && (
        <div>
          {!showPreview && (
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6 border-b border-gray-200 pb-2">
              <div className="flex flex-wrap gap-2">
                {(['Semua', 'LOTS', 'MOTS', 'HOTS'] as const).map(tab => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 font-medium text-sm transition-colors rounded-t-lg ${activeTab === tab ? 'text-green-700 border-b-2 border-green-700 bg-green-50 font-semibold' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                  >
                    {tab === 'Semua' ? 'Semua Soal' : `${tab} ${tab === 'LOTS' ? '(C1-C2)' : tab === 'MOTS' ? '(C3)' : '(C4-C6)'}`}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowLivePreview(!showLivePreview)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                    showLivePreview
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                  title="Tampilkan / Sembunyikan Panel Live Preview Dokumen"
                >
                  <Eye className="w-3.5 h-3.5 text-emerald-700" />
                  <span>{showLivePreview ? 'Live Preview Aktif' : 'Tampilkan Live Preview'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Dual-column on desktop when Live Preview is active, single column in print mode or when hidden */}
          <div className={showLivePreview && !showPreview ? 'lg:grid lg:grid-cols-12 lg:gap-7 items-start' : ''}>
            <div className={showLivePreview && !showPreview ? 'lg:col-span-7 space-y-6' : 'w-full'}>
              {renderSoal(displayedSoal, showPreview)}
            </div>

            {showLivePreview && !showPreview && (
              <div className="lg:col-span-5 sticky top-6 mt-8 lg:mt-0">
                <QuestionLivePreviewCard
                  selectedQuestion={currentSelectedQuestion}
                  userInput={appState.userInput}
                  currentIndex={currentQuestionIndex}
                  totalQuestions={allFlattenedQuestions.length}
                  onSelectPrev={handleSelectPrev}
                  onSelectNext={handleSelectNext}
                  onOpenFullPrintPreview={() => setShowPreview(true)}
                  onOpenDetailModal={() => {
                    if (currentSelectedQuestion) {
                      handleOpenModal(currentSelectedQuestion.item, currentSelectedQuestion.bentuk);
                    }
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="flex flex-col sm:flex-row justify-between mt-8 gap-4">
        <div className="flex flex-wrap gap-3">
          <Button onClick={handleBack} variant="secondary">Kembali</Button>
          <Button onClick={handleRegenerateClick} variant="secondary" disabled={isLoading}>
            Buat Ulang Soal
          </Button>
          <Button 
            onClick={() => setShowBulkEditModal(true)} 
            variant="secondary" 
            disabled={!displayedSoal || isLoading}
            className="flex items-center gap-2 border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100"
          >
            <Table className="w-4 h-4 text-emerald-700" />
            Edit Massal (Tabel)
          </Button>
          <Button 
            onClick={() => setShowPreview(true)} 
            variant="secondary" 
            disabled={!displayedSoal || isLoading}
            className="flex items-center gap-2 border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100"
          >
            <Printer className="w-4 h-4 text-emerald-700" />
            Pratinjau Cetak
          </Button>
        </div>
        <Button onClick={() => {
          setAppState(prev => ({ ...prev, soal: displayedSoal }));
          handleNext();
        }} disabled={!displayedSoal || isLoading}>
          Lanjutkan ke Ekspor
        </Button>
      </div>

      {/* Confirm Regenerate Modal */}
      {isConfirmRegenerateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 md:p-8">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Konfirmasi Buat Ulang</h3>
            <p className="text-gray-600 mb-6">Apakah Anda ingin menyimpan (mengunduh) soal saat ini terlebih dahulu sebelum membuat soal baru? Soal yang sudah ada akan tertimpa.</p>
            <div className="flex flex-col gap-3">
              <Button onClick={handleSaveAndRegenerate} className="w-full justify-center">
                Simpan (.docx) & Buat Ulang
              </Button>
              <Button onClick={handleConfirmRegenerate} variant="secondary" className="w-full justify-center text-red-700 bg-red-50 hover:bg-red-100 border-red-200">
                Buat Ulang Tanpa Menyimpan
              </Button>
              <Button onClick={() => setIsConfirmRegenerateOpen(false)} variant="secondary" className="w-full justify-center">
                Batal
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Edit Questions Table Modal */}
      {showBulkEditModal && displayedSoal && (
        <BulkEditQuestionsModal
          isOpen={showBulkEditModal}
          onClose={() => setShowBulkEditModal(false)}
          soal={displayedSoal}
          kisiKisi={kisiKisi}
          userInput={appState.userInput}
          onSave={handleSaveBulkEdit}
        />
      )}

      {/* Full-Featured Print Preview Modal */}
      {showPreview && displayedSoal && (
        <ExamPrintPreviewModal
          soal={displayedSoal}
          userInput={appState.userInput}
          kisiKisi={kisiKisi}
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
        />
      )}
      {/* Detail Modal */}
      {modalData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 md:p-8 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b bg-gray-50">
              <h3 className="text-lg font-bold text-gray-800">Detail Soal - {modalData.bentuk}</h3>
              <button 
                onClick={() => setModalData(null)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-left">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <h4 className="font-semibold text-blue-800 mb-2">Konteks Kurikulum</h4>
                <div className="space-y-2 text-sm text-gray-700">
                  <p><span className="font-medium">Indikator:</span> {modalData.kisiItem.indikator}</p>
                  <p><span className="font-medium">Materi:</span> {modalData.kisiItem.materi}</p>
                  <p className="flex items-center gap-2">
                    <span className="font-medium">Tingkat Kognitif:</span> 
                    <span className="bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full text-xs font-bold">
                      {modalData.kisiItem.levelBloom}
                    </span>
                    <span className="text-gray-500 italic">
                      ({modalData.kisiItem.levelBloom.startsWith('C1') || modalData.kisiItem.levelBloom.startsWith('C2') || modalData.kisiItem.levelBloom.startsWith('C3') ? 'LOTS - Lower Order Thinking Skills' : 'HOTS - Higher Order Thinking Skills'})
                    </span>
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-800 mb-2 border-b pb-1">Pertanyaan (Stem)</h4>
                <div className="text-gray-700 leading-relaxed font-medium whitespace-pre-line">
                  {cleanStemText(modalData.soal.soal, Boolean(modalData.soal.options))}
                </div>
              </div>

              {modalData.soal.petunjuk && (
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2 border-b pb-1">Petunjuk</h4>
                  <p className="text-gray-600 italic whitespace-pre-line">{modalData.soal.petunjuk}</p>
                </div>
              )}

              {modalData.soal.options && normalizeOptions(modalData.soal.options).length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2 border-b pb-1">Pilihan Jawaban (Distractor)</h4>
                  <ul className="space-y-2 text-gray-700 font-sans">
                    {normalizeOptions(modalData.soal.options).map((opt) => {
                      const isCorrect = isCorrectOption(opt.key, modalData.soal.kunciJawaban);
                      return (
                        <li key={opt.key} className={`flex items-start gap-3 p-2.5 rounded-lg border ${isCorrect ? 'bg-emerald-50 border-emerald-300' : 'bg-gray-50 border-gray-200'}`}>
                          <span className={`font-bold w-6 shrink-0 ${isCorrect ? 'text-emerald-800' : 'text-gray-700'}`}>{opt.key}.</span>
                          <span className="flex-1 whitespace-pre-line">{opt.value}</span>
                          {isCorrect && <span className="ml-auto shrink-0 text-xs font-bold text-emerald-800 bg-emerald-200 px-2 py-0.5 rounded-full">KUNCI</span>}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {modalData.soal.kunciJawaban && (
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2 border-b pb-1">Kunci Jawaban</h4>
                  <p className="text-gray-800 font-semibold bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                    {formatKunciJawaban(modalData.soal.kunciJawaban)}
                  </p>
                </div>
              )}

              {modalData.soal.rubrik && (
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2 border-b pb-1">Rubrik Penilaian</h4>
                  <ul className="space-y-3 text-sm text-gray-700">
                    <li className="bg-gray-50 p-3 rounded border"><span className="font-bold text-green-700">Skor 4:</span> {modalData.soal.rubrik.skor4}</li>
                    <li className="bg-gray-50 p-3 rounded border"><span className="font-bold text-blue-700">Skor 3:</span> {modalData.soal.rubrik.skor3}</li>
                    <li className="bg-gray-50 p-3 rounded border"><span className="font-bold text-amber-700">Skor 2:</span> {modalData.soal.rubrik.skor2}</li>
                    <li className="bg-gray-50 p-3 rounded border"><span className="font-bold text-red-700">Skor 1:</span> {modalData.soal.rubrik.skor1}</li>
                  </ul>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t bg-gray-50 flex justify-end">
              <Button onClick={() => setModalData(null)} variant="secondary">Tutup</Button>
            </div>
          </div>
        </div>
      )}

    </Card>
  );
};

export default Step4Soal;
