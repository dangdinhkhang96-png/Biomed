import { useEffect, useMemo, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { type Device } from '@/lib/inventory';
import { labelPdf, qrPayload, qrSvg, readDeviceQr, saveBlob } from '@/lib/device-qr';
import { teamApi } from '@/lib/team/client';
import { useDevices } from './access-shell';
const button = 'rounded-lg border border-line bg-surface px-3 py-2 text-sm';

export function DeviceQr({ devices, current, onOpen }: { devices: Device[]; current: Device | null; onOpen: (id:string)=>void }) {
  const DEVICES = useDevices();
  const [base,setBase]=useState('');
  const [chosen,setChosen]=useState<Set<string>>(new Set());
  const [message,setMessage]=useState(''); const [busy,setBusy]=useState(false);
  const [tokens,setTokens]=useState<Record<string,string>>({});
  const [scan,setScan]=useState(false); const [view,setView]=useState(60);
  useEffect(()=>{try{setBase(localStorage.getItem('tbyt-qr-base')||window.location.origin+'/');}catch{setBase(window.location.origin+'/');}},[]);
  const validBase = useMemo(()=>{try {qrPayload('test',base);return true;}catch{return false;}},[base]);
  const target = current || devices[0];
  useEffect(()=>{
    if(!target)return;
    let active=true;
    teamApi<{tokens:Record<string,string>}>('qr-links',{deviceIds:[target.id]})
      .then(result=>{if(active)setTokens(previous=>({...previous,...result.tokens}));})
      .catch(error=>{if(active)setMessage(error instanceof Error?error.message:'Không tạo được liên kết QR công khai.');});
    return()=>{active=false;};
  },[target?.id]);
  const payload = target && validBase && tokens[target.id] ? qrPayload(target.id,base,tokens[target.id]) : '';
  const visibleIds = new Set(devices.map(d=>d.id));
  const selected=DEVICES.filter(d=>chosen.has(d.id));
  const allFiltered=devices.length>0 && devices.every(d=>chosen.has(d.id));
  async function exportPdf(list: Device[]) {
    setBusy(true);setMessage('Đang tạo PDF…');
    // Yield before doing CPU work so progress and disabled buttons render.
    await new Promise(resolve=>setTimeout(resolve,30));
    try {
      setMessage('Đang chuẩn bị liên kết QR công khai…');
      const chunks=Array.from({length:Math.ceil(list.length/100)},(_,index)=>list.slice(index*100,(index+1)*100));
      const results=await Promise.all(chunks.map(chunk=>teamApi<{tokens:Record<string,string>}>('qr-links',{deviceIds:chunk.map(device=>device.id)})));
      const allTokens=Object.assign({},...results.map(result=>result.tokens));
      setTokens(previous=>({...previous,...allTokens}));
      setMessage('Đang tạo PDF…');
      labelPdf(list,base,allTokens).save(`Tem-QR-${list.length}-thiet-bi.pdf`);
      setMessage(`Đã xuất ${list.length} tem QR công khai. Quét mã sẽ mở đúng thiết bị, không cần đăng nhập.`);
    }
    catch(e){setMessage(e instanceof Error?e.message:'Không tạo được PDF.');}finally{setBusy(false);}
  }
  function openCode(value:string) {
    const id=readDeviceQr(value) || value.trim();
    if(!DEVICES.some(d=>d.id===id)) return false;
    setScan(false);onOpen(id);return true;
  }
  return <div className="grid gap-4">
    <section className="rounded-xl border border-line bg-surface p-4">
      <h2 className="text-xl font-semibold">QR thiết bị</h2>
      <p className="mt-2 text-sm text-muted">Tạo tem 60 × 40 mm, 18 tem/trang A4. Quét trong ứng dụng để mở hồ sơ đúng máy.</p>
      <button type="button" className="mt-3 rounded-lg bg-teal px-4 py-2 text-surface" onClick={()=>setScan(true)}>Mở camera quét QR</button>
      <label className="mt-4 block text-sm">Địa chỉ HTTPS của ứng dụng đã triển khai (tùy chọn)
        <input type="url" maxLength={200} value={base} placeholder="https://thietbi.benhvien.vn/" onChange={e=>setBase(e.target.value)} onBlur={()=>{if(validBase)try{localStorage.setItem('tbyt-qr-base',base);}catch{}}} className="mt-1 w-full rounded-lg border border-line p-2" />
      </label>
      <p className="mt-1 text-xs text-muted">QR mở trang thông tin công khai của đúng thiết bị; người quét không cần đăng nhập và không xem được danh sách máy. Địa chỉ trống sẽ dùng website hiện tại.</p>
      {!validBase && <p role="alert" className="mt-2 text-sm text-bad">Nhập địa chỉ HTTPS hợp lệ hoặc để trống.</p>}
    </section>
    {target && payload && <section className="flex flex-wrap items-center gap-4 rounded-xl border border-line bg-surface p-4">
      <img className="size-40" alt={`QR thiết bị ${target.id}`} src={'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(qrSvg(payload))} />
      <div className="min-w-0 flex-1"><h3 className="font-semibold">{target.name}</h3><p className="text-sm">{target.id} · {target.dept}</p>
        <p className="mt-1 break-all text-xs text-muted">{payload}</p>
        <div className="mt-3 flex flex-wrap gap-2"><button type="button" className={button} onClick={()=>saveBlob(new Blob([qrSvg(payload)],{type:'image/svg+xml'}),`QR-${target.id.replace(/[^\p{L}\p{N}_-]/gu,'_')}.svg`)}>Tải QR SVG</button>
        <button type="button" className={button} disabled={busy} onClick={()=>exportPdf([target])}>Xuất tem máy này</button>
        <button type="button" className={button} onClick={()=>onOpen(target.id)}>Thông tin máy</button></div>
      </div>
    </section>}
    {target && !payload && <p role="status" className="rounded-xl border border-line bg-surface p-4 text-sm text-muted">Đang tạo QR công khai cho thiết bị… {message}</p>}
    <section className="rounded-xl border border-line bg-surface p-4">
      <h3 className="font-semibold">Xuất QR hàng loạt</h3>
      <p className="mt-1 text-sm text-muted">Dùng ô tìm kiếm và bộ lọc bên trái để chọn nhóm thiết bị. Đã chọn {chosen.size} máy; {devices.length} máy khớp bộ lọc.</p>
      <div className="my-3 flex flex-wrap gap-2">
        <button type="button" className={button} onClick={()=>setChosen(p=>{const s=new Set(p);devices.forEach(d=>allFiltered?s.delete(d.id):s.add(d.id));return s;})}>{allFiltered?'Bỏ chọn nhóm đang lọc':'Chọn tất cả kết quả lọc'}</button>
        <button type="button" className={button} onClick={()=>setChosen(new Set())}>Bỏ chọn tất cả</button>
        <button type="button" disabled={busy||!validBase||!selected.length} className={button+' disabled:opacity-40'} onClick={()=>exportPdf(selected)}>Xuất PDF đã chọn ({selected.length})</button>
        <button type="button" disabled={busy||!validBase||!devices.length} className={button+' disabled:opacity-40'} onClick={()=>exportPdf(devices)}>Xuất PDF theo bộ lọc ({devices.length})</button>
      </div>
      <p role="status" className="text-sm text-teal-deep">{message}</p>
      {!!selected.filter(d=>!visibleIds.has(d.id)).length && <p className="mt-2 text-xs text-muted">Lựa chọn có cả máy ngoài bộ lọc hiện tại.</p>}
      <div className="mt-3 max-h-96 overflow-y-auto">{devices.slice(0,view).map(d=><label key={d.id} className="flex items-center gap-3 border-b border-line py-3 text-sm"><input type="checkbox" checked={chosen.has(d.id)} onChange={e=>setChosen(p=>{const s=new Set(p);e.target.checked?s.add(d.id):s.delete(d.id);return s;})}/><span className="min-w-0 flex-1">{d.name}<span className="block text-xs text-muted">{d.id} · {d.dept}</span></span><button type="button" className={button} onClick={()=>onOpen(d.id)}>Xem máy</button></label>)}</div>
      {view<devices.length&&<button type="button" className={button+' mt-2'} onClick={()=>setView(v=>v+60)}>Xem thêm</button>}
    </section>
    {scan&&<QrScanner onClose={()=>setScan(false)} onRead={openCode}/>}
  </div>;
}

export function QrScanner({onRead,onClose}:{onRead:(text:string)=>boolean;onClose:()=>void}) {
  const video=useRef<HTMLVideoElement>(null), stream=useRef<MediaStream|null>(null), cancel=useRef<(()=>void)|null>(null);
  const [running,setRunning]=useState(false),[error,setError]=useState(''),[input,setInput]=useState('');
  const [facing,setFacing]=useState<'environment'|'user'>('environment');
  function stop(){cancel.current?.();cancel.current=null;stream.current?.getTracks().forEach(t=>t.stop());stream.current=null; if(video.current)video.current.srcObject=null;setRunning(false);}
  useEffect(()=>()=>{cancel.current?.();stream.current?.getTracks().forEach(t=>t.stop());},[]);
  async function start(){
    stop();setError('');let disposed=false;cancel.current=()=>{disposed=true;};setRunning(true);
    try{
      if(!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new Error('Camera cần mở ứng dụng bằng HTTPS và cấp quyền camera. Bạn vẫn có thể tải ảnh QR hoặc nhập mã bên dưới.');
      const media=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:facing},width:{ideal:1280},height:{ideal:720}}});
      if(disposed){media.getTracks().forEach(t=>t.stop());return;}
      stream.current=media;const v=video.current;if(!v)throw new Error('Không mở được vùng hiển thị camera.');
      v.srcObject=media;await v.play();
      const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});
      if(!ctx)throw new Error('Không khởi tạo được bộ đọc QR.');
      const tick=()=>{
        if(disposed)return;
        if(v.readyState>=2&&v.videoWidth){
          canvas.width=Math.min(v.videoWidth,800);canvas.height=Math.round(v.videoHeight*canvas.width/v.videoWidth);
          ctx.drawImage(v,0,0,canvas.width,canvas.height);const frame=ctx.getImageData(0,0,canvas.width,canvas.height);
          const code=jsQR(frame.data,frame.width,frame.height,{inversionAttempts:'attemptBoth'});
          if(code){if(onRead(code.data)){stop();return;}setError('QR không thuộc thiết bị trong danh mục. Hãy quét lại.');}
        }
        setTimeout(tick,200);
      };tick();
    }catch(e){if(!disposed){stop();const name=e instanceof Error?e.name:'';setError(name==='NotAllowedError'?'Chưa được cấp quyền camera. Hãy cho phép camera trong cài đặt trình duyệt.':name==='NotFoundError'?'Không tìm thấy camera. Hãy chọn ảnh QR hoặc nhập mã thiết bị.':e instanceof Error?e.message:'Không mở được camera.');}}
  }
  async function readImage(file:File){
    setError('');let url='';
    try{url=URL.createObjectURL(file);const img=new Image();img.src=url;await img.decode();const c=document.createElement('canvas');const scale=Math.min(1,1600/Math.max(img.width,img.height));c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);const ctx=c.getContext('2d');if(!ctx)throw Error('Không đọc được ảnh.');ctx.drawImage(img,0,0,c.width,c.height);const f=ctx.getImageData(0,0,c.width,c.height);const code=jsQR(f.data,f.width,f.height,{inversionAttempts:'attemptBoth'});if(!code||!onRead(code.data))setError('Không tìm thấy QR hợp lệ của thiết bị trong ảnh.');else stop();}catch{setError('Không đọc được ảnh QR. Hãy chọn ảnh PNG hoặc JPEG rõ nét.');}finally{if(url)URL.revokeObjectURL(url);}
  }
  return <div className="fixed inset-0 z-30 flex items-center justify-center bg-header/70 p-3"><section role="dialog" aria-modal="true" aria-label="Quét QR thiết bị" className="max-h-[95dvh] w-full max-w-lg overflow-y-auto rounded-xl bg-surface p-4">
    <div className="flex items-center justify-between"><h2 className="font-semibold">Camera quét QR thiết bị</h2><button type="button" className={button} onClick={()=>{stop();onClose();}}>Đóng</button></div>
    <video ref={video} muted playsInline className="mt-3 aspect-video w-full rounded-lg bg-header object-contain"/>
    <p className="mt-2 text-xs text-muted">Đưa toàn bộ mã QR vào khung, đủ sáng và giữ máy ổn định. Camera chỉ bật khi bạn nhấn Bắt đầu.</p>
    <div className="mt-3 flex flex-wrap gap-2"><select aria-label="Chọn camera" value={facing} disabled={running} onChange={e=>setFacing(e.target.value as typeof facing)} className={button}><option value="environment">Camera sau</option><option value="user">Camera trước</option></select><button type="button" className={button} disabled={running} onClick={start}>Bắt đầu camera</button><button type="button" className={button} disabled={!running} onClick={stop}>Dừng camera</button></div>
    {error&&<p role="alert" className="mt-3 text-sm text-bad">{error}</p>}
    <label className="mt-4 block text-sm">Hoặc chọn ảnh QR<input type="file" accept="image/png,image/jpeg,image/webp" className="mt-1 block w-full text-sm" onChange={e=>{const f=e.target.files?.[0];if(f)readImage(f);e.target.value='';}}/></label>
    <form className="mt-3 flex gap-2" onSubmit={e=>{e.preventDefault();if(!onRead(input))setError('Không tìm thấy thiết bị. Kiểm tra mã hoặc nội dung QR.');else stop();}}><input aria-label="Mã thiết bị hoặc nội dung QR" placeholder="Nhập mã máy hoặc dán nội dung QR" className="min-w-0 flex-1 rounded-lg border border-line p-2 text-sm" value={input} onChange={e=>setInput(e.target.value)}/><button type="submit" className={button}>Mở máy</button></form>
  </section></div>;
}
