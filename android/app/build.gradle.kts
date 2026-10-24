import java.util.Properties

plugins {
    id("com.android.application")
    id("com.chaquo.python")
}

// Release imzasi: anahtar ve parolalar depoda DEGIL, ~/.vaalz-keys/ altinda (ya da VAALZ_KEYSTORE_PROPS ile gosterilen dosyada)
val imzaDosyasi = File(System.getenv("VAALZ_KEYSTORE_PROPS") ?: "${System.getProperty("user.home")}/.vaalz-keys/keystore.properties")
val imza = Properties().apply { if (imzaDosyasi.isFile) imzaDosyasi.inputStream().use { load(it) } }

// Masaustu surumle ayni kaynaklar: web/ arayuzu ve kaynak/vaalzmusic.py her derlemede kopyalanir.
val syncWeb = tasks.register<Copy>("syncWeb") {
    from("../../web")
    into(layout.buildDirectory.dir("generated/vaalzAssets/web"))
}
val syncSunucu = tasks.register<Copy>("syncSunucu") {
    from("../../kaynak/vaalzmusic.py")
    into(layout.buildDirectory.dir("generated/vaalzPython"))
}
tasks.configureEach {
    if (name != "syncWeb" && name != "syncSunucu" && (name.contains("Python") || name.contains("Assets") || name == "preBuild")) {
        dependsOn(syncWeb, syncSunucu)
    }
}

android {
    namespace = "com.vaalz.music"
    compileSdk = 35
    defaultConfig {
        applicationId = "com.vaalz.music"
        minSdk = 29
        targetSdk = 35
        versionCode = 5
        versionName = "0.1.4"
        ndk { abiFilters += listOf("arm64-v8a") }
    }
    lint { checkReleaseBuilds = false; abortOnError = false }     // lint-gradle ek indirme ister; kotali internette cevrimdisi derleme icin kapali
    signingConfigs {
        if (imza.isNotEmpty()) create("release") {
            storeFile = file(imza.getProperty("storeFile"))
            storePassword = imza.getProperty("storePassword")
            keyAlias = imza.getProperty("keyAlias")
            keyPassword = imza.getProperty("keyPassword")
        }
    }
    buildTypes {
        release {
            isMinifyEnabled = false          // Chaquopy + youtubedl-android yansima/JNI kullaniyor; kucultme risk
            signingConfigs.findByName("release")?.let { signingConfig = it }
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    sourceSets["main"].assets.srcDir("build/generated/vaalzAssets")
    // yt-dlp'nin python'u ve ffmpeg, nativeLibraryDir'den calistirilir: kutuphaneler diske acilmali
    packaging { jniLibs { useLegacyPackaging = true } }
}

dependencies {
    implementation("io.github.junkfood02.youtubedl-android:library:0.18.1")
    implementation("io.github.junkfood02.youtubedl-android:ffmpeg:0.18.1")
}

chaquopy {
    defaultConfig {
        version = "3.12"
    }
    sourceSets {
        getByName("main") {
            srcDir("build/generated/vaalzPython")
        }
    }
}


