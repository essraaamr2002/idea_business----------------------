import React from 'react'
import { Body, Container, Head, Heading, Html, Preview, Text, Button, Section, Hr } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  name?: string
  siteUrl?: string
}

const Email = ({ name, siteUrl = 'https://busniss.org' }: Props) => (
  <Html lang="ar" dir="rtl">
    <Head />
    <Preview>أهلًا بك في IDEA BUSINESS — منصة الاستثمار الذكي</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar}>
          <Text style={brand}>IDEA BUSINESS</Text>
        </Section>
        <Heading style={h1}>{name ? `مرحبًا ${name} 👋` : 'مرحبًا بك 👋'}</Heading>
        <Text style={text}>
          نشكرك على انضمامك إلى منصة <strong>IDEA BUSINESS</strong> — حيث تتداول الأفكار وتنمو الاستثمارات.
        </Text>
        <Text style={text}>
          أنت الآن جزء من مجتمع آلاف المستثمرين والمؤسسين. ابدأ باستكشاف المشاريع، ضع أهدافك المالية، أو راجع دليل البدء السريع.
        </Text>
        <Section style={{ textAlign: 'center', margin: '32px 0' }}>
          <Button href={siteUrl} style={button}>
            ابدأ الاستكشاف
          </Button>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>
          إذا لم تنشئ هذا الحساب يمكنك تجاهل هذه الرسالة بأمان.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => (d.name ? `أهلًا ${d.name} في IDEA BUSINESS` : 'أهلًا بك في IDEA BUSINESS'),
  displayName: 'رسالة الترحيب',
  previewData: { name: 'سارة', siteUrl: 'https://busniss.org' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Cairo, Arial, sans-serif' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '32px 24px' }
const brandBar = { textAlign: 'center' as const, marginBottom: '20px' }
const brand = { fontSize: '14px', fontWeight: 800, color: '#0ea5e9', letterSpacing: '1px', margin: 0 }
const h1 = { fontSize: '24px', fontWeight: 800, color: '#0f172a', textAlign: 'center' as const, margin: '0 0 16px' }
const text = { fontSize: '15px', lineHeight: '24px', color: '#334155', margin: '0 0 12px' }
const button = { backgroundColor: '#0ea5e9', color: '#ffffff', padding: '12px 28px', borderRadius: '10px', fontWeight: 700, textDecoration: 'none' }
const hr = { borderColor: '#e2e8f0', margin: '28px 0' }
const footer = { fontSize: '12px', color: '#94a3b8', textAlign: 'center' as const }
