import { Link } from '@tanstack/react-router';
export function Monogram({className=''}:{className?:string}) { return <span role="img" aria-label="Maison Calvela monogramı" className={`monogram-icon inline-block h-[1em] w-[1em] shrink-0 align-middle ${className}`}/>; }
export function Brand({light=false,compact=false}:{light?:boolean;compact?:boolean}) {
  return <Link to="/" aria-label="Maison Calvela ana sayfa" className={`inline-flex shrink-0 items-center gap-3 ${light?'text-primary-foreground':'text-foreground'}`}>
    <Monogram className={`${compact?'text-[30px]':'text-[36px]'}`}/>
    <span className={`font-display whitespace-nowrap font-semibold leading-[.75] tracking-[.025em] ${compact?'text-[23px]':'text-[29px]'}`}>Maison<br/><span className="pl-[.3em]">Calvela</span></span>
  </Link>;
}
