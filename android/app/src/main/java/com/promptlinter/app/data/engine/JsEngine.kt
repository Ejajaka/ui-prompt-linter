package com.promptlinter.app.data.engine

import android.annotation.SuppressLint
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import com.google.gson.Gson
import com.promptlinter.app.data.model.AnalysisPayload
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference

class JsEngine(context: Context) {
    private val appContext = context.applicationContext
    private val mainHandler = Handler(Looper.getMainLooper())
    private val gson = Gson()
    @Volatile private var ready = false
    private val readyLatch = CountDownLatch(1)
    private var webView: WebView? = null

    @SuppressLint("SetJavaScriptEnabled")
    fun ensureReady() {
        if (ready) return
        val latch = readyLatch
        mainHandler.post {
            if (webView == null) {
                val wv = WebView(appContext)
                wv.settings.javaScriptEnabled = true
                wv.settings.domStorageEnabled = false
                wv.webViewClient = object : WebViewClient() {
                    override fun onPageFinished(view: WebView?, url: String?) {
                        ready = true
                        latch.countDown()
                    }
                }
                wv.loadUrl("file:///android_asset/engine.html")
                webView = wv
            }
        }
        latch.await(10, TimeUnit.SECONDS)
    }

    fun analyze(text: String, answers: Map<String, String>, finalize: Boolean): AnalysisPayload {
        ensureReady()
        val answersJson = gson.toJson(answers)
        val ref = AtomicReference<String?>()
        val done = CountDownLatch(1)
        val js = "window.runAnalyze(${jsonQuote(text)}, ${jsonQuote(answersJson)}, ${if (finalize) "true" else "false"})"
        mainHandler.post {
            webView?.evaluateJavascript(js) { value ->
                ref.set(unquoteJsString(value))
                done.countDown()
            } ?: done.countDown()
        }
        done.await(10, TimeUnit.SECONDS)
        val json = ref.get() ?: "{\"error\":\"Engine returned no result\"}"
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
