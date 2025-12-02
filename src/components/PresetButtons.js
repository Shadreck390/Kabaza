// components/PresetButtons.js - Common button presets for your app
import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Button from './Button';

// Ride-related buttons
export const BookRideButton = ({ 
  loading, 
  onPress, 
  disabled, 
  title = "Book Ride",
  style,
  testID 
}) => (
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
    style={style}
    testID={testID || "book-ride-button"}
    accessibilityLabel={loading ? "Searching for available rides" : "Book a ride"}
  />
);

export const FindRidesButton = ({ 
  loading, 
  onPress, 
  disabled, 
  count = 0,
  style,
  testID 
}) => {
  const title = useMemo(() => {
    if (loading) return "Searching...";
    if (count > 0) return `Find Rides (${count} available)`;
    return "Find Rides";
  }, [loading, count]);

  return (
    <Button
      title={title}
      icon="search"
      iconPosition="left"
      variant="primary"
      size="large"
      fullWidth
      loading={loading}
      disabled={disabled}
      onPress={onPress}
      style={style}
      testID={testID || "find-rides-button"}
      accessibilityLabel={count > 0 ? `Find rides, ${count} available` : "Find available rides nearby"}
    />
  );
};

export const CancelRideButton = ({ 
  onPress, 
  loading = false, 
  size = "medium",
  style,
  testID 
}) => (
  <Button
    title={loading ? "Cancelling..." : "Cancel Ride"}
    icon="times"
    iconPosition="left"
    variant="danger"
    size={size}
    loading={loading}
    onPress={onPress}
    style={style}
    testID={testID || "cancel-ride-button"}
    accessibilityLabel="Cancel current ride"
  />
);

export const ConfirmRideButton = ({ 
  onPress, 
  loading = false, 
  driverName, 
  amount,
  currency = "MWK",
  style,
  testID 
}) => {
  const title = useMemo(() => {
    if (loading) return "Confirming...";
    return `Confirm with ${driverName} - ${currency} ${amount}`;
  }, [loading, driverName, amount, currency]);

  return (
    <Button
      title={title}
      icon="check"
      iconPosition="left"
      variant="success"
      size="large"
      fullWidth
      loading={loading}
      onPress={onPress}
      style={style}
      testID={testID || "confirm-ride-button"}
      accessibilityLabel={`Confirm ride with ${driverName} for ${amount} ${currency}`}
    />
  );
};

// Payment buttons
export const PaymentButton = ({ 
  amount, 
  onPress, 
  loading = false, 
  method = "Mobile Money",
  currency = "MWK",
  style,
  testID 
}) => (
  <Button
    title={loading ? "Processing..." : `Pay ${currency} ${amount}`}
    icon="credit-card"
    iconPosition="left"
    variant="primary"
    size="large"
    fullWidth
    loading={loading}
    onPress={onPress}
    style={style}
    testID={testID || "payment-button"}
    accessibilityLabel={`Pay ${amount} ${currency} using ${method}`}
  />
);

export const MobileMoneyButton = ({ 
  onPress, 
  loading = false, 
  provider = "Airtel Money",
  style,
  testID 
}) => (
  <Button
    title={loading ? "Processing..." : `Pay with ${provider}`}
    icon="mobile"
    iconPosition="left"
    variant="secondary"
    size="medium"
    fullWidth
    loading={loading}
    onPress={onPress}
    style={style}
    testID={testID || "mobile-money-button"}
    accessibilityLabel={`Pay using ${provider}`}
  />
);

// Location buttons
export const LocationButton = ({ 
  onPress, 
  loading = false, 
  title = "Use Current Location",
  style,
  testID 
}) => (
  <Button
    title={loading ? "Getting Location..." : title}
    icon="map-marker"
    iconPosition="left"
    variant="secondary"
    size="medium"
    loading={loading}
    onPress={onPress}
    style={style}
    testID={testID || "location-button"}
    accessibilityLabel="Use current location"
  />
);

