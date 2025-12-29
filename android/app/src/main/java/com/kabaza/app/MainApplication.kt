package com.kabaza.app

import android.app.Application
import android.content.Context
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.soloader.SoLoader
import com.facebook.react.soloader.OpenSourceMergedSoMapping
// ❌ REMOVE THIS LINE - not needed anymore:
// import com.dieam.reactnativepushnotification.ReactNativePushNotificationPackage

// ✅ ADD THESE FACEBOOK IMPORTS
import com.facebook.FacebookSdk
import com.facebook.appevents.AppEventsLogger

class MainApplication : Application(), ReactApplication {

    override val reactNativeHost: ReactNativeHost =
        object : DefaultReactNativeHost(this) {
            override fun getPackages(): List<ReactPackage> {
                // Packages that cannot be autolinked yet can be added manually here
                val packages = PackageList(this).packages.toMutableList()
                
                // ❌ REMOVE THIS LINE - it's auto-linked now:
                // packages.add(ReactNativePushNotificationPackage())
                
                // Add other custom packages here if needed
                // e.g., packages.add(MyCustomPackage())
                
                return packages
            }

            override fun getJSMainModuleName(): String = "index"

            override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

            override val isNewArchEnabled: Boolean
                get() = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED

            override val isHermesEnabled: Boolean
                get() = BuildConfig.IS_HERMES_ENABLED
        }

    override val reactHost: ReactHost
        get() = getDefaultReactHost(applicationContext, reactNativeHost)

    override fun onCreate() {
        super.onCreate()
        
        // ✅ ✅ ADD FACEBOOK SDK INITIALIZATION HERE (BEFORE SoLoader!)
        // Initialize Facebook SDK FIRST
        FacebookSdk.setAutoInitEnabled(true)
        FacebookSdk.fullyInitialize()
        AppEventsLogger.activateApp(this)
        
        // Now initialize SoLoader for loading native libraries
        SoLoader.init(this, OpenSourceMergedSoMapping)
        
        // Load New Architecture if enabled
        if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
            load()
        }
    }
}