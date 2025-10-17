/**
 * Browser Extension Error Suppression
 *
 * This utility suppresses harmless errors from browser extensions that can clutter the console.
 * These errors are typically caused by extensions like password managers, ad blockers, etc.
 */

export function suppressExtensionErrors() {
  if (typeof window === 'undefined') return;

  // Store original console methods
  const originalError = console.error;
  const originalWarn = console.warn;

  // Patterns to identify extension-related errors
  const extensionErrorPatterns = [
    /A listener indicated an asynchronous response/i,
    /runtime\.lastError/i,
    /Extension context invalidated/i,
    /ResizeObserver loop limit exceeded/i,
    /Non-Error promise rejection captured/i,
    /Cannot access a chrome:\/\/ URL/i,
  ];

  // Override console.error
  console.error = (...args) => {
    const errorString = args.join(' ');

    // Check if this is an extension-related error
    const isExtensionError = extensionErrorPatterns.some(pattern =>
      pattern.test(errorString)
    );

    // Only log if it's not an extension error
    if (!isExtensionError) {
      originalError.apply(console, args);
    }
  };

  // Override console.warn for similar extension warnings
  console.warn = (...args) => {
    const warnString = args.join(' ');

    // Check if this is an extension-related warning
    const isExtensionWarning = extensionErrorPatterns.some(pattern =>
      pattern.test(warnString)
    );

    // Only log if it's not an extension warning
    if (!isExtensionWarning) {
      originalWarn.apply(console, args);
    }
  };

  // Also handle unhandled promise rejections that are extension-related
  window.addEventListener('unhandledrejection', (event) => {
    const errorMessage = event.reason?.toString() || '';

    const isExtensionError = extensionErrorPatterns.some(pattern =>
      pattern.test(errorMessage)
    );

    if (isExtensionError) {
      event.preventDefault(); // Prevent the default error logging
    }
  });
}