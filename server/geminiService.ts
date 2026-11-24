import { GoogleGenAI, Type } from "@google/genai";
import type { GenerateContentResponse } from "@google/genai";
import { BentukSoal } from '../types.ts';
import type { UserInput, KisiKisiItem, ValidationResult, Soal, AnalisisSoal } from '../types.ts';

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not defined. Please ensure your API key is set in Settings > Secrets.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

const CANDIDATE_MODELS = [
  'gemini-2.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash',
  'gemini-flash-latest'
];

function cleanJsonText(raw: string): string {
  let cleaned = (raw || '').trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
  }

  // If there's leading/trailing text or commentary, extract the outermost valid JSON structure
  const firstBracket = cleaned.indexOf('[');
  const firstBrace = cleaned.indexOf('{');

  if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
    const lastBracket = cleaned.lastIndexOf(']');
    if (lastBracket > firstBracket) {
      return cleaned.substring(firstBracket, lastBracket + 1);
    }
  } else if (firstBrace !== -1) {
    const lastBrace = cleaned.lastIndexOf('}');
    if (lastBrace > firstBrace) {
      return cleaned.substring(firstBrace, lastBrace + 1);
    }
  }

  return cleaned;
}

function isRetryableError(error: any): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    msg.includes('503') ||
    msg.includes('UNAVAILABLE') ||
    msg.includes('high demand') ||
    msg.includes('overloaded') ||
    msg.includes('429') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('500') ||
    msg.includes('502') ||
    msg.includes('504') ||
    msg.includes('ECONNRESET') ||
    msg.includes('ETIMEDOUT') ||
    msg.includes('fetch failed') ||
    msg.includes('JSON') ||
    error instanceof SyntaxError
  );
}

async function executeWithModelFallback<T>(
  operation: (modelName: string) => Promise<T>,
  operationName = 'Gemini Operation'
): Promise<T> {
  let lastError: any = null;

  for (const model of CANDIDATE_MODELS) {
    let attempt = 0;
    const maxAttemptsForModel = 2;
    let delay = 1500;

    while (attempt < maxAttemptsForModel) {
      attempt++;
      try {
        console.log(`[Gemini Server] Executing ${operationName} with model: ${model} (attempt ${attempt}/${maxAttemptsForModel})`);
        return await operation(model);
      } catch (err: any) {
        lastError = err;
        const errMsg = err instanceof Error ? err.message : String(err);
        console.warn(`[Gemini Server] ${operationName} with model ${model} attempt ${attempt} failed: ${errMsg}`);

        const isHighDemand = errMsg.includes('503') || errMsg.includes('UNAVAILABLE') || errMsg.includes('high demand') || errMsg.includes('overloaded');
        if (isHighDemand) {
          console.log(`[Gemini Server] Model ${model} is experiencing high demand (503). Switching immediately to fallback model...`);
          break; // Switch to next fallback model immediately!
        }

        if (isRetryableError(err) && attempt < maxAttemptsForModel) {
          console.log(`[Gemini Server] Retrying ${model} after ${delay}ms...`);
          await new Promise(r => setTimeout(r, delay));
          delay *= 1.5;
        } else {
          break;
        }
      }
    }
  }

  // All models failed; provide a clear and user-friendly error
  const rawMsg = lastError instanceof Error ? lastError.message : String(lastError);
  console.error(`[Gemini Server] All fallback models failed for ${operationName}:`, rawMsg);

  if (rawMsg.includes('503') || rawMsg.includes('UNAVAILABLE') || rawMsg.includes('high demand') || rawMsg.includes('overloaded')) {
    throw new Error('Layanan AI Google saat ini sedang mengalami lonjakan beban tinggi (503). Silakan coba klik tombol Buat Kisi-Kisi kembali beberapa saat lagi.');
  }
  if (rawMsg.includes('429') || rawMsg.includes('RESOURCE_EXHAUSTED')) {
    throw new Error('Batas kuota penggunaan AI tercapai. Silakan coba lagi dalam 1-2 menit.');
  }
  if (rawMsg.includes('API key') || rawMsg.includes('API_KEY')) {
    throw new Error('Kunci API Gemini tidak valid atau belum diatur. Silakan periksa di Settings > Secrets.');
  }
  if (rawMsg.includes('JSON') || lastError instanceof SyntaxError) {
    throw new Error('Format keluaran AI tidak lengkap. Silakan coba kurangi jumlah soal atau klik buat kembali.');
  }

  throw new Error(`Gagal memproses AI: ${rawMsg}`);
}

