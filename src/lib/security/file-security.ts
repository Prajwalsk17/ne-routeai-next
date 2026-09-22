/**
 * AuraNER / NER-Route AI — Production File Security & Document Validation
 * 
 * Provides:
 * 1. Safe filename sanitization (path traversal & null byte injection defenses)
 * 2. MIME type & extension whitelist verification
 * 3. File size constraints enforcement (10MB max limit)
 * 4. Storage URL validation against malicious protocols (javascript:, data:, etc.)
 */

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'] as const;

export const MAX_UPLOAD_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 Megabytes

export interface FileValidationInput {
  name: string;
  size: number;
  mimeType: string;
}

export interface FileValidationResult {
  valid: boolean;
  sanitizedFilename: string;
  error?: string;
}

/**
 * Sanitizes a filename to prevent path traversal, drive letter escaping, and null byte attacks
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return `document_${Date.now()}.pdf`;
  }

  // Remove null bytes
  let clean = filename.replace(/\0/g, '');

  // Strip any directory path components (taking only the file basename)
  clean = clean.replace(/^.*[/\\]/, '');

  // Strip dangerous characters
  clean = clean.replace(/[/\\?%*:|"<>]/g, '_');

  // Collapse consecutive dots and strip leading dots
  clean = clean.replace(/\.{2,}/g, '.');
  clean = clean.replace(/^\.+/, '');

  // Trim whitespace
  clean = clean.trim();

  if (clean.length === 0) {
    return `document_${Date.now()}.pdf`;
  }

  // Maximum filename length: 120 characters
  if (clean.length > 120) {
    const extIndex = clean.lastIndexOf('.');
    const ext = extIndex !== -1 ? clean.slice(extIndex) : '';
    clean = clean.slice(0, 120 - ext.length) + ext;
  }

  return clean;
}

/**
 * Validates file upload metadata for vehicle and driver document submissions
 */
export function validateDocumentUpload(input: FileValidationInput): FileValidationResult {
  const sanitizedFilename = sanitizeFilename(input.name);

  // 1. File size check
  if (input.size <= 0) {
    return {
      valid: false,
      sanitizedFilename,
      error: 'File is empty (0 bytes).',
    };
  }

  if (input.size > MAX_UPLOAD_FILE_SIZE_BYTES) {
    return {
      valid: false,
      sanitizedFilename,
      error: `File size exceeds the 10MB limit (received: ${(input.size / (1024 * 1024)).toFixed(2)}MB).`,
    };
  }

  // 2. MIME type check
  const normalizedMime = input.mimeType.toLowerCase().trim();
  const isMimeAllowed = (ALLOWED_DOCUMENT_MIME_TYPES as readonly string[]).includes(normalizedMime);
  if (!isMimeAllowed) {
    return {
      valid: false,
      sanitizedFilename,
      error: `Disallowed MIME type: ${normalizedMime}. Allowed formats: PDF, JPEG, PNG, WEBP.`,
    };
  }

  // 3. Extension check
  const dotIndex = sanitizedFilename.lastIndexOf('.');
  if (dotIndex === -1) {
    return {
      valid: false,
      sanitizedFilename,
      error: 'File must have a valid extension (.pdf, .jpg, .jpeg, .png, .webp).',
    };
  }

  const ext = sanitizedFilename.slice(dotIndex).toLowerCase();
  const isExtAllowed = (ALLOWED_EXTENSIONS as readonly string[]).includes(ext as any);
  if (!isExtAllowed) {
    return {
      valid: false,
      sanitizedFilename,
      error: `Disallowed file extension: ${ext}. Allowed extensions: .pdf, .jpg, .jpeg, .png, .webp.`,
    };
  }

  return {
    valid: true,
    sanitizedFilename,
  };
}

/**
 * Validates document storage URLs to ensure safe schemes (HTTPS or internal vault protocol)
 */
export function validateStorageUrl(url: string): { valid: boolean; error?: string } {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'Storage URL cannot be empty.' };
  }

  const trimmed = url.trim();

  // Explicitly reject malicious pseudo-protocols
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('file:')
  ) {
    return { valid: false, error: 'Disallowed URL protocol.' };
  }

  // Allow approved https or internal vault URL prefixes
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://localhost') || trimmed.startsWith('auraner-vault://')) {
    return { valid: true };
  }

  return { valid: false, error: 'Storage URL must use HTTPS or internal vault scheme.' };
}
