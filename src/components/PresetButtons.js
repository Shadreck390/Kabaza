// components/PresetButtons.js - Common button presets for your app
import React from 'react';
import { View } from 'react-native';
import Button from './Button';

// Ride-related buttons
export const BookRideButton = ({ loading, onPress, disabled, title = "Book Ride" }) => (
  <Button
    title={loading ? "Finding Rides..." : title}
    icon="car"
    iconPosition="left"
    variant="primary"
    size="large"
    fullWidth
    loading={loading}
    disabled={disabled}
    onPress={onPress}
    accessibilityLabel={loading ? "Searching for available rides" : "Book a ride"}
  />
);

export const FindRidesButton = ({ loading, onPress, disabled, count = 0 }) => (
  <Button
    title={loading ? "Searching..." : count > 0 ? `Find Rides (${count} available)` : "Find Rides"}
    icon="search"
    iconPosition="left"
    variant="primary"
    size="large"
    fullWidth
    loading={loading}
    disabled={disabled}
    onPress={onPress}
    accessibilityLabel="Find available rides nearby"
  />
);

export const CancelRideButton = ({ onPress, loading = false, size = "medium" }) => (
  <Button
    title={loading ? "Cancelling..." : "Cancel Ride"}
    icon="times"
    iconPosition="left"
    variant="danger"
    size={size}
    loading={loading}
    onPress={onPress}
    accessibilityLabel="Cancel current ride"
  />
);

export const ConfirmRideButton = ({ onPress, loading = false, driverName, amount }) => (
  <Button
    title={loading ? "Confirming..." : `Confirm with ${driverName} - MWK ${amount}`}
    icon="check"
    iconPosition="left"
    variant="success"
    size="large"
    fullWidth
    loading={loading}
    onPress={onPress}
    accessibilityLabel={`Confirm ride with ${driverName} for ${amount} Kwacha`}
  />
);

// Payment buttons
export const PaymentButton = ({ amount, onPress, loading = false, method = "Mobile Money" }) => (
  <Button
    title={loading ? "Processing..." : `Pay MWK ${amount}`}
    icon="credit-card"
    iconPosition="left"
    variant="primary"
    size="large"
    fullWidth
    loading={loading}
    onPress={onPress}
    accessibilityLabel={`Pay ${amount} Kwacha using ${method}`}
  />
);

export const MobileMoneyButton = ({ onPress, loading = false, provider = "Airtel Money" }) => (
  <Button
    title={loading ? "Processing..." : `Pay with ${provider}`}
    icon="mobile"
    iconPosition="left"
    variant="secondary"
    size="medium"
    fullWidth
    loading={loading}
    onPress={onPress}
    accessibilityLabel={`Pay using ${provider}`}
  />
);

// Location buttons
export const LocationButton = ({ onPress, loading = false, title = "Use Current Location" }) => (
  <Button
    title={loading ? "Getting Location..." : title}
    icon="map-marker"
    iconPosition="left"
    variant="secondary"
    size="medium"
    loading={loading}
    onPress={onPress}
    accessibilityLabel="Use current location"
  />
);

export const SetPickupButton = ({ onPress, loading = false, locationName }) => (
  <Button
    title={loading ? "Setting Location..." : locationName ? `Pickup: ${locationName}` : "Set Pickup Location"}
    icon="location-arrow"
    iconPosition="left"
    variant="outline"
    size="medium"
    loading={loading}
    onPress={onPress}
    accessibilityLabel={locationName ? `Set pickup location to ${locationName}` : "Set pickup location"}
  />
);

// Authentication buttons
export const LoginButton = ({ onPress, loading = false, title = "Login" }) => (
  <Button
    title={loading ? "Signing In..." : title}
    icon="sign-in"
    iconPosition="left"
    variant="primary"
    size="large"
    fullWidth
    loading={loading}
    onPress={onPress}
    accessibilityLabel="Sign in to your account"
  />
);

export const RegisterButton = ({ onPress, loading = false, title = "Create Account" }) => (
  <Button
    title={loading ? "Creating Account..." : title}
    icon="user-plus"
    iconPosition="left"
    variant="success"
    size="large"
    fullWidth
    loading={loading}
    onPress={onPress}
    accessibilityLabel="Create new account"
  />
);

export const GoogleLoginButton = ({ onPress, loading = false }) => (
  <Button
    title={loading ? "Connecting..." : "Continue with Google"}
    icon="google"
    iconPosition="left"
    variant="outline"
    size="large"
    fullWidth
    loading={loading}
    onPress={onPress}
    accessibilityLabel="Sign in with Google account"
  />
);

// Navigation and action buttons
export const ConfirmButton = ({ onPress, title = "Confirm", loading = false, variant = "success" }) => (
  <Button
    title={loading ? "Confirming..." : title}
    variant={variant}
    size="medium"
    loading={loading}
    onPress={onPress}
    accessibilityLabel={`Confirm ${title.toLowerCase()}`}
  />
);

export const SaveButton = ({ onPress, loading = false, title = "Save Changes" }) => (
  <Button
    title={loading ? "Saving..." : title}
    icon="save"
    iconPosition="left"
    variant="primary"
    size="medium"
    loading={loading}
    onPress={onPress}
    accessibilityLabel="Save changes"
  />
);

