import { useEffect, useRef, useState } from 'react'
import ReCAPTCHA from 'react-google-recaptcha'
import { api } from '../lib/api'

interface Props {
  onChange: (token: string | null) => void
}

export default function CaptchaField({ onChange }: Props) {
  const ref = useRef<ReCAPTCHA>(null)
  const [siteKey, setSiteKey] = useState('')

  useEffect(() => {
    api.authConfig().then((c) => setSiteKey(c.recaptcha_site_key)).catch(() => setSiteKey(''))
  }, [])

  if (!siteKey) {
    return (
      <div className="rounded-lg border border-dashed border-outline/40 bg-surface-container p-3 text-sm text-on-surface/60">
        Captcha disabled in dev (set RECAPTCHA keys in backend .env)
        <button
          type="button"
          className="ml-2 text-primary underline"
          onClick={() => onChange('dev-bypass')}
        >
          Continue
        </button>
      </div>
    )
  }

  return (
    <ReCAPTCHA
      ref={ref}
      sitekey={siteKey}
      onChange={onChange}
      onExpired={() => onChange(null)}
    />
  )
}
