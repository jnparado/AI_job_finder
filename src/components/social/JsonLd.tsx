import { publicAppUrl } from '@/lib/social'

export function JsonLd() {
  const url = publicAppUrl()
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        name: 'Atelier',
        alternateName: 'Atelier AI-Powered Job Matching',
        url,
        logo: `${url}/brand/atelier-logo.jpg`,
        description: 'AI-powered job matching for candidates and employers. Nothing is sent until you approve.',
        sameAs: [
          import.meta.env.VITE_SOCIAL_FACEBOOK,
          import.meta.env.VITE_SOCIAL_INSTAGRAM,
          import.meta.env.VITE_SOCIAL_LINKEDIN,
          import.meta.env.VITE_SOCIAL_X,
          import.meta.env.VITE_SOCIAL_YOUTUBE,
          import.meta.env.VITE_SOCIAL_TIKTOK,
        ].filter(Boolean),
      },
      {
        '@type': 'WebSite',
        name: 'Atelier',
        url,
        potentialAction: {
          '@type': 'SearchAction',
          target: `${url}/app/jobs`,
        },
      },
    ],
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
}
