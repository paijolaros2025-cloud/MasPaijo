
import type { Dispatch, SetStateAction } from 'react';

export const Step = {
  Input: 1,
  KisiKisi: 2,
  Validation: 3,
  Soal: 4,
  Export: 5,
} as const;
export type Step = (typeof Step)[keyof typeof Step];

export const Bahasa = {
  Indonesia: "Bahasa Indonesia",
  Arab: "Bahasa Arab",
  JawaHanacaraka: "Bahasa Jawa Hanacaraka",
  Sunda: "Bahasa Sunda",
} as const;
export type Bahasa = (typeof Bahasa)[keyof typeof Bahasa];

export const TingkatKesulitan = {
  Mudah: "Mudah",
  Sedang: "Sedang",
  Sulit: "Sulit",
} as const;
export type TingkatKesulitan = (typeof TingkatKesulitan)[keyof typeof TingkatKesulitan];

export interface UserInput {
  mataPelajaran: string;
  kelas: string;
  cp: string;
  tp: string;
  materi: string;
  jumlahPG: number;
  jumlahPGKompleks: number;
  jumlahIsian: number;
  jumlahUraian: number;
  bahasa: Bahasa;
  tingkatKesulitan: TingkatKesulitan;
}

export const BentukSoal = {
  PG: "Pilihan Ganda",
  PGK: "Pilihan Ganda Kompleks",
  ISIAN: "Isian Singkat",
  URAIAN: "Uraian",
} as const;
export type BentukSoal = (typeof BentukSoal)[keyof typeof BentukSoal];

export interface KisiKisiItem {
  no: number;
  mapel: string;
  kelas: string;
  cp: string;
  tp: string;
  materi: string;
  indikator: string;
  levelBloom: string;
  bentukSoal: BentukSoal;
  noSoal: number;
}

export interface ValidationResult {
  isValid: boolean;
  reasons: string[];
  abcd?: {
    audience: boolean;
    behavior: boolean;
    condition: boolean;
    degree: boolean;
    details?: {
      audience?: string;
      behavior?: string;
      condition?: string;
      degree?: string;
    };
  };
}

export interface SoalPG {
  soal: string;
  options: { key: string; value: string }[];
  kunciJawaban: string;
}

export interface SoalPGKompleks {
  soal: string;
  options: { key: string; value: string }[];
  kunciJawaban: string[];
  petunjuk: string;
}

export interface SoalIsian {
  soal: string;
  kunciJawaban: string;
}

export interface SoalUraian {
  soal: string;
  rubrik: {
    skor4: string;
    skor3: string;
    skor2: string;
    skor1: string;
  };
}

export interface Soal {
  pg: (SoalPG & { noSoal: number })[];
  pgKompleks: (SoalPGKompleks & { noSoal: number })[];
  isian: (SoalIsian & { noSoal: number })[];
  uraian: (SoalUraian & { noSoal: number })[];
}

export interface AnalisisSoal {
  keterbacaan: string;
  tingkatKognitif: string;
  kecocokanKurikulum: string;
  kesimpulan: string;
}

export interface AppState {
  currentStep: Step;
  userInput: UserInput | null;
  kisiKisi: KisiKisiItem[];
  validationResults: ValidationResult[];
  soal: Soal | null;
  analisis: AnalisisSoal | null;
  isLoading: boolean;
  error: string | null;
}

export type AppStateSetter = Dispatch<SetStateAction<AppState>>;
