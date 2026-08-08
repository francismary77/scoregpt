import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/config/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base=getSiteUrl(),paths=["","/matches","/results","/pricing","/about","/sales","/contact","/responsible-gaming","/privacy","/terms"];
  return paths.map((path,index)=>({url:`${base}${path}`,changeFrequency:index<3?"daily":"monthly",priority:index===0?1:index<3?0.8:0.6}));
}
