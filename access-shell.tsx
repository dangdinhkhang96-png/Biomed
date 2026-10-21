import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { LockKeyhole, Stethoscope, UserPlus, ShieldCheck } from 'lucide-react';
import { clearTeamSession, saveTeamToken, teamApi, type TeamUser } from '@/lib/team/client';
import { RegistrationForm, useAdminNotices, AdminNotificationPanel } from './registration';
import type { Device } from '@/lib/inventory';
const Team=createContext<TeamUser|null>(null);
export const useTeamUser=()=>useContext(Team);
const Catalog=createContext<Device[]>([]);
export const useDevices=()=>useContext(Catalog);
const input='mt-1 w-full rounded-lg border border-line bg-surface p-2.5 text-sm text-ink';
const button='rounded-lg border border-line px-3 py-2 text-sm disabled:opacity-50';

export function AccessShell({children,previewOnly=false}:{children:ReactNode;previewOnly?:boolean}){
 const [user,setUser]=useState<TeamUser|null>(null),[devices,setDevices]=useState<Device[]>([]),[pending,setPending]=useState(!previewOnly),[error,setError]=useState(''),[manage,setManage]=useState(false),[change,setChange]=useState(false),[notices,setNotices]=useState(false);
 const noticeState=useAdminNotices(Boolean(user?.role==='admin'&&!user.must_change));
 const offline=previewOnly||(typeof window!=='undefined'&&window.location.protocol==='file:');
 async function load(){
   setPending(true);setError('');
   try{const s=await teamApi<{user:TeamUser|null}>('session');setUser(s.user);
    if(s.user&&!s.user.must_change){const c=await teamApi<{devices:Device[]}>('catalog');setDevices(c.devices);}
    else setDevices([]);
   }catch(e){setUser(null);setDevices([]);setError(e instanceof Error?e.message:'Không kết nối được máy chủ.');}finally{setPending(false);}
 }
 useEffect(()=>{if(offline){setPending(false);return;}void load();},[]);
 useEffect(()=>{
  if(!user||offline)return;
  const check=async()=>{try{const r=await teamApi<{user:TeamUser|null}>('session');if(!r.user){clearTeamSession();setUser(null);setDevices([]);setManage(false);setError('Phiên đăng nhập đã kết thúc hoặc tài khoản bị khóa.');}else setUser(r.user);}catch{setError('Chưa kiểm tra được phiên đăng nhập. Hãy kiểm tra kết nối.');}};
  const timer=setInterval(check,60000);window.addEventListener('focus',check);
  return()=>{clearInterval(timer);window.removeEventListener('focus',check);};
 },[user?.id,offline]);
 async function logout(){
   try{await teamApi('logout',{});clearTeamSession();setUser(null);setDevices([]);setManage(false);setChange(false);setNotices(false);}
   catch(e){setError(e instanceof Error?e.message:'Không đăng xuất được.');}
 }
 if(pending)return <main className="grid min-h-screen place-items-center bg-bg"><p role="status" className="text-teal-deep">Đang kiểm tra phiên đăng nhập…</p></main>;
 if(!user)return <Login offline={offline} error={error} onLogin={load}/>;
 if(user.must_change||change)return <PasswordChange user={user} forced={user.must_change} onDone={()=>{clearTeamSession();setUser(null);setDevices([]);setChange(false);setError('Đã đổi mật khẩu. Vui lòng đăng nhập lại.');}} onCancel={()=>setChange(false)} onLogout={logout}/>;
 return <Team.Provider value={user}><Catalog.Provider value={devices}>
   <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-4 py-2">
    <p className="text-sm"><b>{user.name}</b> · {user.username} · {user.role==='admin'?'Quản trị viên':'Thành viên'}</p>
    <div className="flex flex-wrap gap-2">{user.role==='admin'&&<button type="button" className={button} onClick={()=>{setNotices(false);setManage(v=>!v);}}>{manage?'Về thiết bị':'Quản lý tài khoản'}</button>}{user.role==='admin'&&<button type="button" className={button} onClick={()=>{setManage(false);setNotices(v=>!v);}}>Thông báo ({noticeState.unread})</button>}<button type="button" className={button} onClick={()=>setChange(true)}>Đổi mật khẩu</button><button type="button" className={button} onClick={logout}>Đăng xuất</button></div>
   </div>
   {error&&<p role="alert" className="p-3 text-bad">{error}</p>}
   {notices&&user.role==='admin'?<AdminNotificationPanel {...noticeState}/>:manage&&user.role==='admin'?<AccountManager/>:children}
 </Catalog.Provider></Team.Provider>;
}

