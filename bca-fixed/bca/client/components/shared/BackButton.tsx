'use client';
import { useRouter } from 'next/navigation';

interface BackButtonProps {
  href?: string;
  label?: string;
  className?: string;
}

export default function BackButton({ href, label = 'Back', className = '' }: BackButtonProps) {
  const router = useRouter();
  const handleClick = () => href ? router.push(href) : router.back();
  return (
    <button onClick={handleClick}
      className={`inline-flex items-center gap-2 text-slate-400 hover:text-white transition-all duration-200 group ${className}`}>
      <span className="w-8 h-8 rounded-lg glass border border-white/10 flex items-center justify-center group-hover:border-gold/40 group-hover:bg-gold/5 transition-all">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
      <span className="text-sm font-bold tracking-wide uppercase">{label}</span>
    </button>
  );
}
