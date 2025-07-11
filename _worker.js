import { handleSubRequest } from './src/handlers/subconverter.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname } = url;
	
    if (pathname.startsWith('/sub')) {
      return await handleSubRequest(request, env, ctx);
    }
	
    return new Response('Not Found', { status: 404 });
  }
};