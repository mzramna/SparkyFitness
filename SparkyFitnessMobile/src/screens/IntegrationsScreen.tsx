import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import Button from '../components/ui/Button';
import { useActiveWorkoutBarPadding } from '../components/ActiveWorkoutBar';
import { useHeaderActionColors } from '../hooks/useHeaderActionColors';
import { useServerConnection } from '../hooks';
import type { RootStackScreenProps } from '../types/navigation';

type Props = RootStackScreenProps<'Integrations'>;

interface IntegrationItem {
  id: string;
  name: string;
  description: string;
  iconName: string;
  color: string;
  url: string;
  category: 'fitness' | 'health' | 'nutrition';
}

const INTEGRATIONS: IntegrationItem[] = [
  {
    id: 'garmin',
    name: 'Garmin Connect',
    description: 'Sync activities, steps, sleep, and heart rate from Garmin devices.',
    iconName: 'watch',
    color: '#007CC3',
    url: '/integrations/garmin',
    category: 'fitness',
  },
  {
    id: 'strava',
    name: 'Strava',
    description: 'Import activities and workouts from Strava.',
    iconName: 'bicycle',
    color: '#FC4C02',
    url: '/integrations/strava',
    category: 'fitness',
  },
  {
    id: 'fitbit',
    name: 'Fitbit',
    description: 'Sync steps, sleep, heart rate, and weight from Fitbit.',
    iconName: 'fitness',
    color: '#00B0B9',
    url: '/integrations/fitbit',
    category: 'fitness',
  },
  {
    id: 'oura',
    name: 'Oura Ring',
    description: 'Import sleep, readiness, and activity data from Oura.',
    iconName: 'ring',
    color: '#374151',
    url: '/integrations/oura',
    category: 'health',
  },
  {
    id: 'withings',
    name: 'Withings',
    description: 'Sync weight, blood pressure, and body composition from Withings devices.',
    iconName: 'scale',
    color: '#0082C8',
    url: '/integrations/withings',
    category: 'health',
  },
  {
    id: 'polar',
    name: 'Polar',
    description: 'Import training sessions and heart rate data from Polar watches.',
    iconName: 'heart',
    color: '#E6007E',
    url: '/integrations/polar',
    category: 'fitness',
  },
  {
    id: 'hevy',
    name: 'Hevy',
    description: 'Import workout logs from the Hevy app.',
    iconName: 'barbell',
    color: '#4A90D9',
    url: '/integrations/hevy',
    category: 'fitness',
  },
  {
    id: 'google-health',
    name: 'Google Health Connect',
    description: 'Sync health data from Google Health Connect (Android).',
    iconName: 'logo-google',
    color: '#34A853',
    url: '/integrations/google-health',
    category: 'health',
  },
];

const CATEGORIES = [
  { key: 'fitness', label: 'Fitness & Activity' },
  { key: 'health', label: 'Health & Body' },
  { key: 'nutrition', label: 'Nutrition' },
];

// --- Integration Card -------------------------------------------------------

const IntegrationCard: React.FC<{
  item: IntegrationItem;
  onPress: () => void;
}> = ({ item, onPress }) => (
  <Pressable
    onPress={onPress}
    className="bg-surface rounded-xl p-4 mb-3 flex-row items-center"
    style={({ pressed }) => (pressed ? { opacity: 0.8 } : null)}
  >
    <View
      className="w-12 h-12 rounded-xl items-center justify-center mr-3"
      style={{ backgroundColor: item.color + '20' }}
    >
      <Icon name={item.iconName} size={24} color={item.color} />
    </View>
    <View className="flex-1">
      <Text className="text-sm font-semibold text-text-primary">{item.name}</Text>
      <Text className="text-xs text-text-muted mt-0.5" numberOfLines={2}>
        {item.description}
      </Text>
    </View>
    <Icon name="chevron-forward" size={16} color="var(--color-text-muted)" />
  </Pressable>
);

// --- Main Screen -----------------------------------------------------------

const IntegrationsScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const activeWorkoutBarPadding = useActiveWorkoutBarPadding('stack');
  const { backColor } = useHeaderActionColors();
  const { isConnected } = useServerConnection();

  const handleOpenIntegration = (item: IntegrationItem) => {
    if (!isConnected) {
      return;
    }
    // Navigate to a web-based OAuth callback flow or settings
    // For now, open the server's integration page in browser
    navigation.navigate('ServerSettings');
  };

  const header = (
    <View className="flex-row items-center px-4 py-3">
      <Button
        variant="ghost"
        onPress={() => navigation.goBack()}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        className="py-0 px-0"
      >
        <Icon name="chevron-back" size={22} color={backColor} />
      </Button>
      <Text className="flex-1 text-center text-lg font-semibold text-text-primary">
        Integrations
      </Text>
      <View style={{ width: 22 }} />
    </View>
  );

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {header}

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 32 + activeWorkoutBarPadding,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Info banner */}
        <View className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-4 flex-row items-start gap-3">
          <Icon name="information-circle" size={20} color="#3B82F6" />
          <View className="flex-1">
            <Text className="text-xs font-semibold text-blue-600 mb-1">
              Connect Your Services
            </Text>
            <Text className="text-xs text-blue-500/80">
              Link your fitness devices and health platforms to automatically sync data.
              Integrations are configured through the web interface. Go to Settings → Server
              to access the full integration setup.
            </Text>
          </View>
        </View>

        {/* Integration categories */}
        {CATEGORIES.map((category) => {
          const items = INTEGRATIONS.filter((i) => i.category === category.key);
          if (items.length === 0) return null;
          return (
            <View key={category.key} className="mb-4">
              <Text className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">
                {category.label}
              </Text>
              {items.map((item) => (
                <IntegrationCard
                  key={item.id}
                  item={item}
                  onPress={() => handleOpenIntegration(item)}
                />
              ))}
            </View>
          );
        })}

        {/* Health Connect (mobile-specific) */}
        <View className="bg-surface rounded-xl p-4 mb-4">
          <View className="flex-row items-center gap-2 mb-2">
            <Icon name="phone-portrait" size={18} color="var(--color-accent-primary)" />
            <Text className="text-sm font-semibold text-text-primary">
              Mobile Health Sync
            </Text>
          </View>
          <Text className="text-xs text-text-muted mb-3">
            On mobile, health data (steps, heart rate, weight, sleep) syncs directly through
            Health Connect (Android) or HealthKit (iOS) — no OAuth needed.
          </Text>
          <Button
            variant="secondary"
            onPress={() => navigation.navigate('Sync')}
          >
            <Text className="text-sm font-semibold text-accent-primary">
              Open Health Sync Settings
            </Text>
          </Button>
        </View>
      </ScrollView>
    </View>
  );
};

export default IntegrationsScreen;
