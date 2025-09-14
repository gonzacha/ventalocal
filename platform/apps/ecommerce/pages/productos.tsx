import { GetServerSideProps } from 'next';
import Head from 'next/head';
import ProductCatalog from '../components/ProductCatalog';

interface TenantConfig {
  primaryColor: string;
  secondaryColor: string;  
  brandName: string;
  logo?: string;
  domain: string;
}

interface ProductsPageProps {
  tenantConfig: TenantConfig;
}

export default function ProductsPage({ tenantConfig }: ProductsPageProps) {
  return (
    <>
      <Head>
        <title>Catálogo de Productos - {tenantConfig.brandName}</title>
        <meta 
          name="description" 
          content={`Explorá nuestro catálogo completo de electrodomésticos en ${tenantConfig.brandName}. Heladeras, lavarropas, Smart TVs y más con las mejores ofertas.`} 
        />
        <meta name="keywords" content="catálogo electrodomésticos, productos, heladeras, lavarropas, smart tv, ofertas" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        
        <meta property="og:title" content={`Catálogo - ${tenantConfig.brandName}`} />
        <meta property="og:description" content="Descubrí todos nuestros productos con las mejores ofertas" />
        <meta name="theme-color" content={tenantConfig.primaryColor} />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b sticky top-0 z-40">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-sky-500 text-white font-bold grid place-items-center"
                >
                  {tenantConfig.brandName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h1 className="font-bold text-gray-900">{tenantConfig.brandName}</h1>
                  <p className="text-sm text-gray-500">Catálogo de productos</p>
                </div>
              </div>
              
              <button
                onClick={() => window.location.href = '/'}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                ← Volver al inicio
              </button>
            </div>
          </div>
        </header>

        {/* Product Catalog */}
        <main>
          <ProductCatalog tenantConfig={tenantConfig} />
        </main>

        {/* Footer */}
        <footer className="bg-gray-900 text-white py-12 mt-16">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-8">
              <div>
                <h3 className="font-bold text-xl mb-4">{tenantConfig.brandName}</h3>
                <p className="text-gray-300">
                  Tu tienda de electrodomésticos de confianza. 
                  Las mejores marcas con garantía y servicio técnico.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-4">Información</h4>
                <ul className="space-y-2 text-gray-300">
                  <li>Términos y condiciones</li>
                  <li>Política de privacidad</li>
                  <li>Formas de pago</li>
                  <li>Garantías</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-4">Contacto</h4>
                <ul className="space-y-2 text-gray-300">
                  <li>📧 info@{tenantConfig.domain}</li>
                  <li>📱 WhatsApp: +54 9 11 1234-5678</li>
                  <li>🕒 Lun a Vie 9-18hs</li>
                  <li>📍 Corrientes Capital</li>
                </ul>
              </div>
            </div>
            
            <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
              <p>
                © {new Date().getFullYear()} {tenantConfig.brandName} · 
                Powered by <span className="text-white font-semibold">ComercioYA</span>
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const host = context.req.headers.host || 'localhost';
  
  // Mock tenant configuration
  const tenantConfig: TenantConfig = {
    primaryColor: '#0ea5e9',
    secondaryColor: '#06b6d4', 
    brandName: 'Distribuidora NEA',
    logo: '/logo.png',
    domain: host
  };

  return {
    props: {
      tenantConfig
    }
  };
};