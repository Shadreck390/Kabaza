# Google Places API Setup for Kabaza App

## 🚀 What This Does

Your Kabaza app now has **professional Google Places search** just like Uber and Bolt! Users can search any location in the world instead of being limited to hardcoded places.

## 📋 Setup Instructions

### 1. Get Google API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable these APIs:
   - **Places API** (for autocomplete search)
   - **Geocoding API** (for address to coordinates)
   - **Directions API** (for real road navigation)
   - **Maps SDK for Android** (if using Android)
   - **Maps SDK for iOS** (if using iOS)

4. Create credentials → API Key
5. **Important**: Restrict your API key for security:
   - Application restrictions: Your app bundle ID
   - API restrictions: Only enable the APIs listed above

### 2. Update API Key

Edit `services/googlePlacesService.js`:

```javascript
const GOOGLE_API_KEY = 'AIzaSyAft39RTF1LB_GTSYqy-I2tswzakC4fT3Q'; // Replace this line
```

### 3. Install Dependencies (if needed)

```bash
npm install react-native-maps
```

## ✨ What Users Can Now Do

### Before (Limited Search)
- Only search from your hardcoded Malawi locations
- Maximum ~12 places available

### After (Unlimited Search)
- Search **any location in the world**
- Real-time autocomplete suggestions
- Professional address search
- Coordinates automatically retrieved

## 🎯 Search Examples

Users can now type:

**"Airport"** → Results:
- O.R. Tambo International Airport
- Kamuzu International Airport  
- Cape Town International Airport
- And hundreds more...

**"Shopping"** → Results:
- Game Stores
- Shoprite Mall
- Area 3 Shopping Complex
- Plus all local shopping centers

**"Restaurant"** → Results:
- Local restaurants
- Popular chains
- Hidden gems
- All with exact coordinates

## 📱 How It Works

1. **User types** in search bar
2. **Google Places API** returns suggestions instantly
3. **User selects** a place
4. **Coordinates retrieved** automatically
5. **Navigate to** RideSelection with full location data

## 🔄 App Flow

```
RiderHomeScreen
      ↓ (tap search bar)
SearchLocationScreen  
      ↓ (type & select)
Google Places API
      ↓ (get coordinates)
RideSelectionScreen
      ↓ (continue booking)
```

## 🏗️ Architecture

### Files Created/Updated:

1. **`services/googlePlacesService.js`** - Google API integration
2. **`screens/rider/SearchLocationScreen.js`** - Professional search UI
3. **`screens/rider/RiderHomeScreen.js`** - Updated to use new search

### Features Included:

✅ **Saved Places** (Home, Work, Airport)  
✅ **Popular Malawi Locations** (your existing places)  
✅ **Google Places Search** (unlimited locations)  
✅ **Real-time Search** (300ms debounce)  
✅ **Loading Indicators** (professional UX)  
✅ **Error Handling** (graceful fallbacks)  

## 🌍 Location Types Supported

- **Addresses**: "123 Main Street, Lilongwe"
- **Businesses**: "Shoprite", "KFC", "Banks"
- **Landmarks**: "Bingu Stadium", "Kamuzu Hospital"
- **Airports**: "Lilongwe Airport", "Johannesburg Airport"
- **Shopping**: "Malls", "Markets", "Stores"
- **And millions more...**

## 🚨 Important Notes

1. **API Key Security**: Never expose your API key in public repos
2. **Usage Limits**: Google has free tier limits (~$200/month credit)
3. **Testing**: Test with real device, not simulator for best results
4. **Malawi Focus**: Currently biased to Malawi locations (can be removed for worldwide)

## 🎉 Result

Your Kabaza app now searches like **Uber/Bolt**! Users can find any destination, making your app much more professional and user-friendly.

The search bar on RiderHomeScreen now opens a full Google Places search experience, while keeping your popular Malawi locations as quick suggestions.

**Ready to test?** Just update your Google API key and start searching! 🚀
