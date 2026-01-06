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

// Facebook SDK imports - Already commented, good!
//import com.facebook.FacebookSdk
//import com.facebook.appevents.AppEventsLogger

class MainApplication : Application(), ReactApplication {

    override val reactNativeHost: ReactNativeHost =
        object : DefaultReactNativeHost(this) {
            override fun getPackages(): List<ReactPackage> {
                // Packages that cannot be autolinked yet can be added manually here
                val packages = PackageList(this).packages.toMutableList()
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
        
        // PERMANENT FIX: Facebook SDK initialization - COMMENT THIS SECTION
        // Step 1: Get Facebook App ID (from BuildConfig or hardcoded)
        /*
        val facebookAppId = if (!BuildConfig.FACEBOOK_APP_ID.isNullOrEmpty()) {
            BuildConfig.FACEBOOK_APP_ID
        } else {
            // REPLACE THIS WITH YOUR ACTUAL FACEBOOK APP ID (15-digit number)
            "123456789012345"
        }
        
        // Step 2: Set App ID BEFORE initializing SDK (CRITICAL)
        FacebookSdk.setApplicationId(facebookAppId)
        
        // Step 3: Initialize SDK with callback
        FacebookSdk.setAutoInitEnabled(true)
        FacebookSdk.sdkInitialize(applicationContext) {
            // This runs AFTER SDK is fully initialized
            AppEventsLogger.activateApp(this)
        }
        */
        
        // Initialize React Native
        SoLoader.init(this, OpenSourceMergedSoMapping)
        
        if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
            load()
        }
    }
}