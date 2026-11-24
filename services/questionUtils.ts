/**
 * Utility functions for robust formatting, sanitizing, and normalizing
 * exam question stems, options, and answer keys across all renderers.
 */

export interface NormalizedOption {
  key: string;
  value: string;
}

/**
 * Normalizes a single option which might be a string ("A. Opsi", "Opsi"),
 * or an object ({ key: "A", value: "Opsi" }, { huruf: "A", teks: "Opsi" }, etc.)
 */
export function normalizeOption(opt: any, index: number): NormalizedOption {
  const fallbackKey = String.fromCharCode(65 + index); // A, B, C, D...

  if (typeof opt === 'string') {
    const trimmed = opt.trim();
    // Check if the string begins with letter/digit prefix like "A. ...", "A) ...", "a: ..."
    const match = trimmed.match(/^([A-Da-d0-9])[\.\:\)\-]\s*(.+)$/);
    if (match) {
      return {
        key: match[1].toUpperCase(),
        value: match[2].trim(),
      };
    }
    return {
      key: fallbackKey,
      value: trimmed,
    };
  }

  if (opt && typeof opt === 'object') {
    let rawKey = opt.key ?? opt.kunci ?? opt.huruf ?? fallbackKey;
    if (typeof rawKey === 'string') {
      rawKey = rawKey.replace(/[\.\:\)\-\s]/g, '').toUpperCase() || fallbackKey;
    }
    const rawVal = opt.value ?? opt.teks ?? opt.text ?? opt.jawaban ?? '';
    return {
      key: String(rawKey),
      value: typeof rawVal === 'string' ? rawVal.trim() : String(rawVal ?? ''),
    };
  }

  return {
    key: fallbackKey,
    value: String(opt ?? ''),
  };
}

/**
 * Safely normalizes options into a clean Array of { key: string, value: string }
 */
export function normalizeOptions(options: any): NormalizedOption[] {
  if (!options) return [];

  if (Array.isArray(options)) {
    return options.map((opt, i) => normalizeOption(opt, i));
  }

  if (typeof options === 'object') {
    return Object.entries(options).map(([k, v], i) => {
      const cleanKey = k.replace(/[\.\:\)\-\s]/g, '').toUpperCase() || String.fromCharCode(65 + i);
      return {
        key: cleanKey,
        value: typeof v === 'string' ? v.trim() : String(v ?? ''),
      };
    });
  }

  return [];
}

/**
 * Safely formats answer key (kunci jawaban) whether it is a string ("A"),
 * array (["A", "C"]), or comma-separated string ("A, C").
 */
export function formatKunciJawaban(kunci: any): string {
  if (Array.isArray(kunci)) {
    return kunci.map(k => String(k).trim()).filter(Boolean).join(', ');
  }
  if (typeof kunci === 'string') {
    return kunci.trim();
  }
  if (kunci == null) return '-';
  return String(kunci);
}

/**
 * Checks if a specific option key matches the answer key (handles string or array).
 */
export function isCorrectOption(optKey: string, kunciJawaban: any): boolean {
  if (!optKey) return false;
  const cleanKey = optKey.trim().toUpperCase();

  if (Array.isArray(kunciJawaban)) {
    return kunciJawaban.some(k => String(k).trim().toUpperCase() === cleanKey);
  }

  if (typeof kunciJawaban === 'string') {
    // Could be "A" or "A, C" or "A,C"
    const splitKeys = kunciJawaban.split(/[,;\s]+/).map(k => k.trim().toUpperCase());
    return splitKeys.includes(cleanKey);
  }

  return false;
}

/**
 * Cleans the question stem:
 * 1. Safely unwraps objects to text if the AI returned { soal: "..." }
 * 2. Strips duplicate trailing options like "\nA. ...\nB. ...\nC. ...\nD. ..."
 *    when options array already exists.
 * 3. Strips internal drafting commentary or notes.
 */
