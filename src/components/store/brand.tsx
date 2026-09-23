import { Link } from '@tanstack/react-router';
export function Monogram({className=''}:{className?:string}) { return <svg viewBox="0 0 72 64" fill="none" aria-label="Maison Calvela monogramı" role="img" className={`inline-block h-[1em] w-[1.125em] shrink-0 ${className}`}><path d="M5 52V12L22 37L36 13V52" stroke="currentColor" strokeWidth="2.6" strokeLinecap="square" strokeLinejoin="miter"/><path d="M65 15C58 9 48 9 41 15C34 21 33 42 41 49C48 56 58 55 65 48" stroke="currentColor" strokeWidth="2.6" strokeLinecap="square"/><path d="M30 7V57M9 57H67" stroke="currentColor" strokeWidth=".9" opacity=".65"/></svg>; }
export function Brand({light=false,compact=false}:{light?:boolean;compact?:boolean}) {
  return <Link to="/" aria-label="Maison Calvela ana sayfa" className={`inline-flex shrink-0 items-center gap-3 ${light?'text-primary-foreground':'text-foreground'}`}>
    <Monogram className={`border-r pr-3 ${light?'border-primary-foreground/30':'border-border'} ${compact?'text-[25px]':'text-[30px]'}`}/>
    <span className={`font-display whitespace-nowrap font-semibold leading-[.75] tracking-[.025em] ${compact?'text-[23px]':'text-[29px]'}`}>Maison<br/><span className="pl-[.3em]">Calvela</span></span>
  </Link>;
}
