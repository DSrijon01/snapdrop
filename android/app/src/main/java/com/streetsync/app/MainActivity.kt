package com.streetsync.app

import android.annotation.SuppressLint
import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.view.View
import android.view.ViewGroup
import android.webkit.CookieManager
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.systemBars
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.net.toUri
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.streetsync.app.ui.theme.WebShellTheme

class MainActivity : ComponentActivity() {
    private var webViewRef: WebView? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)
        setContent {
            WebShellTheme {
                WebShellScreen(
                    onWebViewCreated = { webViewRef = it },
                )
            }
        }
        handleDeepLinkIntent(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleDeepLinkIntent(intent)
    }

    private fun handleDeepLinkIntent(intent: Intent?) {
        val uri = intent?.data ?: return
        Log.i(TAG, "Incoming deep link: $uri")
        val scheme = uri.scheme?.lowercase() ?: return
        val webView = webViewRef ?: return

        if (scheme == "streetsync") {
            val query = uri.query
            val hostPart = uri.host?.takeIf { it.isNotBlank() } ?: ""
            val pathPart = uri.path?.removePrefix("/") ?: ""
            val fullPath = when {
                hostPart.isNotBlank() && pathPart.isNotBlank() -> "$hostPart/$pathPart"
                hostPart.isNotBlank() && hostPart != "callback" -> hostPart
                hostPart == "callback" -> "callback"
                else -> pathPart
            }
            val baseHost = (BuildConfig.SOLANA_MOBILE_URL.trim().ifBlank { "https://streetsync-ss.com/" }).removeSuffix("/")
            val targetUrl = if (!query.isNullOrBlank()) {
                if (fullPath.isNotBlank()) "$baseHost/$fullPath?$query" else "$baseHost/?$query"
            } else {
                if (fullPath.isNotBlank()) "$baseHost/$fullPath" else baseHost
            }
            Log.i(TAG, "Routing streetsync deep link to WebView: $targetUrl (fullPath: $fullPath)")
            webView.post {
                val currentUrl = webView.url
                // If WebView has an active page running, evaluate the deep link in-memory without page reload!
                // This keeps in-flight transaction Promises and event listeners alive.
                if (!currentUrl.isNullOrBlank() && !currentUrl.startsWith("data:") && !currentUrl.startsWith("about:")) {
                    val fullDeepLink = uri.toString().replace("\\", "\\\\").replace("'", "\\'")
                    val js = """
                        (function() {
                            if ('$fullPath' === 'sessions' && !window.location.pathname.includes('/sessions')) {
                                window.history.pushState({}, document.title, '/sessions');
                                window.dispatchEvent(new Event('popstate'));
                            }
                            if (window.__handlePhantomDeepLink) {
                                window.__handlePhantomDeepLink('$fullDeepLink');
                            } else {
                                const current = new URL(window.location.href);
                                const incoming = new URL('$fullDeepLink');
                                incoming.searchParams.forEach(function(v, k) { current.searchParams.set(k, v); });
                                window.history.replaceState({}, document.title, current.toString());
                                window.dispatchEvent(new Event('popstate'));
                                if (window.processPhantomMobileRedirect) {
                                    window.processPhantomMobileRedirect();
                                }
                            }
                        })();
                    """.trimIndent()
                    Log.i(TAG, "Evaluating deep link callback in-memory via evaluateJavascript")
                    webView.evaluateJavascript(js, null)
                } else {
                    Log.i(TAG, "Loading initial targetUrl: $targetUrl")
                    webView.loadUrl(targetUrl)
                }
            }
        } else if (scheme == "https" || scheme == "http") {
            val query = uri.query
            val isWalletCallback = query?.contains("nonce") == true ||
                    query?.contains("phantom_encryption_public_key") == true ||
                    query?.contains("errorCode") == true

            webView.post {
                val currentUrl = webView.url
                if (isWalletCallback && !currentUrl.isNullOrBlank() && !currentUrl.startsWith("data:") && !currentUrl.startsWith("about:")) {
                    val fullDeepLink = uri.toString().replace("\\", "\\\\").replace("'", "\\'")
                    val js = """
                        (function() {
                            if (window.__handlePhantomDeepLink) {
                                window.__handlePhantomDeepLink('$fullDeepLink');
                            } else {
                                const current = new URL(window.location.href);
                                const incoming = new URL('$fullDeepLink');
                                incoming.searchParams.forEach(function(v, k) { current.searchParams.set(k, v); });
                                window.history.replaceState({}, document.title, current.toString());
                                window.dispatchEvent(new Event('popstate'));
                                if (window.processPhantomMobileRedirect) {
                                    window.processPhantomMobileRedirect();
                                }
                            }
                        })();
                    """.trimIndent()
                    Log.i(TAG, "Evaluating https wallet callback in-memory via evaluateJavascript")
                    webView.evaluateJavascript(js, null)
                } else {
                    webView.loadUrl(uri.toString())
                }
            }
        }
    }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun WebShellScreen(
    onWebViewCreated: (WebView) -> Unit = {},
) {
    val context = LocalContext.current
    val startUrl = remember { normalizeHttpUrl() }
    if (startUrl == null) {
        Log.e(TAG, "SOLANA_MOBILE_URL is not a valid http(s) URL")
        return
    }
    val scopeHost = remember(startUrl) { startUrl.toUri().host.orEmpty() }

    var progress by remember { mutableFloatStateOf(0f) }
    var isLoading by remember { mutableStateOf(true) }
    var hasError by remember { mutableStateOf(false) }
    var showSplash by remember { mutableStateOf(true) }

    val webView =
        remember {
            WebView(context).apply {
                onWebViewCreated(this)
                layoutParams =
                    ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT,
                    )

                // Match dark mode theme to eliminate white flashes
                setBackgroundColor(android.graphics.Color.parseColor("#090a0f"))

                // Eliminate overscroll bounce/stretch which causes GPU surface clipping on Android
                overScrollMode = View.OVER_SCROLL_NEVER
                isVerticalScrollBarEnabled = false
                isHorizontalScrollBarEnabled = false
                // Use default native hardware layer to prevent offscreen GPU texture exhaustion and black screens on complex CSS
                setLayerType(View.LAYER_TYPE_NONE, null)

                settings.apply {
                    javaScriptEnabled = true
                    domStorageEnabled = true
                    databaseEnabled = true
                    loadWithOverviewMode = true
                    useWideViewPort = true
                    mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
                    cacheMode = WebSettings.LOAD_DEFAULT
                    allowFileAccess = false
                    allowContentAccess = false
                    setSupportZoom(false)
                    builtInZoomControls = false
                    displayZoomControls = false
                    javaScriptCanOpenWindowsAutomatically = true
                    // Keep in single window so external browser popups are not triggered unnecessarily
                    setSupportMultipleWindows(false)
                    // Disable offscreenPreRaster to avoid Android low memory killer dropping GPU raster
                    offscreenPreRaster = false
                }

                // Native bridge marker for frontend Web3 detection
                addJavascriptInterface(
                    object {
                        @android.webkit.JavascriptInterface
                        fun isNativeApp(): Boolean = true

                        @android.webkit.JavascriptInterface
                        fun getAppVersion(): String = "1.0.6"
                    },
                    "StreetSyncNative",
                )

                val originalUa = settings.userAgentString
                settings.userAgentString = appendUserAgentMarker(baseUserAgent = originalUa)

                if (BuildConfig.DEBUG) {
                    Log.i(TAG, "UA original: $originalUa")
                    Log.i(TAG, "UA verify:   ${settings.userAgentString}")
                }

                CookieManager.getInstance().setAcceptCookie(true)
                CookieManager.getInstance().setAcceptThirdPartyCookies(this, true)

                webChromeClient =
                    WebShellChromeClient(
                        onProgressChanged = { newProgress ->
                            progress = newProgress / 100f
                            if (newProgress > 0) showSplash = false
                            isLoading = newProgress < 100
                        },
                        isDebug = BuildConfig.DEBUG,
                    )

                webViewClient =
                    object : WebShellViewClient(context, scopeHostProvider = { scopeHost }) {
                        override fun onPageFinished(
                            view: WebView,
                            url: String?,
                        ) {
                            super.onPageFinished(view, url)
                            hasError = false
                            isLoading = false
                            showSplash = false
                        }

                        override fun onReceivedError(
                            view: WebView?,
                            request: WebResourceRequest?,
                            error: WebResourceError?,
                        ) {
                            super.onReceivedError(view, request, error)
                            if (request?.isForMainFrame == true && (error?.errorCode ?: 0) != WebViewClient.ERROR_UNKNOWN) {
                                hasError = true
                                isLoading = false
                                showSplash = false
                            }
                        }
                    }

                loadUrl(startUrl)
            }
        }

    DisposableEffect(webView) {
        onDispose {
            webView.destroy()
        }
    }

    BackHandler(enabled = webView.canGoBack()) {
        webView.goBack()
    }

    WebViewLayer(
        modifier =
            Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .windowInsetsPadding(WindowInsets.systemBars),
        webView = webView,
        isLoading = isLoading,
        progress = progress,
        hasError = hasError,
        showSplash = showSplash,
        onRetry = {
            hasError = false
            isLoading = true
            webView.reload()
        },
    )
}

