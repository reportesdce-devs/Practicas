import type { ReactNode } from 'react'

interface FormFieldProps {
  label: string
  error?: string
  required?: boolean
  children: ReactNode
}

export default function FormField({ label, error, required = false, children }: FormFieldProps) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-ink/65">
        {label}
        {required && <span className="text-brand">*</span>}
      </span>
      {children}
      {error && <span className="mt-1.5 block text-xs font-semibold text-danger">{error}</span>}
    </label>
  )
}