import type { ReactNode } from 'react'

interface FormFieldProps {
  label: string
  error?: string
  required?: boolean
  children: ReactNode
}

export default function FormField({ label, error, required = false, children }: FormFieldProps) {
  return (
    <label className="form-group">
      <span>
        {label}
        {required && <span style={{ color: 'var(--accent)' }}> *</span>}
      </span>
      {children}
      {error && (
        <span className="field-hint" style={{ color: 'var(--danger)', fontWeight: 700 }}>
          {error}
        </span>
      )}
    </label>
  )
}