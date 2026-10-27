package com.mingalarcinema.app;

import java.net.URI;
import java.util.Locale;

final class NavigationPolicy {
    static boolean isInternal(String home, String target) {
        if (home == null || target == null) return false;
        try {
            URI base = URI.create(home), next = URI.create(target);
            return next.getUserInfo() == null && base.getScheme() != null
                && base.getScheme().equalsIgnoreCase(next.getScheme())
                && base.getHost() != null && base.getHost().equalsIgnoreCase(next.getHost())
                && port(base) == port(next);
        } catch (IllegalArgumentException e) { return false; }
    }
    static boolean canOpenExternally(String target) {
        if (target == null) return false;
        try {
            URI uri = URI.create(target);
            String scheme = uri.getScheme();
            return scheme != null && switch (scheme.toLowerCase(Locale.ROOT)) {
                case "https" -> uri.getHost() != null && uri.getUserInfo() == null;
                case "mailto", "tel", "kbzpay" -> uri.getSchemeSpecificPart() != null
                    && !uri.getSchemeSpecificPart().isEmpty();
                default -> false;
            };
        } catch (IllegalArgumentException e) { return false; }
    }
    private static int port(URI uri) {
        return uri.getPort() != -1 ? uri.getPort() : ("https".equalsIgnoreCase(uri.getScheme()) ? 443 : 80);
    }
}
