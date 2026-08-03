import * as React from 'react'
import { Text } from '@react-email/components'
import { BrandEmailLayout, styles } from './_layout'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <BrandEmailLayout
    preview="رمز التحقق الخاص بك"
    title="رمز التحقق 🔢"
  >
    <Text style={styles.text}>
      استخدم الرمز التالي لتأكيد هويتك:
    </Text>
    <Text style={{ textAlign: 'center', margin: '8px 0 20px' }}>
      <span style={styles.code}>{token}</span>
    </Text>
    <Text style={styles.muted}>
      هذا الرمز صالح لفترة قصيرة. إذا لم تطلبه، يمكنك تجاهل الرسالة بأمان.
    </Text>
  </BrandEmailLayout>
)

export default ReauthenticationEmail
