import React, { useState, useMemo, useEffect } from 'react';
import { Soal, KisiKisiItem, BentukSoal, Bahasa, UserInput } from '../types';
import Button from './Button';
import { X, Save, Search, Table, AlertTriangle, Check, RefreshCw } from './icons';
import { normalizeOptions, cleanStemText } from '../services/questionUtils';

interface BulkEditQuestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  soal: Soal;
  kisiKisi: KisiKisiItem[];
  userInput: UserInput | null;
  onSave: (updatedSoal: Soal, updatedKisiKisi: KisiKisiItem[]) => void;
}

export interface EditableQuestionRow {
  id: string;
  type: 'PG' | 'PGK' | 'ISIAN' | 'URAIAN';
  typeName: string;
  originalNoSoal: number;
  displayNoSoal: number;
  soalText: string;
  options?: { key: string; value: string }[];
  kunciJawaban: string | string[];
  petunjuk?: string;
  rubrik?: {
    skor4: string;
    skor3: string;
    skor2: string;
    skor1: string;
  };
  levelBloom: string;
  indikator: string;
  materi: string;
}

const BLOOM_OPTIONS = [
  { value: 'C1', code: 'C1', name: 'Mengingat', category: 'LOTS', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { value: 'C2', code: 'C2', name: 'Memahami', category: 'LOTS', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { value: 'C3', code: 'C3', name: 'Menerapkan', category: 'MOTS', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  { value: 'C4', code: 'C4', name: 'Menganalisis', category: 'HOTS', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
  { value: 'C5', code: 'C5', name: 'Mengevaluasi', category: 'HOTS', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  { value: 'C6', code: 'C6', name: 'Mencipta', category: 'HOTS', color: 'bg-rose-100 text-rose-800 border-rose-300' },
];

export const getCognitiveCategory = (level: string): 'LOTS' | 'MOTS' | 'HOTS' => {
  if (/C[12]/.test(level)) return 'LOTS';
  if (/C3/.test(level)) return 'MOTS';
  if (/C[456]/.test(level)) return 'HOTS';
  return 'MOTS';
};

export const getCognitiveBadgeColor = (level: string) => {
  const cat = getCognitiveCategory(level);
  if (cat === 'LOTS') return 'bg-emerald-100 text-emerald-800 border-emerald-300';
  if (cat === 'MOTS') return 'bg-amber-100 text-amber-800 border-amber-300';
  return 'bg-purple-100 text-purple-800 border-purple-300';
};

export const normalizeBloomCode = (bloomStr: string): string => {
  const match = bloomStr.match(/C[1-6]/i);
  return match ? match[0].toUpperCase() : 'C3';
};

export const BulkEditQuestionsModal: React.FC<BulkEditQuestionsModalProps> = ({
  isOpen,
  onClose,
  soal,
  kisiKisi,
  userInput,
  onSave,
}) => {
  const [rows, setRows] = useState<EditableQuestionRow[]>([]);
  const [initialRows, setInitialRows] = useState<EditableQuestionRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterCognitive, setFilterCognitive] = useState<string>('ALL');
  const [filterModifiedOnly, setFilterModifiedOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [batchBloom, setBatchBloom] = useState<string>('C3');
  const [expandedOptionRowId, setExpandedOptionRowId] = useState<string | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState<boolean>(false);

  // Initialize data when modal opens
  useEffect(() => {
    if (!isOpen || !soal) return;

    const items: EditableQuestionRow[] = [];

    // 1. PG
    if (soal.pg) {
      soal.pg.forEach((item, idx) => {
        const origNo = (item as any).originalNoSoal ?? item.noSoal;
        const matchedKisi = kisiKisi.find(k => k.noSoal === origNo);
        const normOpts = item.options ? normalizeOptions(item.options) : [
          { key: 'A', value: '' },
          { key: 'B', value: '' },
          { key: 'C', value: '' },
          { key: 'D', value: '' },
        ];
        items.push({
          id: `pg-${origNo}-${idx}`,
          type: 'PG',
          typeName: 'Pilihan Ganda',
          originalNoSoal: origNo,
          displayNoSoal: item.noSoal,
          soalText: cleanStemText(item.soal || '', normOpts.length > 0),
          options: normOpts,
          kunciJawaban: item.kunciJawaban || 'A',
          levelBloom: matchedKisi ? matchedKisi.levelBloom : 'C2',
          indikator: matchedKisi ? matchedKisi.indikator : '',
          materi: matchedKisi ? matchedKisi.materi : '',
        });
      });
    }

    // 2. PG Kompleks
    if (soal.pgKompleks) {
      soal.pgKompleks.forEach((item, idx) => {
        const origNo = (item as any).originalNoSoal ?? item.noSoal;
        const matchedKisi = kisiKisi.find(k => k.noSoal === origNo);
        const normOpts = item.options ? normalizeOptions(item.options) : [
          { key: 'A', value: '' },
          { key: 'B', value: '' },
          { key: 'C', value: '' },
          { key: 'D', value: '' },
        ];
        items.push({
          id: `pgk-${origNo}-${idx}`,
          type: 'PGK',
          typeName: 'Pilihan Ganda Kompleks',
          originalNoSoal: origNo,
          displayNoSoal: item.noSoal,
          soalText: cleanStemText(item.soal || '', normOpts.length > 0),
          options: normOpts,
          kunciJawaban: Array.isArray(item.kunciJawaban) ? [...item.kunciJawaban] : [item.kunciJawaban || 'A'],
          petunjuk: item.petunjuk || 'Pilihlah jawaban yang benar!',
          levelBloom: matchedKisi ? matchedKisi.levelBloom : 'C4',
          indikator: matchedKisi ? matchedKisi.indikator : '',
          materi: matchedKisi ? matchedKisi.materi : '',
        });
      });
    }

    // 3. Isian Singkat
    if (soal.isian) {
      soal.isian.forEach((item, idx) => {
        const origNo = (item as any).originalNoSoal ?? item.noSoal;
        const matchedKisi = kisiKisi.find(k => k.noSoal === origNo);
        items.push({
          id: `isian-${origNo}-${idx}`,
          type: 'ISIAN',
          typeName: 'Isian Singkat',
          originalNoSoal: origNo,
          displayNoSoal: item.noSoal,
          soalText: cleanStemText(item.soal || '', false),
          kunciJawaban: item.kunciJawaban || '',
          levelBloom: matchedKisi ? matchedKisi.levelBloom : 'C2',
          indikator: matchedKisi ? matchedKisi.indikator : '',
          materi: matchedKisi ? matchedKisi.materi : '',
        });
      });
    }

    // 4. Uraian
    if (soal.uraian) {
      soal.uraian.forEach((item, idx) => {
        const origNo = (item as any).originalNoSoal ?? item.noSoal;
        const matchedKisi = kisiKisi.find(k => k.noSoal === origNo);
        items.push({
          id: `uraian-${origNo}-${idx}`,
          type: 'URAIAN',
          typeName: 'Uraian',
          originalNoSoal: origNo,
          displayNoSoal: item.noSoal,
          soalText: cleanStemText(item.soal || '', false),
          kunciJawaban: '',
          rubrik: item.rubrik ? { ...item.rubrik } : { skor4: '', skor3: '', skor2: '', skor1: '' },
          levelBloom: matchedKisi ? matchedKisi.levelBloom : 'C5',
          indikator: matchedKisi ? matchedKisi.indikator : '',
          materi: matchedKisi ? matchedKisi.materi : '',
        });
      });
    }

    setRows(items);
    setInitialRows(JSON.parse(JSON.stringify(items)));
    setSelectedIds(new Set());
    setExpandedOptionRowId(null);
  }, [isOpen, soal, kisiKisi]);

  // Determine row modified status
  const modifiedRowsMap = useMemo(() => {
    const map = new Map<string, boolean>();
    rows.forEach(r => {
      const init = initialRows.find(initR => initR.id === r.id);
      if (!init) {
        map.set(r.id, false);
        return;
      }
      const isStemChanged = r.soalText !== init.soalText;
      const isBloomChanged = normalizeBloomCode(r.levelBloom) !== normalizeBloomCode(init.levelBloom);
      const isKeyChanged = JSON.stringify(r.kunciJawaban) !== JSON.stringify(init.kunciJawaban);
      const isOptsChanged = JSON.stringify(r.options) !== JSON.stringify(init.options);
      const isRubrikChanged = JSON.stringify(r.rubrik) !== JSON.stringify(init.rubrik);
      const isPetunjukChanged = r.petunjuk !== init.petunjuk;

      map.set(r.id, isStemChanged || isBloomChanged || isKeyChanged || isOptsChanged || isRubrikChanged || isPetunjukChanged);
    });
    return map;
  }, [rows, initialRows]);

  const totalModifiedCount = useMemo(() => {
    let count = 0;
    modifiedRowsMap.forEach(isMod => {
      if (isMod) count++;
    });
    return count;
  }, [modifiedRowsMap]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return rows.filter(r => {
      if (filterType !== 'ALL' && r.type !== filterType) return false;

      if (filterCognitive !== 'ALL') {
        const cat = getCognitiveCategory(r.levelBloom);
        if (cat !== filterCognitive) return false;
      }

      if (filterModifiedOnly && !modifiedRowsMap.get(r.id)) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesStem = r.soalText.toLowerCase().includes(query);
        const matchesIndikator = r.indikator.toLowerCase().includes(query);
        const matchesMateri = r.materi.toLowerCase().includes(query);
        const matchesNo = r.displayNoSoal.toString().includes(query) || r.originalNoSoal.toString().includes(query);
        if (!matchesStem && !matchesIndikator && !matchesMateri && !matchesNo) return false;
      }

      return true;
    });
  }, [rows, filterType, filterCognitive, filterModifiedOnly, searchQuery, modifiedRowsMap]);

  if (!isOpen) return null;

  const isArabic = userInput?.bahasa === Bahasa.Arab;
  const isJavanese = userInput?.bahasa === Bahasa.JawaHanacaraka;

  // Handlers for updating row fields
  const handleStemChange = (id: string, text: string) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, soalText: text } : r));
  };

  const handleBloomChange = (id: string, newBloom: string) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, levelBloom: newBloom } : r));
  };

  const handlePgKeyChange = (id: string, keyVal: string) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, kunciJawaban: keyVal } : r));
  };

  const handlePgkKeyToggle = (id: string, keyVal: string) => {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const curKeys = Array.isArray(r.kunciJawaban) ? [...r.kunciJawaban] : [r.kunciJawaban];
      const nextKeys = curKeys.includes(keyVal)
        ? curKeys.filter(k => k !== keyVal)
        : [...curKeys, keyVal].sort();
      return { ...r, kunciJawaban: nextKeys.length > 0 ? nextKeys : [keyVal] };
    }));
  };

  const handleIsianKeyChange = (id: string, keyVal: string) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, kunciJawaban: keyVal } : r));
  };

  const handleOptionTextChange = (id: string, optIndex: number, text: string) => {
    setRows(prev => prev.map(r => {
      if (r.id !== id || !r.options) return r;
      const nextOpts = [...r.options];
      nextOpts[optIndex] = { ...nextOpts[optIndex], value: text };
      return { ...r, options: nextOpts };
    }));
  };

  const handleRubrikChange = (id: string, field: 'skor4' | 'skor3' | 'skor2' | 'skor1', text: string) => {
    setRows(prev => prev.map(r => {
      if (r.id !== id || !r.rubrik) return r;
      return {
        ...r,
        rubrik: {
          ...r.rubrik,
          [field]: text,
        },
      };
    }));
  };

  // Selection handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    if (selectedIds.size === filteredRows.length && filteredRows.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRows.map(r => r.id)));
    }
  };

  // Bulk apply cognitive level
  const handleApplyBatchBloom = () => {
    if (selectedIds.size === 0) return;
    setRows(prev => prev.map(r => {
      if (selectedIds.has(r.id)) {
        return { ...r, levelBloom: batchBloom };
      }
      return r;
    }));
  };

  // Reset all to initial state
  const handleResetAll = () => {
    if (window.confirm('Apakah Anda yakin ingin membatalkan semua perubahan dan mengembalikan ke data awal?')) {
      setRows(JSON.parse(JSON.stringify(initialRows)));
      setSelectedIds(new Set());
    }
  };

  // Save changes
  const handleSaveAll = () => {
    // 1. Build updated Soal
    const updatedSoal: Soal = JSON.parse(JSON.stringify(soal));

    // Update PG
    if (updatedSoal.pg) {
      updatedSoal.pg = updatedSoal.pg.map(item => {
        const origNo = (item as any).originalNoSoal ?? item.noSoal;
        const row = rows.find(r => r.type === 'PG' && r.originalNoSoal === origNo);
        if (!row) return item;
        return {
          ...item,
          soal: row.soalText,
          options: row.options || item.options,
          kunciJawaban: typeof row.kunciJawaban === 'string' ? row.kunciJawaban : (row.kunciJawaban[0] || 'A'),
        };
      });
    }

    // Update PGK
    if (updatedSoal.pgKompleks) {
      updatedSoal.pgKompleks = updatedSoal.pgKompleks.map(item => {
        const origNo = (item as any).originalNoSoal ?? item.noSoal;
        const row = rows.find(r => r.type === 'PGK' && r.originalNoSoal === origNo);
        if (!row) return item;
        return {
          ...item,
          soal: row.soalText,
          options: row.options || item.options,
          kunciJawaban: Array.isArray(row.kunciJawaban) ? row.kunciJawaban : [row.kunciJawaban],
          petunjuk: row.petunjuk || item.petunjuk,
        };
      });
    }

    // Update Isian
    if (updatedSoal.isian) {
      updatedSoal.isian = updatedSoal.isian.map(item => {
        const origNo = (item as any).originalNoSoal ?? item.noSoal;
        const row = rows.find(r => r.type === 'ISIAN' && r.originalNoSoal === origNo);
        if (!row) return item;
        return {
          ...item,
          soal: row.soalText,
          kunciJawaban: typeof row.kunciJawaban === 'string' ? row.kunciJawaban : String(row.kunciJawaban),
        };
      });
    }

    // Update Uraian
    if (updatedSoal.uraian) {
      updatedSoal.uraian = updatedSoal.uraian.map(item => {
        const origNo = (item as any).originalNoSoal ?? item.noSoal;
        const row = rows.find(r => r.type === 'URAIAN' && r.originalNoSoal === origNo);
        if (!row) return item;
        return {
          ...item,
          soal: row.soalText,
          rubrik: row.rubrik || item.rubrik,
        };
      });
    }

    // 2. Build updated KisiKisi
    const updatedKisiKisi: KisiKisiItem[] = kisiKisi.map(kItem => {
      const row = rows.find(r => r.originalNoSoal === kItem.noSoal);
      if (!row) return kItem;
      return {
        ...kItem,
        levelBloom: row.levelBloom,
      };
    });

    onSave(updatedSoal, updatedKisiKisi);
    onClose();
  };

  const handleCloseAttempt = () => {
    if (totalModifiedCount > 0) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-2 sm:p-4 md:p-6 overflow-hidden">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-[95vh] flex flex-col overflow-hidden border border-gray-200">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50/80 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 text-green-700 flex items-center justify-center shadow-sm">
              <Table className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-gray-900">Edit Massal Soal & Kisi-Kisi</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-green-100 text-green-800 border border-green-200">
                  Mode Tabel
                </span>
                {totalModifiedCount > 0 && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                    {totalModifiedCount} soal diubah
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Ubah teks butir soal, kunci jawaban, dan tingkat kognitif Bloom (LOTS/MOTS/HOTS) secara serentak.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleSaveAll}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-600/20 text-sm py-2 px-4"
            >
              <Save className="w-4 h-4" />
              Simpan Semua Perubahan
            </Button>
            <button
              onClick={handleCloseAttempt}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              title="Tutup Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar & Filters */}
        <div className="p-4 bg-white border-b border-gray-200 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Left: Filters */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cari nomor, soal, materi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg text-xs w-48 sm:w-64 focus:ring-2 focus:ring-green-500 focus:outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Tipe Soal Filter */}
              <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                {[
                  { id: 'ALL', label: 'Semua Bentuk' },
                  { id: 'PG', label: 'PG' },
                  { id: 'PGK', label: 'PGK' },
                  { id: 'ISIAN', label: 'Isian' },
                  { id: 'URAIAN', label: 'Uraian' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setFilterType(tab.id)}
                    className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                      filterType === tab.id
                        ? 'bg-white text-green-800 shadow-sm font-semibold'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Cognitive Filter */}
              <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                {[
                  { id: 'ALL', label: 'Semua Kognitif' },
                  { id: 'LOTS', label: 'LOTS (C1-C2)' },
                  { id: 'MOTS', label: 'MOTS (C3)' },
                  { id: 'HOTS', label: 'HOTS (C4-C6)' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setFilterCognitive(tab.id)}
                    className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                      filterCognitive === tab.id
                        ? 'bg-white text-green-800 shadow-sm font-semibold'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Filter Modified Only toggle */}
              <label className="flex items-center gap-1.5 cursor-pointer text-gray-700 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-lg hover:bg-gray-100">
                <input
                  type="checkbox"
                  checked={filterModifiedOnly}
                  onChange={(e) => setFilterModifiedOnly(e.target.checked)}
                  className="rounded text-green-600 focus:ring-green-500 w-3.5 h-3.5"
                />
                <span>Hanya yang Diubah ({totalModifiedCount})</span>
              </label>
            </div>

            {/* Right: Reset Action */}
            <div className="flex items-center gap-2">
              {totalModifiedCount > 0 && (
                <button
                  onClick={handleResetAll}
                  className="text-xs text-red-600 hover:text-red-700 font-medium px-2 py-1 rounded border border-red-200 hover:bg-red-50 flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  Reset Perubahan
                </button>
              )}
            </div>
          </div>

          {/* Batch Actions Bar (when >= 1 row selected) */}
          {selectedIds.size > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl text-xs text-emerald-900">
              <div className="flex items-center gap-2">
                <span className="font-bold bg-emerald-200 px-2 py-0.5 rounded-full text-emerald-800">
                  {selectedIds.size} baris dipilih
                </span>
                <span className="text-emerald-700">Aksi massal untuk baris terpilih:</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-emerald-300">
                  <span className="font-medium text-gray-600">Ubah Level Kognitif ke:</span>
                  <select
                    value={batchBloom}
                    onChange={(e) => setBatchBloom(e.target.value)}
                    className="border-none bg-transparent font-semibold text-gray-800 focus:ring-0 text-xs py-0.5"
                  >
                    {BLOOM_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.code} - {opt.name} ({opt.category})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleApplyBatchBloom}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-3 py-1.5 rounded-lg shadow-sm transition-colors flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  Terapkan ke {selectedIds.size} Soal
                </button>

                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="text-gray-500 hover:text-gray-700 px-2 py-1 font-medium"
                >
                  Batalkan Pilihan
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-auto bg-gray-50/50">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-100/90 text-gray-700 text-xs uppercase font-semibold sticky top-0 z-10 border-b border-gray-300 shadow-sm backdrop-blur-sm">
              <tr>
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filteredRows.length > 0 && selectedIds.size === filteredRows.length}
                    onChange={handleSelectAllVisible}
                    className="rounded text-green-600 focus:ring-green-500 w-4 h-4 cursor-pointer"
                    title="Pilih Semua yang Ditampilkan"
                  />
                </th>
                <th className="py-3 px-2 w-14 text-center">No.</th>
                <th className="py-3 px-3 w-28">Bentuk</th>
                <th className="py-3 px-3 w-48">Level Kognitif (Bloom)</th>
                <th className="py-3 px-3 min-w-[340px]">Butir Pertanyaan (Stem)</th>
                <th className="py-3 px-3 w-56">Kunci Jawaban</th>
                <th className="py-3 px-3 w-40">Konteks / Indikator</th>
                <th className="py-3 px-3 w-20 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white text-xs">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-500">
                    <Table className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="font-medium">Tidak ada soal yang sesuai dengan filter.</p>
                    <p className="text-gray-400 text-xs mt-1">Coba sesuaikan kata kunci pencarian atau ganti filter di atas.</p>
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const isSelected = selectedIds.has(row.id);
                  const isModified = modifiedRowsMap.get(row.id) ?? false;
                  const bloomCat = getCognitiveCategory(row.levelBloom);
                  const isExpandedOptions = expandedOptionRowId === row.id;

                  return (
                    <tr
                      key={row.id}
                      className={`transition-colors hover:bg-gray-50/80 ${
                        isSelected ? 'bg-emerald-50/50' : isModified ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3 text-center align-top">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(row.id)}
                          className="rounded text-green-600 focus:ring-green-500 w-4 h-4 cursor-pointer mt-1"
                        />
                      </td>

                      {/* No Soal */}
                      <td className="py-3 px-2 text-center align-top font-bold text-gray-700">
                        <span className="inline-block px-2 py-0.5 rounded bg-gray-100 text-gray-800 text-xs">
                          {row.displayNoSoal}
                        </span>
                        {row.originalNoSoal !== row.displayNoSoal && (
                          <div className="text-[10px] text-gray-400 mt-0.5" title="Nomor asli di kisi-kisi">
                            (#{row.originalNoSoal})
                          </div>
                        )}
                      </td>

                      {/* Bentuk Soal Badge */}
                      <td className="py-3 px-3 align-top">
                        <span
                          className={`inline-block px-2 py-1 rounded-md text-[11px] font-semibold border ${
                            row.type === 'PG'
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : row.type === 'PGK'
                              ? 'bg-teal-50 text-teal-800 border-teal-200'
                              : row.type === 'ISIAN'
                              ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                              : 'bg-purple-50 text-purple-800 border-purple-200'
                          }`}
                        >
                          {row.typeName}
                        </span>
                      </td>

                      {/* Cognitive Level (Bloom & Category) */}
                      <td className="py-3 px-3 align-top space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <select
                            value={normalizeBloomCode(row.levelBloom)}
                            onChange={(e) => handleBloomChange(row.id, e.target.value)}
                            className="w-full text-xs font-semibold py-1 px-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                          >
                            {BLOOM_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>
                                {opt.code} - {opt.name} ({opt.category})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getCognitiveBadgeColor(row.levelBloom)}`}>
                            {bloomCat}
                          </span>
                          <span className="text-[10px] text-gray-500">
                            {bloomCat === 'LOTS' ? 'Tingkat Rendah' : bloomCat === 'MOTS' ? 'Tingkat Menengah' : 'Tingkat Tinggi'}
                          </span>
                        </div>
                      </td>

                      {/* Stem / Butir Soal (Editable) */}
                      <td className="py-3 px-3 align-top space-y-2">
                        <textarea
                          rows={2}
                          value={row.soalText}
                          onChange={(e) => handleStemChange(row.id, e.target.value)}
                          dir={isArabic ? 'rtl' : 'ltr'}
                          className={`w-full text-xs p-2 rounded-lg border focus:ring-2 focus:ring-green-500 focus:outline-none transition-all leading-relaxed ${
                            isArabic ? 'font-arabic text-sm' : isJavanese ? 'font-javanese text-sm' : 'font-sans'
                          } ${
                            isModified ? 'border-amber-400 bg-amber-50/20' : 'border-gray-300 bg-white'
                          }`}
                          placeholder="Ketikkan butir soal pertanyaan..."
                        />

                        {/* Collapsible Options editor for PG & PGK */}
                        {row.options && row.options.length > 0 && (
                          <div>
                            <button
                              type="button"
                              onClick={() => setExpandedOptionRowId(isExpandedOptions ? null : row.id)}
                              className="text-[11px] text-green-700 hover:text-green-800 font-medium inline-flex items-center gap-1 hover:underline"
                            >
                              <span>{isExpandedOptions ? '▲ Tutup Pilihan Jawaban' : '▼ Edit Butir Opsi (A, B, C, D)'}</span>
                            </button>

                            {isExpandedOptions && (
                              <div className="mt-2 p-2.5 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                                <p className="text-[11px] font-bold text-gray-700">Opsi Jawaban:</p>
                                <div className="space-y-1.5">
                                  {row.options.map((opt, oIdx) => (
                                    <div key={opt.key} className="flex items-center gap-2">
                                      <span className="font-bold text-gray-700 w-4">{opt.key}.</span>
                                      <input
                                        type="text"
                                        value={opt.value}
                                        onChange={(e) => handleOptionTextChange(row.id, oIdx, e.target.value)}
                                        dir={isArabic ? 'rtl' : 'ltr'}
                                        className="flex-1 text-xs px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-green-500 bg-white"
                                        placeholder={`Pilihan ${opt.key}...`}
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Petunjuk for PGK */}
                        {row.type === 'PGK' && (
                          <div className="text-[11px] text-gray-500 italic bg-gray-50 px-2 py-1 rounded border border-gray-100">
                            <span className="font-semibold not-italic">Petunjuk:</span> {row.petunjuk}
                          </div>
                        )}
                      </td>

                      {/* Kunci Jawaban (Editable) */}
                      <td className="py-3 px-3 align-top space-y-2">
                        {row.type === 'PG' && (
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap gap-1">
                              {(row.options || [{ key: 'A' }, { key: 'B' }, { key: 'C' }, { key: 'D' }]).map(opt => {
                                const isKey = row.kunciJawaban === opt.key;
                                return (
                                  <button
                                    key={opt.key}
                                    type="button"
                                    onClick={() => handlePgKeyChange(row.id, opt.key)}
                                    className={`w-7 h-7 rounded-lg font-bold text-xs transition-all border ${
                                      isKey
                                        ? 'bg-green-600 text-white border-green-700 shadow-sm ring-2 ring-green-200'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200'
                                    }`}
                                  >
                                    {opt.key}
                                  </button>
                                );
                              })}
                            </div>
                            <span className="text-[11px] text-gray-500 block">
                              Kunci: <strong className="text-green-700">{String(row.kunciJawaban)}</strong>
                            </span>
                          </div>
                        )}

                        {row.type === 'PGK' && (
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap gap-1">
                              {(row.options || [{ key: 'A' }, { key: 'B' }, { key: 'C' }, { key: 'D' }]).map(opt => {
                                const curKeys = Array.isArray(row.kunciJawaban) ? row.kunciJawaban : [row.kunciJawaban];
                                const isKey = curKeys.includes(opt.key);
                                return (
                                  <button
                                    key={opt.key}
                                    type="button"
                                    onClick={() => handlePgkKeyToggle(row.id, opt.key)}
                                    className={`w-7 h-7 rounded-lg font-bold text-xs transition-all border ${
                                      isKey
                                        ? 'bg-teal-600 text-white border-teal-700 shadow-sm ring-2 ring-teal-200'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200'
                                    }`}
                                    title={`Klik untuk toggle kunci ${opt.key}`}
                                  >
                                    {opt.key}
                                  </button>
                                );
                              })}
                            </div>
                            <span className="text-[11px] text-gray-500 block">
                              Kunci: <strong className="text-teal-700">
                                {Array.isArray(row.kunciJawaban) ? row.kunciJawaban.join(', ') : row.kunciJawaban}
                              </strong>
                            </span>
                          </div>
                        )}

                        {row.type === 'ISIAN' && (
                          <div className="space-y-1">
                            <input
                              type="text"
                              value={String(row.kunciJawaban)}
                              onChange={(e) => handleIsianKeyChange(row.id, e.target.value)}
                              className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 bg-white"
                              placeholder="Kunci isian singkat..."
                            />
                          </div>
                        )}

                        {row.type === 'URAIAN' && row.rubrik && (
                          <div className="space-y-1 bg-gray-50 p-2 rounded-lg border border-gray-200 text-[11px]">
                            <div className="font-semibold text-gray-700 mb-1">Rubrik Skor Maks (Skor 4):</div>
                            <input
                              type="text"
                              value={row.rubrik.skor4}
                              onChange={(e) => handleRubrikChange(row.id, 'skor4', e.target.value)}
                              className="w-full text-xs px-2 py-1 border border-gray-300 rounded bg-white"
                              placeholder="Kriteria skor 4..."
                            />
                            <div className="text-[10px] text-gray-500">Skor 3: {row.rubrik.skor3 || '-'}</div>
                          </div>
                        )}
                      </td>

                      {/* Konteks / Indikator */}
                      <td className="py-3 px-3 align-top text-gray-600 space-y-1">
                        <div className="font-medium text-gray-800 line-clamp-1" title={row.materi}>
                          {row.materi || '-'}
                        </div>
                        <div className="text-[11px] text-gray-500 line-clamp-2" title={row.indikator}>
                          {row.indikator || '-'}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 align-top text-center">
                        {isModified ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            Diubah
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500">
                            Tersimpan
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span className="font-semibold">Total Soal: {rows.length}</span>
            <span>•</span>
            <span>Ditampilkan: {filteredRows.length}</span>
            {totalModifiedCount > 0 && (
              <>
                <span>•</span>
                <span className="font-bold text-amber-700">{totalModifiedCount} soal telah disunting</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={handleCloseAttempt}
              className="text-sm py-2 px-4"
            >
              Batal
            </Button>
            <Button
              onClick={handleSaveAll}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-600/20 text-sm py-2 px-5"
            >
              <Save className="w-4 h-4" />
              Simpan Semua Perubahan
            </Button>
          </div>
        </div>

      </div>

      {/* Discard Confirmation Modal */}
      {showDiscardConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-gray-900">Perubahan Belum Disimpan</h3>
            </div>
            <p className="text-sm text-gray-600">
              Ada {totalModifiedCount} butir soal yang telah disunting tetapi belum disimpan. Apakah Anda yakin ingin keluar dan membuang perubahan?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                onClick={() => setShowDiscardConfirm(false)}
                className="text-xs"
              >
                Tetap Mengedit
              </Button>
              <Button
                onClick={() => {
                  setShowDiscardConfirm(false);
                  onClose();
                }}
                className="bg-red-600 hover:bg-red-700 text-white text-xs"
              >
                Buang Perubahan
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkEditQuestionsModal;
