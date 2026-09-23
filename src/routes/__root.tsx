import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Outlet, Link, createRootRouteWithContext, useRouter, HeadContent, Scripts } from '@tanstack/react-router';
import { useEffect, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { StoreProvider } from '@/components/store/store-provider';
import { Header, Footer, CartPanel, SearchPanel } from '@/components/store/site-shell';
import appCss from '../styles.css?url';
import { reportLovableError } from '../lib/lovable-error-reporting';
function NotFoundComponent(){return <div className="container-wide flex min-h-[60vh] flex-col items-center justify-center text-center"><p className="label-caps text-gold">404</p><h1 className="editorial-title mt-3 text-6xl">Sayfa bulunamadı</h1><Button variant="luxury" className="mt-8" asChild><Link to="/">Ana Sayfaya Dön</Link></Button></div>}
function ErrorComponent({error,reset}:{error:Error;reset:()=>void}){const router=useRouter();useEffect(()=>{reportLovableError(error,{boundary:'tanstack_root_error_component'})},[error]);return <div className="container-wide flex min-h-[60vh] flex-col items-center justify-center text-center"><h1 className="editorial-title text-5xl">Bir sorun oluştu.</h1><p className="mt-3 text-muted-foreground">Lütfen tekrar deneyin.</p><Button variant="luxury" className="mt-7" onClick={()=>{router.invalidate();reset()}}>Tekrar Dene</Button></div>}
export const Route=createRootRouteWithContext<{queryClient:QueryClient}>()({head:()=>({meta:[{charSet:'utf-8'},{name:'viewport',content:'width=device-width, initial-scale=1'}],links:[{rel:'stylesheet',href:appCss},{rel:'preconnect',href:'https://fonts.googleapis.com'},{rel:'preconnect',href:'https://fonts.gstatic.com',crossOrigin:'anonymous'},{rel:'stylesheet',href:'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=DM+Sans:wght@400;500;600;700&display=swap'},{rel:'icon',href:'/favicon.svg',type:'image/svg+xml'}]}),shellComponent:RootShell,component:RootComponent,notFoundComponent:NotFoundComponent,errorComponent:ErrorComponent});
function RootShell({children}:{children:ReactNode}){return <html lang="tr"><head><HeadContent/></head><body>{children}<Scripts/></body></html>}
function RootComponent(){const {queryClient}=Route.useRouteContext();return <QueryClientProvider client={queryClient}><StoreProvider><Header/><Outlet/><Footer/><CartPanel/><SearchPanel/></StoreProvider></QueryClientProvider>}
