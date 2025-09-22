import path from 'path';
import fs from 'fs';
import { logSecurityEvent } from './securityLogger';

export function createSecureExportPath(filename: string, tenantId: string): string {
  // Sanitize filename to prevent directory traversal
  const sanitizedFilename = path.basename(filename).replace(/[^a-zA-Z0-9.-]/g, '_');
  const timestamp = Date.now();
  // Create tenant-specific export directory with secure permissions
  const exportDir = path.join(process.cwd(), 'secure_exports', tenantId);
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true, mode: 0o750 });
  }
  return path.join(exportDir, `${timestamp}_${sanitizedFilename}`);
}

export async function exportValidationPipeline({ customerId, tenantId, requestorId, hasGDPRConsent, hasAccessPermission, meetsRetentionPolicy }: {
  customerId: string;
  tenantId: string;
  requestorId: string;
  hasGDPRConsent: boolean;
  hasAccessPermission: boolean;
  meetsRetentionPolicy: boolean;
}) {
  // 1. Customer Verification
  if (!customerId || !tenantId) {
    logSecurityEvent('medium', 'invalid_export_request', { reason: 'Missing customer or tenant', customerId, tenantId });
    throw new Error('Customer or tenant not found');
  }
  // 2. GDPR Consent Check
  if (!hasGDPRConsent) {
    logSecurityEvent('high', 'export_validation_error', { reason: 'Missing GDPR consent', customerId, tenantId });
    throw new Error('GDPR consent required');
  }
  // 3. Access Permission Validation
  if (!hasAccessPermission) {
    logSecurityEvent('high', 'export_validation_error', { reason: 'No access permission', requestorId });
    throw new Error('Access denied');
  }
  // 4. Data Retention Policy
  if (!meetsRetentionPolicy) {
    logSecurityEvent('high', 'export_validation_error', { reason: 'Data retention policy violation', customerId });
    throw new Error('Data retention policy violation');
  }
  // 5. Audit Trail Creation
  logSecurityEvent('low', 'export_audit_trail', { customerId, tenantId, requestorId });
  return true;
} 