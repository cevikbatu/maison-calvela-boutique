import { createFileRoute } from '@tanstack/react-router';
import {publicIndexingSite as site} from '@/lib/indexing-config';
import {robotsText} from '@/lib/indexing';
export const Route=createFileRoute('/robots.txt')({server:{handlers:{GET:()=>new Response(robotsText(site),{headers:{'content-type':'text/plain; charset=utf-8','x-robots-tag':site?'index':'noindex, nofollow'}})}}});
