
import * as XLSX from 'xlsx';
import saveAs from 'file-saver';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel, AlignmentType } from 'docx';
import { KisiKisiItem, Soal, UserInput, Bahasa } from '../types';
import { normalizeOptions, cleanStemText } from './questionUtils';

export function exportToXlsx(kisiKisi: KisiKisiItem[], fileName: string): void {
  const worksheetData = kisiKisi.map(item => ({
    'No': item.no,
    'Mata Pelajaran': item.mapel,
    'Kelas': item.kelas,
    'Capaian Pembelajaran': item.cp,
    'Tujuan Pembelajaran': item.tp,
    'Materi': item.materi,
    'Indikator Soal': item.indikator,
    'Level Kognitif': item.levelBloom,
    'Bentuk Soal': item.bentukSoal,
    'No Soal': item.noSoal,
  }));

  const worksheet = XLSX.utils.json_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Kisi-Kisi');
  
  // Auto-fit columns
  const cols = Object.keys(worksheetData[0] || {});
  const colWidths = cols.map(key => ({
    wch: Math.max(...worksheetData.map(row => row[key]?.toString().length || 10), key.length) + 2
  }));
  worksheet['!cols'] = colWidths;
  
  XLSX.writeFile(workbook, `${fileName.replace(/\s+/g, '_')}_kisi_kisi.xlsx`);
}

