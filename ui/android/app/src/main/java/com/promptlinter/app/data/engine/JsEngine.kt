package com.promptlinter.app.data.engine

import android.annotation.SuppressLint
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.webkit.JavascriptInterface
import android.webkit.WebResourceResponse
import android.webkit.WebView
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewClientCompat
import com.google.gson.Gson
import com.promptlinter.app.data.model.AnalysisPayload
import java.util.UUID
import java.util.concurrent.CompletableFuture
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

class JsEngine(context: Context) {
    private val appContext = context.applicationContext
    private val mainHandler = Handler(Looper.getMainLooper())
    private val gson = Gson()
    @Volatile private var ready = false
    private val readyLatch = CountDownLatch(1)
    private var webView: WebView? = null
    private val pending = ConcurrentHashMap<String, CompletableFuture<String>>()

    private inner class Bridge {
        @JavascriptInterface
        fun onResult(id: String, json: String) {
            pending.remove(id)?.complete(json)
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    fun ensureReady() {
        if (ready) return
        val latch = readyLatch
        mainHandler.post {
            if (webView == null) {
                val wv = WebView(appContext)
                wv.settings.javaScriptEnabled = true
                wv.settings.domStorageEnabled = true
                val loader = WebViewAssetLoader.Builder()
                    .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(appContext))
                    .build()
                wv.addJavascriptInterface(Bridge(), "VectorBridge")
                wv.webViewClient = object : WebViewClientCompat() {
                    override fun shouldInterceptRequest(
                        view: WebView,
                        request: android.webkit.WebResourceRequest
                    ): WebResourceResponse? = loader.shouldInterceptRequest(request.url)

                    override fun onPageFinished(view: WebView?, url: String?) {
                        ready = true
                        latch.countDown()
                    }
                }
                wv.loadUrl("https://appassets.androidplatform.net/assets/engine.html")
                webView = wv
            }
        }
        latch.await(10, TimeUnit.SECONDS)
    }

    fun analyze(
        text: String,
        answers: Map<String, String>,
        finalize: Boolean,
        engineName: String = "rules",
        settings: Map<String, String> = emptyMap()
    ): AnalysisPayload {
        ensureReady()
        val answersJson = gson.toJson(answers)
        val settingsJson = gson.toJson(settings)
        val id = UUID.randomUUID().toString()
        val future = CompletableFuture<String>()
        pending[id] = future
        val js = "window.runAnalyzeAsync(${jsonQuote(text)}, ${jsonQuote(answersJson)}, " +
            "${if (finalize) "true" else "false"}, ${jsonQuote(engineName)}, " +
            "${jsonQuote(settingsJson)}, ${jsonQuote(id)})"
        mainHandler.post {
            webView?.evaluateJavascript(js, null)
        }
        val json = try {
            future.get(300, TimeUnit.SECONDS)
        } catch (e: Exception) {
            "{\"error\":${gson.toJson(e.message ?: "Engine timed out")}}"
        } finally {
            pending.remove(id)
        }
        return try {
            gson.fromJson(json, AnalysisPayload::class.java) ?: AnalysisPayload(error = "Parse error")
        } catch (e: Exception) {
            AnalysisPayload(error = e.message)
        }
    }

    private fun jsonQuote(s: String): String = gson.toJson(s)

    private fun unquoteJsString(value: String?): String? {
        if (value == null || value == "null") return null
        // evaluateJavascript returns a JSON string literal for string results
        return try {
            gson.fromJson(value, String::class.java)
        } catch (_: Exception) {
            value.trim('"')
        }
    }
}