export const SetPickupButton = ({ 
  onPress, 
  loading = false, 
  locationName,
  style,
  testID 
}) => {
  const title = useMemo(() => {
    if (loading) return "Setting Location...";
    return locationName ? `Pickup: ${locationName}` : "Set Pickup Location";
  }, [loading, locationName]);

  return (
    <Button
      title={title}
      icon="location-arrow"
      iconPosition="left"
      variant="outline"
      size="medium"
      loading={loading}
      onPress={onPress}
      style={style}
      testID={testID || "set-pickup-button"}
      accessibilityLabel={locationName ? `Set pickup location to ${locationName}` : "Set pickup location"}
    />
  );
};

// Authentication buttons
export const LoginButton = ({ 
  onPress, 
  loading = false, 
  title = "Login",
  style,
  testID 
}) => (
  <Button
    title={loading ? "Signing In..." : title}
    icon="sign-in"
    iconPosition="left"
    variant="primary"
    size="large"
    fullWidth
    loading={loading}
    onPress={onPress}
    style={style}
    testID={testID || "login-button"}
    accessibilityLabel="Sign in to your account"
  />
);

export const RegisterButton = ({ 
  onPress, 
  loading = false, 
  title = "Create Account",
  style,
  testID 
}) => (
  <Button
    title={loading ? "Creating Account..." : title}
    icon="user-plus"
    iconPosition="left"
    variant="success"
    size="large"
    fullWidth
    loading={loading}
    onPress={onPress}
    style={style}
    testID={testID || "register-button"}
    accessibilityLabel="Create new account"
  />
);

export const GoogleLoginButton = ({ 
  onPress, 
  loading = false,
  style,
  testID 
}) => (
  <Button
    title={loading ? "Connecting..." : "Continue with Google"}
    icon="google"
    iconPosition="left"
    variant="outline"
    size="large"
    fullWidth
    loading={loading}
    onPress={onPress}
    style={style}
    testID={testID || "google-login-button"}
    accessibilityLabel="Sign in with Google account"
  />
);

export const FacebookLoginButton = ({ 
  onPress, 
  loading = false,
  style,
  testID 
}) => (
  <Button
    title={loading ? "Connecting..." : "Continue with Facebook"}
    icon="facebook"
    iconPosition="left"
    variant="outline"
    size="large"
    fullWidth
    loading={loading}
    onPress={onPress}
    style={style}
    testID={testID || "facebook-login-button"}
    accessibilityLabel="Sign in with Facebook account"
  />
);

// Navigation and action buttons
export const ConfirmButton = ({ 
  onPress, 
  title = "Confirm", 
  loading = false, 
  variant = "success",
  style,
  testID 
}) => (
  <Button
    title={loading ? "Confirming..." : title}
    variant={variant}
    size="medium"
    loading={loading}
    onPress={onPress}
    style={style}
    testID={testID || "confirm-button"}
    accessibilityLabel={`Confirm ${title.toLowerCase()}`}
  />
);

export const SaveButton = ({ 
  onPress, 
  loading = false, 
  title = "Save Changes",
  style,
  testID 
}) => (
  <Button
    title={loading ? "Saving..." : title}
    icon="save"
    iconPosition="left"
    variant="primary"
    size="medium"
    loading={loading}
    onPress={onPress}
    style={style}
    testID={testID || "save-button"}
    accessibilityLabel="Save changes"
  />
);

export const EditButton = ({ 
  onPress, 
  title = "Edit", 
  size = "small",
  style,
  testID 
}) => (
  <Button
    title={title}
    icon="edit"
    iconPosition="left"
    variant="outline"
    size={size}
    onPress={onPress}
    style={style}
    testID={testID || "edit-button"}
    accessibilityLabel={`Edit ${title.toLowerCase()}`}
  />
);

export const DeleteButton = ({ 
  onPress, 
  loading = false, 
  title = "Delete",
  size = "small",
  style,
  testID 
}) => (
  <Button
    title={loading ? "Deleting..." : title}
    icon="trash"
    iconPosition="left"
    variant="danger"
    size={size}
    loading={loading}
    onPress={onPress}
    style={style}
    testID={testID || "delete-button"}
    accessibilityLabel={`Delete ${title.toLowerCase()}`}
  />
);

