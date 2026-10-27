package com.mingalarcinema.app;

import org.junit.Test;
import static org.junit.Assert.*;

public class WebViewCompatibilityTest {
    @Test public void acceptsCurrentChromiumEngines() {
        assertTrue(WebViewCompatibility.isSupported("111.0.5563.116"));
        assertTrue(WebViewCompatibility.isSupported("138.0.7204.179"));
    }
    @Test public void detectsUnsupportedEngines() {
        assertFalse(WebViewCompatibility.isSupported("106.0.5249.126"));
        assertFalse(WebViewCompatibility.isSupported("110.0.5481.154"));
    }
    @Test public void letsUnknownVendorVersionsTryNormally() {
        assertTrue(WebViewCompatibility.isSupported(null));
        assertTrue(WebViewCompatibility.isSupported("vendor-version"));
    }
    @Test public void supportsUpdatedAndroidSevenWebView() {
        assertTrue(WebViewCompatibility.isSupportedUserAgent("Mozilla/5.0 (Linux; Android 7.0; wv) AppleWebKit/537.36 Version/4.0 Chrome/119.0.6045.193 Mobile Safari/537.36"));
    }
    @Test public void detectsOutdatedEngineFromUserAgentOnOlderAndroid() {
        assertFalse(WebViewCompatibility.isSupportedUserAgent("Mozilla/5.0 (Linux; Android 7.0; wv) Chrome/106.0.5249.126 Mobile Safari/537.36"));
        assertTrue(WebViewCompatibility.isSupportedUserAgent(null));
        assertTrue(WebViewCompatibility.isSupportedUserAgent("Unknown vendor"));
    }
}
