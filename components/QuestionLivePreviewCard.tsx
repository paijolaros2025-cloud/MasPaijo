import React, { useState } from 'react';
import { UserInput, Bahasa, KisiKisiItem } from '../types';
import { Eye, ChevronLeft, ChevronRight, Printer, Info, Check } from './icons';
import { normalizeOptions, cleanStemText, formatKunciJawaban, isCorrectOption } from '../services/questionUtils';

export interface SelectedQuestionData {
  bentuk: 'Pilihan Ganda' | 'Pilihan Ganda Kompleks' | 'Isian Singkat' | 'Uraian';
  displayNoSoal: number;
  originalNoSoal: number;
  item: any;
  kisiItem?: KisiKisiItem;
}

interface QuestionLivePreviewCardProps {
  selectedQuestion: SelectedQuestionData | null;
  userInput: UserInput | null;
  currentIndex: number;
  totalQuestions: number;
  onSelectPrev: () => void;
  onSelectNext: () => void;
  onOpenFullPrintPreview?: () => void;
  onOpenDetailModal?: () => void;
}

export const QuestionLivePreviewCard: React.FC<QuestionLivePreviewCardProps> = ({
  selectedQuestion,
  userInput,
  currentIndex,
  totalQuestions,
  onSelectPrev,
  onSelectNext,
  onOpenFullPrintPreview,
  onOpenDetailModal,
}) => {
  const [previewMode, setPreviewMode] = useState<'siswa' | 'guru'>('siswa');

  if (!selectedQuestion) {
    return (
      <div className="bg-white rounded-xl border border-neutral-200 p-8 text-center shadow-sm">
        <Eye className="w-8 h-8 text-neutral-300 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-neutral-700">Live Preview Dokumen</h3>
        <p className="text-xs text-neutral-500 mt-1">
          Pilih salah satu butir soal pada daftar untuk melihat pratinjau format cetak & ekspor dokumen.
        </p>
      </div>
    );
  }

  const { bentuk, displayNoSoal, item, kisiItem } = selectedQuestion;
  const isArabic = userInput?.bahasa === Bahasa.Arab;
  const isJavanese = userInput?.bahasa === Bahasa.JawaHanacaraka;
  const isSunda = userInput?.bahasa === Bahasa.Sunda;

  const fontClass = isArabic
    ? 'font-arabic text-lg leading-[2.4]'
    : isJavanese
    ? 'font-javanese text-base leading-[2.2]'
    : 'font-serif text-[14.5px] leading-relaxed';

  const textDirection = isArabic ? 'rtl' : 'ltr';

  // Cognitive category determination
  const bloomLevel = kisiItem?.levelBloom || 'C3';
  const isLots = /C[12]/.test(bloomLevel);
  const isMots = /C3/.test(bloomLevel);
  const bloomCategory = isLots ? 'LOTS' : isMots ? 'MOTS' : 'HOTS';

  // Section title mapping matching exported docx & print preview
  const sectionTitle = (() => {
    switch (bentuk) {
      case 'Pilihan Ganda':
        return isArabic
          ? 'أ. اَلِاخْتِيَارُ مِنْ مُتَعَدِّدٍ'
          : isJavanese
          ? '꧇꧑꧇꧈ ꦥꦶꦭꦶꦲꦤ꧀ ꦒꦤ꧀ꦢ'
          : 'BAGIAN I: PILIHAN GANDA';
      case 'Pilihan Ganda Kompleks':
        return isArabic
          ? 'ب. اَلِاخْتِيَارُ مِنْ مُتَعَدِّدٍ الْمُرَكَّبُ'
          : isJavanese
          ? '꧇꧒꧇꧈ ꦥꦶꦭꦶꦲꦤ꧀ ꦒꦤ꧀ꦢ ꦏꦺꦴꦩ꧀ꦥ꧀ꦭꦺꦏ꧀ꦱ꧀'
          : 'BAGIAN II: PILIHAN GANDA KOMPLEKS';
      case 'Isian Singkat':
        return isArabic
          ? 'ج. اَلْإِجَابَةُ الْقَصِيرَةُ'
          : isJavanese
          ? '꧇꧓꧇꧈ ꦆꦱꦶꦪꦤ꧀ ꦱꦶꦁꦏꦠ꧀'
          : isSunda
          ? 'BAGIAN III: EUSIAN SINGGET'
          : 'BAGIAN III: ISIAN SINGKAT';
      case 'Uraian':
        return isArabic
          ? 'د. اَلْأَسْئِلَةُ الْمَقَالِيَّةُ'
          : isJavanese
          ? '꧇꧔꧇꧈ ꦈꦫꦲꦶꦪꦤ꧀'
          : isSunda
          ? 'BAGIAN IV: PEDARAN'
          : 'BAGIAN IV: URAIAN';
      default:
        return 'BAGIAN SOAL';
    }
  })();

  const sectionInstruction = (() => {
    switch (bentuk) {
      case 'Pilihan Ganda':
        return isArabic
          ? 'اِخْتَرْ أَصَحَّ الْأَجْوِبَةِ بِوَضْعِ عَلَامَةِ (X) عَلَى حَرْفِ أ، ب، ج، أَوْ د!'
          : 'Berilah tanda silang (X) pada huruf A, B, C, atau D di depan jawaban yang paling benar!';
      case 'Pilihan Ganda Kompleks':
        return item.petunjuk || 'Pilihlah lebih dari satu jawaban yang benar dengan memberi tanda centang (✓)!';
      case 'Isian Singkat':
        return 'Isilah titik-titik di bawah ini dengan jawaban yang singkat, tepat, dan benar!';
      case 'Uraian':
        return 'Jawablah pertanyaan-pertanyaan berikut dengan uraian yang jelas, lengkap, dan sistematis!';
      default:
        return '';
    }
  })();

  return (
    <div className="bg-white rounded-xl border border-neutral-200/90 shadow-sm overflow-hidden flex flex-col">
      {/* Top Header Toolbar */}
      <div className="px-4 py-3 bg-neutral-50/90 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
            <Eye className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-neutral-900 tracking-tight">Live Preview Dokumen</span>
              <span className="text-[10px] text-neutral-400">·</span>
              <span className="text-[11px] font-semibold text-emerald-800">
                Soal #{displayNoSoal}
              </span>
            </div>
            <p className="text-[10px] text-neutral-500 hidden sm:block">
              Format tipografi & tata letak naskah Word (.docx) / Ujian
            </p>
          </div>
        </div>

        {/* Question Stepper Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onSelectPrev}
            disabled={currentIndex <= 0}
            className={`p-1.5 rounded-md border transition-colors ${
              currentIndex <= 0
                ? 'text-neutral-300 border-neutral-200 cursor-not-allowed bg-neutral-50'
                : 'text-neutral-700 border-neutral-300 hover:bg-neutral-100 bg-white'
            }`}
            title="Soal Sebelumnya"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <span className="text-[11px] font-medium text-neutral-600 px-1 select-none">
            {currentIndex + 1} / {totalQuestions}
          </span>

          <button
            onClick={onSelectNext}
            disabled={currentIndex >= totalQuestions - 1}
            className={`p-1.5 rounded-md border transition-colors ${
              currentIndex >= totalQuestions - 1
                ? 'text-neutral-300 border-neutral-200 cursor-not-allowed bg-neutral-50'
                : 'text-neutral-700 border-neutral-300 hover:bg-neutral-100 bg-white'
            }`}
            title="Soal Selanjutnya"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Segmented Mode Switcher (Siswa vs Guru) */}
      <div className="px-4 py-2 border-b border-neutral-200 bg-white flex items-center justify-between gap-2">
        <div className="inline-flex rounded-lg p-0.5 bg-neutral-100 border border-neutral-200/80 text-xs">
          <button
            type="button"
            onClick={() => setPreviewMode('siswa')}
            className={`px-3 py-1 font-medium rounded-md transition-all ${
              previewMode === 'siswa'
                ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Tampilan Siswa
          </button>
          <button
            type="button"
            onClick={() => setPreviewMode('guru')}
            className={`px-3 py-1 font-medium rounded-md transition-all ${
              previewMode === 'guru'
                ? 'bg-white text-emerald-900 shadow-xs font-semibold'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Kunci & Rubrik (Guru)
          </button>
        </div>

        <div className="flex items-center gap-1">
          {onOpenDetailModal && (
            <button
              onClick={onOpenDetailModal}
              className="p-1.5 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 rounded-md transition-colors"
              title="Lihat Rincian Lengkap Kisi-Kisi"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          )}
          {onOpenFullPrintPreview && (
            <button
              onClick={onOpenFullPrintPreview}
              className="p-1.5 text-neutral-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
              title="Buka Pratinjau Cetak Seluruh Naskah"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Paper Sheet Preview Area */}
      <div className="p-4 sm:p-5 bg-neutral-100/50 flex-1 overflow-y-auto max-h-[580px]">
        <div className="bg-white rounded-lg border border-neutral-300 shadow-xs p-5 sm:p-6 text-neutral-900 relative">
          
          {/* Subtle Document Paper Header */}
          <div className="border-b border-neutral-200 pb-2 mb-3.5 text-[11px] text-neutral-500 flex flex-wrap items-center justify-between gap-1 font-sans">
            <span className="font-semibold uppercase tracking-wider text-neutral-700">
              MIN 1 BANYUWANGI · PAS 2025/2026
            </span>
            <div className="flex items-center gap-1.5 text-[10px]">
              <span>{userInput?.mataPelajaran || 'Ujian'}</span>
              <span>·</span>
              <span>Kelas {userInput?.kelas || '-'}</span>
            </div>
          </div>

          {/* Section Indicator */}
          <div className="mb-3.5">
            <h4 className="text-xs font-bold uppercase tracking-wide text-neutral-800 font-sans">
              {sectionTitle}
            </h4>
            {sectionInstruction && (
              <p className="text-[11px] italic text-neutral-500 mt-0.5 font-sans leading-tight">
                {sectionInstruction}
              </p>
            )}
          </div>

          {/* Formatted Question Body */}
          <div className={`${fontClass}`} dir={textDirection}>
            {/* Question Stem */}
            <div className="flex items-start gap-2.5">
              <span className="font-bold shrink-0">{displayNoSoal}.</span>
              <div className="flex-1">
                <div className="text-neutral-900 font-medium whitespace-pre-line leading-relaxed">
                  {cleanStemText(item.soal, Boolean(item.options && item.options.length > 0))}
                </div>
              </div>
            </div>

            {/* Type Specific Formatters */}

            {/* 1. PILIHAN GANDA */}
            {bentuk === 'Pilihan Ganda' && (
              <div className="mt-3.5 pl-6 space-y-2">
                {normalizeOptions(item.options).map((opt) => {
                  const isCorrect = isCorrectOption(opt.key, item.kunciJawaban);
                  const showKey = previewMode === 'guru' && isCorrect;

                  return (
                    <div
                      key={opt.key}
                      className={`flex items-start gap-2.5 p-2 rounded-lg transition-colors ${
                        showKey
                          ? 'bg-emerald-50/90 border border-emerald-300 text-emerald-950 font-semibold shadow-xs'
                          : 'text-neutral-800 hover:bg-neutral-50/60'
                      }`}
                    >
                      <span className={`font-bold shrink-0 w-6 ${showKey ? 'text-emerald-800' : 'text-neutral-700'}`}>
                        {opt.key}.
                      </span>
                      <span className="flex-1 whitespace-pre-line">{opt.value}</span>
                      {showKey && (
                        <span className="ml-2 shrink-0 inline-flex items-center gap-1 text-[11px] font-sans font-bold text-emerald-800 bg-emerald-200/90 px-2 py-0.5 rounded-full">
                          <Check className="w-3 h-3 text-emerald-700" />
                          Kunci Jawaban
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* 2. PILIHAN GANDA KOMPLEKS */}
            {bentuk === 'Pilihan Ganda Kompleks' && (
              <div className="mt-3.5 pl-6 space-y-2">
                {normalizeOptions(item.options).map((opt) => {
                  const isCorrect = isCorrectOption(opt.key, item.kunciJawaban);
                  const showKey = previewMode === 'guru' && isCorrect;

                  return (
                    <div
                      key={opt.key}
                      className={`flex items-start gap-2.5 p-2 rounded-lg transition-colors ${
                        showKey
                          ? 'bg-teal-50/90 border border-teal-300 text-teal-950 font-semibold shadow-xs'
                          : 'text-neutral-800 hover:bg-neutral-50/60'
                      }`}
                    >
                      <span className={`font-mono shrink-0 select-none ${showKey ? 'text-teal-700 font-bold' : 'text-neutral-400'}`}>
                        {showKey ? '[✓]' : '[  ]'}
                      </span>
                      <span className={`font-bold shrink-0 w-6 ${showKey ? 'text-teal-800' : 'text-neutral-700'}`}>{opt.key}.</span>
                      <span className="flex-1 whitespace-pre-line">{opt.value}</span>
                      {showKey && (
                        <span className="ml-2 shrink-0 inline-flex items-center gap-1 text-[11px] font-sans font-bold text-teal-800 bg-teal-200/90 px-2 py-0.5 rounded-full">
                          <Check className="w-3 h-3 text-teal-700" />
                          Kunci
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* 3. ISIAN SINGKAT */}
            {bentuk === 'Isian Singkat' && (
              <div className="mt-4 pl-6 font-sans">
                <div className="flex items-center gap-2 text-sm text-neutral-600">
                  <span className="font-semibold text-neutral-800">Jawaban:</span>
                  <span className="border-b-2 border-dotted border-neutral-400 flex-1 h-5 tracking-widest text-transparent select-none">
                    ......................................................................
                  </span>
                </div>

                {previewMode === 'guru' && item.kunciJawaban && (
                  <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-900 font-sans">
                    <span className="font-bold">Kunci Jawaban Guru:</span>{' '}
                    <span className="font-semibold">{formatKunciJawaban(item.kunciJawaban)}</span>
                  </div>
                )}
              </div>
            )}

            {/* 4. URAIAN */}
            {bentuk === 'Uraian' && (
              <div className="mt-4 pl-6 font-sans">
                {previewMode === 'siswa' ? (
                  <div className="space-y-3.5 pt-1 text-xs text-neutral-400">
                    <p className="font-semibold text-neutral-700">Lembar Jawaban:</p>
                    <div className="border-b border-dotted border-neutral-300 w-full h-4"></div>
                    <div className="border-b border-dotted border-neutral-300 w-full h-4"></div>
                    <div className="border-b border-dotted border-neutral-300 w-full h-4"></div>
                    <div className="border-b border-dotted border-neutral-300 w-full h-4"></div>
                  </div>
                ) : (
                  item.rubrik && (
                    <div className="mt-2 space-y-2 p-3 bg-neutral-50 border border-neutral-200 rounded-md text-xs font-sans text-neutral-800">
                      <p className="font-bold text-neutral-900 border-b border-neutral-200 pb-1">
                        Pedoman Penskoran / Rubrik Guru:
                      </p>
                      <ul className="space-y-1.5 text-[11px] text-neutral-700">
                        <li className="flex gap-2">
                          <span className="font-bold text-emerald-700 w-12 shrink-0">Skor 4:</span>
                          <span>{item.rubrik.skor4 || 'Jawaban lengkap dan sempurna'}</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold text-blue-700 w-12 shrink-0">Skor 3:</span>
                          <span>{item.rubrik.skor3 || 'Sebagian besar jawaban benar'}</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold text-amber-700 w-12 shrink-0">Skor 2:</span>
                          <span>{item.rubrik.skor2 || 'Jawaban kurang lengkap'}</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="font-bold text-rose-700 w-12 shrink-0">Skor 1:</span>
                          <span>{item.rubrik.skor1 || 'Jawaban belum tepat atau mendekati'}</span>
                        </li>
                      </ul>
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          {/* Document Metadata Footnote (Clean, unboxed text per constitution) */}
          <div className="mt-6 pt-3 border-t border-neutral-200/80 text-[11px] text-neutral-500 font-sans flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="font-medium text-neutral-700">Level Kognitif:</span>
              <span className="font-semibold text-neutral-900">{bloomLevel}</span>
              <span aria-hidden="true" className="text-neutral-300">·</span>
              <span className={`font-semibold ${
                bloomCategory === 'HOTS' ? 'text-indigo-700' : bloomCategory === 'MOTS' ? 'text-amber-700' : 'text-emerald-700'
              }`}>
                {bloomCategory} ({bloomCategory === 'HOTS' ? 'Penalaran Tinggi' : bloomCategory === 'MOTS' ? 'Penerapan' : 'Pemahaman Dasar'})
              </span>
            </div>

            {kisiItem?.materi && (
              <div className="flex items-start gap-1.5">
                <span className="font-medium text-neutral-700 shrink-0">Materi:</span>
                <span className="text-neutral-600 line-clamp-1">{kisiItem.materi}</span>
              </div>
            )}

            {kisiItem?.indikator && (
              <div className="flex items-start gap-1.5">
                <span className="font-medium text-neutral-700 shrink-0">Indikator:</span>
                <span className="text-neutral-600 line-clamp-2 leading-relaxed">{kisiItem.indikator}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card Footer Actions */}
      <div className="px-4 py-2.5 bg-neutral-50 border-t border-neutral-200 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="text-neutral-500 text-[11px]">
          Klik butir soal pada daftar untuk memperbarui pratinjau.
        </span>

        {onOpenFullPrintPreview && (
          <button
            type="button"
            onClick={onOpenFullPrintPreview}
            className="inline-flex items-center gap-1.5 text-emerald-800 hover:text-emerald-900 font-semibold hover:underline"
          >
            <Printer className="w-3.5 h-3.5 text-emerald-700" />
            Cetak Seluruh Naskah
          </button>
        )}
      </div>
    </div>
  );
};

export default QuestionLivePreviewCard;
