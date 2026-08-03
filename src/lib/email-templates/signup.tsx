import * as React from 'react'
import { Button, Link, Text } from '@react-email/components'
import { BrandEmailLayout, styles } from './_layout'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <BrandEmailLayout
    preview={`أكّد بريدك للانضمام إلى ${siteName}`}
    title="مرحباً بك في IDEA BUSINESS 👋"
  >
    <Text style={styles.text}>
      شكراً لانضمامك إلى <strong>{siteName}</strong> — المنصة العربية لتداول
      الأفكار وتنمية الاستثمارات.
    </Text>
    <Text style={styles.text}>
      لتفعيل حسابك (<Link href={`mailto:${recipient}`} style={styles.link}>{recipient}</Link>)،
      اضغط على الزر التالي:
    </Text>
    <Text style={{ textAlign: 'center', margin: '24px 0' }}>
      <Button style={styles.button} href={confirmationUrl}>
        تأكيد البريد وتفعيل الحساب
      </Button>
    </Text>
    <Text style={styles.muted}>
      إذا لم تنشئ حساباً، يمكنك تجاهل هذه الرسالة بأمان.
    </Text>
  </BrandEmailLayout>
)

export default SignupEmail
