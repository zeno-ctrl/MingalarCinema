package com.mingalarcinema.app;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.graphics.Bitmap;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.CookieManager;
import android.webkit.SslErrorHandler;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;
import android.window.OnBackInvokedDispatcher;

public class MainActivity extends Activity {
    private static final int PICK_FILE = 100;
    private WebView web;
    private ProgressBar loading;
    private LinearLayout error;
    private TextView errorMessage;
    private Button retry;
    private ValueCallback<Uri[]> fileCallback;
    private String failedUrl = BuildConfig.WEBSITE_URL;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(0xfffafafa);
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            if (android.os.Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            } else {
                view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                    insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            }
            return insets;
        });
        loading = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        root.addView(loading, new LinearLayout.LayoutParams(-1, 6));
        error = new LinearLayout(this);
        error.setOrientation(LinearLayout.VERTICAL);
        error.setGravity(android.view.Gravity.CENTER);
        error.setPadding(32, 32, 32, 32);
        errorMessage = new TextView(this);
        errorMessage.setText(R.string.connection_error);
        errorMessage.setGravity(android.view.Gravity.CENTER);
        error.addView(errorMessage);
        retry = new Button(this);
        retry.setText(R.string.retry);
        retry.setOnClickListener(v -> web.loadUrl(failedUrl));
        error.addView(retry);
        Button browser = new Button(this);
        browser.setText(R.string.open_browser);
        browser.setOnClickListener(v -> openExternal(BuildConfig.WEBSITE_URL));
        error.addView(browser);
        error.setVisibility(View.GONE);
        root.addView(error, new LinearLayout.LayoutParams(-1, -1));
        setContentView(root);
        if (android.os.Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::handleBack);
        }
        PackageInfo provider = android.os.Build.VERSION.SDK_INT >= 26 ? WebView.getCurrentWebViewPackage() : null;
        if (provider != null && !WebViewCompatibility.isSupported(provider.versionName)) {
            showWebViewUnavailable();
            retry.setOnClickListener(v -> openExternal("https://play.google.com/store/apps/details?id=" + provider.packageName));
            return;
        }
        try { web = new WebView(this); }
        catch (RuntimeException e) {
            showWebViewUnavailable();
            retry.setText(R.string.retry);
            retry.setOnClickListener(v -> recreate());
            return;
        }
        if (!WebViewCompatibility.isSupportedUserAgent(web.getSettings().getUserAgentString())) {
            web.destroy();
            web = null;
            showWebViewUnavailable();
            retry.setOnClickListener(v -> openExternal("https://play.google.com/store/apps/details?id=com.google.android.webview"));
            return;
        }
        root.addView(web, new LinearLayout.LayoutParams(-1, 0, 1));
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportMultipleWindows(false);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, false);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        web.setWebChromeClient(new WebChromeClient() {
            @Override public void onProgressChanged(WebView view, int progress) {
                loading.setProgress(progress);
                loading.setVisibility(progress == 100 ? View.GONE : View.VISIBLE);
            }
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                try { startActivityForResult(params.createIntent(), PICK_FILE); }
                catch (ActivityNotFoundException e) {
                    fileCallback.onReceiveValue(null);
                    fileCallback = null;
                    Toast.makeText(MainActivity.this, R.string.no_file_picker, Toast.LENGTH_SHORT).show();
                }
                return true;
            }
        });
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (!request.isForMainFrame()) return false;
                String url = request.getUrl().toString();
                if (NavigationPolicy.isInternal(BuildConfig.WEBSITE_URL, url)) return false;
                if (request.isForMainFrame()) openExternal(url);
                return true;
            }
            @Override public void onPageStarted(WebView view, String url, Bitmap icon) {
                error.setVisibility(View.GONE);
                web.setVisibility(View.VISIBLE);
            }
            @Override public void onPageFinished(WebView view, String url) {
                CookieManager.getInstance().flush();
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError reason) {
                if (request.isForMainFrame()) showError(request.getUrl().toString());
            }
            @Override public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
                if (request.isForMainFrame() && response.getStatusCode() >= 400) showError(request.getUrl().toString());
            }
            @Override public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError reason) {
                handler.cancel();
                showError(view.getUrl());
            }
        });
        // The browser handles PDF downloads; no broad storage permission is needed.
        web.setDownloadListener((url, agent, disposition, mime, length) -> openExternal(url));
        if (state == null || web.restoreState(state) == null) web.loadUrl(BuildConfig.WEBSITE_URL);
    }

    private void showWebViewUnavailable() {
        loading.setVisibility(View.GONE);
        errorMessage.setText(R.string.webview_unavailable);
        retry.setText(R.string.update_webview);
        error.setVisibility(View.VISIBLE);
    }
    private void showError(String url) {
        failedUrl = NavigationPolicy.isInternal(BuildConfig.WEBSITE_URL, url) ? url : BuildConfig.WEBSITE_URL;
        web.setVisibility(View.GONE);
        loading.setVisibility(View.GONE);
        error.setVisibility(View.VISIBLE);
    }
    private void openExternal(String url) {
        if (!NavigationPolicy.canOpenExternally(url)) return;
        try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)).addCategory(Intent.CATEGORY_BROWSABLE)); }
        catch (ActivityNotFoundException e) {
            Toast.makeText(this, R.string.no_link_handler, Toast.LENGTH_LONG).show();
        }
    }
    @Override public void onBackPressed() {
        handleBack();
    }
    private void handleBack() {
        if (web != null && web.canGoBack()) web.goBack(); else finish();
    }
    @Override protected void onSaveInstanceState(Bundle state) {
        if (web != null) web.saveState(state);
        super.onSaveInstanceState(state);
    }
    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request == PICK_FILE && fileCallback != null) {
            fileCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result, data));
            fileCallback = null;
        }
    }
    @Override protected void onPause() {
        if (web != null) {
            web.onPause();
            CookieManager.getInstance().flush();
        }
        super.onPause();
    }
    @Override protected void onResume() { super.onResume(); if (web != null) web.onResume(); }
    @Override protected void onDestroy() {
        if (fileCallback != null) fileCallback.onReceiveValue(null);
        if (web != null) web.destroy();
        super.onDestroy();
    }
}
