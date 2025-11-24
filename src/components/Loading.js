// components/Loading.js
import React from 'react';
import { 
  View, 
  Text, 
  ActivityIndicator, 
  StyleSheet, 
  Animated,
  Easing,
  Dimensions 
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

const { width, height } = Dimensions.get('window');

const Loading = ({ 
  message = 'Loading...', 
  size = 'large',
  type = 'spinner', // 'spinner', 'dots', 'pulse', 'skeleton'
  color = '#6c3',
  backgroundColor = 'transparent',
  overlay = false,
  fullScreen = false,
  textStyle,
  containerStyle,
  showLogo = false,
  progress, // For progress bar type (0-100)
  subtitle,
  testID,
}) => {
  const pulseAnim = new Animated.Value(1);
  const dotAnim1 = new Animated.Value(0);
  const dotAnim2 = new Animated.Value(0);
  const dotAnim3 = new Animated.Value(0);

  React.useEffect(() => {
    if (type === 'pulse') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }

    if (type === 'dots') {
      const createDotAnimation = (anim, delay) => {
        return Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 1,
              duration: 600,
              delay,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 600,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        );
      };

      createDotAnimation(dotAnim1, 0).start();
      createDotAnimation(dotAnim2, 200).start();
      createDotAnimation(dotAnim3, 400).start();
    }
  }, [type]);

  const renderSpinner = () => (
    <ActivityIndicator 
      size={size} 
      color={color} 
      style={styles.spinner}
    />
  );

  const renderDots = () => (
    <View style={styles.dotsContainer}>
      <Animated.View 
        style={[
          styles.dot,
          { 
            backgroundColor: color,
            opacity: dotAnim1,
            transform: [{ scale: dotAnim1.interpolate({
              inputRange: [0, 1],
              outputRange: [0.5, 1]
            })}]
          }
        ]} 
      />
      <Animated.View 
        style={[
          styles.dot,
          { 
            backgroundColor: color,
            opacity: dotAnim2,
            transform: [{ scale: dotAnim2.interpolate({
              inputRange: [0, 1],
              outputRange: [0.5, 1]
            })}]
          }
        ]} 
      />
      <Animated.View 
        style={[
          styles.dot,
          { 
            backgroundColor: color,
            opacity: dotAnim3,
            transform: [{ scale: dotAnim3.interpolate({
              inputRange: [0, 1],
              outputRange: [0.5, 1]
            })}]
          }
        ]} 
      />
    </View>
  );

  const renderPulse = () => (
    <Animated.View 
      style={[
        styles.pulseContainer,
        { transform: [{ scale: pulseAnim }] }
      ]}
    >
      <Icon name="car" size={40} color={color} />
    </Animated.View>
  );

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressBackground}>
        <View 
          style={[
            styles.progressFill,
            { 
              width: `${progress}%`,
              backgroundColor: color
            }
          ]} 
        />
      </View>
      <Text style={[styles.progressText, { color }]}>
        {Math.round(progress)}%
      </Text>
    </View>
  );

  const renderSkeleton = () => (
    <View style={styles.skeletonContainer}>
      <View style={[styles.skeletonLine, styles.skeletonTitle]} />
      <View style={[styles.skeletonLine, styles.skeletonSubtitle]} />
      <View style={styles.skeletonContent}>
        <View style={[styles.skeletonBox, styles.skeletonBox1]} />
        <View style={[styles.skeletonBox, styles.skeletonBox2]} />
      </View>
    </View>
  );

  const renderLoader = () => {
    switch (type) {
      case 'dots':
        return renderDots();
      case 'pulse':
        return renderPulse();
      case 'progress':
        return renderProgressBar();
      case 'skeleton':
        return renderSkeleton();
      default:
        return renderSpinner();
    }
  };

  const containerStyles = [
    styles.container,
    overlay && styles.overlay,
    fullScreen && styles.fullScreen,
    { backgroundColor },
    containerStyle
  ];

  if (type === 'skeleton') {
    return (
      <View style={containerStyles} testID={testID}>
        {renderSkeleton()}
      </View>
    );
  }

  return (
    <View style={containerStyles} testID={testID}>
      {showLogo && (
        <View style={styles.logoContainer}>
          <Icon name="car" size={48} color={color} />
          <Text style={[styles.logoText, { color }]}>Kabaza</Text>
        </View>
      )}
      
      {renderLoader()}
      
      <View style={styles.textContainer}>
        <Text style={[styles.message, textStyle, { color }]}>
          {message}
        </Text>
        {subtitle && (
          <Text style={[styles.subtitle, textStyle, { color: `${color}99` }]}>
            {subtitle}
          </Text>
        )}
      </View>
    </View>
  );
};

// Loading wrapper for components
export const LoadingWrapper = ({ 
  loading, 
  children, 
  type = 'spinner',
  message = 'Loading...',
  ...props 
}) => {
  if (loading) {
    return <Loading type={type} message={message} {...props} />;
  }
  return children;
};

// Inline loading component
export const InlineLoading = ({ size = 'small', color = '#6c3', ...props }) => (
  <Loading 
    size={size} 
    color={color} 
    overlay={false}
    fullScreen={false}
    {...props} 
  />
);

// Page loading component
export const PageLoading = ({ message = 'Loading...', ...props }) => (
  <Loading 
    message={message} 
    fullScreen={true} 
    overlay={true}
    showLogo={true}
    {...props} 
  />
);

// Progress loading component
export const ProgressLoading = ({ progress, message = 'Processing...', ...props }) => (
  <Loading 
    type="progress" 
    progress={progress} 
    message={message}
    fullScreen={true}
    overlay={true}
    {...props} 
  />
);

// Skeleton loading component
export const SkeletonLoading = ({ ...props }) => (
  <Loading 
    type="skeleton" 
    fullScreen={false}
    overlay={false}
    {...props} 
  />
);

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  overlay: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  fullScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    width,
    height,
  },
  spinner: {
    marginBottom: 16,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 8,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  pulseContainer: {
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    width: '80%',
    maxWidth: 300,
    marginBottom: 16,
    alignItems: 'center',
  },
  progressBackground: {
    width: '100%',
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
  },
  textContainer: {
    alignItems: 'center',
  },
  message: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.7,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  // Skeleton styles
  skeletonContainer: {
    width: '100%',
    padding: 16,
  },
  skeletonLine: {
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginBottom: 12,
  },
  skeletonTitle: {
    height: 20,
    width: '60%',
  },
  skeletonSubtitle: {
    height: 16,
    width: '40%',
  },
  skeletonContent: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  skeletonBox: {
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
  },
  skeletonBox1: {
    width: 100,
    height: 100,
  },
  skeletonBox2: {
    flex: 1,
    height: 100,
  },
});

export default Loading;