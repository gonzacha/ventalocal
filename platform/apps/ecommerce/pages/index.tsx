import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import Head from 'next/head';
import TemuStyleShowcase from '../components/TemuStyleShowcase';

interface TenantConfig {
  primaryColor: string;
  secondaryColor: string;
  brandName: string;
  logo?: string;
  domain: string;
  features: string[];
}

interface HomePageProps {
  tenantConfig: TenantConfig;
}

export default function HomePage({ tenantConfig }: HomePageProps) {
  const router = useRouter();

  const handleCTA = () => {
    router.push('/productos');
  };

  return (
    <>
      <Head>
        <title>{tenantConfig.brandName} - Electrodomésticos Online</title>
        <meta 
          name="description" 
          content={`Comprá electrodomésticos en ${tenantConfig.brandName}. Ofertas exclusivas, cuotas sin interés y entrega rápida. La mejor experiencia de compra online.`} 
        />
        <meta name="keywords" content="electrodomésticos, heladeras, lavarropas, smart tv, aires acondicionados, ofertas" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        
        {/* Open Graph */}
        <meta property="og:title" content={`${tenantConfig.brandName} - Electrodomésticos Online`} />
        <meta property="og:description" content="Las mejores marcas de electrodomésticos con ofertas exclusivas" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`https://${tenantConfig.domain}`} />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${tenantConfig.brandName} - Electrodomésticos`} />
        
        {/* Theme Color */}
        <meta name="theme-color" content={tenantConfig.primaryColor} />
        
        {/* Preconnect */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        
        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        
        {/* Schema.org */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Store",
              "name": tenantConfig.brandName,
              "url": `https://${tenantConfig.domain}`,
              "description": "Venta de electrodomésticos online con las mejores marcas",
              "address": {
                "@type": "PostalAddress",
                "addressCountry": "AR"
              },
              "priceRange": "$$",
              "paymentAccepted": ["Credit Card", "Cash", "Mercado Pago"]
            })
          }}
        />
      </Head>

      <TemuStyleShowcase 
        onCTA={handleCTA}
        tenantConfig={tenantConfig}
      />
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  // In a real multi-tenant app, you'd determine the tenant from:
  // - Subdomain: distribuidor1.ventalocal.com
  // - Custom domain: mitienda.com.ar  
  // - Header: Host header
  const host = context.req.headers.host || 'localhost';
  
  // Mock tenant configuration - in production this would come from database
  const tenantConfig: TenantConfig = {
    primaryColor: '#0ea5e9', // Sky blue
    secondaryColor: '#06b6d4', // Cyan
    brandName: 'Distribuidora NEA',
    logo: '/logo.png',
    domain: host,
    features: [
      'Cuotas sin interés',
      'Entrega rápida', 
      'Garantía extendida',
      'Soporte técnico',
      'Mercado Pago'
    ]
  };

  // TODO: Replace with real API call
  // const tenantConfig = await getTenantByDomain(host);
  
  return {
    props: {
      tenantConfig
    }
  };
};