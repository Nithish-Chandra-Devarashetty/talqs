import crypto from 'crypto';

/**
 * Generates a SHA-256 hash fingerprint from file content
 * @param content The file content to hash
 * @returns SHA-256 hash of the content
 */
export function generateFingerprint(content: string | ArrayBuffer): string {
  const hash = crypto.createHash('sha256');
  
  if (typeof content === 'string') {
    hash.update(content);
  } else {
    hash.update(Buffer.from(content));
  }
  
  return hash.digest('hex');
}

/**
 * Extracts metadata from a file
 * @param file The file to extract metadata from
 * @returns Object containing file metadata
 */
export async function extractFileMetadata(file: File): Promise<{
  name: string;
  size: number;
  content: string;
  fingerprint: string;
}> {
  // Read file content
  const content = await readFileAsText(file);
  
  // Generate fingerprint
  const fingerprint = generateFingerprint(content);
  
  return {
    name: file.name,
    size: file.size,
    content,
    fingerprint
  };
}

/**
 * Reads a file as text
 * @param file The file to read
 * @returns Promise resolving to the file content as string
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      resolve(reader.result as string);
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
}

/**
 * Truncates a string to a maximum length with ellipsis
 * @param str The string to truncate
 * @param maxLength Maximum length before truncation
 * @returns Truncated string
 */
export function truncateString(str: string, maxLength: number = 100): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '...';
}
