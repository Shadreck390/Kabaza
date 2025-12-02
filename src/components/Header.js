// components/Header.js
import React, { useMemo } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  StatusBar,
  Platform,
  SafeAreaView
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useNavigation } from '@react-navigation/native';

const Header = ({ 
  title, 
  subtitle,
  onBack, 
  rightIcon, 
  rightComponent,
  leftComponent,
  onRightPress, 
  showBack = true,
  backgroundColor = '#6c3',
  titleColor = '#fff',
  iconColor = '#fff',
  statusBarStyle = 'light-content',
  transparent = false,
  elevated = true,
  centerTitle = true,
  style,
  testID,
  disabled = false,
  large = false,
}) => {
  const navigation = useNavigation();

  const handleBack = () => {
    if (disabled) return;
    if (onBack) {
      onBack();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const handleRightPress = () => {
    if (disabled || !onRightPress) return;
    onRightPress();
  };

  const renderLeft = useMemo(() => {
    if (leftComponent) {
      return leftComponent;
    }

    if (showBack) {
      return (
        <TouchableOpacity 
          onPress={handleBack} 
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Go back"
          accessibilityRole="button"
          disabled={disabled}
          activeOpacity={0.7}
        >
          <Icon name="arrow-left" size={20} color={iconColor} />
        </TouchableOpacity>
      );
    }

    return <View style={styles.placeholder} />;
  }, [leftComponent, showBack, iconColor, disabled]);

  const renderRight = useMemo(() => {
    if (rightComponent) {
      return rightComponent;
    }

    if (rightIcon) {
      return (
        <TouchableOpacity 
          onPress={handleRightPress} 
          style={styles.rightButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel={typeof rightIcon === 'string' ? rightIcon : 'Action'}
          accessibilityRole="button"
          disabled={disabled || !onRightPress}
          activeOpacity={0.7}
        >
          {typeof rightIcon === 'string' ? (
            <Icon name={rightIcon} size={20} color={iconColor} />
          ) : (
            rightIcon
          )}
        </TouchableOpacity>
      );
    }

    return <View style={styles.placeholder} />;
  }, [rightComponent, rightIcon, iconColor, onRightPress, disabled]);

  const headerStyle = useMemo(() => [
    styles.header,
    large && styles.headerLarge,
    transparent && styles.transparent,
    elevated && !transparent && styles.elevated,
    { backgroundColor: transparent ? 'transparent' : backgroundColor },
    style
  ], [transparent, elevated, backgroundColor, large, style]);

  const titleStyle = useMemo(() => [
    styles.title,
    large && styles.titleLarge,
    { color: titleColor },
    subtitle && styles.titleWithSubtitle
  ], [titleColor, subtitle, large]);

  const subtitleStyle = useMemo(() => [
    styles.subtitle,
    large && styles.subtitleLarge,
    { color: titleColor }
  ], [titleColor, large]);

  return (
    <>
      <StatusBar 
        barStyle={statusBarStyle} 
        backgroundColor={transparent ? 'transparent' : backgroundColor}
        translucent={transparent}
      />
      <SafeAreaView 
        style={[
          styles.safeArea,
          { backgroundColor: transparent ? 'transparent' : backgroundColor }
        ]}
      >
        <View style={headerStyle} testID={testID}>
          <View style={styles.leftContainer}>
            {renderLeft}
          </View>

          <View style={[
            styles.titleContainer, 
            !centerTitle && styles.titleContainerLeft
          ]}>
            <Text 
              style={titleStyle}
              numberOfLines={1}
              ellipsizeMode="tail"
              accessibilityRole="header"
            >
              {title}
            </Text>
            {subtitle && (
              <Text 
                style={subtitleStyle}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {subtitle}
              </Text>
            )}
          </View>

          <View style={styles.rightContainer}>
            {renderRight}
          </View>
        </View>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#6c3',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: Platform.OS === 'ios' ? 44 : 56,
  },
  headerLarge: {
    minHeight: Platform.OS === 'ios' ? 64 : 72,
    paddingVertical: 16,
  },
  transparent: {
    backgroundColor: 'transparent',
    elevation: 0,
    shadowOpacity: 0,
  },
  elevated: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  leftContainer: {
    width: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  rightContainer: {
    width: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  titleContainerLeft: {
    alignItems: 'flex-start',
    paddingLeft: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: Platform.OS === 'ios' ? '600' : 'bold',
    textAlign: 'center',
  },
  titleLarge: {
    fontSize: 24,
    fontWeight: Platform.OS === 'ios' ? '700' : 'bold',
  },
  titleWithSubtitle: {
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '400',
    opacity: 0.85,
    textAlign: 'center',
  },
  subtitleLarge: {
    fontSize: 14,
  },
  backButton: {
    padding: 4,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightButton: {
    padding: 4,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    width: 40,
  },
});

export default Header;