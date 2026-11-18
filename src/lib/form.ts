import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { isApiError } from './api/errors'

/**
 * Map backend VALIDATION_ERROR field violations onto react-hook-form fields.
 * Returns true when at least one field error was applied.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
): boolean {
  if (!isApiError(error, 'VALIDATION_ERROR')) return false
  for (const violation of error.fieldErrors) {
    setError(violation.field as Path<T>, { message: violation.message })
  }
  return error.fieldErrors.length > 0
}
