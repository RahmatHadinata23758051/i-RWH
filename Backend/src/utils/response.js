/**
 * Helper untuk response JSON envelope yang seragam dan profesional
 */

export function successResponse({
  statusCode = 200,
  message = 'Operasi berhasil',
  data = null,
  meta = {}
}) {
  return {
    success: true,
    statusCode,
    message,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta
    }
  };
}

export function errorResponse({
  statusCode = 500,
  error = 'Internal Server Error',
  message = 'Terjadi kesalahan pada server',
  details = null
}) {
  const response = {
    success: false,
    statusCode,
    error,
    message,
    meta: {
      timestamp: new Date().toISOString()
    }
  };

  if (details) {
    response.details = details;
  }

  return response;
}
