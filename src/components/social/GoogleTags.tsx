import { useEffect } from 'react'

export function GoogleTags() {
  const ga = (import.meta.env.VITE_GOOGLE_ANALYTICS_ID as string | undefined)?.trim()
  const gtm = (import.meta.env.VITE_GOOGLE_TAG_MANAGER_ID as string | undefined)?.trim()
  const verify = (import.meta.env.VITE_GOOGLE_SITE_VERIFICATION as string | undefined)?.trim()

  useEffect(() => {
    if (verify && !document.querySelector('meta[name="google-site-verification"]')) {
      const meta = document.createElement('meta')
      meta.name = 'google-site-verification'
      meta.content = verify
      document.head.appendChild(meta)
    }

    if (gtm && !document.getElementById('atelier-gtm')) {
      const script = document.createElement('script')
      script.id = 'atelier-gtm'
      script.innerHTML = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
        Date.now(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
        'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
      })(window,document,'script','dataLayer','${gtm}');`
      document.head.appendChild(script)
    }

    if (ga && !document.getElementById('atelier-ga')) {
      const src = document.createElement('script')
      src.id = 'atelier-ga'
      src.async = true
      src.src = `https://www.googletagmanager.com/gtag/js?id=${ga}`
      document.head.appendChild(src)
      const boot = document.createElement('script')
      boot.innerHTML = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date()); gtag('config', ${JSON.stringify(ga)});`
      document.head.appendChild(boot)
    }
  }, [ga, gtm, verify])

  if (!gtm) return null
  return (
    <noscript>
      <iframe
        title="Google Tag Manager"
        src={`https://www.googletagmanager.com/ns.html?id=${gtm}`}
        height={0}
        width={0}
        style={{ display: 'none', visibility: 'hidden' }}
      />
    </noscript>
  )
}
