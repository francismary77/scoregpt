import Link from "next/link";
import { brand } from "@/config/brand";

export function BrandMark() {
  return (
    <Link href="/" className="brand-mark" aria-label={`${brand.siteName} home`}>
      <span className="brand-icon">9</span>
      <span>{brand.siteName}</span>
      <span className="brand-dot" />
    </Link>
  );
}
