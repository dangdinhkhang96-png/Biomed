import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import type { Device } from './inventory';
import { QR_FONT } from './qr-font';

export function qrPayload(id: string, base = '', publicToken?: string) {
  if (publicToken) {
    const fallback = typeof window === 'undefined' ? '' : `${window.location.origin}/`;
    const url = new URL(base.trim() || fallback);
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Địa chỉ ứng dụng phải là HTTPS, không chứa thông tin đăng nhập.');
    url.pathname = '/'; url.search = '';
    url.hash = new URLSearchParams({ qr: publicToken, device: id }).toString();
    if (url.href.length > 220) throw new Error('Địa chỉ quá dài để in tem QR rõ nét. Hãy dùng tên miền ngắn hơn.');
    return url.href;
  }
  if (!base.trim()) return `tbyt:74001:${encodeURIComponent(id)}`;
  const url = new URL(base.trim());
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Địa chỉ ứng dụng phải là HTTPS, không chứa thông tin đăng nhập.');
  url.hash = new URLSearchParams({ device: id }).toString();
  if (url.href.length > 220) throw new Error("Địa chỉ quá dài để in tem QR rõ nét. Hãy dùng đường dẫn ngắn hơn.");
  return url.href;
}
export function readDeviceQr(text: string): string | null {
  try {
    const value = text.trim();
    if (value.startsWith('tbyt:74001:')) return decodeURIComponent(value.slice(11)) || null;
    const u = new URL(value);
    if (!['https:', 'http:', 'file:'].includes(u.protocol)) return null;
    return new URLSearchParams(u.hash.slice(1)).get('device');
  } catch { return null; }
}
export function qrSvg(payload: string) {
  const qr = QRCode.create(payload, { errorCorrectionLevel: 'M' });
  const n = qr.modules.size;
  let path = '';
  for (let y=0;y<n;y++) for(let x=0;x<n;x++) if(qr.modules.get(y,x)) path += `M${x+4},${y+4}h1v1h-1z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n+8} ${n+8}" width="320" height="320"><rect width="100%" height="100%" fill="white"/><path d="${path}" fill="black"/></svg>`;
}
export function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob); const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 10000);
}
// Matches the supplied inventory label: 93 × 45.5 mm, two columns × six rows on A4.
export function labelPdf(devices: Device[], base = '', publicTokens: Record<string, string> = {}) {
  if (!devices.length) throw new Error('Chọn ít nhất một thiết bị.');
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  pdf.addFileToVFS('Vietnamese.ttf', QR_FONT); pdf.addFont('Vietnamese.ttf','Vietnamese','normal'); pdf.setFont('Vietnamese');
  const labelW=93, labelH=45.5, marginX=10, marginY=8, gapX=4, gapY=1.5;
  const year=String(new Date().getFullYear());
  const fitted=(value:string,maxWidth:number,size:number,minSize=5.3)=>{
    let text=value.replace(/\s+/g,' ').trim()||'—', fontSize=size;
    pdf.setFontSize(fontSize);
    while(pdf.getTextWidth(text)>maxWidth&&fontSize>minSize){fontSize=Math.max(minSize,fontSize-.25);pdf.setFontSize(fontSize);}
    while(pdf.getTextWidth(text)>maxWidth&&text.length>1) text=text.slice(0,-2).trimEnd()+'…';
    return {text,fontSize};
  };
  const drawFit=(value:string,x:number,y:number,maxWidth:number,size:number)=>{
    const result=fitted(value,maxWidth,size);pdf.setFontSize(result.fontSize);pdf.text(result.text,x,y);return result;
  };
  devices.forEach((d,i)=>{
    if(i && i%12===0) pdf.addPage();
    const within=i%12, x=marginX+(within%2)*(labelW+gapX), y=marginY+Math.floor(within/2)*(labelH+gapY);
    pdf.setDrawColor(0); pdf.setLineWidth(.2); pdf.rect(x,y,labelW,labelH);
    pdf.setTextColor(0);pdf.setFont('Vietnamese','normal');
    const hospital=fitted('BỆNH VIỆN ĐA KHOA BÌNH DƯƠNG',labelW-25,8.5,7);
    pdf.setFontSize(hospital.fontSize);pdf.text(hospital.text,x+labelW/2,y+4.1,{align:'center',renderingMode:'fillThenStroke'});
    const title=fitted('TEM KIỂM KÊ TÀI SẢN',labelW-24,9.2,7.2);
    pdf.setFontSize(title.fontSize);pdf.text(title.text,x+labelW/2,y+9.5,{align:'center'});

    const qrBox=17.5, qrX=x+labelW-20, qrY=y+6.3, qrSize=qrBox;
    pdf.setLineWidth(.2);pdf.rect(qrX,qrY,qrBox,qrBox);
    const token=publicTokens[d.id];
    if (!token) throw new Error(`Chưa tạo liên kết công khai cho thiết bị ${d.id}. Hãy thử lại.`);
    const qr=QRCode.create(qrPayload(d.id,base,token),{errorCorrectionLevel:'M'}), n=qr.modules.size, unit=qrSize/(n+8);
    const qrInset=(qrBox-qrSize)/2;pdf.setFillColor(0,0,0);
    for(let r=0;r<n;r++) for(let c=0;c<n;c++) if(qr.modules.get(r,c)) pdf.rect(qrX+qrInset+(c+4)*unit,qrY+qrInset+(r+4)*unit,unit+.005,unit+.005,'F');

    pdf.setFont('Vietnamese','normal');pdf.setTextColor(0);
    const left=x+2.2, right=qrX-2.5;
    drawFit('TÊN TÀI SẢN:',left,y+15.6,20,6.8);
    drawFit(String(d.name||'—'),x+23,y+15.6,right-(x+23),7);
    drawFit('MÃ TÀI SẢN:',left,y+21.6,20,6.8);
    drawFit(String(d.id||'—'),x+23,y+21.6,right-(x+23),7);
    drawFit('KHOA PHÒNG SỬ DỤNG/ QUẢN LÝ:',left,y+27.7,39.2,6.2);
    drawFit(String(d.dept||'—'),x+42.5,y+27.7,right-(x+42.5),6.8);
    drawFit('Năm kiểm kê:',left,y+33.4,21,6.8);
    drawFit(year,x+23,y+33.4,right-(x+23),6.8);
    const note=fitted('(Không bóc, tẩy xóa hoặc làm rách tem)',labelW-8,6.8,6);
    pdf.setFontSize(note.fontSize);pdf.text(note.text,x+labelW/2,y+41.4,{align:'center'});
  });
  return pdf;
}
