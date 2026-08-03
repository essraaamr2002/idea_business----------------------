import React from 'react'
import { Body, Container, Head, Heading, Html, Preview, Text, Button, Section, Hr } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  recipientName?: string
  senderName?: string
  preview?: string
  conversationUrl?: string
}

const Email = ({ recipientName, senderName = 'عضو في المنصة', preview, conversationUrl = 'https://busniss.org/messages' }: Props) => (
  <Html lang="ar" dir="rtl">
    <Head />
    <Preview>{senderName} أرسل لك رسالة جديدة في IDEA BUSINESS</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar}>
          <Text style={brand}>IDEA BUSINESS</Text>
        </Section>
        <Heading style={h1}>{recipientName ? `مرحبًا ${recipientName}` : 'مرحبًا'} 💬</Heading>
        <Text style={text}>
          لديك رسالة جديدة من <strong>{senderName}</strong>:
        </Text>
        {preview && (
          <Section style={quote}>
            <Text style={quoteText}>{preview}</Text>
          </Section>
        )}
        <Section style={{ textAlign: 'center', margin: '28px 0' }}>
          <Button href={conversationUrl} style={button}>فتح المحادثة</Button>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>
          يمكنك إيقاف إشعارات البريد من إعدادات الحساب &gt; التفضيلات.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `رسالة جديدة من ${d.senderName || 'عضو'} — IDEA BUSINESS`,
  displayName: 'إشعار رسالة جديدة',
  previewData: { recipientName: 'سارة', senderName: 'أحمد', preview: 'مرحبًا، أودّ مناقشة فرصة الاستثمار...', conversationUrl: 'https://busniss.org/messages' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Cairo, Arial, sans-serif' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '32px 24px' }
const brandBar = { textAlign: 'center' as const, marginBottom: '20px' }
const brand = { fontSize: '14px', fontWeight: 800, color: '#0ea5e9', letterSpacing: '1px', margin: 0 }
const h1 = { fontSize: '22px', fontWeight: 800, color: '#0f172a', textAlign: 'center' as const, margin: '0 0 16px' }
const text = { fontSize: '15px', lineHeight: '24px', color: '#334155', margin: '0 0 12px' }
const quote = { background: '#f1f5f9', borderRight: '3px solid #0ea5e9', padding: '12px 16px', borderRadius: '8px', margin: '12px 0' }
const quoteText = { fontSize: '14px', lineHeight: '22px', color: '#0f172a', margin: 0, whiteSpace: 'pre-wrap' as const }
const button = { backgroundColor: '#0ea5e9', color: '#ffffff', padding: '12px 28px', borderRadius: '10px', fontWeight: 700, textDecoration: 'none' }
const hr = { borderColor: '#e2e8f0', margin: '28px 0' }
const footer = { fontSize: '12px', color: '#94a3b8', textAlign: 'center' as const }