// Driver-specific buttons
export const GoOnlineButton = ({ 
  onPress, 
  loading = false, 
  isOnline = false,
  style,
  testID 
}) => {
  const buttonProps = useMemo(() => ({
    title: loading ? "Updating..." : (isOnline ? "Go Offline" : "Go Online"),
    icon: isOnline ? "power-off" : "play",
    variant: isOnline ? "warning" : "success",
    accessibilityLabel: isOnline ? "Go offline as driver" : "Go online as driver"
  }), [loading, isOnline]);

  return (
    <Button
      {...buttonProps}
      iconPosition="left"
      size="large"
      fullWidth
      loading={loading}
      onPress={onPress}
      style={style}
      testID={testID || "go-online-button"}
    />
  );
};

export const AcceptRideButton = ({ 
  onPress, 
  loading = false, 
  riderName,
  style,
  testID 
}) => (
  <Button
    title={loading ? "Accepting..." : `Accept ${riderName}'s Ride`}
    icon="check-circle"
    iconPosition="left"
    variant="success"
    size="large"
    fullWidth
    loading={loading}
    onPress={onPress}
    style={style}
    testID={testID || "accept-ride-button"}
    accessibilityLabel={`Accept ride request from ${riderName}`}
  />
);

export const StartRideButton = ({ 
  onPress, 
  loading = false,
  style,
  testID 
}) => (
  <Button
    title={loading ? "Starting..." : "Start Ride"}
    icon="play"
    iconPosition="left"
    variant="primary"
    size="large"
    fullWidth
    loading={loading}
    onPress={onPress}
    style={style}
    testID={testID || "start-ride-button"}
    accessibilityLabel="Start the ride"
  />
);

export const CompleteRideButton = ({ 
  onPress, 
  loading = false,
  style,
  testID 
}) => (
  <Button
    title={loading ? "Completing..." : "Complete Ride"}
    icon="flag-checkered"
    iconPosition="left"
    variant="success"
    size="large"
    fullWidth
    loading={loading}
    onPress={onPress}
    style={style}
    testID={testID || "complete-ride-button"}
    accessibilityLabel="Complete the current ride"
  />
);

// Emergency and safety buttons
export const SOSButton = ({ 
  onPress, 
  loading = false,
  style,
  testID 
}) => (
  <Button
    title={loading ? "Sending Alert..." : "SOS Emergency"}
    icon="exclamation-triangle"
    iconPosition="left"
    variant="danger"
    size="large"
    fullWidth
    loading={loading}
    onPress={onPress}
    style={style}
    testID={testID || "sos-button"}
    accessibilityLabel="Emergency SOS button - Send emergency alert"
    accessibilityHint="Sends emergency alert to emergency contacts and support"
  />
);

export const ShareTripButton = ({ 
  onPress, 
  loading = false, 
  isSharing = false,
  style,
  testID 
}) => {
  const buttonProps = useMemo(() => ({
    title: loading ? "Sharing..." : (isSharing ? "Stop Sharing" : "Share Trip"),
    accessibilityLabel: isSharing ? "Stop sharing trip location" : "Share trip location"
  }), [loading, isSharing]);

  return (
    <Button
      {...buttonProps}
      icon="share"
      iconPosition="left"
      variant="secondary"
      size="medium"
      loading={loading}
      onPress={onPress}
      style={style}
      testID={testID || "share-trip-button"}
    />
  );
};

// Rating and feedback buttons
export const RateRideButton = ({ 
  onPress, 
  loading = false,
  style,
  testID 
}) => (
  <Button
    title={loading ? "Submitting..." : "Rate Ride"}
    icon="star"
    iconPosition="left"
    variant="primary"
    size="medium"
    loading={loading}
    onPress={onPress}
    style={style}
    testID={testID || "rate-ride-button"}
    accessibilityLabel="Rate your ride experience"
  />
);

export const SubmitReviewButton = ({ 
  onPress, 
  loading = false,
  style,
  testID 
}) => (
  <Button
    title={loading ? "Submitting..." : "Submit Review"}
    icon="send"
    iconPosition="left"
    variant="success"
    size="medium"
    loading={loading}
    onPress={onPress}
    style={style}
    testID={testID || "submit-review-button"}
    accessibilityLabel="Submit your review"
  />
);

