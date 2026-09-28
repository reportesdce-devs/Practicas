import type { ReactNode } from 'react'

interface FormFieldProps {
  label: string
  error?: string
  required?: boolean
  children: ReactNode
}

export default function FormField({ label, error, required = false, children }: FormFieldProps) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-semibold text-gray-700">
        {label}
        {required && <span className="text-brand"> *</span>}
      </span>
      {children}
      {error && <span className="mt-1 block text-xs font-semibold text-red-600">{error}</span>}
    </label>
  )
}
