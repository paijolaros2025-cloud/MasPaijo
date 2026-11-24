
import React, { useState } from 'react';
import { UserInput, AppStateSetter, Bahasa, TingkatKesulitan } from '../../types';
import { generateKisiKisi } from '../../services/geminiService';
import Button from '../Button';
import { AlertTriangle } from '../icons';

interface Props {
  setAppState: AppStateSetter;
  handleNext: () => void;
}

const Step1InputForm: React.FC<Props> = ({ setAppState, handleNext }) => {
  const [formData, setFormData] = useState<UserInput>({
    mataPelajaran: 'Aqidah Akhlak',
    kelas: '4',
    cp: 'Peserta didik mampu memahami sifat-sifat Allah, mengenal nama-nama-Nya yang indah (al-Asma’ al-Husna), serta mengenal rasul-rasul Allah dan tugas-tugasnya.',
    tp: 'Menjelaskan arti dan meneladani al-Asma’ al-Husna al-Malik, al-’Aziz, al-Quddus, as-Salam, dan al-Mu’min.',
    materi: 'Al-Asma’ al-Husna (al-Malik, al-’Aziz, al-Quddus, as-Salam, dan al-Mu’min)',
    jumlahPG: 5,
    jumlahPGKompleks: 2,
    jumlahIsian: 2,
    jumlahUraian: 1,
    bahasa: Bahasa.Indonesia,
    tingkatKesulitan: TingkatKesulitan.Sedang,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name.startsWith('jumlah') ? parseInt(value, 10) || 0 : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setAppState(prev => ({...prev, isLoading: true, error: null}));

    try {
      const kisiKisi = await generateKisiKisi(formData);
      setAppState(prev => ({
        ...prev,
        userInput: formData,
        kisiKisi: kisiKisi,
        isLoading: false,
      }));
      handleNext();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan tidak diketahui';
      setError(errorMessage);
      setAppState(prev => ({...prev, isLoading: false, error: errorMessage}));
    } finally {
      setIsLoading(false);
    }
  };

  const totalSoal = formData.jumlahPG + formData.jumlahPGKompleks + formData.jumlahIsian + formData.jumlahUraian;
  const isFormInvalid = totalSoal === 0 || !formData.materi?.trim() || !formData.cp?.trim() || !formData.tp?.trim();
  
  const inputBaseClasses = "mt-1 block w-full rounded-md bg-white shadow-sm sm:text-sm p-2.5 focus:outline-none";
  const inputBorderClasses = {
      sky: "border-2 border-sky-400 focus:ring-2 focus:ring-sky-300 focus:border-sky-500",
      violet: "border-2 border-violet-400 focus:ring-2 focus:ring-violet-300 focus:border-violet-500",
      amber: "border-2 border-amber-400 focus:ring-2 focus:ring-amber-300 focus:border-amber-500",
  };

  return (
    <div>
        <h2 className="text-3xl font-bold text-center text-green-800 mb-8">Input Data Pembuatan Soal</h2>
        <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
                <div className="bg-red-50 border-2 border-red-400 text-red-800 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5"/>
                        <div>
                            <p className="font-bold text-red-900">Gagal Membuat Kisi-kisi</p>
                            <p className="text-sm mt-1">{error}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); handleSubmit(e); }}
                        disabled={isLoading}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg shadow transition duration-150 flex-shrink-0 self-end sm:self-center"
                    >
                        Coba Lagi
                    </button>
                </div>
            )}

            {isLoading && (
                <div className="bg-emerald-50 border-2 border-emerald-400 text-emerald-900 p-4 rounded-xl flex items-center gap-4 shadow-md animate-pulse">
                    <div className="w-6 h-6 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                    <div>
                        <p className="font-bold text-emerald-950">AI sedang menyusun kisi-kisi soal berstandar ABCD...</p>
                        <p className="text-xs text-emerald-800 mt-0.5">
                            Menyelaraskan Capaian Pembelajaran, materi, level Bloom, dan kaidah ketat ABCD (Audience, Behavior, Condition, Degree). Mohon tunggu 5–20 detik.
                        </p>
                    </div>
                </div>
            )}
            
            {/* Card 1: Informasi Dasar */}
            <div className="bg-gradient-to-br from-sky-100 to-sky-200 p-6 sm:p-8 rounded-xl shadow-lg">
                <h3 className="text-xl font-bold text-sky-800 mb-4">1. Informasi Dasar</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="mataPelajaran" className="block text-sm font-medium text-sky-700">Mata Pelajaran</label>
                        <input type="text" name="mataPelajaran" id="mataPelajaran" value={formData.mataPelajaran} onChange={handleChange} className={`${inputBaseClasses} ${inputBorderClasses.sky}`} />
                    </div>
                    <div>
                        <label htmlFor="kelas" className="block text-sm font-medium text-sky-700">Kelas</label>
                        <input type="text" name="kelas" id="kelas" value={formData.kelas} onChange={handleChange} className={`${inputBaseClasses} ${inputBorderClasses.sky}`} />
                    </div>
                    <div>
                        <label htmlFor="bahasa" className="block text-sm font-medium text-sky-700">Bahasa Keluaran</label>
                        <select 
                            name="bahasa" 
                            id="bahasa" 
                            value={formData.bahasa} 
                            onChange={handleChange} 
                            className={`${inputBaseClasses} ${inputBorderClasses.sky}`}
                        >
                            {Object.values(Bahasa).map(b => (
                                <option key={b} value={b}>{b}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="tingkatKesulitan" className="block text-sm font-medium text-sky-700">Tingkat Kesulitan</label>
                        <select 
                            name="tingkatKesulitan" 
                            id="tingkatKesulitan" 
                            value={formData.tingkatKesulitan} 
                            onChange={handleChange} 
                            className={`${inputBaseClasses} ${inputBorderClasses.sky}`}
                        >
                            {Object.values(TingkatKesulitan).map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Card 2: Detail Kurikulum */}
            <div className="bg-gradient-to-br from-violet-100 to-violet-200 p-6 sm:p-8 rounded-xl shadow-lg">
                <h3 className="text-xl font-bold text-violet-800 mb-4">2. Detail Kurikulum</h3>
                <div className="space-y-6">
                    <div>
                        <label htmlFor="cp" className="block text-sm font-medium text-violet-700">Capaian Pembelajaran (CP)</label>
                        <textarea name="cp" id="cp" rows={3} value={formData.cp} onChange={handleChange} className={`${inputBaseClasses} ${inputBorderClasses.violet}`}></textarea>
                    </div>
                    <div>
                        <label htmlFor="tp" className="block text-sm font-medium text-violet-700">Tujuan Pembelajaran (TP)</label>
                        <textarea name="tp" id="tp" rows={3} value={formData.tp} onChange={handleChange} className={`${inputBaseClasses} ${inputBorderClasses.violet}`}></textarea>
                    </div>
                    <div>
                        <label htmlFor="materi" className="block text-sm font-medium text-violet-700">Materi</label>
                        <textarea name="materi" id="materi" rows={2} value={formData.materi} onChange={handleChange} className={`${inputBaseClasses} ${inputBorderClasses.violet}`}></textarea>
                    </div>
                </div>
            </div>

            {/* Card 3: Distribusi Soal */}
            <div className="bg-gradient-to-br from-amber-100 to-amber-200 p-6 sm:p-8 rounded-xl shadow-lg">
                <h3 className="text-xl font-bold text-amber-800 mb-4">3. Distribusi Soal</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <label htmlFor="jumlahPG" className="block text-sm font-medium text-amber-700">Pilihan Ganda</label>
                        <input type="number" name="jumlahPG" id="jumlahPG" value={formData.jumlahPG} onChange={handleChange} min="0" className={`${inputBaseClasses} ${inputBorderClasses.amber}`} />
                    </div>
                    <div>
                        <label htmlFor="jumlahPGKompleks" className="block text-sm font-medium text-amber-700">PG Kompleks</label>
                        <input type="number" name="jumlahPGKompleks" id="jumlahPGKompleks" value={formData.jumlahPGKompleks} onChange={handleChange} min="0" className={`${inputBaseClasses} ${inputBorderClasses.amber}`} />
                    </div>
                    <div>
                        <label htmlFor="jumlahIsian" className="block text-sm font-medium text-amber-700">Isian Singkat</label>
                        <input type="number" name="jumlahIsian" id="jumlahIsian" value={formData.jumlahIsian} onChange={handleChange} min="0" className={`${inputBaseClasses} ${inputBorderClasses.amber}`} />
                    </div>
                    <div>
                        <label htmlFor="jumlahUraian" className="block text-sm font-medium text-amber-700">Uraian</label>
                        <input type="number" name="jumlahUraian" id="jumlahUraian" value={formData.jumlahUraian} onChange={handleChange} min="0" className={`${inputBaseClasses} ${inputBorderClasses.amber}`} />
                    </div>
                </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-100">
                <div className="text-xs text-gray-500 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                    <span>Setiap butir indikator dijamin memuat struktur lengkap <strong>Audience, Behavior, Condition, Degree (ABCD)</strong>.</span>
                </div>
                <Button 
                    type="submit" 
                    isLoading={isLoading} 
                    disabled={isFormInvalid}
                    className="w-full sm:w-auto text-white font-bold text-lg py-3 px-8 bg-gradient-to-r from-sky-500 via-violet-500 to-amber-500 hover:from-sky-600 hover:via-violet-600 hover:to-amber-600 shadow-xl transform hover:scale-105 focus:ring-violet-400"
                    variant="primary" // base variant
                >
                    {isLoading ? 'Sedang Menyusun...' : 'Buat Kisi-Kisi'}
                </Button>
            </div>
        </form>
    </div>
  );
};

export default Step1InputForm;
