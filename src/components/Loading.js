// components/Loading.js
import React, { useEffect, useRef, useMemo } from 'react';
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
  type = 'spinner', // 'spinner', 'dots', 'pulse', 'skeleton', 'progress', 'bars'
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
  animated = true,
  skeletonCount = 3,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const dotAnim1 = useRef(new Animated.Value(0)).current;
  const dotAnim2 = useRef(new Animated.Value(0)).current;
  const dotAnim3 = useRef(new Animated.Value(0)).current;
  const barAnim1 = useRef(new Animated.Value(0.3)).current;
  const barAnim2 = useRef(new Animated.Value(0.3)).current;
  const barAnim3 = useRef(new Animated.Value(0.3)).current;
  const skeletonAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) return;

    let animations = [];

    if (type === 'pulse') {
      const pulseAnimation = Animated.loop(
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
      );
      pulseAnimation.start();
      animations.push(pulseAnimation);
    }

    if (type === 'dots') {
      const createDotAnimation = (anim, delay) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim, {
              toValue: 1,
              duration: 600,
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

      const dot1 = createDotAnimation(dotAnim1, 0);
      const dot2 = createDotAnimation(dotAnim2, 200);
      const dot3 = createDotAnimation(dotAnim3, 400);
      
      dot1.start();
      dot2.start();
      dot3.start();
      
      animations.push(dot1, dot2, dot3);
    }

    if (type === 'bars') {
      const createBarAnimation = (anim, delay) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim, {
              toValue: 1,
              duration: 500,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0.3,
              duration: 500,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        );
      };

      const bar1 = createBarAnimation(barAnim1, 0);
      const bar2 = createBarAnimation(barAnim2, 150);
      const bar3 = createBarAnimation(barAnim3, 300);
      
      bar1.start();
      bar2.start();
      bar3.start();
      
      animations.push(bar1, bar2, bar3);
    }

    if (type === 'skeleton') {
      const skeletonAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(skeletonAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(skeletonAnim, {
            toValue: 0,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      skeletonAnimation.start();
      animations.push(skeletonAnimation);
    }

    return () => {
      animations.forEach(anim => anim.stop());
    };
  }, [type, animated]);

  useEffect(() => {
    if (type === 'progress' && typeof progress === 'number') {
      Animated.timing(progressAnim, {
        toValue: progress,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }).start();
    }
  }, [progress, type]);

  const renderSpinner = () => (
    <ActivityIndicator 
      size={size} 
      color={color} 
      style={styles.spinner}
      accessibilityLabel="Loading"
    />
  );

  const renderDots = () => (
    <View style={styles.dotsContainer}>
      {[dotAnim1, dotAnim2, dotAnim3].map((anim, index) => (
        <Animated.View 
          key={index}
          style={[
            styles.dot,
            { 
              backgroundColor: color,
              opacity: anim,
              transform: [{ 
                scale: anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.5, 1]
                })
              }]
            }
          ]} 
        />
      ))}
    </View>
  );

  const renderBars = () => (
    <View style={styles.barsContainer}>
      {[barAnim1, barAnim2, barAnim3].map((anim, index) => (
        <Animated.View 
          key={index}
          style={[
            styles.bar,
            { 
              backgroundColor: color,
              transform: [{ scaleY: anim }]
            }
          ]} 
        />
      ))}
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

  const renderProgressBar = () => {
    const displayProgress = typeof progress === 'number' ? progress : 0;
    const progressWidth = progressAnim.interpolate({
      inputRange: [0, 100],
      outputRange: ['0%', '100%'],
    });

    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressBackground}>
          <Animated.View 
            style={[
              styles.progressFill,
              { 
                width: progressWidth,
                backgroundColor: color
              }
            ]} 
          />
        </View>
        <Text style={[styles.progressText, { color }]}>
          {Math.round(displayProgress)}%
        </Text>
      </View>
    );
  };

  const skeletonOpacity = skeletonAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const renderSkeleton = () => (
    <View style={styles.skeletonContainer}>
      {Array.from({ length: skeletonCount }).map((_, index) => (
        <Animated.View 
          key={index}
          style={[
            styles.skeletonItem,
            { opacity: skeletonOpacity }
          ]}
        >
          <View style={[styles.skeletonLine, styles.skeletonTitle]} />
          <View style={[styles.skeletonLine, styles.skeletonSubtitle]} />
          <View style={styles.skeletonContent}>
            <View style={[styles.skeletonBox, styles.skeletonBox1]} />
            <View style={[styles.skeletonBox, styles.skeletonBox2]} />
          </View>
        </Animated.View>
      ))}
    </View>
  );

  const renderLoader = () => {
    switch (type) {
      case 'dots':
        return renderDots();
      case 'bars':
        return renderBars();
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

  const containerStyles = useMemo(() => [
    styles.container,
    overlay && styles.overlay,
    fullScreen && styles.fullScreen,
    { backgroundColor },
    containerStyle
  ], [overlay, fullScreen, backgroundColor, containerStyle]);

  if (type === 'skeleton') {
    return (
      <View 
        style={containerStyles} 
        testID={testID}
        accessibilityLabel="Loading content"
        accessibilityRole="progressbar"
      >
        {renderSkeleton()}
      </View>
    );
  }

  return (
    <View 
      style={containerStyles} 
      testID={testID}
      accessibilityLabel={message}
      accessibilityRole="progressbar"
      accessibilityLiveRegion="polite"
    >
      {showLogo && (
        <View style={styles.logoContainer}>
          <Icon name="car" size={48} color={color} />
          <Text style={[styles.logoText, { color }]}>Kabaza</Text>
        </View>
      )}
      
      {renderLoader()}
      
      {(message || subtitle) && (
        <View style={styles.textContainer}>
          {message && (
            <Text style={[styles.message, textStyle, { color }]}>
              {message}
            </Text>
          )}
          {subtitle && (
            <Text style={[styles.subtitle, textStyle, { color: `${color}99` }]}>
              {subtitle}
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

// Loading wrapper for components
export const LoadingWrapper = ({ 
  loading, 
  children, 
  type = 'spinner',
  message = 'Loading...',
  fallback,
  ...props 
}) => {
  if (loading) {
    return fallback || <Loading type={type} message={message} {...props} />;
  }
  return <>{children}</>;
};

// Inline loading component
export const InlineLoading = ({ 
  size = 'small', 
  color = '#6c3',
  style,
  ...props 
}) => (
  <Loading 
    size={size} 
    color={color} 
    overlay={false}
    fullScreen={false}
    containerStyle={[styles.inline, style]}
    {...props} 
  />
);

// Page loading component
export const PageLoading = ({ 
  message = 'Loading...', 
  color = '#6c3',
  ...props 
}) => (
  <Loading 
    message={message} 
    color={color}
    fullScreen={true} 
    overlay={true}
    showLogo={true}
    {...props} 
  />
);

// Progress loading component
export const ProgressLoading = ({ 
  progress = 0, 
  message = 'Processing...',
  color = '#6c3',
  ...props 
}) => (
  <Loading 
    type="progress" 
    progress={progress} 
    message={message}
    color={color}
    fullScreen={true}
    overlay={true}
    {...props} 
  />
);

// Skeleton loading component
export const SkeletonLoading = ({ 
  count = 3,
  ...props 
}) => (
  <Loading 
    type="skeleton" 
    skeletonCount={count}
    fullScreen={false}
    overlay={false}
    {...props} 
  />
);

// Card skeleton for lists
export const CardSkeleton = ({ count = 1, style }) => (
  <View style={style}>
    {Array.from({ length: count }).map((_, index) => (
      <View key={index} style={styles.cardSkeletonWrapper}>
        <View style={styles.cardSkeleton}>
          <View style={styles.cardSkeletonHeader}>
            <View style={styles.cardSkeletonAvatar} />
            <View style={styles.cardSkeletonHeaderText}>
              <View style={styles.cardSkeletonTitle} />
              <View style={styles.cardSkeletonSubtitle} />
            </View>
          </View>
          <View style={styles.cardSkeletonBody} />
        </View>
      </View>
    ))}
  </View>
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
  inline: {
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  spinner: {
    marginBottom: 16,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 10,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    marginBottom: 16,
    gap: 6,
  },
  bar: {
    width: 6,
    height: 40,
    borderRadius: 3,
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
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
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
  },
  skeletonItem: {
    padding: 16,
    marginBottom: 16,
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
  // Card skeleton styles
  cardSkeletonWrapper: {
    marginBottom: 12,
  },
  cardSkeleton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardSkeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardSkeletonAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E5E7EB',
    marginRight: 12,
  },
  cardSkeletonHeaderText: {
    flex: 1,
  },
  cardSkeletonTitle: {
    height: 16,
    width: '70%',
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginBottom: 8,
  },
  cardSkeletonSubtitle: {
    height: 12,
    width: '50%',
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
  },
  cardSkeletonBody: {
    height: 60,
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
  },
});

export default Loading;