const withRetry = async <T>(
  apiCall: () => Promise<T>,
  maxRetries = 2,
  initialDelay = 1500
): Promise<T> => {
  let attempt = 0;
  let delay = initialDelay;

  while (true) {
    try {
      return await apiCall();
    } catch (e: any) {
      attempt++;
      const errorMessage = e instanceof Error ? e.message : String(e);
      if (isRetryableError(e) && attempt < maxRetries) {
        console.warn(`[Gemini Server] Error encountered: ${errorMessage}. Retrying in ${delay / 1000}s... (Attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 1.5;
      } else {
        throw e;
      }
    }
  }
};

const kisiKisiSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      indikator: { type: Type.STRING },
      levelBloom: { type: Type.STRING },
      bentukSoal: { type: Type.STRING, enum: Object.values(BentukSoal) },
      noSoal: { type: Type.INTEGER },
    },
    required: ['indikator', 'levelBloom', 'bentukSoal', 'noSoal']
  }
};

export async function serverGenerateKisiKisi(input: UserInput): Promise<KisiKisiItem[]> {
  return executeWithModelFallback(async (modelName: string) => {
    const ai = getGeminiClient();
    const prompt = `
    Anda adalah ahli penyusun kisi-kisi soal ujian madrasah dan sekolah. Berdasarkan informasi berikut:
    - Mata Pelajaran: ${input.mataPelajaran}
    - Kelas: ${input.kelas}
    - Bahasa Keluaran: ${input.bahasa}
    - Tingkat Kesulitan Keseluruhan: ${input.tingkatKesulitan}
    - Capaian Pembelajaran (CP): ${input.cp}
    - Tujuan Pembelajaran (TP): ${input.tp}
    - Materi: ${input.materi}
    Buatkan kisi-kisi soal dengan jumlah:
    - ${input.jumlahPG} Pilihan Ganda
    - ${input.jumlahPGKompleks} Pilihan Ganda Kompleks
    - ${input.jumlahIsian} Isian Singkat
    - ${input.jumlahUraian} Uraian
    Untuk setiap soal, buatlah:
    1. Indikator Soal yang WAJIB MEMENUHI KAIDAH ABCD (Audience, Behavior, Condition, Degree) SECARA KETAT, DETAIL, DAN LENGKAP:
       - **Condition (C)**: Kondisi/stimulus awal yang disajikan kepada siswa (misal: "Disajikan tabel data percobaan...", "Diberikan kutipan teks deskripsi...", "Disajikan gambar bagan organ pernapasan...", "Berdasarkan studi kasus...").
       - **Audience (A)**: Subjek peserta didik yang dinyatakan secara eksplisit: "peserta didik" (atau dalam bahasa sasaran: "التِّلْمِيذُ" untuk Bahasa Arab, "para murid" untuk Bahasa Sunda, "para siswa" untuk Bahasa Jawa).
       - **Behavior (B)**: Perilaku yang dapat diobservasi dan diukur dengan Kata Kerja Operasional (KKO) Taksonomi Bloom sesuai level kognitif yang diminta dan materi terkait (misal: "dapat menganalisis faktor penyebab...", "dapat menghitung luas permukaan...", "dapat mengklasifikasikan jenis-jenis...").
       - **Degree (D)**: Derajat atau tingkat ketepatan/kriteria keberhasilan (misal: "dengan tepat", "dengan benar", "secara runtut dan tepat", "dengan teliti", "minimal 3 karakteristik secara lengkap").
       *Pola Wajib Kalimat Indikator:*
       "[Condition: Disajikan/Diberikan ...], [Audience: peserta didik] dapat [Behavior: [KKO Bloom] [materi spesifik]] [Degree: dengan tepat/benar]."
       *Contoh:*
       - C2: "Disajikan gambar daur hidup katak (C), peserta didik (A) dapat mengidentifikasi tahapan metamorfosis sempurna (B) dengan tepat (D)."
       - C3: "Diberikan tabel data panjang dan lebar persegi (C), peserta didik (A) dapat menghitung keliling bangun tersebut (B) dengan benar (D)."
       - C4: "Disajikan narasi kasus pencemaran lingkungan (C), peserta didik (A) dapat menganalisis penyebab utama penurunan kualitas air (B) secara kritis dan sistematis (D)."
    2. Level Kognitif (Bloom) yang sesuai (C1-C6). Sesuaikan proporsi level kognitif dengan tingkat kesulitan yang diminta (${input.tingkatKesulitan}).
    3. Bentuk Soal (Pilihan Ganda, Pilihan Ganda Kompleks, Isian Singkat, Uraian).
    4. Nomor Soal yang berurutan.
    Pastikan jumlah soal untuk setiap bentuk sesuai dengan permintaan.
    PENTING: Seluruh teks keluaran WAJIB menggunakan ${input.bahasa}.
    - Jika **Bahasa Arab**: Gunakan tata bahasa Arab yang fushha (formal) dengan kaidah Nahwu dan Shorof yang tepat. WAJIB menyertakan **harakat/tashkeel (syakal) yang lengkap, benar, dan konsisten** pada setiap huruf dan kata. Kaidah ABCD dalam Bahasa Arab: "بِنَاءً عَلَى... (C)، يَسْتَطِيعُ التِّلْمِيذُ (A) أَنْ [فعل مضارع KKO]... (B) بِشَكْلٍ صَحِيحٍ / بِدِقَّةٍ (D)."
    - Jika **Bahasa Jawa Hanacaraka**: Gunakan **Aksara Jawa (Unicode)** dengan sandhangan dan pasangan yang benar.
    - Jika **Bahasa Sunda**: Gunakan **Basa Sunda baku (lulugu)**: "Dumasar kana... (C), para murid (A) tiasa [KKO]... (B) kalayan leres (D)."
    `;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: kisiKisiSchema,
      },
    });

    const text = cleanJsonText(response.text || "[]");
    const data = JSON.parse(text);

    if (!Array.isArray(data)) {
      throw new Error("Respons dari AI tidak valid (bukan array).");
    }

    let noSoalCounter = 1;
    return data.map((item: any) => ({
      no: noSoalCounter++,
      mapel: input.mataPelajaran,
      kelas: input.kelas,
      cp: input.cp,
      tp: input.tp,
      materi: input.materi,
      indikator: item.indikator || `Memahami indikator materi ${input.materi}`,
      levelBloom: item.levelBloom || 'C3',
      bentukSoal: item.bentukSoal || BentukSoal.PG,
      noSoal: typeof item.noSoal === 'number' ? item.noSoal : noSoalCounter - 1
    }));
  }, 'serverGenerateKisiKisi');
}

const validationSchema = {
  type: Type.OBJECT,
  properties: {
    isValid: { type: Type.BOOLEAN },
    reasons: { type: Type.ARRAY, items: { type: Type.STRING } },
    abcd: {
      type: Type.OBJECT,
      properties: {
        audience: { type: Type.BOOLEAN },
        behavior: { type: Type.BOOLEAN },
        condition: { type: Type.BOOLEAN },
        degree: { type: Type.BOOLEAN },
      },
      required: ['audience', 'behavior', 'condition', 'degree']
    }
  },
  required: ['isValid', 'reasons', 'abcd']
};

export async function serverValidateIndicators(kisiKisi: KisiKisiItem[]): Promise<ValidationResult[]> {
  return executeWithModelFallback(async (modelName: string) => {
    const ai = getGeminiClient();
    const indicatorsToValidate = kisiKisi.map(item => ({
      noSoal: item.noSoal,
      indikator: item.indikator,
      cp: item.cp,
      tp: item.tp,
      materi: item.materi,
      levelBloom: item.levelBloom,
    }));

    const prompt = `
    Anda adalah penilai ahli kualitas kurikulum dan indikator soal ujian nasional (Kemdikbud/Kemenag).
    Lakukan VALIDASI KETAT DAN MENDETAIL terhadap SETIAP Indikator Soal dalam daftar berikut berdasarkan KAIDAH MUTLAK ABCD (Audience, Behavior, Condition, Degree).

    PANDUAN 4 UNSUR WAJIB ABCD:
    1. Condition (C): Wajib memuat kondisi/stimulus awal yang disajikan kepada siswa (misal: "Disajikan teks bacaan...", "Diberikan tabel data...", "Disajikan gambar bagan..."). Jika indikator langsung dimulai tanpa stimulus atau kondisi tidak jelas, maka condition = false.
    2. Audience (A): Wajib menyebutkan subjek peserta didik secara eksplisit ("peserta didik", "siswa", atau "التلميذ" / "para murid" / "para siswa"). Jika subjek peserta didik tidak ada, maka audience = false.
    3. Behavior (B): Wajib memuat Kata Kerja Operasional (KKO) Taksonomi Bloom yang terukur dan materi spesifik yang diuji ("dapat mengidentifikasi...", "dapat menghitung...", "dapat menganalisis..."). Jika KKO tidak terukur (misal hanya "mengetahui" / "memahami" tanpa tindakan terukur) atau materi tidak jelas, maka behavior = false.
    4. Degree (D): Wajib memuat derajat ketepatan, akurasi, kelengkapan, atau standar kriteria keberhasilan unjuk kerja ("dengan tepat", "dengan benar", "secara runtut dan tepat", "dengan teliti", "minimal 3 poin secara lengkap"). Jika tidak ada standar ketepatan, maka degree = false.

    ATURAN KELULUSAN KETAT (STANDAR MUTLAK):
    - 'isValid' HANYA BOLEH bernilai true JIKA dan HANYA JIKA ke-4 unsur ABCD bernilai true (audience: true, behavior: true, condition: true, degree: true) DAN indikator selaras dengan CP, TP, Materi, serta Level Bloom.
    - Jika SALAH SATU ATAU LEBIH dari unsur ABCD tidak terpenuhi (false), maka 'isValid' WAJIB bernilai false!
    - Pada 'reasons', sebutkan secara terperinci setiap unsur ABCD yang belum terpenuhi dan berikan perbaikannya. Contoh: "Belum memenuhi unsur Condition (belum ada stimulus pengantar seperti 'Disajikan teks...')", "Belum memenuhi unsur Degree (belum ada tingkat ketepatan seperti 'dengan tepat')".

    Daftar Indikator dan Konteksnya:
    ${JSON.stringify(indicatorsToValidate, null, 2)}
    Berikan hasil validasi dalam format JSON ARRAY sesuai skema. Urutan dalam array hasil HARUS SAMA PERSIS dengan urutan dalam daftar input.
    `;

    const validationSchemaArray = {
      type: Type.ARRAY,
      items: validationSchema
    };

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: validationSchemaArray,
      },
    });

    const text = cleanJsonText(response.text || "[]");
    const results = JSON.parse(text) as ValidationResult[];
    if (results.length !== kisiKisi.length) {
      throw new Error("Jumlah hasil validasi tidak cocok dengan jumlah input indikator.");
    }
    return results;
  }, 'serverValidateIndicators');
}

const fixAllIndicatorsSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      noSoal: { type: Type.INTEGER },
      revisedIndicator: { type: Type.STRING }
    },
    required: ['noSoal', 'revisedIndicator']
  }
};

export async function serverFixAllInvalidIndicators(invalidItems: { item: KisiKisiItem; feedback: ValidationResult }[]): Promise<KisiKisiItem[]> {
  return executeWithModelFallback(async (modelName: string) => {
    const ai = getGeminiClient();
    const itemsToFix = invalidItems.map(({ item, feedback }) => ({
      noSoal: item.noSoal,
      indikatorAsli: item.indikator,
      alasanTidakValid: feedback.reasons.join(', '),
      cp: item.cp,
      tp: item.tp,
      materi: item.materi,
      levelBloom: item.levelBloom
    }));

    if (itemsToFix.length === 0) {
      return [];
    }

    const prompt = `
    Anda adalah ahli penyempurnaan kisi-kisi dan indikator soal ujian nasional/madrasah.
    Daftar indikator soal berikut dinyatakan TIDAK VALID karena melanggar atau kurang memenuhi kaidah ABCD (Audience, Behavior, Condition, Degree).
    
    Data Indikator yang Perlu Diperbaiki:
    ${JSON.stringify(itemsToFix, null, 2)}

    TUGAS ANDA:
    Tulis ulang dan perbaiki SETIAP indikator tersebut agar 100% MEMENUHI KAIDAH ABCD SECARA KETAT, DETAIL, DAN LENGKAP:
    Formula Wajib:
    "[Condition: Disajikan/Diberikan ... (stimulus konkret sesuai materi)], [Audience: peserta didik] dapat [Behavior: [KKO Bloom terukur sesuai level Bloom] [materi spesifik]] [Degree: dengan tepat dan benar]."

    Pastikan:
    1. Condition (C) memuat stimulus nyata (teks narasi, tabel data, gambar diagram, kasus kontekstual).
    2. Audience (A) selalu menyebutkan "peserta didik" (atau dalam bahasa sasaran: "التِّلْمِيذُ" untuk Bahasa Arab, "para murid" untuk Bahasa Sunda, "para siswa" untuk Bahasa Jawa).
    3. Behavior (B) memuat KKO Bloom yang operasional dan dapat diukur sesuai level kognitif masing-masing soal.
    4. Degree (D) menyebutkan standar ketepatan ("dengan tepat", "dengan benar", "secara runtut dan tepat", "dengan teliti").
    5. Seluruh teks keluaran wajib menggunakan bahasa yang sama dengan indikator asli.

    Kembalikan hasilnya dalam format JSON ARRAY. Setiap objek dalam array harus berisi 'noSoal' asli dan 'revisedIndicator' yang sudah diperbaiki sempurna sesuai kaidah ABCD.
    `;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: fixAllIndicatorsSchema,
      },
    });

    const text = cleanJsonText(response.text || "[]");
    const fixedResults: { noSoal: number; revisedIndicator: string }[] = JSON.parse(text);

    const updatedKisiKisiItems: KisiKisiItem[] = [];

    fixedResults.forEach(fixed => {
      const originalInvalidItem = invalidItems.find(({ item }) => item.noSoal === fixed.noSoal);
      if (originalInvalidItem) {
        updatedKisiKisiItems.push({
          ...originalInvalidItem.item,
          indikator: fixed.revisedIndicator,
        });
      }
    });

    return updatedKisiKisiItems;
  }, 'serverFixAllInvalidIndicators');
}

export async function serverGenerateSingleSoal(kisiItem: KisiKisiItem, bahasa: string, tingkatKesulitan: string): Promise<any> {
  return executeWithModelFallback(async (modelName: string) => {
    const ai = getGeminiClient();
    const prompt = `
    Berdasarkan indikator soal berikut yang telah divalidasi, buatlah 1 buah soal ujian dalam ${bahasa}.
    
    Konteks:
    - Mata Pelajaran: ${kisiItem.mapel || 'Umum'}
    - Kelas/Fase: ${kisiItem.kelas || 'Umum'}
    - Materi Utama: ${kisiItem.materi || 'Umum'}
    - Tingkat Kesulitan Keseluruhan: ${tingkatKesulitan}
    
    Spesifikasi Soal:
    - Nomor Soal: ${kisiItem.noSoal}
    - Bentuk Soal: ${kisiItem.bentukSoal}
    - Level Bloom: ${kisiItem.levelBloom}
    - Indikator: ${kisiItem.indikator}

    Aturan Pembuatan Soal:
    1.  **Gaya AKM / TKA Nasional:** Buat soal dengan gaya bahasa, format, dan kedalaman berpikir yang setara dengan soal-soal Asesmen Kompetensi Minimum (AKM) atau Tes Kompetensi Akademik (TKA) Nasional. Fokus pada penalaran logis, literasi, numerasi, dan pemecahan masalah (HOTS).
    2.  **Kesesuaian Usia, Kelas, & Tingkat Berpikir (SANGAT KRITIKAL):** Kalimat, kosa kata, stimulus, dan stem soal HARUS DIBUAT KHUSUS untuk siswa kelas ${kisiItem.kelas}.
        - Kelas Rendah (SD/MI 1-3): Gunakan 1-2 kalimat per pernyataan, kosa kata sehari-hari yang sangat konkret.
        - Kelas Menengah/Tinggi: Sesuaikan tingkat abstraksi secara bertahap.
        Stem pertanyaan WAJIB langsung, jelas, tidak ambigu, dan membidik tepat pada level kognitif usia mereka. Untuk bahasa Arab/Jawa, DILARANG MENGGUNAKAN kosa kata asing/sastra kuno yang di luar jangkauan jika diperuntukkan bagi siswa dasar.
    3.  **Tingkat Kesulitan & Level Bloom:** Sesuaikan tingkat kesulitan soal ini agar selaras dengan Level Bloom dari kisi-kisi dan tingkat kesulitan keseluruhan (${tingkatKesulitan}). Buat pengecoh dan soal yang mencerminkan kerumitan dari tingkat kesulitan tersebut.
    4.  **Stimulus Kontekstual:** Setiap teks soal WAJIB diawali dengan stimulus (cerita pendek, kasus, fenomena, infografis naratif, atau data) yang relevan dengan lingkungan dan kehidupan sehari-hari siswa kelas ${kisiItem.kelas}, sebelum masuk ke kalimat pertanyaan inti (stem soal).
    5.  **Pilihan Ganda (PG):** Jika bentuk soal Pilihan Ganda, buat soal dengan 4 pilihan jawaban (A, B, C, D) dan satu kunci jawaban yang benar.
    6.  **Pilihan Ganda Kompleks (PGK):** Jika bentuk soal Pilihan Ganda Kompleks, buat soal dengan 4-5 pilihan jawaban, di mana bisa ada lebih dari satu atau lebih jawaban benar. Sertakan petunjuk jumlah jawaban yang harus dipilih, misal: "Pilihlah dua jawaban yang benar!".
    7.  **Kualitas Pengecoh (Distractor) SANGAT PENTING & KRITIKAL (UNTUK PG & PGK):**
        - **WAJIB HOMOGEN (ATURAN MUTLAK):** Kunci jawaban dan semua pengecoh WAJIB IDENTIK secara panjang karakter, jumlah kata, dan kerumitan struktur gramatikal. JIKA KUNCI JAWABAN TERDIRI DARI 5 KATA, MAKA SEMUA PENGECOH HARUS TERDIRI DARI 4-6 KATA. Kunci jawaban DILARANG KERAS menjadi opsi yang paling panjang, mendetail, atau paling deskriptif.
        - **WAJIB RASIONAL & MENGECOH LEVEL TINGGI:** Pengecoh harus sangat masuk akal dan sulit disingkirkan oleh siswa yang tidak menguasai materi. Ambil dari:
           a. Miskonsepsi lazim siswa kelas ${kisiItem.kelas}.
           b. Jebakan logika dari teks stimulus (fakta benar di teks tapi salah konteks untuk pertanyaan).
           c. Kesalahan hitung/tata bahasa yang sangat umum.
        - **PERINGATAN KERAS BAHASA ARAB & JAWA HANACARAKA:** Karena rentan ditebak dari panjang visual, ANDA WAJIB MEMASTIKAN JUMLAH HURUF/KARAKTER PADA KUNCI JAWABAN SAMA PERSIS DENGAN PENGECOHNYA. Jika kunci jawaban 3 kata, semua pengecoh wajib 3 kata. Jangan sampai kunci jawaban menonjol sendiri panjangnya.
    8.  **Isian Singkat:** Jika bentuk soal Isian, buat soal yang jawabannya singkat dan padat.
    9.  **Uraian:** Jika bentuk soal Uraian, buat soal esai dan sertakan rubrik penilaian sederhana dengan kriteria untuk skor 4 (sangat baik), 3 (baik), 2 (cukup), dan 1 (kurang).
    10. **Bahasa & Aksara (SANGAT PENTING):** Seluruh teks soal, pilihan jawaban, petunjuk, dan rubrik WAJIB menggunakan ${bahasa}.
        - Jika **Bahasa Arab**: Gunakan tata bahasa Arab yang fushha (formal) dengan kaidah Nahwu dan Shorof yang tepat. WAJIB menyertakan **harakat/tashkeel (syakal) yang lengkap, benar, dan konsisten** pada setiap huruf dan kata (fathah, kasrah, dammah, sukun, tanwin, shaddah, fathatain, kasratain, dammatain) untuk memudahkan pembacaan siswa MI. Perhatikan penulisan hamzah (qatha' dan washal), alif lam (syamsiyah dan qamariyah), ta' marbuthah, dan huruf-huruf yang mirip. Pastikan i'rab (harakat akhir kata) benar sesuai kedudukannya dalam kalimat. Jangan mencampur dengan bahasa lain.
        - Jika **Bahasa Jawa Hanacaraka**: Gunakan **Aksara Jawa (Unicode)** dengan penulisan yang baku. WAJIB menggunakan **sandhangan (wulu, suku, pepet, taling, taling tarung, layar, wignyan, cecak, pangkon)** dan **pasangan** yang tepat sesuai kaidah penulisan Aksara Jawa yang benar (Paugeran Sriwedari). Pastikan tidak ada spasi di antara aksara dalam satu kata, dan gunakan spasi antar kata. Jangan hanya menggunakan aksara legena.
        - Jika **Bahasa Sunda**: Gunakan **Basa Sunda baku (lulugu)** yang baik dan benar sesuai dengan Undak-usuk Basa (Tatakrama Basa Sunda) yang tepat untuk konteks pendidikan/sekolah. Perhatikan penggunaan ejaan yang tepat (seperti é, e, dan eu).
    11. **Kualitas Indikator:** Gunakan indikator soal yang telah divalidasi ini sebagai panduan utama untuk memastikan kualitas soal yang dihasilkan.
    Pastikan setiap soal sesuai persis dengan indikator, nomor soal, dan bentuk soal yang ditentukan dalam kisi-kisi.
    PENTING: Buatlah soal dan jawaban dengan ringkas dan padat agar respons tidak terpotong.
    `;

    let singleSoalSchema: any;
    if (kisiItem.bentukSoal === BentukSoal.PG) {
      singleSoalSchema = {
        type: Type.OBJECT,
        properties: { noSoal: { type: Type.INTEGER }, soal: { type: Type.STRING }, options: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { key: { type: Type.STRING }, value: { type: Type.STRING } } } }, kunciJawaban: { type: Type.STRING } }
      };
    } else if (kisiItem.bentukSoal === BentukSoal.PGK) {
      singleSoalSchema = {
        type: Type.OBJECT,
        properties: { noSoal: { type: Type.INTEGER }, soal: { type: Type.STRING }, options: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { key: { type: Type.STRING }, value: { type: Type.STRING } } } }, kunciJawaban: { type: Type.ARRAY, items: { type: Type.STRING } }, petunjuk: { type: Type.STRING } }
      };
    } else if (kisiItem.bentukSoal === BentukSoal.ISIAN) {
      singleSoalSchema = {
        type: Type.OBJECT,
        properties: { noSoal: { type: Type.INTEGER }, soal: { type: Type.STRING }, kunciJawaban: { type: Type.STRING } }
      };
    } else {
      singleSoalSchema = {
        type: Type.OBJECT,
        properties: { noSoal: { type: Type.INTEGER }, soal: { type: Type.STRING }, rubrik: { type: Type.OBJECT, properties: { skor4: { type: Type.STRING }, skor3: { type: Type.STRING }, skor2: { type: Type.STRING }, skor1: { type: Type.STRING } } } }
      };
    }

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: singleSoalSchema,
        maxOutputTokens: 2048,
      },
    });

    const text = cleanJsonText(response.text || "{}");
    const raw = JSON.parse(text);
    return sanitizeSingleSoal(raw, kisiItem.bentukSoal, kisiItem.noSoal);
  }, 'serverGenerateSingleSoal');
}

function sanitizeSingleSoal(raw: any, bentukSoal?: string, fallbackNo = 1): any {
  if (!raw || typeof raw !== 'object') {
    return {
      noSoal: fallbackNo,
      soal: String(raw ?? ''),
    };
  }

  const noSoal = typeof raw.noSoal === 'number' ? raw.noSoal : fallbackNo;
  let rawSoal = typeof raw.soal === 'string' ? raw.soal.trim() : String(raw.soal ?? '');

  // Strip duplicated choices from the question stem if options array is present
  if (Array.isArray(raw.options) && raw.options.length > 0) {
    const trailingChoicesRegex = /\n\s*(?:[A-Da-d][\.\:\)]|\([A-Da-d]\))\s+[\s\S]*?(?:\n\s*(?:[B-Db-d][\.\:\)]|\([B-Db-d]\))\s+[\s\S]*?)+$/;
    if (trailingChoicesRegex.test(rawSoal)) {
      rawSoal = rawSoal.replace(trailingChoicesRegex, '').trim();
    }
  }

  let normalizedOptions: { key: string; value: string }[] | undefined = undefined;
  if (Array.isArray(raw.options)) {
    normalizedOptions = raw.options.map((opt: any, i: number) => {
      if (typeof opt === 'string') {
        const match = opt.trim().match(/^([A-Da-d0-9])[\.\:\)\-]\s*(.+)$/);
        return match
          ? { key: match[1].toUpperCase(), value: match[2].trim() }
          : { key: String.fromCharCode(65 + i), value: opt.trim() };
      }
      if (opt && typeof opt === 'object') {
        const key = String(opt.key ?? opt.kunci ?? opt.huruf ?? String.fromCharCode(65 + i)).replace(/[\.\:\)\-\s]/g, '').toUpperCase() || String.fromCharCode(65 + i);
        const value = String(opt.value ?? opt.teks ?? opt.text ?? opt.jawaban ?? '').trim();
        return { key, value };
      }
      return { key: String.fromCharCode(65 + i), value: String(opt ?? '') };
    });
  }

  const result: any = {
    noSoal,
    soal: rawSoal,
  };

  if (normalizedOptions) {
    result.options = normalizedOptions;
  }

  if (raw.kunciJawaban !== undefined) {
    result.kunciJawaban = raw.kunciJawaban;
  }

  if (raw.petunjuk) {
    result.petunjuk = String(raw.petunjuk).trim();
  }

  if (raw.rubrik && typeof raw.rubrik === 'object') {
    result.rubrik = {
      skor4: String(raw.rubrik.skor4 ?? 'Sangat baik, lengkap, dan sistematis'),
      skor3: String(raw.rubrik.skor3 ?? 'Baik dan relevan'),
      skor2: String(raw.rubrik.skor2 ?? 'Cukup, ada beberapa kekurangan'),
      skor1: String(raw.rubrik.skor1 ?? 'Kurang atau tidak relevan'),
    };
  }

  return result;
}

function sanitizeSoalCollection(raw: any): Soal {
  const output: Soal = {
    pg: [],
    pgKompleks: [],
    isian: [],
    uraian: []
  };

  if (raw && typeof raw === 'object') {
    if (Array.isArray(raw.pg)) {
      output.pg = raw.pg.map((item: any, i: number) => sanitizeSingleSoal(item, 'Pilihan Ganda', i + 1));
    }
    if (Array.isArray(raw.pgKompleks)) {
      output.pgKompleks = raw.pgKompleks.map((item: any, i: number) => sanitizeSingleSoal(item, 'Pilihan Ganda Kompleks', i + 1));
    }
    if (Array.isArray(raw.isian)) {
      output.isian = raw.isian.map((item: any, i: number) => sanitizeSingleSoal(item, 'Isian Singkat', i + 1));
    }
    if (Array.isArray(raw.uraian)) {
      output.uraian = raw.uraian.map((item: any, i: number) => sanitizeSingleSoal(item, 'Uraian', i + 1));
    }
  }

  return output;
}

const soalSchema = {
  type: Type.OBJECT,
  properties: {
    pg: {
      type: Type.ARRAY, items: {
        type: Type.OBJECT,
        properties: { noSoal: { type: Type.INTEGER }, soal: { type: Type.STRING }, options: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { key: { type: Type.STRING }, value: { type: Type.STRING } } } }, kunciJawaban: { type: Type.STRING } }
      }
    },
    pgKompleks: {
      type: Type.ARRAY, items: {
        type: Type.OBJECT,
        properties: { noSoal: { type: Type.INTEGER }, soal: { type: Type.STRING }, options: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { key: { type: Type.STRING }, value: { type: Type.STRING } } } }, kunciJawaban: { type: Type.ARRAY, items: { type: Type.STRING } }, petunjuk: { type: Type.STRING } }
      }
    },
    isian: {
      type: Type.ARRAY, items: {
        type: Type.OBJECT,
        properties: { noSoal: { type: Type.INTEGER }, soal: { type: Type.STRING }, kunciJawaban: { type: Type.STRING } }
      }
    },
    uraian: {
      type: Type.ARRAY, items: {
        type: Type.OBJECT,
        properties: { noSoal: { type: Type.INTEGER }, soal: { type: Type.STRING }, rubrik: { type: Type.OBJECT, properties: { skor4: { type: Type.STRING }, skor3: { type: Type.STRING }, skor2: { type: Type.STRING }, skor1: { type: Type.STRING } } } }
      }
    },
  }
};

export async function serverGenerateSoal(kisiKisi: KisiKisiItem[], bahasa: string, tingkatKesulitan: string): Promise<Soal> {
  return executeWithModelFallback(async (modelName: string) => {
    const ai = getGeminiClient();
    const prompt = `
    Berdasarkan kisi-kisi berikut yang telah divalidasi, buatlah soal ujian lengkap dalam ${bahasa}.
    Kisi-kisi:
    ${kisiKisi.map(item => `- No ${item.noSoal} (${item.bentukSoal}, Level ${item.levelBloom}): ${item.indikator}`).join('\n')}
    Materi Utama: ${kisiKisi[0]?.materi}
    Kelas/Fase: ${kisiKisi[0]?.kelas}
    Tingkat Kesulitan Keseluruhan: ${tingkatKesulitan}
    Aturan Pembuatan Soal:
    1.  **Gaya AKM / TKA Nasional:** Buat soal dengan gaya bahasa, format, dan kedalaman berpikir yang setara dengan soal-soal Asesmen Kompetensi Minimum (AKM) atau Tes Kompetensi Akademik (TKA) Nasional. Fokus pada penalaran logis, literasi, numerasi, dan pemecahan masalah (HOTS).
    2.  **Kesesuaian Usia, Kelas, & Tingkat Berpikir (SANGAT KRITIKAL):** Kalimat, kosa kata, stimulus, dan stem soal HARUS DIBUAT KHUSUS untuk siswa kelas ${kisiKisi[0]?.kelas}.
        - Kelas Rendah (SD/MI 1-3): Gunakan 1-2 kalimat per pernyataan, kosa kata sehari-hari yang sangat konkret.
        - Kelas Menengah/Tinggi: Sesuaikan tingkat abstraksi secara bertahap.
        Stem pertanyaan WAJIB langsung, jelas, tidak ambigu, dan membidik tepat pada level kognitif usia mereka. Untuk bahasa Arab/Jawa, DILARANG MENGGUNAKAN kosa kata asing/sastra kuno yang di luar jangkauan jika diperuntukkan bagi siswa dasar.
    3.  **Tingkat Kesulitan & Level Bloom:** Sesuaikan tingkat kesulitan soal ini agar selaras dengan Level Bloom dari kisi-kisi dan tingkat kesulitan keseluruhan (${tingkatKesulitan}).
    4.  **Stimulus Kontekstual:** Setiap teks soal WAJIB diawali dengan stimulus (cerita pendek, kasus, fenomena, infografis naratif, atau data) yang relevan dengan lingkungan dan kehidupan sehari-hari siswa kelas ${kisiKisi[0]?.kelas}, sebelum masuk ke kalimat pertanyaan inti (stem soal).
    5.  **Pilihan Ganda (PG):** Buat soal dengan 4 pilihan jawaban (A, B, C, D) dan satu kunci jawaban yang benar.
    6.  **Pilihan Ganda Kompleks (PGK):** Buat soal dengan 4-5 pilihan jawaban, di mana bisa ada lebih dari satu atau lebih jawaban benar. Sertakan petunjuk jumlah jawaban yang harus dipilih, misal: "Pilihlah dua jawaban yang benar!".
    7.  **Kualitas Pengecoh (Distractor) SANGAT PENTING & KRITIKAL (UNTUK PG & PGK):**
        - **WAJIB HOMOGEN (ATURAN MUTLAK):** Kunci jawaban dan semua pengecoh WAJIB IDENTIK secara panjang karakter, jumlah kata, dan kerumitan struktur gramatikal. JIKA KUNCI JAWABAN TERDIRI DARI 5 KATA, MAKA SEMUA PENGECOH HARUS TERDIRI DARI 4-6 KATA. Kunci jawaban DILARANG KERAS menjadi opsi yang paling panjang, mendetail, atau paling deskriptif.
        - **WAJIB RASIONAL & MENGECOH LEVEL TINGGI:** Pengecoh harus sangat masuk akal dan sulit disingkirkan oleh siswa yang tidak menguasai materi. Ambil dari:
           a. Miskonsepsi lazim siswa kelas ${kisiKisi[0]?.kelas}.
           b. Jebakan logika dari teks stimulus (fakta benar di teks tapi salah konteks untuk pertanyaan).
           c. Kesalahan hitung/tata bahasa yang sangat umum.
        - **PERINGATAN KERAS BAHASA ARAB & JAWA HANACARAKA:** Karena rentan ditebak dari panjang visual, ANDA WAJIB MEMASTIKAN JUMLAH HURUF/KARAKTER PADA KUNCI JAWABAN SAMA PERSIS DENGAN PENGECOHNYA. Jika kunci jawaban 3 kata, semua pengecoh wajib 3 kata. Jangan sampai kunci jawaban menonjol sendiri panjangnya.
    8.  **Isian Singkat:** Buat soal yang jawabannya singkat dan padat.
    9.  **Uraian:** Buat soal esai dan sertakan rubrik penilaian sederhana dengan kriteria untuk skor 4 (sangat baik), 3 (baik), 2 (cukup), dan 1 (kurang).
    10. **Bahasa & Aksara (SANGAT PENTING):** Seluruh teks soal, pilihan jawaban, petunjuk, dan rubrik WAJIB menggunakan ${bahasa}.
        - Jika **Bahasa Arab**: Gunakan tata bahasa Arab yang fushha (formal) dengan kaidah Nahwu dan Shorof yang tepat. WAJIB menyertakan **harakat/tashkeel (syakal) yang lengkap, benar, dan konsisten** pada setiap huruf dan kata (fathah, kasrah, dammah, sukun, tanwin, shaddah, fathatain, kasratain, dammatain) untuk memudahkan pembacaan siswa MI. Perhatikan penulisan hamzah (qatha' dan washal), alif lam (syamsiyah dan qamariyah), ta' marbuthah, dan huruf-huruf yang mirip. Pastikan i'rab (harakat akhir kata) benar sesuai kedudukannya dalam kalimat. Jangan mencampur dengan bahasa lain.
        - Jika **Bahasa Jawa Hanacaraka**: Gunakan **Aksara Jawa (Unicode)** dengan penulisan yang baku. WAJIB menggunakan **sandhangan (wulu, suku, pepet, taling, taling tarung, layar, wignyan, cecak, pangkon)** dan **pasangan** yang tepat sesuai kaidah penulisan Aksara Jawa yang benar (Paugeran Sriwedari). Pastikan tidak ada spasi di antara aksara dalam satu kata, dan gunakan spasi antar kata. Jangan hanya menggunakan aksara legena.
        - Jika **Bahasa Sunda**: Gunakan **Basa Sunda baku (lulugu)** yang baik dan benar sesuai dengan Undak-usuk Basa (Tatakrama Basa Sunda) yang tepat untuk konteks pendidikan/sekolah. Perhatikan penggunaan ejaan yang tepat (seperti é, e, dan eu).
    11. **Kualitas Indikator:** Gunakan indikator soal yang telah divalidasi ini sebagai panduan utama untuk memastikan kualitas soal yang dihasilkan.
    Pastikan setiap soal sesuai persis dengan indikator, nomor soal, dan bentuk soal yang ditentukan dalam kisi-kisi.
    PENTING: Buatlah soal dan jawaban dengan ringkas dan padat agar respons tidak terpotong.
    `;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: soalSchema,
        maxOutputTokens: 8192,
      },
    });

    const text = cleanJsonText(response.text || "{}");
    const raw = JSON.parse(text);
    return sanitizeSoalCollection(raw);
  }, 'serverGenerateSoal');
}

export async function serverAnalyzeSoal(kisiKisi: KisiKisiItem[], soal: Soal, userInput: UserInput): Promise<AnalisisSoal> {
  return executeWithModelFallback(async (modelName: string) => {
    const ai = getGeminiClient();
    const prompt = `
    Tolong analisis kualitas soal yang telah dihasilkan berdasarkan kurikulum dan kisi-kisi berikut.

    Konteks Kurikulum:
    - Mata Pelajaran: ${userInput.mataPelajaran}
    - Kelas/Fase: ${userInput.kelas}
    - Capaian Pembelajaran (CP): ${userInput.cp}
    - Tujuan Pembelajaran (TP): ${userInput.tp}
    - Materi: ${userInput.materi}
    - Tingkat Kesulitan Target: ${userInput.tingkatKesulitan}

    Data Kisi-kisi:
    ${JSON.stringify(kisiKisi)}

    Data Soal:
    ${JSON.stringify(soal)}

    Berikan analisis singkat dan objektif mengenai:
    1. Keterbacaan: Apakah bahasa, panjang kalimat, dan kosa kata sudah sesuai dengan usia/kelas siswa target? (Evaluasi khusus jika menggunakan bahasa daerah/asing).
    2. Tingkat Kognitif: Sejauh mana soal mencerminkan level LOTS (C1-C3) dan HOTS (C4-C6)? Apakah porsinya sesuai dengan tingkat kesulitan yang diminta?
    3. Kecocokan Kurikulum: Seberapa baik soal dan stimulus selaras dengan CP, TP, dan Materi?
    4. Kesimpulan: Penilaian umum (contoh: "Sangat Baik", "Baik", "Perlu Perbaikan") beserta 1-2 kalimat saran perbaikan jika ada.
    `;

    const analisisSchema = {
      type: Type.OBJECT,
      properties: {
        keterbacaan: { type: Type.STRING },
        tingkatKognitif: { type: Type.STRING },
        kecocokanKurikulum: { type: Type.STRING },
        kesimpulan: { type: Type.STRING },
      }
    };

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: analisisSchema,
        maxOutputTokens: 2048,
      },
    });

    const text = cleanJsonText(response.text || "{}");
    return JSON.parse(text) as AnalisisSoal;
  }, 'serverAnalyzeSoal');
}

export interface GenerateImageServerParams {
  prompt: string;
  model?: string;
  size?: '512px' | '1K' | '2K' | '4K';
  aspectRatio?: '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
  referenceImage?: {
    data: string;
    mimeType: string;
  };
}

export async function serverGenerateImage(params: GenerateImageServerParams): Promise<string> {
  return withRetry(async () => {
    const ai = getGeminiClient();

    // Map input model alias to active supported model
    let targetModel = 'gemini-3.1-flash-lite-image';
    if (params.model?.includes('pro') || params.model?.includes('banana-2.1')) {
      targetModel = 'gemini-3-pro-image';
    }

    const parts: any[] = [];
    if (params.referenceImage) {
      parts.push({
        inlineData: {
          data: params.referenceImage.data,
          mimeType: params.referenceImage.mimeType,
        }
      });
    }

    parts.push({ text: params.prompt });

    const response = await ai.models.generateContent({
      model: targetModel,
      contents: {
        parts: parts,
      },
      config: {
        imageConfig: {
          aspectRatio: params.aspectRatio || "1:1",
          imageSize: params.size,
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
      }
    }

    throw new Error("Tidak ada gambar yang dihasilkan dari model.");
  });
}