export function exportToDocx(soal: Soal, userInput: UserInput): void {
  const isArabic = userInput.bahasa === Bahasa.Arab;
  const isJavanese = userInput.bahasa === Bahasa.JawaHanacaraka;
  const isSunda = userInput.bahasa === Bahasa.Sunda;
  const alignment = isArabic ? AlignmentType.RIGHT : AlignmentType.LEFT;
  
  const fontSize = (isArabic || isJavanese) ? 32 : 24; // 16pt vs 12pt
  const fontName = isArabic ? "Amiri" : (isJavanese ? "Javanese Text" : "Inter");

  const labels = {
      pg: isArabic ? "أ. اَلِاخْتِيَارُ مِنْ مُتَعَدِّدٍ" : (isJavanese ? "꧇꧑꧇꧈ꦥꦶꦭꦶꦲꦤ꧀ꦒꦤ꧀ꦢ" : "I. Pilihan Ganda"),
      pgk: isArabic ? "ب. اَلِاخْتِيَارُ مِنْ مُتَعَدِّدٍ الْمُرَكَّبُ" : (isJavanese ? "꧇꧒꧇꧈ꦥꦶꦭꦶꦲꦤ꧀ꦒꦤ꧀ꦢꦏꦺꦴꦩ꧀ꦥ꧀ꦭꦺꦏ꧀ꦱ꧀" : "II. Pilihan Ganda Kompleks"),
      isian: isArabic ? "ج. اَلْإِجَابَةُ الْقَصِيرَةُ" : (isJavanese ? "꧇꧓꧇꧈ꦆꦱꦶꦪꦤ꧀ꦱꦶꦁꦏꦠ꧀" : (isSunda ? "III. Eusian Singget" : "III. Isian Singkat")),
      uraian: isArabic ? "د. اَلْأَسْئِلَةُ الْمَقَالِيَّةُ" : (isJavanese ? "꧇꧔꧇꧈ꦈꦫꦲꦶꦪꦤ꧀" : (isSunda ? "IV. Pedaran" : "IV. Uraian")),
      jawaban: isArabic ? "اَلْإِجَابَةُ:" : (isJavanese ? "ꦮꦔ꧀ꦱꦸꦭꦤ꧀꧇" : "Jawaban:")
  };

  const docChildren: any[] = [
      new Paragraph({
          text: `PENILAIAN AKHIR SEMESTER`,
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER
      }),
      new Paragraph({
          text: `Mata Pelajaran: ${userInput.mataPelajaran}`,
          heading: HeadingLevel.HEADING_2,
          alignment: AlignmentType.CENTER
      }),
      new Paragraph({
          text: `Kelas: ${userInput.kelas}`,
          heading: HeadingLevel.HEADING_2,
          alignment: AlignmentType.CENTER
      }),
      new Paragraph({ text: "" }), // Spacer
  ];

  if((soal.pg || []).length > 0) {
      docChildren.push(new Paragraph({ text: labels.pg, style: "headline", alignment: alignment }));
      (soal.pg || []).forEach(s => {
          const opts = normalizeOptions(s.options);
          docChildren.push(new Paragraph({
              children: [new TextRun({ text: `${s.noSoal}. ${cleanStemText(s.soal, opts.length > 0)}`, rightToLeft: isArabic, size: fontSize, font: fontName })],
              spacing: { after: 100 },
              alignment: alignment,
              bidirectional: isArabic
          }));
          opts.forEach(opt => {
              docChildren.push(new Paragraph({
                  children: [new TextRun({ text: `   ${opt.key}. ${opt.value}`, rightToLeft: isArabic, size: fontSize, font: fontName })],
                  alignment: alignment,
                  bidirectional: isArabic
              }));
          });
          docChildren.push(new Paragraph({ text: "" }));
      });
  }

  if((soal.pgKompleks || []).length > 0) {
      docChildren.push(new Paragraph({ text: labels.pgk, style: "headline", alignment: alignment }));
      (soal.pgKompleks || []).forEach(s => {
          const opts = normalizeOptions(s.options);
          docChildren.push(new Paragraph({
              children: [new TextRun({ text: `${s.noSoal}. ${cleanStemText(s.soal, opts.length > 0)}`, rightToLeft: isArabic, size: fontSize, font: fontName })],
              spacing: { after: 100 },
              alignment: alignment,
              bidirectional: isArabic
          }));
          if (s.petunjuk) {
              docChildren.push(new Paragraph({
                  children: [new TextRun({ text: `   (${s.petunjuk})`, italics: true, rightToLeft: isArabic, size: fontSize - 4, font: fontName })],
                  spacing: { after: 100 },
                  alignment: alignment,
                  bidirectional: isArabic
              }));
          }
          opts.forEach(opt => {
              docChildren.push(new Paragraph({
                  children: [new TextRun({ text: `   [  ] ${opt.key}. ${opt.value}`, rightToLeft: isArabic, size: fontSize, font: fontName })],
                  alignment: alignment,
                  bidirectional: isArabic
              }));
          });
          docChildren.push(new Paragraph({ text: "" }));
      });
  }
  
  if((soal.isian || []).length > 0) {
      docChildren.push(new Paragraph({ text: labels.isian, style: "headline", alignment: alignment }));
      (soal.isian || []).forEach(s => {
          docChildren.push(new Paragraph({
              children: [new TextRun({ text: `${s.noSoal}. ${cleanStemText(s.soal, false)}`, rightToLeft: isArabic, size: fontSize, font: fontName })],
              spacing: { after: 200 },
              alignment: alignment,
              bidirectional: isArabic
          }));
          docChildren.push(new Paragraph({ 
              text: isArabic ? `................................................. :${labels.jawaban}` : `\n   ${labels.jawaban} .................................................`,
              alignment: alignment,
              bidirectional: isArabic
          }));
          docChildren.push(new Paragraph({ text: "" }));
      });
  }

  if((soal.uraian || []).length > 0) {
      docChildren.push(new Paragraph({ text: labels.uraian, style: "headline", alignment: alignment }));
      (soal.uraian || []).forEach(s => {
          docChildren.push(new Paragraph({
              children: [new TextRun({ text: `${s.noSoal}. ${cleanStemText(s.soal, false)}`, rightToLeft: isArabic, size: fontSize, font: fontName })],
              spacing: { after: 200 },
              alignment: alignment,
              bidirectional: isArabic
          }));
          docChildren.push(new Paragraph({ 
              text: isArabic ? `\n\n\n\n :${labels.jawaban}` : `\n   ${labels.jawaban} \n\n\n\n`,
              alignment: alignment,
              bidirectional: isArabic
          }));
      });
  }

  const doc = new Document({
    styles: {
        paragraphStyles: [
            {
                id: "headline",
                name: "Headline",
                basedOn: "Normal",
                next: "Normal",
                run: {
                    bold: true,
                    size: 28, // 14pt
                },
                paragraph: {
                    spacing: { before: 240, after: 120 },
                }
            },
        ],
    },
    sections: [{
      properties: {},
      children: docChildren,
    }],
  });

  Packer.toBlob(doc).then(blob => {
    saveAs(blob, `${userInput.mataPelajaran.replace(/\s+/g, '_')}_soal.docx`);
  });
}
