import React, { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    icon: 'access-point-network' as const,
    title: 'Real-time emergency detection',
    desc: 'ESP32 sensors monitor temperature, smoke, motion and panic buttons across every zone — alerting staff within seconds.',
    color: '#2563EB',
  },
  {
    id: '2',
    icon: 'brain' as const,
    title: 'AI-powered threat assessment',
    desc: 'Gemini AI analyses sensor patterns in real time, scores threat severity, and generates instant incident summaries for responders.',
    color: '#8B5CF6',
  },
  {
    id: '3',
    icon: 'exit-run' as const,
    title: 'Guided evacuation protocol',
    desc: 'Step-by-step evacuation guidance for staff, guests and emergency services — all coordinated from one unified platform.',
    color: '#EF4444',
  },
];

const ONBOARDING_KEY = 'unifyos_onboarding_done';

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState(0);
  const flatRef = useRef<FlatList>(null);
  const dotAnim = useRef(SLIDES.map(() => new Animated.Value(0))).current;

  const topPad = Platform.OS === 'web' ? 20 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 20 : insets.bottom;

  function updateDots(index: number) {
    SLIDES.forEach((_, i) => {
      Animated.timing(dotAnim[i], {
        toValue: i === index ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    });
  }

  async function handleFinish() {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'done');
    router.replace('/');
  }

  function handleSkip() {
    AsyncStorage.setItem(ONBOARDING_KEY, 'done');
    router.replace('/');
  }

  function handleNext() {
    if (current < SLIDES.length - 1) {
      const next = current + 1;
      flatRef.current?.scrollToIndex({ index: next, animated: true });
      setCurrent(next);
      updateDots(next);
    } else {
      handleFinish();
    }
  }

  const slide = SLIDES[current];

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <LinearGradient colors={['#0D1B3E', '#0A0E1A']} style={StyleSheet.absoluteFill} />

      <TouchableOpacity
        style={[styles.skipBtn, { top: topPad + 16 }]}
        onPress={handleSkip}
        activeOpacity={0.8}
        accessibilityLabel="Skip onboarding"
        accessibilityRole="button"
      >
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <FlatList
        ref={flatRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
            <View style={[styles.iconBox, { backgroundColor: item.color + '20', borderColor: item.color + '40' }]}>
              <MaterialCommunityIcons name={item.icon} size={72} color={item.color} />
            </View>
            <Text style={styles.slideTitle}>{item.title}</Text>
            <Text style={styles.slideDesc}>{item.desc}</Text>
          </View>
        )}
      />

      <View style={[styles.footer, { paddingBottom: bottomPad + 20 }]}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                {
                  width: dotAnim[i].interpolate({ inputRange: [0, 1], outputRange: [8, 24] }),
                  backgroundColor: i === current ? slide.color : '#1E2D45',
                },
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: slide.color }]}
          onPress={handleNext}
          activeOpacity={0.85}
          accessibilityLabel={current < SLIDES.length - 1 ? 'Next' : 'Get Started'}
          accessibilityRole="button"
        >
          <Text style={styles.nextBtnText}>
            {current < SLIDES.length - 1 ? 'Next' : 'Get Started'}
          </Text>
          <MaterialCommunityIcons
            name={current < SLIDES.length - 1 ? 'arrow-right' : 'check'}
            size={18}
            color="#fff"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1B3E' },
  skipBtn: {
    position: 'absolute', right: 20, zIndex: 10,
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  skipText: { fontSize: 13, color: '#8B9EC5', fontFamily: 'Inter_500Medium' },
  slide: {
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 40, gap: 24,
  },
  iconBox: {
    width: 140, height: 140, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, marginBottom: 8,
  },
  slideTitle: {
    fontSize: 26, fontFamily: 'Inter_700Bold', color: '#F0F4FF',
    textAlign: 'center', letterSpacing: -0.5,
  },
  slideDesc: {
    fontSize: 15, fontFamily: 'Inter_400Regular', color: '#8B9EC5',
    textAlign: 'center', lineHeight: 24,
  },
  footer: { paddingHorizontal: 24, gap: 24, alignItems: 'center' },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { height: 8, borderRadius: 4 },
  nextBtn: {
    width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 16, paddingVertical: 16,
  },
  nextBtnText: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#fff' },
});
