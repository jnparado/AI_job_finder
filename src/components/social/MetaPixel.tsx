import { useEffect } from 'react'

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
    _fbq?: unknown
  }
}

export function MetaPixel() {
  const pixelId = (import.meta.env.VITE_META_PIXEL_ID as string | undefined)?.trim()

  useEffect(() => {
    if (!pixelId || window.fbq) return
    const script = document.createElement('script')
    script.innerHTML = `
      !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
      n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', ${JSON.stringify(pixelId)});
      fbq('track', 'PageView');
    `
    document.head.appendChild(script)
  }, [pixelId])

  if (!pixelId) return null
  return (
    <noscript>
      <img
        height={1}
        width={1}
        style={{ display: 'none' }}
        src={`https://www.facebook.com/tr?id=${encodeURIComponent(pixelId)}&ev=PageView&noscript=1`}
        alt=""
      />
    </noscript>
  )
}