@Composable
private fun WebViewLayer(
    modifier: Modifier,
    webView: WebView,
    isLoading: Boolean,
    progress: Float,
    hasError: Boolean,
    showSplash: Boolean,
    onRetry: () -> Unit,
) {
    Box(modifier = modifier) {
        AndroidView(
            modifier = Modifier.fillMaxSize(),
            factory = { webView },
            update = { view ->
                view.layoutParams =
                    ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT,
                    )
            },
        )

        if (isLoading && !hasError) {
            LinearProgressIndicator(
                progress = { progress },
                modifier =
                    Modifier
                        .fillMaxWidth()
                        .align(Alignment.TopCenter),
            )
        }

        if (hasError) {
            Box(
                modifier =
                    Modifier
                        .fillMaxSize()
                        .background(MaterialTheme.colorScheme.background.copy(alpha = 0.96f)),
                contentAlignment = Alignment.Center,
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = "Unable to load page",
                        style = MaterialTheme.typography.titleMedium,
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Button(onClick = onRetry) {
                        Text("Retry")
                    }
                }
            }
        }

        AnimatedVisibility(
            visible = showSplash,
            exit = fadeOut(),
        ) {
            Box(
                modifier =
                    Modifier
                        .fillMaxSize()
                        .background(Color(0xFF090A0F)),
                contentAlignment = Alignment.Center,
            ) {
                SplashLoadingView()
            }
        }
    }
}

