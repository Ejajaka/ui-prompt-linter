// The Streamlit engine embedded on the New Analysis page.
// Override at runtime with ?engine=https://your-app.streamlit.app
const params = new URLSearchParams(window.location.search);
const fromQuery = params.get('engine');

export const ENGINE_URL =
  fromQuery ||
  'https://ui-prompt-linte-ecdeszwu2gpoaebpkgus3y.streamlit.app';

const separator = ENGINE_URL.includes('?') ? '&' : '?';
export const ENGINE_EMBED_URL = `${ENGINE_URL}${separator}embed=true&uiembed=1`;
