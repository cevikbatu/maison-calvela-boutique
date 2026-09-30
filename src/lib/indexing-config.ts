import {indexingSite} from './indexing';
export const publicIndexingSite=indexingSite(import.meta.env['VITE_PUBLIC_SITE_URL'],import.meta.env['VITE_PUBLIC_INDEXING_ENABLED']);
