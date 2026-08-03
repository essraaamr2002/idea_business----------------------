import * as React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
  Hr,
} from '@react-email/components'

export const BRAND = {
  name: 'IDEA BUSINESS',
  tagline: 'Turning Ideas Into Projects',
  url: 'https://busniss.org',
  logo: 'https://busniss.org/og-logo.png',
  primary: '#0ea5e9',
  primaryDark: '#0369a1',
  text: '#0f172a',
  muted: '#64748b',
  border: '#e2e8f0',
}

interface LayoutProps {
  preview: string
  title: string
  children: React.ReactNode
}

export function BrandEmailLayout({ preview, title, children }: LayoutProps) {
  return (
    <Html lang="ar" dir="rtl">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Img
              src={BRAND.logo}
              width="140"
              height="140"
              alt={BRAND.name}
              style={logoImg}
            />
            <Heading style={brandName}>{BRAND.name}</Heading>
            <Text style={tagline}>{BRAND.tagline}</Text>
          </Section>

          <Section style={card}>
            <Heading as="h2" style={h2}>
              {title}
            </Heading>
            {children}
          </Section>

          <Hr style={hr} />
          <Text style={footer}>
            © {new Date().getFullYear()} {BRAND.name} — جميع الحقوق محفوظة.
            <br />
            هذه رسالة آلية، يرجى عدم الرد عليها.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const styles = {
  text: {
    fontSize: '15px',
    color: BRAND.text,
    lineHeight: '1.7',
    margin: '0 0 16px',
    textAlign: 'right' as const,
  },
  muted: {
    fontSize: '13px',
    color: BRAND.muted,
    lineHeight: '1.6',
    margin: '24px 0 0',
    textAlign: 'right' as const,
  },
  button: {
    backgroundColor: BRAND.primary,
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: 'bold' as const,
    borderRadius: '10px',
    padding: '14px 28px',
    textDecoration: 'none',
    display: 'inline-block',
  },
  code: {
    display: 'inline-block',
    fontFamily: 'Courier, monospace',
    fontSize: '28px',
    fontWeight: 'bold' as const,
    letterSpacing: '6px',
    color: BRAND.primaryDark,
    background: '#f0f9ff',
    border: `1px solid ${BRAND.border}`,
    borderRadius: '10px',
    padding: '14px 22px',
    margin: '8px 0 16px',
  },
  link: { color: BRAND.primary, textDecoration: 'underline' },
}

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '"Cairo", "Segoe UI", Tahoma, Arial, sans-serif',
}
const container = { maxWidth: '600px', margin: '0 auto', padding: '32px 20px' }
const header = { textAlign: 'center' as const, padding: '0 0 24px' }
const logoImg = {
  display: 'block',
  margin: '0 auto 12px',
  borderRadius: '12px',
}
const brandName = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: BRAND.text,
  margin: '0',
}
const tagline = {
  fontSize: '12px',
  color: BRAND.muted,
  margin: '4px 0 0',
  letterSpacing: '0.5px',
}
const card = {
  background: '#ffffff',
  border: `1px solid ${BRAND.border}`,
  borderRadius: '14px',
  padding: '28px 26px',
  textAlign: 'right' as const,
}
const h2 = {
  fontSize: '20px',
  fontWeight: 'bold' as const,
  color: BRAND.text,
  margin: '0 0 18px',
  textAlign: 'right' as const,
}
const hr = { borderColor: BRAND.border, margin: '28px 0 14px' }
const footer = {
  fontSize: '12px',
  color: BRAND.muted,
  textAlign: 'center' as const,
  lineHeight: '1.6',
}
