import { Link } from '@tanstack/react-router';
export function Monogram({className=''}:{className?:string}) { return <span aria-label="MC" className={`font-display leading-none tracking-[-0.11em] ${className}`}>MC</span>; }
export function Brand({light=false,compact=false}:{light?:boolean;compact?:boolean}) {
  return <Link to="/" aria-label="Maison Calvela ana sayfa" className={`inline-flex shrink-0 items-center gap-3 ${light?'text-primary-foreground':'text-foreground'}`}>
    <Monogram className={`border-r pr-3 ${light?'border-primary-foreground/30':'border-border'} ${compact?'text-[25px]':'text-[30px]'}`}/>
    <span className={`font-display whitespace-nowrap font-semibold leading-[.75] tracking-[.025em] ${compact?'text-[23px]':'text-[29px]'}`}>Maison<br/><span className="pl-[.3em]">Calvela</span></span>
  </Link>;
}
