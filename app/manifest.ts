import type { MetadataRoute } from 'next'
import { BRAND } from '@/lib/brand'

/**
 * Web app manifest — lets a visitor "install" the site to their home screen / dock
 * with the charity's logo and name, and launch it like a standalone app. Next serves
 * this at /manifest.webmanifest and links it automatically.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND.name,
    short_name: 'Spotty Zebras',
    description: BRAND.description,
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#2DA174',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
