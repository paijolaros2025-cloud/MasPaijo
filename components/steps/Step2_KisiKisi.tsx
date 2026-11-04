
import React from 'react';
import { AppState, AppStateSetter, Bahasa } from '../../types';
import Card from '../Card';
import Button from '../Button';
import Spinner from '../Spinner';

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
      <h2 className="text-2xl font-bold text-center text-green-800 mb-6">Kisi-Kisi Soal</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Materi</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Indikator</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Level</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bentuk Soal</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No Soal</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {kisiKisi.map((item, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.no}</td>
                <td className={`px-6 py-4 whitespace-normal text-gray-500 ${langClass} ${textDirClass}`} dir={isArabic ? 'rtl' : 'ltr'}>{item.materi}</td>
                <td className={`px-6 py-4 whitespace-normal text-gray-500 ${langClass} ${textDirClass}`} dir={isArabic ? 'rtl' : 'ltr'}>{item.indikator}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.levelBloom}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.bentukSoal}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.noSoal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
       <div className="flex justify-between mt-8">
          <Button onClick={handleBack} variant="secondary">Kembali</Button>
          <Button onClick={handleNext}>Lanjutkan ke Validasi</Button>
        </div>
    </Card>
  );
};

export default Step2KisiKisi;
