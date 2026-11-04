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

const TEXT_MODEL = 'gemini-3.8-flash';

const withRetry = async <T>(
  apiCall: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 2000
): Promise<T> => {
  let attempt = 0;
  let delay = initialDelay;

  while (true) {
    try {
      return await apiCall();
    } catch (e) {
      attempt++;
      const errorMessage = e instanceof Error ? e.message : String(e);
      const isRateLimitError = errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED');
      const isJsonError = e instanceof SyntaxError || errorMessage.includes('JSON');

      if ((isRateLimitError || isJsonError) && attempt < maxRetries) {
        console.warn(`[Gemini Server] Error encountered: ${errorMessage}. Retrying in ${delay / 1000}s... (Attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      } else {
        if (isRateLimitError) {
          console.error("[Gemini Server] Max retries reached for rate limit error.");
          throw new Error("Server sedang sibuk (batas penggunaan tercapai). Silakan coba lagi dalam beberapa menit.");
        }
        if (isJsonError) {
          console.error("[Gemini Server] Max retries reached for JSON parse error.");
          throw new Error("Respons dari AI terpotong atau tidak valid. Coba kurangi jumlah soal atau coba lagi.");
        }
        if (errorMessage.includes('API key not valid') || errorMessage.includes('API_KEY_INVALID')) {
          throw new Error("Kunci API tidak valid. Mohon periksa kembali di Settings > Secrets.");
        }
        console.error(`[Gemini Server] API call failed after ${attempt} attempts:`, e);
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
  return withRetry(async () => {
    const ai = getGeminiClient();
    const prompt = `
    Anda adalah ahli penyusun kisi-kisi soal ujian. Berdasarkan informasi berikut:
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
    1. Indikator Soal yang spesifik, terukur, dan sesuai dengan materi, TP, dan CP. Indikator harus mendukung pembuatan soal bergaya Asesmen Kompetensi Minimum (AKM) atau Tes Kompetensi Akademik (TKA) Nasional yang menguji penalaran, literasi, dan numerasi.
    2. Level Kognitif (Bloom) yang sesuai. Sesuaikan proporsi level kognitif dengan tingkat kesulitan yang diminta (${input.tingkatKesulitan}). Jika Mudah, perbanyak C1-C2; jika Sedang, dominan C3-C4; jika Sulit, perbanyak C4-C6 (HOTS).
    3. Bentuk Soal (Pilihan Ganda, Pilihan Ganda Kompleks, Isian Singkat, Uraian).
    4. Nomor Soal yang berurutan.
    Pastikan jumlah soal untuk setiap bentuk sesuai dengan permintaan.
    PENTING: Seluruh teks keluaran WAJIB menggunakan ${input.bahasa}.
    - Jika **Bahasa Arab**: Gunakan tata bahasa Arab yang fushha (formal) dengan kaidah Nahwu dan Shorof yang tepat. WAJIB menyertakan **harakat/tashkeel (syakal) yang lengkap, benar, dan konsisten** pada setiap huruf dan kata (fathah, kasrah, dammah, sukun, tanwin, shaddah, fathatain, kasratain, dammatain). Perhatikan penulisan hamzah (qatha' dan washal), alif lam (syamsiyah dan qamariyah), ta' marbuthah, dan huruf-huruf yang mirip. Pastikan i'rab (harakat akhir kata) benar sesuai kedudukannya dalam kalimat. Jangan mencampur dengan bahasa lain.
    - Jika **Bahasa Jawa Hanacaraka**: Gunakan **Aksara Jawa (Unicode)** dengan penulisan yang baku. WAJIB menggunakan **sandhangan (wulu, suku, pepet, taling, taling tarung, layar, wignyan, cecak, pangkon)** dan **pasangan** yang tepat sesuai kaidah penulisan Aksara Jawa yang benar (Paugeran Sriwedari). Pastikan tidak ada spasi di antara aksara dalam satu kata, dan gunakan spasi antar kata. Jangan hanya menggunakan aksara legena.
    - Jika **Bahasa Sunda**: Gunakan **Basa Sunda baku (lulugu)** yang baik dan benar sesuai dengan Undak-usuk Basa (Tatakrama Basa Sunda) yang tepat untuk konteks pendidikan/sekolah.
    `;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: kisiKisiSchema,
      },
    });

    const text = response.text || "[]";
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
      indikator: item.indikator,
      levelBloom: item.levelBloom,
      bentukSoal: item.bentukSoal,
      noSoal: item.noSoal
    }));
  });
}

const validationSchema = {
  type: Type.OBJECT,
  properties: {
    isValid: { type: Type.BOOLEAN },
    reasons: { type: Type.ARRAY, items: { type: Type.STRING } }
  },
  required: ['isValid', 'reasons']
};

export async function serverValidateIndicators(kisiKisi: KisiKisiItem[]): Promise<ValidationResult[]> {
  return withRetry(async () => {
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
    Validasi SETIAP Indikator Soal dalam daftar berikut berdasarkan 7 kriteria:
    1. Sesuai dengan Capaian Pembelajaran (CP)?
    2. Sesuai dengan Tujuan Pembelajaran (TP)?
    3. Menggunakan konsep ABCD (Audience, Behavior, Condition, Degree)?
    4. Menggunakan Kata Kerja Operasional (KKO) yang sesuai Level Bloom?
    5. Indikator dapat diukur dengan jelas?
    6. Selaras dengan materi yang diajarkan?
    7. Layak untuk dijadikan soal ujian?
    Daftar Indikator dan Konteksnya:
    ${JSON.stringify(indicatorsToValidate, null, 2)}
    Berikan hasil validasi dalam format JSON ARRAY. Setiap objek dalam array harus sesuai dengan skema yang diberikan dan MEREPRESENTASIKAN SATU INDIKATOR. Urutan dalam array hasil HARUS SAMA dengan urutan dalam daftar input. Jika sebuah indikator tidak valid, sebutkan semua alasan mengapa.
    `;

    const validationSchemaArray = {
      type: Type.ARRAY,
      items: validationSchema
    };

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: validationSchemaArray,
      },
    });

    const text = response.text || "[]";
    const results = JSON.parse(text) as ValidationResult[];
    if (results.length !== kisiKisi.length) {
      throw new Error("Jumlah hasil validasi tidak cocok dengan jumlah input indikator.");
    }
    return results;
  });
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
  return withRetry(async () => {
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
    Daftar indikator soal berikut dinyatakan tidak valid.
    ${JSON.stringify(itemsToFix, null, 2)}
    Tolong perbaiki SETIAP indikator tersebut agar menjadi valid, spesifik, terukur, dan sesuai dengan semua konteks (CP, TP, Materi, Level Bloom) yang diberikan.
    Kembalikan hasilnya dalam format JSON ARRAY. Setiap objek dalam array harus berisi 'noSoal' asli dan 'revisedIndicator' yang sudah diperbaiki.
    `;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: fixAllIndicatorsSchema,
      },
    });

    const text = response.text || "[]";
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
  });
}

export async function serverGenerateSingleSoal(kisiItem: KisiKisiItem, bahasa: string, tingkatKesulitan: string): Promise<any> {
  return withRetry(async () => {
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
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: singleSoalSchema,
        maxOutputTokens: 2048,
      },
    });

    const text = response.text || "{}";
    return JSON.parse(text);
  });
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
  return withRetry(async () => {
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
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: soalSchema,
        maxOutputTokens: 8192,
      },
    });

    const text = response.text || "{}";
    return JSON.parse(text) as Soal;
  });
}

export async function serverAnalyzeSoal(kisiKisi: KisiKisiItem[], soal: Soal, userInput: UserInput): Promise<AnalisisSoal> {
  return withRetry(async () => {
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
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: analisisSchema,
        maxOutputTokens: 2048,
      },
    });

    const text = response.text || "{}";
    return JSON.parse(text) as AnalisisSoal;
  });
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
