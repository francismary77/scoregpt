"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandMark } from "./brand-mark";
import { useAuthState } from "./auth-state-provider";
import { authService, membershipService } from "@/modules/account/application";
import { PremiumBadge } from "./membership-ui";

const nav=[["Today's Matches","/matches"],["Results","/results"],["Competitions","/competitions"],["Member Access","/pricing"],["About","/about"],["Own a Platform","/sales"]] as const;

function HeaderTier({userId}:{userId:string}) {
  const [premium,setPremium]=useState(false);
  useEffect(()=>{void membershipService.getDisplay(userId).then(value=>setPremium(value.hasPremiumAccess))},[userId]);
  return premium?<PremiumBadge/>:null;
}

export function SiteHeader() {
  const {state}=useAuthState(),router=useRouter(),[menuOpen,setMenuOpen]=useState(false);
  useEffect(()=>{if(!menuOpen)return;const close=(event:KeyboardEvent)=>{if(event.key==="Escape")setMenuOpen(false)};window.addEventListener("keydown",close);return()=>window.removeEventListener("keydown",close)},[menuOpen]);
  async function signOut(){setMenuOpen(false);await authService.signOut();router.push("/");router.refresh()}
  const closeMenu=()=>setMenuOpen(false);
  return <header className="site-header"><div className="container nav-wrap">
    <button className="mobile-menu-trigger" type="button" aria-label="Open navigation menu" aria-expanded={menuOpen} aria-controls="mobile-navigation" onClick={()=>setMenuOpen(true)}><span/><span/><span/></button>
    <BrandMark/>
    <nav className="desktop-nav" aria-label="Primary navigation">{nav.map(([label,href])=><Link className={href==="/sales"?"business-nav-link":undefined} key={href} href={href}>{label}</Link>)}</nav>
    <div className="header-actions">{state.status==="authenticated"?<><Link className="login-link account-link" href="/account">{state.user.displayName}<HeaderTier userId={state.user.id}/></Link>{state.user.role==="admin"&&<Link className="login-link" href="/admin">Admin</Link>}<Link className="button button-small" href="/dashboard">Dashboard</Link><button className="header-signout" onClick={signOut}>Log out</button></>:<><Link className="login-link" href="/login">Log in</Link><Link className="button button-small" href="/register">Get started <span>↗</span></Link></>}</div>
  </div>{menuOpen&&<div className="mobile-menu-backdrop" onClick={closeMenu}><nav id="mobile-navigation" className="mobile-navigation" aria-label="Mobile navigation" onClick={event=>event.stopPropagation()}><div className="mobile-menu-head"><BrandMark/><button type="button" aria-label="Close navigation menu" onClick={closeMenu}>×</button></div>{nav.map(([label,href])=><Link className={href==="/sales"?"business-nav-link":undefined} key={href} href={href} onClick={closeMenu}>{label}</Link>)}<div className="mobile-account-links">{state.status==="authenticated"?<><Link href="/account" onClick={closeMenu}>Account</Link>{state.user.role==="admin"&&<Link href="/admin" onClick={closeMenu}>Admin</Link>}<Link href="/dashboard" onClick={closeMenu}>Dashboard</Link><button type="button" onClick={signOut}>Log out</button></>:<><Link href="/login" onClick={closeMenu}>Log in</Link><Link className="button" href="/register" onClick={closeMenu}>Get started</Link></>}</div></nav></div>}</header>;
}
