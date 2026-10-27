package com.mingalarcinema.app;
import org.junit.Test;
import static org.junit.Assert.*;

public class NavigationPolicyTest {
    private final String home = "https://cinema.example";
    @Test public void retainsSiteNavigation() {
        assertTrue(NavigationPolicy.isInternal(home, home + "/checkout/123"));
        assertTrue(NavigationPolicy.isInternal(home, "https://cinema.example:443/my-tickets"));
    }
    @Test public void rejectsOriginSpoofingAndDowngrades() {
        for (String target : new String[]{"https://cinema.example.evil.test", "https://cinema.example@evil.test", "http://cinema.example", "https://cinema.example:8443", "javascript:alert(1)", "file:///etc/passwd"})
            assertFalse(target, NavigationPolicy.isInternal(home, target));
    }
    @Test public void onlyAllowsSupportedExternalLinks() {
        assertTrue(NavigationPolicy.canOpenExternally("https://bank.example/pay"));
        assertTrue(NavigationPolicy.canOpenExternally("tel:091234567"));
        assertTrue(NavigationPolicy.canOpenExternally("kbzpay://pay"));
        for (String target : new String[]{"javascript:alert(1)", "file:///test", "intent://test", "http://external.example", "data:text/html,test"})
            assertFalse(target, NavigationPolicy.canOpenExternally(target));
    }
    @Test public void rejectsMissingUrlsAndMalformedOrigins() {
        assertFalse(NavigationPolicy.isInternal(home, null));
        assertFalse(NavigationPolicy.isInternal(null, home));
        assertFalse(NavigationPolicy.canOpenExternally(null));
        assertFalse(NavigationPolicy.canOpenExternally("https:relative-path"));
        assertFalse(NavigationPolicy.canOpenExternally("https://cinema.example@evil.example"));
        assertFalse(NavigationPolicy.canOpenExternally("https://"));
    }
}
