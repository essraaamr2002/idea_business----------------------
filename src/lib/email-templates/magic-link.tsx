import * as React from 'react'
import { Button, Text } from '@react-email/components'
import { BrandEmailLayout, styles } from './_layout'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ siteName, confirmationUrl }: MagicLinkEmailProps) => (
  <BrandEmailLayout
    preview={`رابط الدخول إلى ${siteName}`}
    title="رابط الدخول الخاص بك 🔐"
  >
    <Text style={styles.text}>
      اضغط على الزر التالي لتسجيل الدخول إلى <strong>{siteName}</strong>. هذا
      الرابط صالح لمدة قصيرة لأسباب أمنية.
    </Text>
    <Text style={{ textAlign: 'center', margin: '24px 0' }}>
      <Button style={styles.button} href={confirmationUrl}>
        تسجيل الدخول
      </Button>
    </Text>
    <Text style={styles.muted}>
      إذا لم تطلب هذا الرابط، يمكنك تجاهل الرسالة بأمان.
    </Text>
  </BrandEmailLayout>
)

export default MagicLinkEmail
