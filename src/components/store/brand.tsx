import { Link } from '@tanstack/react-router';
export function Monogram({className=''}:{className?:string}) { return <span role="img" aria-label="Maison Calvela monogramı" className={`monogram-icon inline-block h-[1em] w-[1em] shrink-0 align-middle ${className}`}/>; }
export function Brand({light=false,compact=false}:{light?:boolean;compact?:boolean}) {
  return <Link to="/" aria-label="Maison Calvela ana sayfa" className={`inline-flex shrink-0 items-center ${light?'brightness-0 invert':''}`}>
    <img src="/maison-calvela-logo.png" alt="Maison Calvela" className={`${compact?'h-11 sm:h-12':'h-14'} w-auto max-w-[210px] object-contain sm:max-w-[260px]`} />
  </Link>;
}