@Composable
private fun SplashLoadingView() {
    val infiniteTransition = rememberInfiniteTransition(label = "splash_pulse")
    val scale by infiniteTransition.animateFloat(
        initialValue = 0.94f,
        targetValue = 1.04f,
        animationSpec = infiniteRepeatable(
            animation = tween(1200, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "scale",
    )

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
        modifier = Modifier.fillMaxSize(),
    ) {
        Box(
            modifier = Modifier
                .size(112.dp)
                .scale(scale)
                .clip(RoundedCornerShape(26.dp))
                .border(2.dp, Color(0xFFE3182D).copy(alpha = 0.7f), RoundedCornerShape(26.dp)),
            contentAlignment = Alignment.Center,
        ) {
            Image(
                painter = painterResource(id = R.drawable.ic_splash_logo),
                contentDescription = "Street Sync Logo",
                modifier = Modifier.fillMaxSize(),
            )
        }

        Spacer(modifier = Modifier.height(24.dp))

        Text(
            text = "STREET SYNC",
            style = MaterialTheme.typography.titleLarge.copy(
                fontWeight = FontWeight.Black,
                letterSpacing = 4.sp,
                color = Color.White,
            ),
        )

        Spacer(modifier = Modifier.height(18.dp))

        CircularProgressIndicator(
            modifier = Modifier.size(28.dp),
            color = Color(0xFFE3182D),
            strokeWidth = 3.dp,
        )
    }
}

private fun appendUserAgentMarker(baseUserAgent: String): String {
    val marker = "Solana Mobile Web Shell StreetSyncApp"
    if (marker.isEmpty()) return baseUserAgent.trim()
    return if (baseUserAgent.contains(marker)) {
        baseUserAgent.trim()
    } else {
        "${baseUserAgent.trim()} $marker".trim()
    }
}

private fun normalizeHttpUrl(): String? {
    val trimmed = BuildConfig.SOLANA_MOBILE_URL.trim()
    if (trimmed.isEmpty()) return null
    val withScheme =
        if ("://" in trimmed) {
            trimmed
        } else {
            "https://$trimmed"
        }
    val uri = withScheme.toUri()
    val scheme = uri.scheme?.lowercase()
    if (scheme != "http" && scheme != "https") return null
    if (uri.host.isNullOrBlank()) return null
    return uri.toString()
}

private const val TAG = "WebShell"