export const EditButton = ({ onPress, title = "Edit", size = "small" }) => (
  <Button
    title={title}
    icon="edit"
    iconPosition="left"
    variant="outline"
    size={size}
    onPress={onPress}
    accessibilityLabel={`Edit ${title.toLowerCase()}`}
  />
);

// Driver-specific buttons
export const GoOnlineButton = ({ onPress, loading = false, isOnline = false }) => (
  <Button
    title={loading ? "Updating..." : isOnline ? "Go Offline" : "Go Online"}
    icon={isOnline ? "power-off" : "play"}
    iconPosition="left"
    variant={isOnline ? "warning" : "success"}
    size="large"
    fullWidth
    loading={loading}
    onPress={onPress}
    accessibilityLabel={isOnline ? "Go offline as driver" : "Go online as driver"}
  />
);

export const AcceptRideButton = ({ onPress, loading = false, riderName }) => (
  <Button
    title={loading ? "Accepting..." : `Accept ${riderName}'s Ride`}
    icon="check-circle"
    iconPosition="left"
    variant="success"
    size="large"
    fullWidth
    loading={loading}
    onPress={onPress}
    accessibilityLabel={`Accept ride request from ${riderName}`}
  />
);

export const StartRideButton = ({ onPress, loading = false }) => (
  <Button
    title={loading ? "Starting..." : "Start Ride"}
    icon="play"
    iconPosition="left"
    variant="primary"
    size="large"
    fullWidth
    loading={loading}
    onPress={onPress}
    accessibilityLabel="Start the ride"
  />
);

export const CompleteRideButton = ({ onPress, loading = false }) => (
  <Button
    title={loading ? "Completing..." : "Complete Ride"}
    icon="flag-checkered"
    iconPosition="left"
    variant="success"
    size="large"
    fullWidth
    loading={loading}
    onPress={onPress}
    accessibilityLabel="Complete the current ride"
  />
);

// Emergency and safety buttons
export const SOSButton = ({ onPress, loading = false }) => (
  <Button
    title={loading ? "Sending Alert..." : "SOS Emergency"}
    icon="exclamation-triangle"
    iconPosition="left"
    variant="danger"
    size="large"
    fullWidth
    loading={loading}
    onPress={onPress}
    accessibilityLabel="Emergency SOS button"
  />
);

export const ShareTripButton = ({ onPress, loading = false, isSharing = false }) => (
  <Button
    title={loading ? "Sharing..." : isSharing ? "Stop Sharing" : "Share Trip"}
    icon="share"
    iconPosition="left"
    variant="secondary"
    size="medium"
    loading={loading}
    onPress={onPress}
    accessibilityLabel={isSharing ? "Stop sharing trip location" : "Share trip location"}
  />
);

// Rating and feedback buttons
export const RateRideButton = ({ onPress, loading = false }) => (
  <Button
    title={loading ? "Submitting..." : "Rate Ride"}
    icon="star"
    iconPosition="left"
    variant="primary"
    size="medium"
    loading={loading}
    onPress={onPress}
    accessibilityLabel="Rate your ride experience"
  />
);

export const SubmitReviewButton = ({ onPress, loading = false }) => (
  <Button
    title={loading ? "Submitting..." : "Submit Review"}
    icon="send"
    iconPosition="left"
    variant="success"
    size="medium"
    loading={loading}
    onPress={onPress}
    accessibilityLabel="Submit your review"
  />
);

// Utility buttons
export const RetryButton = ({ onPress, loading = false, title = "Try Again" }) => (
  <Button
    title={loading ? "Retrying..." : title}
    icon="refresh"
    iconPosition="left"
    variant="outline"
    size="medium"
    loading={loading}
    onPress={onPress}
    accessibilityLabel="Retry action"
  />
);

export const ContinueButton = ({ onPress, loading = false, title = "Continue" }) => (
  <Button
    title={loading ? "Continuing..." : title}
    icon="arrow-right"
    iconPosition="right"
    variant="primary"
    size="large"
    fullWidth
    loading={loading}
    onPress={onPress}
    accessibilityLabel="Continue to next step"
  />
);

export const BackButton = ({ onPress, loading = false, title = "Back" }) => (
  <Button
    title={loading ? "Going Back..." : title}
    icon="arrow-left"
    iconPosition="left"
    variant="outline"
    size="medium"
    loading={loading}
    onPress={onPress}
    accessibilityLabel="Go back to previous screen"
  />
);

// Button groups for common layouts
export const ButtonGroup = ({ children, style }) => (
  <View style={[{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }, style]}>
    {children}
  </View>
);

export const DoubleButtonGroup = ({ primary, secondary, primaryLoading, secondaryLoading }) => (
  <ButtonGroup>
    <Button
      title={secondary.loading ? secondary.loadingText : secondary.title}
      onPress={secondary.onPress}
      variant={secondary.variant || "outline"}
      size="medium"
      loading={secondaryLoading}
      style={{ flex: 1 }}
    />
    <Button
      title={primary.loading ? primary.loadingText : primary.title}
      onPress={primary.onPress}
      variant={primary.variant || "primary"}
      size="medium"
      loading={primaryLoading}
      style={{ flex: 1 }}
    />
  </ButtonGroup>
);

// Export all button components
export { Button as default } from './Button';