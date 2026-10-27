package com.mingalarcinema.app;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

final class WebViewCompatibility {
    private static final Pattern CHROMIUM_VERSION = Pattern.compile("(?:Chrome|Chromium)/(\\d+)(?:\\.|\\s|$)");
    // Next.js 16's documented Chromium baseline. Unknown vendor versions are tried normally.
    static boolean isSupported(String version) {
        if (version == null) return true;
        try { return Integer.parseInt(version.split("\\.", 2)[0]) >= 111; }
        catch (NumberFormatException e) { return true; }
    }
    static boolean isSupportedUserAgent(String userAgent) {
        if (userAgent == null) return true;
        Matcher match = CHROMIUM_VERSION.matcher(userAgent);
        return !match.find() || isSupported(match.group(1));
    }
}
