// The Streamlit engine embedded on the New Analysis page.
// Override at runtime with ?engine=https://your-app.streamlit.app
const params = new URLSearchParams(window.location.search);
const fromQuery = params.get('engine');

export const ENGINE_URL =
  fromQuery ||
  'https://attitudes-assembled-punk-breeds.trycloudflare.com';

export const ENGINE_EMBED_URL = `${ENGINE_URL}${ENGINE_URL.includes('?') ? '&' : '?'}uiembed=1`;
