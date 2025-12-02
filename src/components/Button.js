// components/Button.js
import React, { useMemo } from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ActivityIndicator,
  View,
  Platform 
} from 'react-native';

const Button = ({ 
  title, 
  onPress, 
  variant = 'primary', 
  size = 'medium',
  loading = false, 
  disabled = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
  textStyle,
  activeOpacity = 0.7,
  testID,
}) => {
  // Memoize button styles for better performance
  const buttonStyles = useMemo(() => [
    styles.button,
    styles[variant],
    styles[size],
    fullWidth && styles.fullWidth,
    (disabled || loading) && styles.disabled,
    style,
  ], [variant, size, fullWidth, disabled, loading, style]);

  const textStyles = useMemo(() => [
    styles.buttonText,
    styles[`${variant}Text`],
    styles[`${size}Text`],
    textStyle,
  ], [variant, size, textStyle]);

  // Get spinner color based on variant
  const getSpinnerColor = () => {
    switch (variant) {
      case 'primary':
      case 'danger':
        return '#fff';
      case 'secondary':
      case 'success':
        return '#4CAF50';
      case 'outline':
      case 'ghost':
        return '#666';
      default:
        return '#4CAF50';
    }
  };

  // Render button content
  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator 
            size={size === 'small' ? 'small' : 'small'} 
            color={getSpinnerColor()} 
          />
          {title && (
            <Text style={[textStyles, styles.loadingText]}>
              {typeof title === 'string' ? title : 'Loading...'}
            </Text>
          )}
        </View>
      );
    }

    const iconElement = icon && (
      <View style={[
        styles.iconContainer,
        iconPosition === 'right' && styles.iconRight
      ]}>
        {icon}
      </View>
    );

    return (
      <View style={styles.contentContainer}>
        {iconPosition === 'left' && iconElement}
        <Text style={textStyles} numberOfLines={1}>
          {title}
        </Text>
        {iconPosition === 'right' && iconElement}
      </View>
    );
  };

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={activeOpacity}
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      accessibilityLabel={title}
    >
      {renderContent()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  
  // Size variants
  small: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    minHeight: 36,
  },
  medium: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    minHeight: 48,
  },
  large: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    minHeight: 56,
  },
  
  // Color variants
  primary: {
    backgroundColor: '#4CAF50',
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
  },
  ghost: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderWidth: 0,
  },
  danger: {
    backgroundColor: '#EF4444',
  },
  success: {
    backgroundColor: '#10B981',
  },
  warning: {
    backgroundColor: '#F59E0B',
  },
  
  // Full width
  fullWidth: {
    width: '100%',
  },
  
  // Disabled state
  disabled: {
    opacity: 0.5,
  },
  
  // Content container
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  loadingText: {
    marginLeft: 8,
  },
  
  // Icon styles
  iconContainer: {
    marginRight: 8,
  },
  iconRight: {
    marginRight: 0,
    marginLeft: 8,
  },
  
  // Text styles
  buttonText: {
    fontWeight: '600',
    textAlign: 'center',
  },
  
  // Text size variants
  smallText: {
    fontSize: 14,
  },
  mediumText: {
    fontSize: 16,
  },
  largeText: {
    fontSize: 18,
  },
  
  // Text color variants
  primaryText: {
    color: '#fff',
  },
  secondaryText: {
    color: '#4CAF50',
  },
  outlineText: {
    color: '#333',
  },
  ghostText: {
    color: '#4CAF50',
  },
  dangerText: {
    color: '#fff',
  },
  successText: {
    color: '#fff',
  },
  warningText: {
    color: '#fff',
  },
});

export default Button;