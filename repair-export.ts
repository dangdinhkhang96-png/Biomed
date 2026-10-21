import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { REPAIR_TEMPLATE } from './repair-template';
import { dmy, type Device, type Repair } from './inventory';

export type RepairRequest = Repair & { keeper?: string; reporter?: string };
const escapeXml = (s: string) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

// Edit the supplied Word template in place, preserving tables, sections and signatures.
export function repairDocument(d: Device, rep: RepairRequest, previousRepairs: number): Uint8Array {
  const files = unzipSync(Uint8Array.from(atob(REPAIR_TEMPLATE), c => c.charCodeAt(0)));
  let issueNext = false;
  files['word/document.xml'] = strToU8(strFromU8(files['word/document.xml']).replace(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g, paragraph => {
    const text = [...paragraph.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map(m => m[1]).join('');
    if (text.startsWith('3.Kiểm tra của Công ty')) {
      paragraph = paragraph.includes('<w:pPr>')
        ? paragraph.replace('<w:pPr>', '<w:pPr><w:keepNext/>')
        : paragraph.replace(/(<w:p(?:\s[^>]*)?>)/, '$1<w:pPr><w:keepNext/></w:pPr>');
    }
    let replacement: string | undefined;
    if (text.startsWith('Tên thiết bị:')) replacement = `Tên thiết bị: ${d.name}     Mã QLTB: ${d.id}`;
    else if (text.startsWith('Số Seri:')) replacement = `Số Seri: ${d.serial || '—'}     Model: ${d.model || '—'}`;
    else if (text.startsWith('Hãng sản xuất:')) replacement = `Hãng sản xuất: ${d.brand || '—'}`;
    else if (text.startsWith('Khoa sử dụng:')) replacement = `Khoa sử dụng: ${d.dept || '—'}     Năm sử dụng: ${rep.useYear || '........'}     Số lần đã sửa: ${previousRepairs}`;
    else if (text.startsWith('Người bảo quản thiết bị:')) replacement = `Người bảo quản thiết bị: ${rep.keeper?.trim() || '................................................................'}`;
    else if (text.startsWith('Người sử dụng (khi phát hiện sự cố):')) replacement = `Người sử dụng (khi phát hiện sự cố): ${rep.reporter?.trim() || '................................................'}`;
    else if (text.startsWith('1 Khoa sử dụng:')) { replacement = `1. Khoa sử dụng: Mô tả sự cố của thiết bị:     Ngày ${dmy(rep.d)}`; issueNext = true; }
    else if (issueNext && !text.trim()) { replacement = rep.issue; issueNext = false; }
    // Approval and inspection dates remain blank, with the request's year.
    else if (text.includes('/2026')) replacement = text.replaceAll('/2026', `/${rep.d.slice(0,4)}`);
    if (replacement === undefined) return paragraph;
    let first = true;
    if (!/<w:t(?:\s[^>]*)?>/.test(paragraph)) return paragraph.replace('</w:p>', `<w:r><w:t xml:space="preserve">${escapeXml(replacement)}</w:t></w:r></w:p>`);
    return paragraph.replace(/<w:t(?:\s[^>]*)?>[\s\S]*?<\/w:t>/g, () => {
      const value = first ? escapeXml(replacement!) : ''; first = false;
      return `<w:t xml:space="preserve">${value}</w:t>`;
    });
  }));
  return zipSync(files);
}

export function downloadRepair(d: Device, rep: RepairRequest, previousRepairs: number) {
  const data = repairDocument(d, rep, previousRepairs);
  const url = URL.createObjectURL(new Blob([new Uint8Array(data)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }));
  const a = document.createElement('a'); a.href = url;
  a.download = `Phieu-sua-chua-${d.id.replace(/[^\p{L}\p{N}_-]/gu, '_')}-${rep.d}.docx`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
