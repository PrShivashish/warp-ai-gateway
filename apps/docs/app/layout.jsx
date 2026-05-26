import { Footer, Layout, Navbar } from 'nextra-theme-docs'
import { Head } from 'nextra/components'
import { getPageMap } from 'nextra/page-map'
import 'nextra-theme-docs/style.css'
import './globals.css'

export const metadata = {
  title: {
    default: 'Warp Docs',
    template: '%s — Warp',
  },
  description: 'Developer documentation for the Warp LLM gateway',
}

export default async function RootLayout({ children }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head />
      <body>
        <Layout
          navbar={
            <Navbar
              logo={<b>Warp</b>}
              projectLink="https://github.com/your-org/warp"
            />
          }
          pageMap={await getPageMap()}
          docsRepositoryBase="https://github.com/your-org/warp/tree/main/apps/docs"
          footer={<Footer>MIT {new Date().getFullYear()} © Warp</Footer>}
        >
          {children}
        </Layout>
      </body>
    </html>
  )
}
