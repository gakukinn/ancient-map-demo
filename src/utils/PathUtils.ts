/**
 * PathUtils.ts
 * Utility to handling path resolution, especially for static assets in production (GitHub Pages).
 */

export function resolvePath(path: string): string {
    // If path is absolute (starts with /), prepend BASE_URL
    if (path.startsWith('/')) {
        // import.meta.env.BASE_URL is provided by Vite
        // In dev: '/'
        // In prod: '/ancient-map-demo/' (or whatever is set in vite.config.js)
        const baseUrl = import.meta.env.BASE_URL;

        // Avoid double slashes if base ends with / and path starts with /
        if (baseUrl.endsWith('/') && path.startsWith('/')) {
            return baseUrl + path.slice(1);
        }
        return baseUrl + path;
    }
    return path;
}