export function cleanStemText(rawSoal: any, hasOptions = false): string {
  if (typeof rawSoal !== 'string') {
    if (rawSoal && typeof rawSoal === 'object') {
      return rawSoal.soal || rawSoal.stem || rawSoal.pertanyaan || JSON.stringify(rawSoal);
    }
    return String(rawSoal ?? '');
  }

  let text = rawSoal.trim();

  // If question has structured options, check if the stem accidentally duplicated the options at the end
  if (hasOptions) {
    const duplicateOptionsPattern = /\n\s*(?:[A-Da-d][\.\:\)]|\([A-Da-d]\))\s+[\s\S]*?(?:\n\s*(?:[B-Db-d][\.\:\)]|\([B-Db-d]\))\s+[\s\S]*?)+$/;
    if (duplicateOptionsPattern.test(text)) {
      text = text.replace(duplicateOptionsPattern, '').trim();
    }
  }

  return text;
}

export interface ABCDIndicatorCheck {
  hasAudience: boolean;
  hasBehavior: boolean;
  hasCondition: boolean;
  hasDegree: boolean;
  isStrictlyComplete: boolean;
  detectedParts: {
    audience?: string;
    behavior?: string;
    condition?: string;
    degree?: string;
  };
  missingLabels: string[];
}

/**
 * Analyzes an indicator string to verify whether it adheres strictly to the
 * ABCD (Audience, Behavior, Condition, Degree) pedagogical rule.
 */
