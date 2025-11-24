// components/Input.js
import React, { useState, useRef } from 'react';
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
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;
  const inputRef = useRef(null);

  const handleFocus = () => {
    setIsFocused(true);
    animateLabel(1);
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (!value) {
      animateLabel(0);
    }
  };

  const animateLabel = (toValue) => {
    Animated.timing(animatedValue, {
      toValue,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleChangeText = (text) => {
    onChangeText?.(text);
    if (text && !isFocused) {
      animateLabel(1);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const focusInput = () => {
    inputRef.current?.focus();
  };

  const getBorderColor = () => {
    if (error) return '#EF4444';
    if (success) return '#10B981';
    if (isFocused) return '#6c3';
    return '#D1D5DB';
  };

  const getRightIcon = () => {
    if (secureTextEntry) {
      return (
        <TouchableOpacity
          onPress={togglePasswordVisibility}
          style={styles.rightIcon}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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
        >
          <Icon name={rightIcon} size={18} color="#6B7280" />
        </TouchableOpacity>
      );
    }

    return null;
  };

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
    outputRange: ['#6B7280', '#6c3'],
  });

  return (
    <View style={[styles.container, containerStyle]}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={focusInput}
        style={[
          styles.inputContainer,
          {
            borderColor: getBorderColor(),
            backgroundColor: editable ? '#fff' : '#F9FAFB',
          },
          multiline && styles.multilineContainer,
          error && styles.inputError,
          success && styles.inputSuccess,
        ]}
      >
        {icon && (
          <Icon 
            name={icon} 
            size={18} 
            color={isFocused ? '#6c3' : '#6B7280'} 
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
                  color: labelColor,
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
              multiline && styles.multilineInput,
              icon && styles.inputWithLeftIcon,
              (rightIcon || secureTextEntry) && styles.inputWithRightIcon,
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
            {...props}
          />
        </View>

        {getRightIcon()}
      </TouchableOpacity>

      <View style={styles.footer}>
        <View style={styles.errorContainer}>
          {error && (
            <View style={styles.errorWrapper}>
              <Icon name="exclamation-circle" size={12} color="#EF4444" />
              <Text style={[styles.errorText, errorStyle]}>{error}</Text>
            </View>
          )}
          {success && !error && (
            <View style={styles.successWrapper}>
              <Icon name="check-circle" size={12} color="#10B981" />
              <Text style={styles.successText}>{success}</Text>
            </View>
          )}
        </View>

        {showCharacterCount && maxLength && (
          <Text style={styles.characterCount}>
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
    }),
  },
  inputWithLeftIcon: {
    marginLeft: 0,
  },
  inputWithRightIcon: {
    paddingRight: 30,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 24,
    paddingBottom: 12,
  },
  inputDisabled: {
    color: '#6B7280',
    opacity: 0.7,
  },
  rightIcon: {
    position: 'absolute',
    right: 16,
    top: 16,
    zIndex: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    minHeight: 20,
  },
  errorContainer: {
    flex: 1,
  },
  errorWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginLeft: 4,
    fontWeight: '500',
  },
  successWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  successText: {
    fontSize: 12,
    color: '#10B981',
    marginLeft: 4,
    fontWeight: '500',
  },
  characterCount: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
});

export default Input;