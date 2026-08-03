import * as React from 'react'
import { Button, Link, Text } from '@react-email/components'
import { BrandEmailLayout, styles } from './_layout'

interface EmailChangeEmailProps {
  siteName: string
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <BrandEmailLayout
    preview={`تأكيد تغيير البريد الإلكتروني — ${siteName}`}
    title="تأكيد تغيير البريد الإلكتروني"
  >
    <Text style={styles.text}>
      طلبت تغيير البريد الإلكتروني في حساب <strong>{siteName}</strong> من{' '}
      <Link href={`mailto:${oldEmail}`} style={styles.link}>{oldEmail}</Link>{' '}
      إلى{' '}
      <Link href={`mailto:${newEmail}`} style={styles.link}>{newEmail}</Link>.
    </Text>
    <Text style={{ textAlign: 'center', margin: '24px 0' }}>
      <Button style={styles.button} href={confirmationUrl}>
        تأكيد تغيير البريد
      </Button>
    </Text>
    <Text style={styles.muted}>
      إذا لم تقم بهذا الطلب، يُرجى تأمين حسابك فوراً وتغيير كلمة المرور.
    </Text>
  </BrandEmailLayout>
)

export default EmailChangeEmail