export function analyzeABCDIndicator(indikatorText: string): ABCDIndicatorCheck {
  if (!indikatorText || typeof indikatorText !== 'string') {
    return {
      hasAudience: false,
      hasBehavior: false,
      hasCondition: false,
      hasDegree: false,
      isStrictlyComplete: false,
      detectedParts: {},
      missingLabels: ['Audience (Peserta Didik)', 'Behavior (KKO & Materi)', 'Condition (Stimulus/Kondisi)', 'Degree (Tingkat Ketepatan)'],
    };
  }

  const raw = indikatorText.trim();
  const lower = raw.toLowerCase();

  // 1. Condition (C) Check: Presence of stimulus/condition prepositions
  const conditionPatterns = [
    /\b(disajikan|diberikan|berdasarkan|melalui|setelah|dengan\s+(?:mengamati|melihat|membaca)|ditampilkan|dari\s+(?:kutipan|teks|gambar|tabel|grafik|ilustrasi)|pada\s+sebuah|jika\s+diberikan)\b/i,
    // Arabic stimulus markers
    /(بِنَاءً\s+عَلَى|مِنْ\s+خِلَالِ|إِذَا\s+عُرِضَ|بَعْدَ\s+قِرَاءَةِ|مِنْ\s+نَصِّ|عِنْدَمَا|إِذَا\s+قُدِّمَ)/,
    // Sunda / Jawa markers
    /\b(dumasar|sabada|tina\s+teks|tina\s+gambar|kaseratna|adhedhasar|sawise|katiti)\b/i,
  ];
  const hasCondition = conditionPatterns.some(p => p.test(raw));

  // 2. Audience (A) Check: Subject learner
  const audiencePatterns = [
    /\b(peserta\s+didik|siswa|murid|pelajar)\b/i,
    // Arabic learner markers
    /(التِّلْمِيذُ|الطَّالِبُ|المُتَعَلِّمُ|التَّلَامِيذُ|الطُّلَّابُ|تِلْمِيذٌ|طَالِبٌ)/,
    // Sunda / Jawa markers
    /\b(para\s+siswa|para\s+murid)\b/i,
  ];
  const hasAudience = audiencePatterns.some(p => p.test(raw));

  // 3. Behavior (B) Check: Operational Action Verb (KKO Bloom) + capability
  const behaviorPatterns = [
    /\b(dapat|mampu)\s+[a-z]{3,}\b/i,
    /\b(menentukan|mengidentifikasi|menganalisis|menjelaskan|menghitung|membedakan|menyimpulkan|mengevaluasi|mengklasifikasi|menyebutkan|menunjukkan|merinci|membandingkan|memilih|menuliskan|membuat|menguraikan|menelaah|menyusun|menafsirkan|membuktikan)\b/i,
    // Arabic KKO markers
    /(يَسْتَطِيعُ|يَقْدِرُ|يُحَدِّدَ|يُمَيِّزَ|يَشْرَحَ|يَسْتَنْتِجَ|يَحْسِبَ|يَذْكُرَ|يُعَرِّفَ|يُصَنِّفَ|يُقَارِنَ)/,
    // Sunda / Jawa markers
    /\b(tiasa|bisa|sagad|nemtokake|nuduhake|njlentrehake|ngidentifikasi|ngitung)\b/i,
  ];
  const hasBehavior = behaviorPatterns.some(p => p.test(raw));

  // 4. Degree (D) Check: Degree of precision, accuracy, standard of success
  const degreePatterns = [
    /\b(dengan\s+(?:tepat|benar|tepat\s+dan\s+benar|akurat|runtut|sistematis|teliti|lengkap|jelas|kritis|baik|sempurna))\b/i,
    /\b(secara\s+(?:tepat|benar|runtut|sistematis|lengkap|mandiri|kritis))\b/i,
    /\b(minimal\s+\d+|paling\s+sedikit\s+\d+|dengan\s+batasan)\b/i,
    // Arabic degree markers
    /(بِدِقَّةٍ|بِشَكْلٍ\s+صَحِيحٍ|صَحِيحًا|بِإِتْقَانٍ|بِوُضُوحٍ)/,
    // Sunda / Jawa markers
    /\b(kalayan\s+(?:leres|merenah|bener)|kanthi\s+(?:bener|trep|pratitis))\b/i,
  ];
  const hasDegree = degreePatterns.some(p => p.test(raw));

  const missingLabels: string[] = [];
  if (!hasCondition) missingLabels.push('Condition (C: Stimulus/Kondisi Awal)');
  if (!hasAudience) missingLabels.push('Audience (A: Peserta Didik)');
  if (!hasBehavior) missingLabels.push('Behavior (B: KKO Bloom & Kemampuan)');
  if (!hasDegree) missingLabels.push('Degree (D: Tingkat Ketepatan/Kriteria)');

  // Try extracting parts if present for detailed display
  let conditionText = '';
  let audienceText = '';
  let behaviorText = '';
  let degreeText = '';

  // Extract condition: usually up to the comma before audience
  const condMatch = raw.match(/^([^,]+(?:,|;)?)\s*(?:peserta didik|siswa|murid|التِّلْمِيذُ|الطَّالِبُ|para siswa)/i);
  if (condMatch) {
    conditionText = condMatch[1].replace(/[,;]+$/, '').trim();
  }

  const audMatch = raw.match(/\b(peserta\s+didik|siswa|murid|التِّلْمِيذُ|الطَّالِبُ|para\s+siswa)\b/i);
  if (audMatch) {
    audienceText = audMatch[0];
  }

  const degMatch = raw.match(/(?:dengan|secara|kalayan|kanthi|بِدِقَّةٍ|بِشَكْلٍ\s+صَحِيحٍ)[\s\S]*$/i);
  if (degMatch) {
    degreeText = degMatch[0].trim();
  }

  return {
    hasAudience,
    hasBehavior,
    hasCondition,
    hasDegree,
    isStrictlyComplete: hasAudience && hasBehavior && hasCondition && hasDegree,
    detectedParts: {
      condition: conditionText || (hasCondition ? 'Terdeteksi' : undefined),
      audience: audienceText || (hasAudience ? 'Peserta Didik' : undefined),
      behavior: behaviorText || (hasBehavior ? 'Terdeteksi' : undefined),
      degree: degreeText || (hasDegree ? 'Terdeteksi' : undefined),
    },
    missingLabels,
  };
}
