# Google Places API Setup Instructions

## Issue: Google Places API key not configured

### Solution:

1. **Get Google Places API Key**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable these APIs:
     - Places API
     - Geocoding API  
     - Directions API
   - Create credentials → API Key
   - **Important**: Restrict your API key for security:
     - Application restrictions: Your app bundle ID
     - API restrictions: Only enable the APIs listed above

2. **Update your .env file**:
   Add this line to your `.env` file (replace with your actual key):
   ```
   GOOGLE_PLACES_API_KEY=your_actual_google_api_key_here
   ```

3. **Restart your app** after updating the .env file

### Current Status:
- ✅ Navigation warning fixed (removed non-serializable function)
- ❌ Google Places API key needs configuration

### Testing:
After adding the API key, you should be able to:
- Search for any location worldwide
- Get real-time autocomplete suggestions
- Retrieve coordinates for selected locations

The app will no longer show "Google Places API key not configured" errors.