// Utility buttons
export const RetryButton = ({ 
  onPress, 
  loading = false, 
  title = "Try Again",
  style,
  testID 
}) => (
  <Button
    title={loading ? "Retrying..." : title}
    icon="refresh"
    iconPosition="left"
    variant="outline"
    size="medium"
    loading={loading}
    onPress={onPress}
    style={style}
    testID={testID || "retry-button"}
    accessibilityLabel="Retry action"
  />
);

export const ContinueButton = ({ 
  onPress, 
  loading = false, 
  title = "Continue",
  style,
  testID 
}) => (
  <Button
    title={loading ? "Continuing..." : title}
    icon="arrow-right"
    iconPosition="right"
    variant="primary"
    size="large"
    fullWidth
    loading={loading}
    onPress={onPress}
    style={style}
    testID={testID || "continue-button"}
    accessibilityLabel="Continue to next step"
  />
);

export const BackButton = ({ 
  onPress, 
  loading = false, 
  title = "Back",
  style,
  testID 
}) => (
  <Button
    title={loading ? "Going Back..." : title}
    icon="arrow-left"
    iconPosition="left"
    variant="outline"
    size="medium"
    loading={loading}
    onPress={onPress}
    style={style}
    testID={testID || "back-button"}
    accessibilityLabel="Go back to previous screen"
  />
);

export const RefreshButton = ({ 
  onPress, 
  loading = false, 
  title = "Refresh",
  size = "small",
  style,
  testID 
}) => (
  <Button
    title={loading ? "Refreshing..." : title}
    icon="refresh"
    iconPosition="left"
    variant="outline"
    size={size}
    loading={loading}
    onPress={onPress}
    style={style}
    testID={testID || "refresh-button"}
    accessibilityLabel="Refresh content"
  />
);

// Button groups for common layouts
export const ButtonGroup = ({ 
  children, 
  style,
  vertical = false,
  spacing = 12,
  testID 
}) => (
  <View 
    style={[
      styles.buttonGroup,
      vertical && styles.buttonGroupVertical,
      { gap: spacing },
      style
    ]}
    testID={testID || "button-group"}
  >
    {children}
  </View>
);

export const DoubleButtonGroup = ({ 
  primary, 
  secondary, 
  primaryLoading = false, 
  secondaryLoading = false,
  style,
  testID 
}) => (
  <ButtonGroup style={style} testID={testID || "double-button-group"}>
    <Button
      title={secondaryLoading ? (secondary.loadingText || "Loading...") : secondary.title}
      onPress={secondary.onPress}
      variant={secondary.variant || "outline"}
      size={secondary.size || "medium"}
      loading={secondaryLoading}
      disabled={secondary.disabled}
      icon={secondary.icon}
      iconPosition={secondary.iconPosition}
      style={[styles.groupButton, secondary.style]}
      testID={secondary.testID || "secondary-button"}
    />
    <Button
      title={primaryLoading ? (primary.loadingText || "Loading...") : primary.title}
      onPress={primary.onPress}
      variant={primary.variant || "primary"}
      size={primary.size || "medium"}
      loading={primaryLoading}
      disabled={primary.disabled}
      icon={primary.icon}
      iconPosition={primary.iconPosition}
      style={[styles.groupButton, primary.style]}
      testID={primary.testID || "primary-button"}
    />
  </ButtonGroup>
);

export const TripleButtonGroup = ({ 
  left, 
  center, 
  right,
  style,
  testID 
}) => (
  <ButtonGroup style={style} testID={testID || "triple-button-group"}>
    <Button
      {...left}
      style={[styles.groupButton, left.style]}
      testID={left.testID || "left-button"}
    />
    <Button
      {...center}
      style={[styles.groupButton, center.style]}
      testID={center.testID || "center-button"}
    />
    <Button
      {...right}
      style={[styles.groupButton, right.style]}
      testID={right.testID || "right-button"}
    />
  </ButtonGroup>
);

const styles = StyleSheet.create({
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  buttonGroupVertical: {
    flexDirection: 'column',
  },
  groupButton: {
    flex: 1,
  },
});

// Export base Button component
export { Button as default } from './Button';