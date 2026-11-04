import React, { useState } from 'react';
import { Soal, UserInput, Bahasa, KisiKisiItem } from '../types';
import Button from './Button';
import { Printer, X, Check, Eye } from './icons';

interface ExamPrintPreviewModalProps {
  soal: Soal;
  userInput: UserInput | null;
  kisiKisi?: KisiKisiItem[];
  isOpen: boolean;
  onClose: () => void;
}

export const ExamPrintPreviewModal: React.FC<ExamPrintPreviewModalProps> = ({
  soal,
  userInput,
  kisiKisi = [],
  isOpen,
  onClose,
}) => {
  const [printMode, setPrintMode] = useState<'siswa' | 'guru'>('siswa');
  const [includeKop, setIncludeKop] = useState<boolean>(true);
  const [density, setDensity] = useState<'normal' | 'compact'>('normal');
  const [fontFamily, setFontFamily] = useState<'sans' | 'serif'>('serif');
  const [includeAnswerSheet, setIncludeAnswerSheet] = useState<boolean>(false);
  const [includeQuickKeyTable, setIncludeQuickKeyTable] = useState<boolean>(true);

  if (!isOpen || !soal) return null;

  const isArabic = userInput?.bahasa === Bahasa.Arab;
  const isJavanese = userInput?.bahasa === Bahasa.JawaHanacaraka;
  const isSunda = userInput?.bahasa === Bahasa.Sunda;

  const handlePrint = () => {
    window.print();
  };

  // Section Labels based on language
  const labels = {
    pg: isArabic 
      ? 'أ. اَلِاخْتِيَارُ مِنْ مُتَعَدِّدٍ' 
      : isJavanese 
      ? '꧇꧑꧇꧈ ꦥꦶꦭꦶꦲꦤ꧀ ꦒꦤ꧀ꦢ' 
      : isSunda 
      ? 'A. PILIHAN GANDA' 
      : 'A. PILIHAN GANDA',
    pgDesc: isArabic
      ? 'اِخْتَرْ أَصَحَّ الْأَجْوِبَةِ بِوَضْعِ عَلَامَةِ الضَّرْبِ (X) عَلَى حَرْفِ أ، ب، ج، أَوْ د!'
      : 'Berilah tanda silang (X) pada huruf A, B, C, atau D di depan jawaban yang paling benar!',
    pgk: isArabic
      ? 'ب. اَلِاخْتِيَارُ مِنْ مُتَعَدِّدٍ الْمُرَكَّبُ'
      : isJavanese
      ? '꧇꧒꧇꧈ ꦥꦶꦭꦶꦲꦤ꧀ ꦒꦤ꧀ꦢ ꦏꦺꦴꦩ꧀ꦥ꧀ꦭꦺꦏ꧀ꦱ꧀'
      : isSunda
      ? 'B. PILIHAN GANDA KOMPLEKS'
      : 'B. PILIHAN GANDA KOMPLEKS',
    pgkDesc: 'Pilihlah lebih dari satu jawaban yang benar dengan memberi tanda centang (✓) pada kotak yang tersedia!',
    isian: isArabic
      ? 'ج. اَلْإِجَابَةُ الْقَصِيرَةُ'
      : isJavanese
      ? '꧇꧓꧇꧈ ꦆꦱꦶꦪꦤ꧀ ꦱꦶꦁꦏꦠ꧀'
      : isSunda
      ? 'C. EUSIAN SINGGET'
      : 'C. ISIAN SINGKAT',
    isianDesc: 'Isilah titik-titik di bawah ini dengan jawaban yang singkat, tepat, dan benar!',
    uraian: isArabic
      ? 'د. اَلْأَسْئِلَةُ الْمَقَالِيَّةُ'
      : isJavanese
      ? '꧇꧔꧇꧈ ꦈꦫꦲꦶꦪꦤ꧀'
      : isSunda
      ? 'D. PEDARAN'
      : 'D. URAIAN',
    uraianDesc: 'Jawablah pertanyaan-pertanyaan di bawah ini dengan uraian yang jelas, runut, dan benar!',
  };

  const totalQuestions = 
    (soal.pg?.length || 0) + 
    (soal.pgKompleks?.length || 0) + 
    (soal.isian?.length || 0) + 
    (soal.uraian?.length || 0);

  // Helper to find bloom level / indicator for a question if kisiKisi is available
  const getKisiDetails = (noSoal: number, bentuk: string) => {
    return kisiKisi.find(k => k.noSoal === noSoal || (k.bentukSoal.toLowerCase().includes(bentuk.toLowerCase())));
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm print-modal-overlay">
      {/* Interactive Toolbar (Screen only, completely hidden on print) */}
      <div className="no-print sticky top-0 z-30 bg-slate-800 text-white shadow-xl border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-2 rounded-lg text-white">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Pratinjau Cetak Naskah Soal
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                  {totalQuestions} Butir Soal
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Format standar naskah ujian madrasah siap cetak / simpan ke PDF
              </p>
            </div>
          </div>

          {/* Controls: Mode & Options */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Version Switcher */}
            <div className="inline-flex rounded-lg bg-slate-700 p-1 text-xs font-medium">
              <button
                type="button"
                onClick={() => setPrintMode('siswa')}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  printMode === 'siswa'
                    ? 'bg-emerald-600 text-white font-semibold shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Naskah Siswa
              </button>
              <button
                type="button"
                onClick={() => setPrintMode('guru')}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  printMode === 'guru'
                    ? 'bg-amber-600 text-white font-semibold shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Naskah Guru (Kunci & Rubrik)
              </button>
            </div>

            {/* Kop Toggle */}
            <button
              type="button"
              onClick={() => setIncludeKop(!includeKop)}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium border ${
                includeKop
                  ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                  : 'border-slate-600 bg-slate-700 text-slate-400'
              }`}
              title="Sertakan kepala surat (KOP) madrasah"
            >
              {includeKop ? '✓ Kop Aktif' : 'Tanpa Kop'}
            </button>

            {/* Density Toggle */}
            <button
              type="button"
              onClick={() => setDensity(density === 'normal' ? 'compact' : 'normal')}
              className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-slate-700 border border-slate-600 text-slate-200 hover:bg-slate-600"
              title="Ubah spasi untuk menghemat kertas"
            >
              {density === 'compact' ? 'Mode Hemat Kertas' : 'Spasi Standar'}
            </button>

            {/* Font Family */}
            <button
              type="button"
              onClick={() => setFontFamily(fontFamily === 'serif' ? 'sans' : 'serif')}
              className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-slate-700 border border-slate-600 text-slate-200 hover:bg-slate-600"
              title="Pilih jenis huruf (Serif klasik atau Sans modern)"
            >
              {fontFamily === 'serif' ? 'Huruf: Serif' : 'Huruf: Sans'}
            </button>

            {/* Quick Answer Sheet Toggle for Students */}
            {printMode === 'siswa' && (
              <button
                type="button"
                onClick={() => setIncludeAnswerSheet(!includeAnswerSheet)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium border ${
                  includeAnswerSheet
                    ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                    : 'border-slate-600 bg-slate-700 text-slate-400'
                }`}
                title="Sertakan template lembar jawaban siswa di halaman akhir"
              >
                {includeAnswerSheet ? '✓ Lembar Jawaban' : '+ Lembar Jawaban'}
              </button>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2 ml-2 pl-2 border-l border-slate-700">
              <Button
                onClick={handlePrint}
                className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg text-xs py-1.5 px-3.5 flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                Cetak / Simpan PDF
              </Button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 transition"
                title="Tutup Pratinjau"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Preview Container */}
      <div className="py-6 px-4 md:px-8 flex justify-center print:p-0 print-modal-container">
        {/* Printable Paper Canvas (A4 Dimensions Simulation) */}
        <div
          className={`print-paper-sheet w-full max-w-[210mm] min-h-[297mm] bg-white text-black shadow-2xl p-8 md:p-12 print:p-0 print:shadow-none print:max-w-none ${
            fontFamily === 'serif' ? 'font-serif' : 'font-sans'
          } ${density === 'compact' ? 'text-[13px] leading-snug' : 'text-[14px] leading-relaxed'}`}
          style={{ boxSizing: 'border-box' }}
        >
          {/* Watermark in Guru Mode */}
          {printMode === 'guru' && (
            <div className="no-print mb-4 py-1.5 px-3 bg-amber-50 border border-amber-300 text-amber-900 rounded text-xs flex items-center justify-between">
              <span className="font-semibold flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-amber-600" />
                Naskah Pegangan Guru (Kunci Jawaban & Rubrik Terbuka)
              </span>
              <span className="text-[11px] text-amber-700">
                Pilih tab &quot;Naskah Siswa&quot; jika ingin mencetak soal untuk peserta ujian
              </span>
            </div>
          )}

          {/* KOP MADRASAH (Official Indonesian Madrasah Exam Header) */}
          {includeKop && (
            <div className="mb-4 text-center page-break-avoid">
              <div className="flex items-center justify-center gap-4 border-b-2 border-black pb-2 mb-0.5">
                {/* Logo Kemenag / MIN 1 Banyuwangi */}
                <div className="shrink-0 w-16 h-16 flex items-center justify-center">
                  <img
                    src="https://i.imghippo.com/files/nrnU9752iR.png"
                    alt="Logo Kemenag"
                    className="w-14 h-14 object-contain"
                    onError={(e) => {
                      // Fallback icon if image fails to load
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
                {/* Heading Text */}
                <div className="flex-1 text-center">
                  <h4 className="text-[13px] font-bold tracking-wide uppercase leading-tight">
                    Kementerian Agama Republik Indonesia
                  </h4>
                  <h4 className="text-[12px] font-bold tracking-wide uppercase leading-tight">
                    Kantor Kementerian Agama Kabupaten Banyuwangi
                  </h4>
                  <h3 className="text-[15px] font-extrabold uppercase tracking-wider text-black leading-tight">
                    Madrasah Ibtidaiyah Negeri 1 Banyuwangi
                  </h3>
                  <p className="text-[10px] text-gray-700 italic leading-tight">
                    Alamat: Jl. Raya Jember No. 123 Banyuwangi | Web: min1banyuwangi.sch.id
                  </p>
                </div>
                {/* Balance spacer */}
                <div className="shrink-0 w-16 h-16 hidden sm:block"></div>
              </div>
              {/* Double Line Separator standard in Indonesian official papers */}
              <div className="border-b-4 border-double border-black my-1"></div>
            </div>
          )}

          {/* Exam Title */}
          <div className="text-center mb-4 page-break-avoid">
            <h2 className="text-[16px] font-extrabold uppercase tracking-wide">
              {printMode === 'guru' ? 'PEDOMAN PENILAIAN & KUNCI JAWABAN' : 'PENILAIAN AKHIR SEMESTER (PAS) / ASAS'}
            </h2>
            <h3 className="text-[13px] font-semibold uppercase tracking-wider text-gray-800">
              TAHUN PELAJARAN 2025/2026
            </h3>
          </div>

          {/* Identity Table (Tabel Identitas Peserta & Ujian) */}
          <div className="border border-black p-3 mb-5 text-[12px] page-break-avoid">
            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
              <div className="flex">
                <span className="w-28 font-semibold">Mata Pelajaran</span>
                <span className="w-3">:</span>
                <span className="font-bold flex-1 uppercase">{userInput?.mataPelajaran || '-'}</span>
              </div>
              <div className="flex">
                <span className="w-28 font-semibold">Nama Peserta</span>
                <span className="w-3">:</span>
                <span className="flex-1 border-b border-dotted border-black">
                  {printMode === 'guru' ? '(Pegangan Guru)' : ''}
                </span>
              </div>
              <div className="flex">
                <span className="w-28 font-semibold">Kelas / Fase</span>
                <span className="w-3">:</span>
                <span className="flex-1">{userInput?.kelas || '-'}</span>
              </div>
              <div className="flex">
                <span className="w-28 font-semibold">Nomor Ujian / Absen</span>
                <span className="w-3">:</span>
                <span className="flex-1 border-b border-dotted border-black"></span>
              </div>
              <div className="flex">
                <span className="w-28 font-semibold">Hari / Tanggal</span>
                <span className="w-3">:</span>
                <span className="flex-1 border-b border-dotted border-black"></span>
              </div>
              <div className="flex">
                <span className="w-28 font-semibold">Waktu</span>
                <span className="w-3">:</span>
                <span className="flex-1">90 Menit</span>
              </div>
            </div>
          </div>

          {/* General Instructions (Petunjuk Umum) */}
          {printMode === 'siswa' && (
            <div className="bg-gray-50 border border-gray-300 p-2.5 mb-5 text-[11px] page-break-avoid">
              <p className="font-bold uppercase mb-1">Petunjuk Umum:</p>
              <ol className="list-decimal pl-4 space-y-0.5 text-gray-800">
                <li>Awali pekerjaan Anda dengan membaca Basmalah dan berdoa.</li>
                <li>Tuliskan identitas diri Anda secara lengkap dan benar pada tempat yang telah disediakan.</li>
                <li>Periksa dan bacalah setiap butir soal dengan saksama sebelum Anda menjawabnya.</li>
                <li>Dahulukan menjawab butir soal yang Anda anggap paling mudah.</li>
                <li>Periksalah kembali seluruh lembar jawaban sebelum diserahkan kepada pengawas ujian.</li>
              </ol>
            </div>
          )}

          {/* SECTION A: PILIHAN GANDA */}
          {soal.pg && soal.pg.length > 0 && (
            <div className="mb-6">
              <div className="border-b-2 border-black pb-1 mb-3 page-break-avoid">
                <h4 className="font-bold text-[13px] uppercase">{labels.pg}</h4>
                <p className="text-[11px] italic text-gray-700">{labels.pgDesc}</p>
              </div>

              <div className="space-y-4">
                {soal.pg.map((item, idx) => {
                  const itemKisi = getKisiDetails(item.noSoal, 'Pilihan Ganda');
                  return (
                    <div key={`pg-${item.noSoal || idx}`} className="page-break-avoid">
                      <div className="flex items-start gap-2">
                        <span className="font-bold shrink-0">{item.noSoal}.</span>
                        <div className="flex-1">
                          <p
                            className={`font-medium ${
                              isArabic ? 'font-serif text-right text-lg' : ''
                            }`}
                            dir={isArabic ? 'rtl' : 'ltr'}
                          >
                            {item.soal}
                          </p>

                          {/* Options grid */}
                          <div
                            className={`mt-2 grid ${
                              item.options.some((o) => o.value.length > 40)
                                ? 'grid-cols-1 gap-1'
                                : 'grid-cols-2 sm:grid-cols-4 gap-2'
                            } text-[12px]`}
                            dir={isArabic ? 'rtl' : 'ltr'}
                          >
                            {item.options.map((opt) => {
                              const isKey = printMode === 'guru' && opt.key === item.kunciJawaban;
                              return (
                                <div
                                  key={opt.key}
                                  className={`flex items-start gap-1.5 p-1 rounded ${
                                    isKey
                                      ? 'bg-amber-100 font-bold border border-amber-400 text-black'
                                      : ''
                                  }`}
                                >
                                  <span className="font-bold shrink-0">{opt.key}.</span>
                                  <span>{opt.value}</span>
                                  {isKey && (
                                    <span className="ml-auto text-[10px] bg-amber-600 text-white px-1 rounded">
                                      KUNCI
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Guru Meta Information */}
                          {printMode === 'guru' && (
                            <div className="mt-1.5 pt-1 border-t border-dashed border-gray-300 text-[11px] flex flex-wrap items-center gap-3 text-gray-600">
                              <span className="font-bold text-emerald-800">
                                Kunci: {item.kunciJawaban}
                              </span>
                              {itemKisi && (
                                <>
                                  <span>Level: <strong>{itemKisi.levelBloom}</strong></span>
                                  <span className="truncate max-w-md">Indikator: {itemKisi.indikator}</span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION B: PILIHAN GANDA KOMPLEKS */}
          {soal.pgKompleks && soal.pgKompleks.length > 0 && (
            <div className="mb-6">
              <div className="border-b-2 border-black pb-1 mb-3 page-break-avoid">
                <h4 className="font-bold text-[13px] uppercase">{labels.pgk}</h4>
                <p className="text-[11px] italic text-gray-700">{labels.pgkDesc}</p>
              </div>

              <div className="space-y-5">
                {soal.pgKompleks.map((item, idx) => {
                  const itemKisi = getKisiDetails(item.noSoal, 'Kompleks');
                  return (
                    <div key={`pgk-${item.noSoal || idx}`} className="page-break-avoid">
                      <div className="flex items-start gap-2">
                        <span className="font-bold shrink-0">{item.noSoal}.</span>
                        <div className="flex-1">
                          <p
                            className={`font-medium ${
                              isArabic ? 'font-serif text-right text-lg' : ''
                            }`}
                            dir={isArabic ? 'rtl' : 'ltr'}
                          >
                            {item.soal}
                          </p>
                          {item.petunjuk && (
                            <p className="text-[11px] italic text-gray-600 mt-0.5">
                              {item.petunjuk}
                            </p>
                          )}

                          {/* Options Checklist */}
                          <div className="mt-2 space-y-1.5 text-[12px]" dir={isArabic ? 'rtl' : 'ltr'}>
                            {item.options.map((opt) => {
                              const isCheckedKey =
                                printMode === 'guru' &&
                                Array.isArray(item.kunciJawaban) &&
                                item.kunciJawaban.includes(opt.key);
                              return (
                                <div
                                  key={opt.key}
                                  className={`flex items-start gap-2.5 p-1 rounded ${
                                    isCheckedKey
                                      ? 'bg-amber-100 font-bold border border-amber-400 text-black'
                                      : ''
                                  }`}
                                >
                                  <span className="inline-flex items-center justify-center w-4 h-4 border border-black rounded text-[11px] shrink-0 mt-0.5">
                                    {isCheckedKey ? '✓' : ''}
                                  </span>
                                  <span className="font-semibold shrink-0">{opt.key}.</span>
                                  <span className="flex-1">{opt.value}</span>
                                  {isCheckedKey && (
                                    <span className="text-[10px] bg-amber-600 text-white px-1 rounded">
                                      BENAR
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Guru Meta */}
                          {printMode === 'guru' && (
                            <div className="mt-1.5 pt-1 border-t border-dashed border-gray-300 text-[11px] flex flex-wrap items-center gap-3 text-gray-600">
                              <span className="font-bold text-emerald-800">
                                Kunci: {(item.kunciJawaban || []).join(', ')}
                              </span>
                              {itemKisi && (
                                <>
                                  <span>Level: <strong>{itemKisi.levelBloom}</strong></span>
                                  <span className="truncate max-w-md">Indikator: {itemKisi.indikator}</span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION C: ISIAN SINGKAT */}
          {soal.isian && soal.isian.length > 0 && (
            <div className="mb-6">
              <div className="border-b-2 border-black pb-1 mb-3 page-break-avoid">
                <h4 className="font-bold text-[13px] uppercase">{labels.isian}</h4>
                <p className="text-[11px] italic text-gray-700">{labels.isianDesc}</p>
              </div>

              <div className="space-y-4">
                {soal.isian.map((item, idx) => {
                  const itemKisi = getKisiDetails(item.noSoal, 'Isian');
                  return (
                    <div key={`isian-${item.noSoal || idx}`} className="page-break-avoid">
                      <div className="flex items-start gap-2">
                        <span className="font-bold shrink-0">{item.noSoal}.</span>
                        <div className="flex-1">
                          <p
                            className={`font-medium ${
                              isArabic ? 'font-serif text-right text-lg' : ''
                            }`}
                            dir={isArabic ? 'rtl' : 'ltr'}
                          >
                            {item.soal}
                          </p>

                          {/* Student Dotted Line */}
                          {printMode === 'siswa' && (
                            <div className="mt-2 pt-2">
                              <div className="border-b border-dotted border-black w-full h-4"></div>
                            </div>
                          )}

                          {/* Guru Key Display */}
                          {printMode === 'guru' && (
                            <div className="mt-2 p-2 bg-emerald-50 border border-emerald-300 rounded text-[11px]">
                              <p className="font-bold text-emerald-900">
                                Kunci Jawaban: <span className="font-normal">{item.kunciJawaban}</span>
                              </p>
                              {itemKisi && (
                                <p className="text-gray-600 mt-0.5">
                                  Level: <strong>{itemKisi.levelBloom}</strong> | Indikator: {itemKisi.indikator}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION D: URAIAN */}
          {soal.uraian && soal.uraian.length > 0 && (
            <div className="mb-6">
              <div className="border-b-2 border-black pb-1 mb-3 page-break-avoid">
                <h4 className="font-bold text-[13px] uppercase">{labels.uraian}</h4>
                <p className="text-[11px] italic text-gray-700">{labels.uraianDesc}</p>
              </div>

              <div className="space-y-5">
                {soal.uraian.map((item, idx) => {
                  const itemKisi = getKisiDetails(item.noSoal, 'Uraian');
                  return (
                    <div key={`uraian-${item.noSoal || idx}`} className="page-break-avoid">
                      <div className="flex items-start gap-2">
                        <span className="font-bold shrink-0">{item.noSoal}.</span>
                        <div className="flex-1">
                          <p
                            className={`font-medium ${
                              isArabic ? 'font-serif text-right text-lg' : ''
                            }`}
                            dir={isArabic ? 'rtl' : 'ltr'}
                          >
                            {item.soal}
                          </p>

                          {/* Student Answer Box Lines */}
                          {printMode === 'siswa' && (
                            <div className="mt-3 border border-gray-400 rounded p-2 h-24 bg-gray-50/30 flex flex-col justify-between">
                              <div className="border-b border-dotted border-gray-300 h-6"></div>
                              <div className="border-b border-dotted border-gray-300 h-6"></div>
                              <div className="border-b border-dotted border-gray-300 h-6"></div>
                            </div>
                          )}

                          {/* Guru Rubric Table */}
                          {printMode === 'guru' && item.rubrik && (
                            <div className="mt-2 border border-gray-300 rounded overflow-hidden text-[11px]">
                              <div className="bg-gray-100 px-2 py-1 font-bold border-b border-gray-300 text-gray-800 flex justify-between">
                                <span>Rubrik Penskoran Soal No. {item.noSoal}</span>
                                {itemKisi && <span>Tingkat: {itemKisi.levelBloom}</span>}
                              </div>
                              <div className="p-2 space-y-1 bg-white">
                                <div className="flex gap-2">
                                  <span className="font-bold text-emerald-800 w-16 shrink-0">Skor 4:</span>
                                  <span className="text-gray-800">{item.rubrik.skor4}</span>
                                </div>
                                <div className="flex gap-2">
                                  <span className="font-bold text-blue-800 w-16 shrink-0">Skor 3:</span>
                                  <span className="text-gray-800">{item.rubrik.skor3}</span>
                                </div>
                                <div className="flex gap-2">
                                  <span className="font-bold text-amber-800 w-16 shrink-0">Skor 2:</span>
                                  <span className="text-gray-800">{item.rubrik.skor2}</span>
                                </div>
                                <div className="flex gap-2">
                                  <span className="font-bold text-red-800 w-16 shrink-0">Skor 1:</span>
                                  <span className="text-gray-800">{item.rubrik.skor1}</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TEACHER SUMMARY TABLE (KUNCI JAWABAN CEPAT DI HALAMAN AKHIR) */}
          {printMode === 'guru' && includeQuickKeyTable && (
            <div className="mt-8 pt-4 border-t-2 border-black page-break-before">
              <h3 className="text-center font-bold text-[14px] uppercase mb-1">
                REKAPITULASI KUNCI JAWABAN & PEDOMAN PENSKORAN
              </h3>
              <p className="text-center text-[11px] text-gray-600 mb-4">
                Mata Pelajaran: {userInput?.mataPelajaran} | Kelas: {userInput?.kelas}
              </p>

              {/* PG Keys Table */}
              {soal.pg && soal.pg.length > 0 && (
                <div className="mb-4">
                  <h5 className="font-bold text-[12px] mb-1">A. Kunci Pilihan Ganda:</h5>
                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 text-center text-[11px]">
                    {soal.pg.map((s) => (
                      <div key={s.noSoal} className="border border-black p-1">
                        <div className="text-[10px] text-gray-500 font-bold">{s.noSoal}</div>
                        <div className="font-extrabold text-[13px]">{s.kunciJawaban}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PGK Keys Table */}
              {soal.pgKompleks && soal.pgKompleks.length > 0 && (
                <div className="mb-4">
                  <h5 className="font-bold text-[12px] mb-1">B. Kunci Pilihan Ganda Kompleks:</h5>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    {soal.pgKompleks.map((s) => (
                      <div key={s.noSoal} className="border border-black p-1.5">
                        <span className="font-bold mr-1">No. {s.noSoal}:</span>
                        <span className="font-semibold">{(s.kunciJawaban || []).join(', ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Isian Keys Table */}
              {soal.isian && soal.isian.length > 0 && (
                <div className="mb-4">
                  <h5 className="font-bold text-[12px] mb-1">C. Kunci Isian Singkat:</h5>
                  <div className="space-y-1 text-[11px]">
                    {soal.isian.map((s) => (
                      <div key={s.noSoal} className="flex gap-2 border-b border-gray-200 pb-0.5">
                        <span className="font-bold w-12 shrink-0">No. {s.noSoal}:</span>
                        <span className="font-medium text-gray-800">{s.kunciJawaban}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Scoring Formula */}
              <div className="mt-4 p-3 border border-black bg-gray-50 text-[11px]">
                <h6 className="font-bold uppercase mb-1">Pedoman Perhitungan Nilai Akhir:</h6>
                <p>
                  Nilai Akhir = (Skor Perolehan / Skor Maksimum) × 100
                </p>
                <div className="flex justify-between mt-6 pt-4 text-center">
                  <div className="w-48">
                    <p>Mengetahui,</p>
                    <p className="font-semibold">Kepala MIN 1 Banyuwangi</p>
                    <div className="h-16"></div>
                    <p className="font-bold underline">H. Moh. Arif, M.Pd.I</p>
                    <p className="text-[10px]">NIP. 197405122005011003</p>
                  </div>
                  <div className="w-48">
                    <p>Banyuwangi, ........................ 2026</p>
                    <p className="font-semibold">Guru Pengampu Mata Pelajaran</p>
                    <div className="h-16"></div>
                    <p className="font-bold underline">..................................................</p>
                    <p className="text-[10px]">NIP. ........................................</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STUDENT ANSWER SHEET TEMPLATE (LEMBAR JAWABAN SISWA) */}
          {printMode === 'siswa' && includeAnswerSheet && (
            <div className="mt-8 pt-4 border-t-2 border-black page-break-before">
              <div className="text-center mb-4">
                <h3 className="font-bold text-[14px] uppercase">
                  LEMBAR JAWABAN PESERTA UJIAN (LJU)
                </h3>
                <p className="text-[11px] text-gray-600">
                  {userInput?.mataPelajaran} | {userInput?.kelas} | Tahun Pelajaran 2025/2026
                </p>
              </div>

              {/* Student Identity in Answer Sheet */}
              <div className="border border-black p-2 mb-4 text-[11px]">
                <div className="grid grid-cols-2 gap-2">
                  <p>Nama: ..............................................................</p>
                  <p>No. Peserta: ...................................................</p>
                  <p>Kelas: .............................................................</p>
                  <p>Tanda Tangan: ................................................</p>
                </div>
              </div>

              {/* Bubble / Answer Grid for PG */}
              {soal.pg && soal.pg.length > 0 && (
                <div className="mb-4">
                  <h5 className="font-bold text-[11px] mb-1">A. Pilihan Ganda (Beri Tanda Silang X):</h5>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    {soal.pg.map((s) => (
                      <div key={s.noSoal} className="flex items-center gap-1.5 border border-gray-300 p-1">
                        <span className="w-6 font-bold">{s.noSoal}.</span>
                        {['A', 'B', 'C', 'D'].map((letter) => (
                          <span
                            key={letter}
                            className="w-5 h-5 flex items-center justify-center border border-black rounded-full text-[10px]"
                          >
                            {letter}
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PGK Answer Checklist */}
              {soal.pgKompleks && soal.pgKompleks.length > 0 && (
                <div className="mb-4">
                  <h5 className="font-bold text-[11px] mb-1">B. Pilihan Ganda Kompleks:</h5>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    {soal.pgKompleks.map((s) => (
                      <div key={s.noSoal} className="flex items-center gap-1.5 border border-gray-300 p-1">
                        <span className="w-6 font-bold">{s.noSoal}.</span>
                        {['A', 'B', 'C', 'D'].map((letter) => (
                          <span
                            key={letter}
                            className="w-5 h-5 flex items-center justify-center border border-black rounded text-[10px]"
                          >
                            [ ]
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Isian Singkat Sheet */}
              {soal.isian && soal.isian.length > 0 && (
                <div className="mb-4">
                  <h5 className="font-bold text-[11px] mb-1">C. Isian Singkat:</h5>
                  <div className="space-y-1.5 text-[11px]">
                    {soal.isian.map((s) => (
                      <div key={s.noSoal} className="flex items-center gap-2">
                        <span className="w-6 font-bold">{s.noSoal}.</span>
                        <div className="flex-1 border-b border-dotted border-black h-4"></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Uraian Sheet */}
              {soal.uraian && soal.uraian.length > 0 && (
                <div className="mb-4">
                  <h5 className="font-bold text-[11px] mb-1">D. Uraian:</h5>
                  <div className="space-y-3 text-[11px]">
                    {soal.uraian.map((s) => (
                      <div key={s.noSoal} className="border border-gray-400 p-2 rounded">
                        <span className="font-bold">Jawaban No. {s.noSoal}:</span>
                        <div className="border-b border-dotted border-gray-300 h-5 mt-1"></div>
                        <div className="border-b border-dotted border-gray-300 h-5 mt-1"></div>
                        <div className="border-b border-dotted border-gray-300 h-5 mt-1"></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExamPrintPreviewModal;
