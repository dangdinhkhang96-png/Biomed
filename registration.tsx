import { useEffect, useState } from 'react';
import { teamApi } from '@/lib/team/client';
const input='mt-1 w-full rounded-lg border border-line p-2.5 text-sm';
const button='rounded-lg border border-line px-3 py-2 text-sm disabled:opacity-50';
const KEY='tbyt-registration-request';
type Pending={requestId:string;requestToken:string;expiresAt:string};

export function RegistrationForm({offline,onBack}:{offline:boolean;onBack:()=>void}){
 const [pending,setPending]=useState<Pending|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[done,setDone]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{if(offline)return;try{const s=JSON.parse(sessionStorage.getItem(KEY)||'null');if(s?.requestId&&s?.requestToken)setPending(s);}catch{}},[offline]);
 function save(value:Pending|null){setPending(value);try{if(value)sessionStorage.setItem(KEY,JSON.stringify(value));else sessionStorage.removeItem(KEY);}catch{}}
 return <main className="grid min-h-screen place-items-center bg-bg p-4"><section className="w-full max-w-lg rounded-xl border border-line bg-surface p-6 shadow-sm">
 <h1 className="text-xl font-semibold">{done?'Tài khoản đã được kích hoạt':pending?'Xác thực tạo tài khoản':'Tạo tài khoản thành viên'}</h1>
 <p className="mt-2 text-sm text-muted">Mã xác thực được gửi vào thông báo trong ứng dụng của quản trị viên. Liên hệ admin để nhận mã sau khi được kiểm tra yêu cầu.</p>
 {offline&&<p className="mt-3 rounded-lg bg-teal-soft p-3 text-sm">Bản HTML chỉ xem giao diện. Gửi yêu cầu và nhận thông báo cần ứng dụng chạy trên máy chủ.</p>}
 {error&&<p role="alert" className="mt-3 text-sm text-bad">{error}</p>}{message&&<p role="status" className="mt-3 text-sm text-teal-deep">{message}</p>}
 {done?<p className="mt-4 text-sm">Bạn có thể đăng nhập bằng tên đăng nhập và mật khẩu đã đăng ký.</p>:pending?<form onSubmit={async e=>{e.preventDefault();setError('');setBusy(true);const f=new FormData(e.currentTarget);try{await teamApi('verify-registration',{...pending,code:f.get('code')});save(null);setDone(true);setMessage('Xác thực thành công.');}catch(e){setError(e instanceof Error?e.message:'Không xác thực được.');}finally{setBusy(false);}}}>
   <p className="mt-4 text-xs text-muted">Mã hết hạn lúc {new Date(pending.expiresAt).toLocaleString('vi-VN')}; tối đa 5 lần nhập.</p>
   <label className="mt-3 block text-sm">Mã xác thực do admin cung cấp<input name="code" type="text" inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9]{6}" maxLength={6} className={input}/></label>
   <button disabled={busy||offline} className="mt-4 w-full rounded-lg bg-teal p-3 text-sm text-surface disabled:opacity-50">{busy?'Đang xác thực…':'Xác thực và kích hoạt tài khoản'}</button>
   <div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={busy||offline} className={button} onClick={async()=>{setBusy(true);setError('');try{const r=await teamApi<{expiresAt:string}>('resend-registration',pending);save({...pending,expiresAt:r.expiresAt});setMessage('Mã mới đã được gửi lại vào thông báo của admin. Mã cũ hết hiệu lực.');}catch(e){setError(e instanceof Error?e.message:'Không gửi lại được mã.');}finally{setBusy(false);}}}>Gửi lại mã cho admin</button><button type="button" className={button} onClick={()=>{save(null);setError('');setMessage('Yêu cầu cũ vẫn chờ xác thực đến khi hết hạn hoặc admin từ chối.');}}>Tạo yêu cầu khác</button></div>
 </form>:<form onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);setError('');setBusy(true);try{if(f.get('password')!==f.get('confirm'))throw Error('Mật khẩu xác nhận chưa khớp.');const r=await teamApi<Pending>('register',{name:f.get('name'),username:f.get('username'),password:f.get('password')});save(r);setMessage('Đã gửi yêu cầu. Admin sẽ nhận mã trong mục Thông báo.');}catch(e){setError(e instanceof Error?e.message:'Không gửi được yêu cầu.');}finally{setBusy(false);}}}>
   <label className="mt-4 block text-sm">Họ và tên<input name="name" autoComplete="name" required maxLength={100} className={input}/></label>
   <label className="mt-3 block text-sm">Tên đăng nhập<input name="username" autoComplete="username" required pattern="[a-z0-9][a-z0-9._-]{2,39}" minLength={3} maxLength={40} className={input}/></label><p className="mt-1 text-xs text-muted">3–40 ký tự: chữ thường, số, dấu chấm, gạch dưới, gạch ngang.</p>
   <label className="mt-3 block text-sm">Mật khẩu<input name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} className={input}/></label>
   <label className="mt-3 block text-sm">Nhập lại mật khẩu<input name="confirm" type="password" autoComplete="new-password" required minLength={12} maxLength={128} className={input}/></label>
   <button disabled={busy||offline} className="mt-5 w-full rounded-lg bg-teal p-3 text-sm text-surface disabled:opacity-50">{busy?'Đang gửi…':'Gửi yêu cầu tạo tài khoản'}</button>
 </form>}
 <button type="button" onClick={onBack} className={button+' mt-4'}>Về đăng nhập</button>
 </section></main>;
}
export type RegistrationNotice={id:string;username:string;name:string;status:'pending'|'verified'|'rejected';attempts:number;read_at:string|null;expires_at:string;code:string|null};
export function useAdminNotices(enabled:boolean){
 const [notifications,setNotifications]=useState<RegistrationNotice[]>([]),[unread,setUnread]=useState(0),[error,setError]=useState('');
 async function refresh(){try{const r=await teamApi<{notifications:RegistrationNotice[];unread:number}>('notifications');setNotifications(r.notifications);setUnread(r.unread);setError('');}catch(e){setError(e instanceof Error?e.message:'Không tải được thông báo.');}}
 useEffect(()=>{if(!enabled){setNotifications([]);setUnread(0);return;}let disposed=false;const update=()=>{if(!disposed)void refresh();};update();const timer=setInterval(update,15000);window.addEventListener('focus',update);return()=>{disposed=true;clearInterval(timer);window.removeEventListener('focus',update);};},[enabled]);
 return {notifications,unread,error,refresh};
}
export function AdminNotificationPanel({notifications,error,refresh}:ReturnType<typeof useAdminNotices>){
 const [message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 async function act(action:string,id:string){setBusy(true);try{await teamApi(action,{id});await refresh();setMessage(action==='reject-registration'?'Đã từ chối yêu cầu. Mã không còn hiệu lực.':'Đã đánh dấu thông báo đã đọc.');}catch(e){setMessage(e instanceof Error?e.message:'Không xử lý được.');}finally{setBusy(false);}}
 return <main className="mx-auto max-w-4xl p-4"><section className="rounded-xl border border-line bg-surface p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-xl font-semibold">Thông báo cho quản trị viên</h1><button className={button} onClick={refresh}>Làm mới</button></div><p className="mt-2 text-sm text-muted">Kiểm tra người đăng ký trước khi cung cấp mã. Chỉ admin xem được mã; mã có hiệu lực 10 phút và dùng một lần. Thông báo tự cập nhật mỗi 15 giây.</p>{error&&<p role="alert" className="mt-3 text-sm text-bad">{error}</p>}{message&&<p role="status" className="mt-3 text-sm text-teal-deep">{message}</p>}
 {!notifications.length&&<p className="mt-6 text-sm text-muted">Chưa có yêu cầu tạo tài khoản.</p>}
 <div className="mt-4 grid gap-3">{notifications.map(n=><article key={n.id} className="rounded-lg border border-line p-4"><h2 className="font-semibold">{n.name} · {n.username}{!n.read_at&&n.status==='pending'?' · Mới':''}</h2><p className="mt-1 text-xs text-muted">{n.status==='verified'?'Đã kích hoạt':n.status==='rejected'?'Đã từ chối':!n.code?'Hết hạn hoặc đã vượt số lần nhập':'Yêu cầu tạo tài khoản'} · Hết hạn: {new Date(n.expires_at).toLocaleString('vi-VN')}</p>
 {n.code&&<p className="mt-3 text-sm">Mã xác thực: <strong className="font-mono text-2xl tracking-widest text-teal-deep">{n.code}</strong></p>}
 {n.status==='pending'&&<div className="mt-3 flex flex-wrap gap-2">{!n.read_at&&<button disabled={busy} className={button} onClick={()=>act('read-notification',n.id)}>Đánh dấu đã đọc</button>}<button disabled={busy} className={button+' text-bad'} onClick={()=>act('reject-registration',n.id)}>Từ chối yêu cầu</button></div>}
 </article>)}</div>
 </section></main>;
}
