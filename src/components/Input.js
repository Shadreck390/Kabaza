// components/Input.js
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
  View, 
  TextInput, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  Animated,
  Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

const Input = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  error,
  success,
  helperText,
  icon,
  rightIcon,
  onRightIconPress,
  editable = true,
  multiline = false,
  numberOfLines = 1,
  autoCapitalize = 'sentences',
  autoCorrect = true,
  autoFocus = false,
  returnKeyType = 'done',
  onSubmitEditing,
  blurOnSubmit = true,
  maxLength,
  containerStyle,
  inputStyle,
  labelStyle,
  errorStyle,
  showCharacterCount = false,
  required = false,
  testID,
  accessibilityLabel,
  clearable = false,
  onClear,
  focusedBorderColor = '#6c3',
  focusedLabelColor = '#6c3',
  variant = 'default', // 'default', 'outlined', 'filled'
  size = 'medium', // 'small', 'medium', 'large'
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;
  const inputRef = useRef(null);

  useEffect(() => {
    if (value && animatedValue._value === 0) {
      animateLabel(1);
    } else if (!value && !isFocused && animatedValue._value === 1) {
      animateLabel(0);
    }
  }, [value]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    animateLabel(1);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    if (!value) {
      animateLabel(0);
    }
  }, [value]);

  const animateLabel = useCallback((toValue) => {
    Animated.timing(animatedValue, {
      toValue,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [animatedValue]);

  const handleChangeText = useCallback((text) => {
    onChangeText?.(text);
  }, [onChangeText]);

  const handleClear = useCallback(() => {
    onChangeText?.('');
    onClear?.();
    inputRef.current?.focus();
  }, [onChangeText, onClear]);

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const getBorderColor = useMemo(() => {
    if (error) return '#EF4444';
    if (success) return '#10B981';
    if (isFocused) return focusedBorderColor;
    return '#D1D5DB';
  }, [error, success, isFocused, focusedBorderColor]);

  const getInputHeight = useMemo(() => {
    const heights = { small: 48, medium: 56, large: 64 };
    return heights[size] || heights.medium;
  }, [size]);

  const showClearButton = clearable && value && !secureTextEntry && !rightIcon;

  const getRightIcon = useCallback(() => {
    if (showClearButton) {
      return (
        <TouchableOpacity
          onPress={handleClear}
          style={styles.rightIcon}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Clear input"
          accessibilityRole="button"
        >
          <Icon name="times-circle" size={18} color="#9CA3AF" />
        </TouchableOpacity>
      );
    }

    if (secureTextEntry) {
      return (
        <TouchableOpacity
          onPress={togglePasswordVisibility}
          style={styles.rightIcon}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
          accessibilityRole="button"
        >
          <Icon 
            name={showPassword ? 'eye-slash' : 'eye'} 
            size={18} 
            color="#6B7280" 
          />
        </TouchableOpacity>
      );
    }

    if (rightIcon) {
      return (
        <TouchableOpacity
          onPress={onRightIconPress}
          style={styles.rightIcon}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          disabled={!onRightIconPress}
          accessibilityRole="button"
        >
          <Icon name={rightIcon} size={18} color="#6B7280" />
        </TouchableOpacity>
      );
    }

    return null;
  }, [showClearButton, secureTextEntry, rightIcon, showPassword, onRightIconPress, handleClear, togglePasswordVisibility]);

  const labelPosition = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 8],
  });

  const labelSize = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 12],
  });

  const labelColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['#6B7280', isFocused ? focusedLabelColor : '#6c3'],
  });

  const containerVariantStyle = useMemo(() => {
    switch (variant) {
      case 'filled':
        return styles.filledVariant;
      case 'outlined':
        return styles.outlinedVariant;
      default:
        return null;
    }
  }, [variant]);

  return (
    <View style={[styles.container, containerStyle]}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={focusInput}
        disabled={!editable}
        style={[
          styles.inputContainer,
          containerVariantStyle,
          {
            borderColor: getBorderColor,
            backgroundColor: editable ? (variant === 'filled' ? '#F9FAFB' : '#fff') : '#F3F4F6',
            minHeight: multiline ? 100 : getInputHeight,
          },
          multiline && styles.multilineContainer,
          error && styles.inputError,
          success && styles.inputSuccess,
          !editable && styles.containerDisabled,
        ]}
      >
        {icon && (
          <Icon 
            name={icon} 
            size={18} 
            color={isFocused ? focusedBorderColor : '#6B7280'} 
            style={styles.leftIcon} 
          />
        )}

        <View style={styles.inputWrapper}>
          {label && (
            <Animated.Text
              style={[
                styles.floatingLabel,
                {
                  transform: [{ translateY: labelPosition }],
                  fontSize: labelSize,
                  color: error ? '#EF4444' : labelColor,
                },
                labelStyle,
              ]}
              numberOfLines={1}
            >
              {label}
              {required && <Text style={styles.required}> *</Text>}
            </Animated.Text>
          )}

          <TextInput
            ref={inputRef}
            style={[
              styles.input,
              { fontSize: size === 'small' ? 14 : size === 'large' ? 18 : 16 },
              multiline && styles.multilineInput,
              icon && styles.inputWithLeftIcon,
              (rightIcon || secureTextEntry || showClearButton) && styles.inputWithRightIcon,
              !editable && styles.inputDisabled,
              inputStyle,
            ]}
            value={value}
            onChangeText={handleChangeText}
            placeholder={isFocused || !label ? placeholder : ''}
            placeholderTextColor="#9CA3AF"
            secureTextEntry={secureTextEntry && !showPassword}
            keyboardType={keyboardType}
            editable={editable}
            multiline={multiline}
            numberOfLines={multiline ? numberOfLines : 1}
            autoCapitalize={autoCapitalize}
            autoCorrect={autoCorrect}
            autoFocus={autoFocus}
            returnKeyType={returnKeyType}
            onSubmitEditing={onSubmitEditing}
            blurOnSubmit={blurOnSubmit}
            maxLength={maxLength}
            onFocus={handleFocus}
            onBlur={handleBlur}
            testID={testID}
            accessibilityLabel={accessibilityLabel || label}
            accessibilityRole="text"
            accessibilityState={{ disabled: !editable }}
            accessibilityHint={error || helperText}
            {...props}
          />
        </View>

        {getRightIcon()}
      </TouchableOpacity>

      <View style={styles.footer}>
        <View style={styles.messageContainer}>
          {error && (
            <View style={styles.messageWrapper}>
              <Icon name="exclamation-circle" size={12} color="#EF4444" />
              <Text style={[styles.errorText, errorStyle]}>{error}</Text>
            </View>
          )}
          {success && !error && (
            <View style={styles.messageWrapper}>
              <Icon name="check-circle" size={12} color="#10B981" />
              <Text style={styles.successText}>{success}</Text>
            </View>
          )}
          {helperText && !error && !success && (
            <Text style={styles.helperText}>{helperText}</Text>
          )}
        </View>

        {showCharacterCount && maxLength && (
          <Text 
            style={[
              styles.characterCount,
              (value?.length || 0) > maxLength * 0.9 && styles.characterCountWarning,
              (value?.length || 0) >= maxLength && styles.characterCountError,
            ]}
          >
            {value?.length || 0}/{maxLength}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1.5,
    borderRadius: 12,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    minHeight: 56,
    transition: 'all 0.2s',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  outlinedVariant: {
    backgroundColor: 'transparent',
  },
  filledVariant: {
    borderWidth: 0,
    borderBottomWidth: 2,
    borderRadius: 8,
    paddingTop: 8,
  },
  multilineContainer: {
    minHeight: 100,
    paddingVertical: 12,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  inputSuccess: {
    borderColor: '#10B981',
  },
  containerDisabled: {
    opacity: 0.6,
  },
  leftIcon: {
    marginRight: 12,
    marginTop: 16,
  },
  inputWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  floatingLabel: {
    position: 'absolute',
    left: 0,
    fontWeight: '500',
    zIndex: 1,
    backgroundColor: 'transparent',
  },
  required: {
    color: '#EF4444',
  },
  input: {
    fontSize: 16,
    color: '#111827',
    paddingTop: 20,
    paddingBottom: 8,
    paddingHorizontal: 0,
    ...Platform.select({
      ios: {
        paddingTop: 22,
      },
      android: {
        paddingTop: 20,
      },
    }),
  },
  inputWithLeftIcon: {
    marginLeft: 0,
  },
  inputWithRightIcon: {
    paddingRight: 36,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 24,
    paddingBottom: 12,
  },
  inputDisabled: {
    color: '#6B7280',
  },
  rightIcon: {
    position: 'absolute',
    right: 16,
    top: 16,
    zIndex: 2,
    padding: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 6,
    minHeight: 20,
  },
  messageContainer: {
    flex: 1,
    marginRight: 8,
  },
  messageWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginLeft: 4,
    fontWeight: '500',
    flexShrink: 1,
  },
  successText: {
    fontSize: 12,
    color: '#10B981',
    marginLeft: 4,
    fontWeight: '500',
    flexShrink: 1,
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '400',
    lineHeight: 16,
  },
  characterCount: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  characterCountWarning: {
    color: '#F59E0B',
  },
  characterCountError: {
    color: '#EF4444',
  },
});

export default Input;