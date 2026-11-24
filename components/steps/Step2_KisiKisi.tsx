
import React from 'react';
import { AppState, AppStateSetter, Bahasa } from '../../types';
import Card from '../Card';
import Button from '../Button';
import Spinner from '../Spinner';

import { analyzeABCDIndicator } from '../../services/questionUtils';

interface Props {
  appState: AppState;
  setAppState: AppStateSetter;
  handleNext: () => void;
  handleBack: () => void;
}

const Step2KisiKisi: React.FC<Props> = ({ appState, handleNext, handleBack }) => {
  const { kisiKisi, isLoading } = appState;

  if (isLoading) {
    return <Spinner message="Sedang membuat kisi-kisi, mohon tunggu..." />;
  }
  
  if (!kisiKisi || kisiKisi.length === 0) {
      return (
          <Card className="text-center">
              <h2 className="text-2xl font-bold text-green-800 mb-4">Kisi-Kisi Belum Dibuat</h2>
              <p className="text-gray-600 mb-6">Kembali ke tahap input untuk membuat kisi-kisi soal terlebih dahulu.</p>
              <Button onClick={handleBack} variant="secondary">Kembali ke Input</Button>
          </Card>
      )
  }

  const isArabic = appState.userInput?.bahasa === Bahasa.Arab;
  const isJavanese = appState.userInput?.bahasa === Bahasa.JawaHanacaraka;
  
  const textDirClass = isArabic ? 'text-right' : 'text-left';
  
  let langClass = '';
  if (isArabic) langClass = 'font-arabic text-xl leading-[2.5]';
  else if (isJavanese) langClass = 'font-javanese text-xl leading-[2.5]';
  else langClass = 'text-sm';

  return (
    <Card>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
        <div>
          <h2 className="text-2xl font-bold text-green-800">Kisi-Kisi Soal</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Setiap indikator diwajibkan memenuhi kaidah standar kurikulum ABCD (Audience, Behavior, Condition, Degree).
          </p>
        </div>
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
          Total: {kisiKisi.length} Butir Soal
        </span>
      </div>

      {/* ABCD Rules Guide Callout */}
      <div className="mb-6 p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-950 font-sans">
        <h4 className="font-bold text-emerald-900 mb-2 flex items-center gap-1.5 text-sm">
          <span>Struktur Wajib Indikator ABCD:</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <div className="p-2.5 bg-white rounded-lg border border-emerald-100 shadow-xs">
            <span className="font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded text-[11px] mr-1.5">C</span>
            <span className="font-bold text-gray-800">Condition:</span>
            <p className="text-gray-600 mt-1 text-[11px] leading-relaxed">
              Stimulus/kondisi awal yang disajikan (misal: <em>Disajikan teks narasi, diberikan tabel data</em>).
            </p>
          </div>
          <div className="p-2.5 bg-white rounded-lg border border-emerald-100 shadow-xs">
            <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[11px] mr-1.5">A</span>
            <span className="font-bold text-gray-800">Audience:</span>
            <p className="text-gray-600 mt-1 text-[11px] leading-relaxed">
              Subjek pembelajar yang disebutkan eksplisit: <em>peserta didik / siswa</em>.
            </p>
          </div>
          <div className="p-2.5 bg-white rounded-lg border border-emerald-100 shadow-xs">
            <span className="font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded text-[11px] mr-1.5">B</span>
            <span className="font-bold text-gray-800">Behavior:</span>
            <p className="text-gray-600 mt-1 text-[11px] leading-relaxed">
              Kata Kerja Operasional (KKO) Bloom + materi yang dapat diobservasi dan diukur.
            </p>
          </div>
          <div className="p-2.5 bg-white rounded-lg border border-emerald-100 shadow-xs">
            <span className="font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded text-[11px] mr-1.5">D</span>
            <span className="font-bold text-gray-800">Degree:</span>
            <p className="text-gray-600 mt-1 text-[11px] leading-relaxed">
              Tingkat ketepatan atau kriteria keberhasilan: <em>dengan tepat, dengan benar</em>.
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wider">
            <tr>
              <th scope="col" className="px-4 py-3 text-left w-12">No</th>
              <th scope="col" className="px-4 py-3 text-left w-36">Materi</th>
              <th scope="col" className="px-6 py-3 text-left">Indikator Soal (Formula ABCD)</th>
              <th scope="col" className="px-4 py-3 text-center w-24">Level</th>
              <th scope="col" className="px-4 py-3 text-left w-36">Bentuk Soal</th>
              <th scope="col" className="px-4 py-3 text-center w-20">No Soal</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {kisiKisi.map((item, index) => {
              const abcd = analyzeABCDIndicator(item.indikator);
              return (
                <tr key={index} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.no}</td>
                  <td className={`px-4 py-4 whitespace-normal text-sm text-gray-600 font-medium ${langClass} ${textDirClass}`} dir={isArabic ? 'rtl' : 'ltr'}>
                    {item.materi}
                  </td>
                  <td className={`px-6 py-4 whitespace-normal text-gray-800 ${langClass} ${textDirClass}`} dir={isArabic ? 'rtl' : 'ltr'}>
                    <div className="leading-relaxed whitespace-pre-line font-medium">
                      {item.indikator}
                    </div>

                    {/* Visual ABCD Pill Status */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5 font-sans text-[11px]" dir="ltr">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded font-semibold border ${
                        abcd.hasCondition ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-red-50 text-red-700 border-red-200'
                      }`} title={abcd.hasCondition ? 'Condition: Stimulus Terpenuhi' : 'Condition: Belum Terdeteksi'}>
                        [C] Condition {abcd.hasCondition ? '✓' : '✗'}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded font-semibold border ${
                        abcd.hasAudience ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
                      }`} title={abcd.hasAudience ? 'Audience: Peserta Didik Terpenuhi' : 'Audience: Belum Terdeteksi'}>
                        [A] Audience {abcd.hasAudience ? '✓' : '✗'}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded font-semibold border ${
                        abcd.hasBehavior ? 'bg-indigo-50 text-indigo-800 border-indigo-200' : 'bg-red-50 text-red-700 border-red-200'
                      }`} title={abcd.hasBehavior ? 'Behavior: KKO & Materi Terpenuhi' : 'Behavior: Belum Terdeteksi'}>
                        [B] Behavior {abcd.hasBehavior ? '✓' : '✗'}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded font-semibold border ${
                        abcd.hasDegree ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'
                      }`} title={abcd.hasDegree ? 'Degree: Tingkat Ketepatan Terpenuhi' : 'Degree: Belum Terdeteksi'}>
                        [D] Degree {abcd.hasDegree ? '✓' : '✗'}
                      </span>

                      {abcd.isStrictlyComplete && (
                        <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800 border border-green-300">
                          ABCD Lengkap
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-semibold text-gray-700">
                    <span className="px-2 py-0.5 rounded bg-gray-100 border border-gray-200 text-xs">
                      {item.levelBloom}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                    {item.bentukSoal}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-bold text-gray-900">
                    #{item.noSoal}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      <div className="flex justify-between mt-8">
        <Button onClick={handleBack} variant="secondary">Kembali</Button>
        <Button onClick={handleNext}>Lanjutkan ke Validasi ABCD</Button>
      </div>
    </Card>
  );
};

export default Step2KisiKisi;
