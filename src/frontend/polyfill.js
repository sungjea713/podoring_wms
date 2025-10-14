// Polyfill for Supabase in browser
// This must be loaded BEFORE any other scripts
globalThis.global = globalThis
window.global = window
window.process = window.process || { env: {} }
console.log('✅ Global polyfill loaded')
