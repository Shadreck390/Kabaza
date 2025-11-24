// components/Header.js
import React from 'react';
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
}) => {
  const navigation = useNavigation();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigation.goBack();
    }
  };

  const renderLeft = () => {
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
        >
          <Icon name="arrow-left" size={20} color={iconColor} />
        </TouchableOpacity>
      );
    }

    return <View style={styles.placeholder} />;
  };

  const renderRight = () => {
    if (rightComponent) {
      return rightComponent;
    }

    if (rightIcon) {
      return (
        <TouchableOpacity 
          onPress={onRightPress} 
          style={styles.rightButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel={typeof rightIcon === 'string' ? rightIcon : 'Action'}
          accessibilityRole="button"
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
  };

  const headerStyle = [
    styles.header,
    transparent && styles.transparent,
    elevated && styles.elevated,
    { backgroundColor: transparent ? 'transparent' : backgroundColor },
    style
  ];

  return (
    <SafeAreaView style={transparent ? styles.transparentSafeArea : null}>
      <StatusBar 
        barStyle={statusBarStyle} 
        backgroundColor={transparent ? 'transparent' : backgroundColor}
        translucent={transparent}
      />
      <View style={headerStyle} testID={testID}>
        <View style={styles.leftContainer}>
          {renderLeft()}
        </View>

        <View style={[
          styles.titleContainer, 
          !centerTitle && styles.titleContainerLeft
        ]}>
          <Text 
            style={[
              styles.title, 
              { color: titleColor },
              subtitle && styles.titleWithSubtitle
            ]}
            numberOfLines={1}
            accessibilityRole="header"
          >
            {title}
          </Text>
          {subtitle && (
            <Text 
              style={[styles.subtitle, { color: titleColor }]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          )}
        </View>

        <View style={styles.rightContainer}>
          {renderRight()}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 8 : 12,
    paddingBottom: 12,
    minHeight: Platform.OS === 'ios' ? 44 : 56,
  },
  transparentSafeArea: {
    backgroundColor: 'transparent',
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
    fontWeight: 'bold',
    textAlign: 'center',
  },
  titleWithSubtitle: {
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '400',
    opacity: 0.9,
    textAlign: 'center',
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