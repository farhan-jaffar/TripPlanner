import { AxiosError } from 'axios';

export function parseApiError(error) {
  if (!(error instanceof AxiosError) || !error.response) {
    if (error instanceof Error) {
      return { message: error.message, fieldErrors: {} };
    }
    return { message: 'An unexpected network error occurred.', fieldErrors: {} };
  }

  const { status, data } = error.response;
  const fieldErrors = {};
  const messages = [];

  if (typeof data === 'string') {
    return { message: data, fieldErrors: {} };
  }

  if (data && typeof data === 'object') {
    if ('detail' in data && typeof data.detail === 'string') {
      return { message: data.detail, fieldErrors: {} };
    }

    Object.entries(data).forEach(([key, value]) => {
      let errorMsg = '';
      if (Array.isArray(value)) {
        errorMsg = value.map((v) => (typeof v === 'string' ? v : JSON.stringify(v))).join(' ');
      } else if (typeof value === 'string') {
        errorMsg = value;
      } else if (typeof value === 'object' && value !== null) {
        errorMsg = Object.values(value).flat().join(' ');
      }

      if (key === 'non_field_errors') {
        messages.push(errorMsg);
      } else {
        fieldErrors[key] = errorMsg;
        messages.push(`${key}: ${errorMsg}`);
      }
    });
  }

  const primaryMessage =
    messages.length > 0
      ? messages.join(' | ')
      : `Request failed with status code ${status}`;

  return {
    message: primaryMessage,
    fieldErrors,
  };
}

export function applyApiFieldErrors(fieldErrors, setError) {
  Object.entries(fieldErrors).forEach(([field, message]) => {
    setError(field, {
      type: 'server',
      message,
    });
  });
}