function Login({offline,error:onError,onLogin}:{offline:boolean;error:string;onLogin:()=>Promise<void>}){
 const [error,setError]=useState(''),[busy,setBusy]=useState(false),[show,setShow]=useState(false),[register,setRegister]=useState(false);
 if(register)return <RegistrationForm offline={offline} onBack={()=>setRegister(false)}/>;
 return <main className="grid min-h-screen items-center bg-bg p-4 lg:grid-cols-2 lg:gap-12 lg:px-16">
  <section className="mx-auto w-full max-w-lg py-6"><div className="mb-5 flex items-center gap-3 text-teal-deep"><Stethoscope className="size-9"/><span className="text-sm font-semibold">BIMEDBD · BVĐK BÌNH DƯƠNG</span></div><h1 className="text-3xl font-semibold leading-tight text-ink">Quản lý trang<br/>thiết bị y tế</h1><p className="mt-4 text-muted">Tra cứu hồ sơ máy, quản lý sự cố và xuất phiếu sửa chữa. Quét QR để tìm đúng thiết bị.</p><div className="mt-6 flex items-center gap-2 text-sm text-teal-deep"><ShieldCheck className="size-5"/>Tài khoản do quản trị viên cấp</div></section>
  <form className="mx-auto w-full max-w-md rounded-xl border border-line bg-surface p-6 shadow-sm" onSubmit={async e=>{e.preventDefault();setError('');setBusy(true);try{const f=new FormData(e.currentTarget);const result=await teamApi<{token:string}>('login',{username:f.get('username'),password:f.get('password')});saveTeamToken(result.token);await onLogin();}catch(e){setError(e instanceof Error?e.message:'Không đăng nhập được.');}finally{setBusy(false);}}}>
   <LockKeyhole className="mb-3 size-7 text-teal"/><h2 className="text-xl font-semibold">Đăng nhập</h2><p className="mt-1 text-sm text-muted">Nhập tài khoản được admin cấp để tiếp tục.</p>
   {offline&&<p role="status" className="mt-4 rounded-lg bg-teal-soft p-3 text-sm">Đây là bản xem giao diện. Đăng nhập và quản lý tài khoản cần chạy dự án trên máy chủ.</p>}
   {(error||onError)&&<p role="alert" className="mt-3 text-sm text-bad">{error||onError}</p>}
   <label className="mt-5 block text-sm font-medium">Tên đăng nhập<input name="username" autoComplete="username" required maxLength={40} placeholder="Ví dụ: admin" className={input}/></label>
   <label className="mt-4 block text-sm font-medium">Mật khẩu<input name="password" type={show?'text':'password'} autoComplete="current-password" required maxLength={128} className={input}/></label>
   <label className="mt-3 flex items-center gap-2 text-sm text-muted"><input type="checkbox" checked={show} onChange={e=>setShow(e.target.checked)}/>Hiện mật khẩu</label>
   <button type="submit" disabled={busy||offline} className="mt-5 w-full rounded-lg bg-teal p-3 text-sm font-semibold text-surface disabled:opacity-50">{busy?'Đang đăng nhập…':'Đăng nhập'}</button>
   <button type="button" className={button+" mt-4 w-full"} onClick={()=>setRegister(true)}>Tạo tài khoản / Nhập mã xác thực</button>
   <p className="mt-3 text-center text-xs text-muted">Quên mật khẩu? Liên hệ admin để được đặt lại.</p>
  </form>
 </main>;
}
function PasswordChange({user,forced,onDone,onCancel,onLogout}:{user:TeamUser;forced:boolean;onDone:()=>void;onCancel:()=>void;onLogout:()=>Promise<void>}){
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 return <main className="grid min-h-screen place-items-center bg-bg p-4"><form className="w-full max-w-md rounded-xl border border-line bg-surface p-6" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');const f=new FormData(e.currentTarget);try{if(f.get('password')!==f.get('confirm'))throw Error('Mật khẩu xác nhận chưa khớp.');await teamApi('password',{currentPassword:f.get('current'),password:f.get('password')});onDone();}catch(e){setError(e instanceof Error?e.message:'Không đổi được mật khẩu.');}finally{setBusy(false);}}}>
 <h1 className="text-xl font-semibold">Đổi mật khẩu</h1><p className="mt-2 text-sm text-muted">{user.username} · {forced?'Bạn phải đổi mật khẩu được cấp trước khi dùng ứng dụng.':'Mật khẩu dài 12–128 ký tự. Sau khi đổi, các phiên đăng nhập sẽ kết thúc.'}</p>
 {error&&<p role="alert" className="mt-3 text-sm text-bad">{error}</p>}
 <label className="mt-4 block text-sm">Mật khẩu hiện tại<input className={input} name="current" type="password" autoComplete="current-password" required maxLength={128}/></label>
 <label className="mt-3 block text-sm">Mật khẩu mới<input className={input} name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={128}/></label>
 <label className="mt-3 block text-sm">Nhập lại mật khẩu mới<input className={input} name="confirm" type="password" autoComplete="new-password" required minLength={12} maxLength={128}/></label>
 <div className="mt-5 flex flex-wrap gap-2"><button disabled={busy} className="rounded-lg bg-teal px-4 py-2 text-sm text-surface">{busy?'Đang lưu…':'Đổi mật khẩu và đăng nhập lại'}</button>{!forced&&<button type="button" className={button} onClick={onCancel}>Hủy</button>}<button type="button" className={button} onClick={onLogout}>Đăng xuất</button></div>
 </form></main>;
}
function AccountManager(){
 const [users,setUsers]=useState<TeamUser[]>([]),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[reset,setReset]=useState<TeamUser|null>(null);
 async function refresh(){try{const r=await teamApi<{users:TeamUser[]}>('users');setUsers(r.users);}catch(e){setError(e instanceof Error?e.message:'Không tải được danh sách.');}}
 useEffect(()=>{void refresh();},[]);
 return <main className="mx-auto grid max-w-6xl gap-5 p-4 lg:grid-cols-[340px_1fr]">
 <form className="self-start rounded-xl border border-line bg-surface p-5" onSubmit={async e=>{e.preventDefault();const form=e.currentTarget;const f=new FormData(form);setBusy(true);setError('');setMessage('');try{await teamApi('users',{username:f.get('username'),name:f.get('name'),password:f.get('password')});form.reset();setMessage('Đã tạo tài khoản thành viên. Hãy cấp tên đăng nhập và mật khẩu cho người dùng.');await refresh();}catch(e){setError(e instanceof Error?e.message:'Không tạo được tài khoản.');}finally{setBusy(false);}}}>
 <UserPlus className="mb-2 size-6 text-teal"/><h1 className="text-xl font-semibold">Tạo tài khoản</h1><p className="mt-2 text-sm text-muted">Tài khoản mới có quyền thành viên và phải đổi mật khẩu khi đăng nhập lần đầu.</p>
 <label className="mt-4 block text-sm">Họ và tên<input name="name" required maxLength={100} autoComplete="off" className={input}/></label>
 <label className="mt-3 block text-sm">Tên đăng nhập<input name="username" required pattern="[a-z0-9][a-z0-9._-]{2,39}" minLength={3} maxLength={40} autoComplete="off" className={input}/></label>
 <p className="mt-1 text-xs text-muted">3–40 ký tự: chữ thường, số, dấu chấm, gạch dưới, gạch ngang.</p>
 <label className="mt-3 block text-sm">Mật khẩu cấp ban đầu<input name="password" required type="password" minLength={12} maxLength={128} autoComplete="new-password" className={input}/></label>
 <button disabled={busy} className="mt-5 w-full rounded-lg bg-teal p-3 text-sm text-surface">{busy?'Đang tạo…':'Tạo tài khoản thành viên'}</button>
 </form>
 <section className="min-w-0 rounded-xl border border-line bg-surface p-5"><h2 className="text-lg font-semibold">Danh sách tài khoản</h2>{error&&<p role="alert" className="mt-3 text-sm text-bad">{error}</p>}{message&&<p role="status" className="mt-3 text-sm text-teal-deep">{message}</p>}
 <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[550px] text-left text-sm"><thead><tr className="border-b border-line">{['Tài khoản','Quyền','Trạng thái','Thao tác'].map(s=><th key={s} className="p-2 font-medium">{s}</th>)}</tr></thead><tbody>{users.map(u=><tr key={u.id} className="border-b border-line"><td className="p-2"><b>{u.name}</b><span className="block text-xs text-muted">{u.username}</span></td><td className="p-2">{u.role==='admin'?'Admin':'Thành viên'}</td><td className="p-2">{u.active?'Hoạt động':'Đã khóa'}{u.must_change&&<span className="block text-xs text-muted">Cần đổi mật khẩu</span>}</td><td className="p-2">{u.role!=='admin'&&<div className="flex gap-2"><button disabled={busy} className={button} onClick={async()=>{setBusy(true);setError('');try{await teamApi('active',{id:u.id,active:!u.active});await refresh();setMessage(u.active?'Đã khóa tài khoản và kết thúc các phiên đăng nhập.':'Đã mở khóa tài khoản.');}catch(e){setError(e instanceof Error?e.message:'Lỗi cập nhật.');}finally{setBusy(false);}}}>{u.active?'Khóa':'Mở khóa'}</button><button className={button} onClick={()=>setReset(u)}>Đặt lại mật khẩu</button></div>}</td></tr>)}</tbody></table></div>
 </section>
 {reset&&<div className="fixed inset-0 z-30 grid place-items-center bg-header/60 p-4"><form role="dialog" aria-modal="true" aria-label="Đặt lại mật khẩu" className="w-full max-w-md rounded-xl bg-surface p-5" onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);setBusy(true);setError('');try{await teamApi('reset',{id:reset.id,password:f.get('password')});setReset(null);setMessage('Đã đặt lại mật khẩu và kết thúc các phiên đăng nhập.');await refresh();}catch(e){setError(e instanceof Error?e.message:'Lỗi đặt lại mật khẩu.');}finally{setBusy(false);}}}><h2 className="font-semibold">Đặt lại mật khẩu cho {reset.username}</h2><p className="mt-2 text-sm text-muted">Thành viên sẽ phải đổi mật khẩu mới ở lần đăng nhập tiếp theo.</p><label className="mt-3 block text-sm">Mật khẩu cấp lại<input type="password" name="password" required minLength={12} maxLength={128} autoComplete="new-password" className={input}/></label>{error&&<p role="alert" className="mt-2 text-sm text-bad">{error}</p>}<div className="mt-4 flex gap-2"><button disabled={busy} className={button}>Đặt lại</button><button type="button" className={button} onClick={()=>setReset(null)}>Hủy</button></div></form></div>}
 </main>;
}
