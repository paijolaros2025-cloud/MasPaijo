import { UserInput, KisiKisiItem, ValidationResult, Soal, AnalisisSoal } from '../types';

async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMsg = `Server error (${response.status}): ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson && errJson.error) {
        let msg = errJson.error;
        try {
          const parsed = JSON.parse(msg);
          if (parsed?.error?.message) {
            msg = parsed.error.message;
          }
        } catch {
          // not JSON string
        }
        errorMsg = msg;
      }
    } catch {
      // response might not be json
    }
    throw new Error(errorMsg);
  }
  return response.json();
}

export async function generateKisiKisi(input: UserInput): Promise<KisiKisiItem[]> {
  const response = await fetch('/api/gemini/generate-kisi-kisi', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return handleApiResponse<KisiKisiItem[]>(response);
}

export async function validateIndicators(kisiKisi: KisiKisiItem[]): Promise<ValidationResult[]> {
  const response = await fetch('/api/gemini/validate-indicators', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kisiKisi }),
  });
  return handleApiResponse<ValidationResult[]>(response);
}

export async function fixAllInvalidIndicators(invalidItems: { item: KisiKisiItem; feedback: ValidationResult }[]): Promise<KisiKisiItem[]> {
  const response = await fetch('/api/gemini/fix-indicators', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ invalidItems }),
  });
  return handleApiResponse<KisiKisiItem[]>(response);
}

export async function generateSingleSoal(kisiItem: KisiKisiItem, bahasa: string, tingkatKesulitan: string): Promise<any> {
  const response = await fetch('/api/gemini/generate-single-soal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kisiItem, bahasa, tingkatKesulitan }),
  });
  return handleApiResponse<any>(response);
}

export async function generateSoal(kisiKisi: KisiKisiItem[], bahasa: string, tingkatKesulitan: string): Promise<Soal> {
  const response = await fetch('/api/gemini/generate-soal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kisiKisi, bahasa, tingkatKesulitan }),
  });
  return handleApiResponse<Soal>(response);
}

export async function analyzeSoal(kisiKisi: KisiKisiItem[], soal: Soal, userInput: UserInput): Promise<AnalisisSoal> {
  const response = await fetch('/api/gemini/analyze-soal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kisiKisi, soal, userInput }),
  });
  return handleApiResponse<AnalisisSoal>(response);
}
