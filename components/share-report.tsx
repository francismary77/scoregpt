"use client";
import { useState } from "react";
export function ShareReport({title}:{title:string}){const[label,setLabel]=useState("Share report");async function share(){try{if(navigator.share){await navigator.share({title,url:window.location.href});return}await navigator.clipboard.writeText(window.location.href);setLabel("Link copied");setTimeout(()=>setLabel("Share report"),1800)}catch{setLabel("Share cancelled")}}return <button className="button button-ghost share-button" type="button" onClick={share} aria-live="polite">{label}</button>}
