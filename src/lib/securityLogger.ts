import winston from 'winston';

const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

export type SecurityEventLevel = 'low' | 'medium' | 'high' | 'critical';

export function logSecurityEvent(level: SecurityEventLevel, event: string, details?: Record<string, any>) {
  securityLogger.log({
    level: level === 'low' ? 'info' : level,
    event,
    message: event, // Required by winston types
    ...details,
  });
}

export default securityLogger; 