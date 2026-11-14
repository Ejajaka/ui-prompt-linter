import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
}

val localProps = Properties().apply {
    val file = rootProject.file("local.properties")
    if (file.exists()) file.inputStream().use { load(it) }
}

fun aiValue(property: String, env: String, fallback: String): String =
    (System.getenv(env) ?: localProps.getProperty(property) ?: fallback)

val aiBaseUrl = aiValue("promptLinter.baseUrl", "VECTOR_BASE_URL", "https://api.groq.com/openai/v1")
val aiModel = aiValue("promptLinter.model", "VECTOR_MODEL", "openai/gpt-oss-120b")
val aiApiKey = aiValue("promptLinter.apiKey", "VECTOR_TEST_API_KEY", "")

android {
    namespace = "com.promptlinter.app"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.promptlinter.app"
        minSdk = 24
        targetSdk = 36
        versionCode = 3
        versionName = "1.2"

        buildConfigField(
            "String",
            "VECTOR_API_KEY",
            "\"${aiApiKey}\""
        )
        buildConfigField("String", "VECTOR_BASE_URL", "\"$aiBaseUrl\"")
        buildConfigField("String", "VECTOR_MODEL", "\"$aiModel\"")
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.material.icons.extended)
    implementation(libs.androidx.navigation.compose)
    implementation(libs.gson)
    implementation(libs.androidx.webkit)
    debugImplementation(libs.androidx.compose.ui.tooling)
}
