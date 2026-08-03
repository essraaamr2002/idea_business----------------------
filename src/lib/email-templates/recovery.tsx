import * as React from 'react'
import { Button, Text } from '@react-email/components'
import { BrandEmailLayout, styles } from './_layout'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ siteName, confirmationUrl }: RecoveryEmailProps) => (
  <BrandEmailLayout
    preview={`إعادة تعيين كلمة المرور — ${siteName}`}
    title="إعادة تعيين كلمة المرور 🔑"
  >
    <Text style={styles.text}>
      وردنا طلب لإعادة تعيين كلمة المرور لحسابك في <strong>{siteName}</strong>.
      اضغط الزر التالي لاختيار كلمة مرور جديدة:
    </Text>
    <Text style={{ textAlign: 'center', margin: '24px 0' }}>
      <Button style={styles.button} href={confirmationUrl}>
        إعادة تعيين كلمة المرور
      </Button>
    </Text>
    <Text style={styles.muted}>
      إذا لم تطلب إعادة التعيين، يمكنك تجاهل هذه الرسالة وستبقى كلمة المرور كما
      هي.
    </Text>
  </BrandEmailLayout>
)

export default RecoveryEmail
