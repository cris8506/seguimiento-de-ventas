/**
 * Utility to copy text to clipboard with fallback for iframes/restricted permissions
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  // Modern navigator clipboard API
  if (navigator?.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('navigator.clipboard.writeText failed, using fallback:', err);
    }
  }

  // Fallback for sandboxed iframes or older browsers
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '-9999px';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('execCommand copy failed:', err);
    return false;
  }
}

/**
 * Resolves the real absolute Webhook URL for Hotmart
 */
export function getWebhookUrl(serverReportedUrl?: string): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin;
    // If the server reported a custom domain that is not localhost, we can trust it, otherwise use browser origin
    if (serverReportedUrl && !serverReportedUrl.includes('localhost') && !serverReportedUrl.includes('127.0.0.1')) {
      return serverReportedUrl;
    }
    return `${origin}/api/webhooks/hotmart`;
  }
  return serverReportedUrl || '/api/webhooks/hotmart';
}
