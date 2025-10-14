const FUNCTION_PREFIX = '/.netlify/functions/api';
const API_PREFIX = '/api';
const GLOBAL_HANDLER_KEY = '__posecomposeApiHandler';
let cachedHandler = null;
const resolveHandler = async () => {
    const override = globalThis[GLOBAL_HANDLER_KEY];
    if (override) {
        return override;
    }
    if (!cachedHandler) {
        const module = await import('../../../api/index.js');
        cachedHandler = module.default;
    }
    return cachedHandler;
};
const normalizeRequest = (request) => {
    const url = new URL(request.url);
    if (url.pathname === FUNCTION_PREFIX) {
        url.pathname = API_PREFIX;
        return new Request(url, request);
    }
    if (url.pathname.startsWith(`${FUNCTION_PREFIX}/`)) {
        url.pathname = `${API_PREFIX}${url.pathname.slice(FUNCTION_PREFIX.length)}`;
        return new Request(url, request);
    }
    return request;
};
export default async (request) => {
    const handler = await resolveHandler();
    const normalizedRequest = normalizeRequest(request);
    return handler(normalizedRequest);
};
export const config = {
    path: ['/api/*', '/.netlify/functions/api', '/.netlify/functions/api/*'],
};
