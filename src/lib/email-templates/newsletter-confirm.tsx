import React from 'react'
import { Body, Container, Head, Heading, Html, Preview, Text, Button, Section, Hr } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  confirmUrl?: string
  siteUrl?: string
}

const Email = ({ confirmUrl = 'https://busniss.org', siteUrl = 'https://busniss.org' }: Props) => (
  <Html lang="ar" dir="rtl">
    <Head />
    <Preview>أكّد اشتراكك في نشرة IDEA BUSINESS</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar}>
          <Text style={brand}>IDEA BUSINESS</Text>
        </Section>
        <Heading style={h1}>أكّد اشتراكك في النشرة 📬</Heading>
        <Text style={text}>
          شكرًا لاشتراكك في نشرة <strong>IDEA BUSINESS</strong>. للتحقّق من بريدك وبدء استلام الأخبار
          والفرص أسبوعيًا، اضغط الزر أدناه:
        </Text>
        <Section style={{ textAlign: 'center', margin: '32px 0' }}>
          <Button href={confirmUrl} style={button}>تأكيد الاشتراك</Button>
        </Section>
        <Text style={muted}>
          إن لم يعمل الزر، انسخ الرابط التالي والصقه في المتصفح:
          <br />
          <span style={{ direction: 'ltr', unicodeBidi: 'embed', wordBreak: 'break-all' }}>{confirmUrl}</span>
        </Text>
        <Hr style={hr} />
        <Text style={footer}>
          إذا لم تشترك بنفسك يمكنك تجاهل هذه الرسالة — لن نضيف بريدك دون تأكيدك.
          <br />
          <a href={siteUrl} style={{ color: '#0ea5e9' }}>{siteUrl}</a>
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'أكّد اشتراكك في نشرة IDEA BUSINESS',
  displayName: 'تأكيد اشتراك النشرة',
  previewData: { confirmUrl: 'https://busniss.org/newsletter/confirm?token=demo', siteUrl: 'https://busniss.org' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Cairo, Arial, sans-serif' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '32px 24px' }
const brandBar = { textAlign: 'center' as const, marginBottom: '20px' }
const brand = { fontSize: '14px', fontWeight: 800, color: '#0ea5e9', letterSpacing: '1px', margin: 0 }
const h1 = { fontSize: '22px', fontWeight: 800, color: '#0f172a', textAlign: 'center' as const, margin: '0 0 16px' }
const text = { fontSize: '15px', lineHeight: '24px', color: '#334155', margin: '0 0 12px' }
const muted = { fontSize: '12px', lineHeight: '20px', color: '#64748b', margin: '0 0 12px', textAlign: 'center' as const }
const button = { backgroundColor: '#0ea5e9', color: '#ffffff', padding: '12px 28px', borderRadius: '10px', fontWeight: 700, textDecoration: 'none' }
const hr = { borderColor: '#e2e8f0', margin: '28px 0' }
const footer = { fontSize: '12px', color: '#94a3b8', textAlign: 'center' as const }
