import * as React from 'react'
import { Button, Link, Text } from '@react-email/components'
import { BrandEmailLayout, styles } from './_layout'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ siteName, siteUrl, confirmationUrl }: InviteEmailProps) => (
  <BrandEmailLayout
    preview={`دعوة للانضمام إلى ${siteName}`}
    title="لقد تمت دعوتك! 🎉"
  >
    <Text style={styles.text}>
      تمت دعوتك للانضمام إلى{' '}
      <Link href={siteUrl} style={styles.link}>
        <strong>{siteName}</strong>
      </Link>{' '}
      — منصة الاستثمار وتداول الأفكار العربية.
    </Text>
    <Text style={{ textAlign: 'center', margin: '24px 0' }}>
      <Button style={styles.button} href={confirmationUrl}>
        قبول الدعوة وإنشاء الحساب
      </Button>
    </Text>
    <Text style={styles.muted}>
      إذا لم تكن تتوقع هذه الدعوة، يمكنك تجاهل الرسالة بأمان.
    </Text>
  </BrandEmailLayout>
)

export default InviteEmail
