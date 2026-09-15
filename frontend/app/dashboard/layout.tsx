"use client";

import {useEffect,useMemo,useState} from "react";
import type {ReactNode} from "react";
import Link from "next/link";
import {usePathname,useRouter} from "next/navigation";
import useAuthUser from "@/hooks/useAuthUser";
import api from "@/lib/axios";
import AppIcon,{type IconName} from "@/components/AppIcon";
import GlobalSearch from "@/components/work/GlobalSearch";
import {getNotifications} from "@/services/workService";

type NavItem={href:string;label:string;icon:IconName};
const coreNav:NavItem[]=[
 {href:"/dashboard",label:"Home",icon:"dashboard"},{href:"/dashboard/tasks?mine=1",label:"My work",icon:"check"},{href:"/dashboard/projects",label:"Projects",icon:"projects"},{href:"/dashboard/tasks",label:"Board",icon:"board"},{href:"/dashboard/calendar",label:"Calendar",icon:"calendar"},{href:"/dashboard/timeline",label:"Timeline",icon:"timeline"},
];
const insightNav:NavItem[]=[{href:"/dashboard/inbox",label:"Inbox",icon:"inbox"},{href:"/dashboard/activity",label:"Activity",icon:"activity"}];
const adminNav:NavItem[]=[{href:"/dashboard/employees",label:"People",icon:"users"},{href:"/dashboard/departments",label:"Departments",icon:"building"},{href:"/dashboard/designations",label:"Roles",icon:"badge"}];

function pageTitle(path:string){if(path.includes('/tasks/')&&!path.endsWith('/tasks'))return 'Task';const p=path.split('/').filter(Boolean).pop()||'dashboard';return ({dashboard:'Home',tasks:'Tasks',projects:'Projects',calendar:'Calendar',timeline:'Timeline',inbox:'Inbox',activity:'Activity',employees:'People',departments:'Departments',designations:'Roles',profile:'Profile'} as Record<string,string>)[p]||p.replaceAll('-',' ')}
export default function DashboardLayout({children}:{children:ReactNode}){
 const pathname=usePathname(),router=useRouter();const {user,authLoading,isAdmin}=useAuthUser();const [mobile,setMobile]=useState(false);const [unread,setUnread]=useState(0);
 useEffect(()=>setMobile(false),[pathname]);useEffect(()=>{if(user)getNotifications().then(r=>setUnread(r.data.unread_count||0)).catch(()=>{})},[user,pathname]);
 const date=useMemo(()=>new Intl.DateTimeFormat("en",{weekday:"short",month:"short",day:"numeric"}).format(new Date()),[]);
 const active=(href:string)=>{const base=href.split('?')[0];if(base==='/dashboard')return pathname==='/dashboard';if(href.includes('mine=1'))return false;return pathname===base||pathname.startsWith(base+'/')};
 const logout=async()=>{try{await api.post('/logout')}catch{}localStorage.removeItem('token');localStorage.removeItem('user');router.replace('/login')};
 if(authLoading)return <div className="app-boot"><span className="loader-dot"/>Opening workspace…</div>;if(!user)return null;
 const Nav=({items}:{items:NavItem[]})=><nav className="app-nav">{items.map(i=><Link key={i.href} href={i.href} className={`app-nav-link ${active(i.href)?'active':''}`}><AppIcon name={i.icon}/><span>{i.label}</span>{i.label==='Inbox'&&unread>0&&<b className="nav-badge">{unread>99?'99+':unread}</b>}</Link>)}</nav>;
 return <div className="app-shell">
  {mobile&&<button className="sidebar-overlay" onClick={()=>setMobile(false)} aria-label="Close menu"/>}
  <aside className={`app-sidebar ${mobile?'open':''}`}>
   <div className="app-brand"><div className="app-brand-mark"><AppIcon name="bolt"/></div><div><div className="app-brand-title">FlowTask</div><div className="app-brand-subtitle">Work operating system</div></div></div>
   <div className="sidebar-section"><div className="app-nav-label">Workspace</div><Nav items={coreNav}/></div>
   <div className="sidebar-section"><div className="app-nav-label">Stay aligned</div><Nav items={insightNav}/></div>
   {isAdmin&&<div className="sidebar-section"><div className="app-nav-label">Administration</div><Nav items={adminNav}/></div>}
   <div className="sidebar-spacer"/>
   <Link href="/dashboard/profile" className="app-user-card"><div className="app-avatar">{user.name.charAt(0).toUpperCase()}</div><div><div className="app-user-name">{user.name}</div><div className="app-user-role">{user.role}</div></div><AppIcon name="settings"/></Link>
   <button className="sidebar-logout" onClick={logout}><AppIcon name="logout"/>Sign out</button>
  </aside>
  <div className="app-main">
   <header className="app-topbar"><div className="app-topbar-left"><button className="mobile-menu-btn" onClick={()=>setMobile(true)}><AppIcon name="menu"/></button><div className="app-page-title">{pageTitle(pathname)}</div></div><GlobalSearch/><div className="top-actions"><Link href="/dashboard/inbox" className="top-icon-btn"><AppIcon name="inbox"/>{unread>0&&<i/>}</Link><span className="app-topbar-date">{date}</span></div></header>
   <main className="app-content">{children}</main>
  </div>
 </div>;
}
