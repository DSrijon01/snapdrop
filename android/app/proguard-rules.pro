# Street Sync ProGuard / R8 Configuration

# Preserve WebView callbacks and JavascriptInterface
-keepattributes JavascriptInterface
-keepattributes *Annotation*
-keepattributes EnclosingMethod
-keepattributes InnerClasses

-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

-keepclassmembers class * extends android.webkit.WebViewClient {
    public *;
}

-keepclassmembers class * extends android.webkit.WebChromeClient {
    public *;
}

# Preserve Street Sync application classes
-keep class com.streetsync.app.** { *; }
-keepclassmembers class com.streetsync.app.** { *; }

# Keep Compose and Splash Screen
-keep class androidx.compose.** { *; }
-keep class androidx.core.splashscreen.** { *; }

-dontwarn android.webkit.**
