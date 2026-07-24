import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useCSSVariable } from 'uniwind';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Icon from './Icon';
import { useMedications, useMedicationEntries } from '../hooks/useMedications';
import { getDueDosesForDate } from '@workspace/shared';
import type { MedicationDetail } from '../types/medications';
import type { RootStackParamList, TabParamList } from '../types/navigation';
import { toLocalDateString } from '../utils/dateUtils';

type MedicationCardNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Dashboard'>,
  NativeStackNavigationProp<RootStackParamList>
>;

interface MedicationsCardProps {
  navigation: MedicationCardNavigation;
}

const MedicationsCard: React.FC<MedicationsCardProps> = ({ navigation }) => {
  const [accentPrimary] = useCSSVariable(['--color-accent-primary']) as [string];

  const { data: meds = [], isLoading: loadingMeds } = useMedications({
    activeOnly: true,
  });

  const today = toLocalDateString(new Date());

  const { data: entries = [] } = useMedicationEntries({
    fromDate: today,
    toDate: today,
  });

  const dueDoses = getDueDosesForDate(meds as MedicationDetail[], today);
  const loggedCount = entries.length;
  const dueCount = dueDoses.length;

  // Loading placeholder
  if (loadingMeds) {
    return (
      <View className="bg-surface rounded-xl p-4 mb-3 shadow-sm">
        <View className="flex-row items-center justify-between">
          <Text className="text-md font-bold text-text-secondary">Medications</Text>
        </View>
      </View>
    );
  }

  // No medications
  if (meds.length === 0) {
    return (
      <Pressable
        className="bg-surface rounded-xl p-4 mb-3 shadow-sm"
        onPress={() => navigation.navigate('Medications')}
        accessibilityRole="button"
        accessibilityLabel="Open medications"
      >
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center gap-2">
            <Icon name="medkit" size={20} color={accentPrimary} />
            <Text className="text-md font-bold text-text-secondary">Medications</Text>
          </View>
          <View className="flex-row items-center">
            <Text className="text-md text-accent-primary font-medium">Get started</Text>
            <Icon
              name="chevron-forward"
              size={14}
              color={accentPrimary}
              style={{ marginLeft: 2 }}
            />
          </View>
        </View>
        <Text className="text-sm text-text-muted">
          Track your medications, log doses, and manage schedules.
        </Text>
      </Pressable>
    );
  }

  const allDone = dueCount === 0 || loggedCount >= dueCount;

  return (
    <Pressable
      className="bg-surface rounded-xl p-4 mb-3 shadow-sm"
      onPress={() => navigation.navigate('Medications')}
      accessibilityRole="button"
      accessibilityLabel="Open medications"
    >
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center gap-2">
          <Icon name="medkit" size={20} color={accentPrimary} />
          <Text className="text-md font-bold text-text-secondary">Medications</Text>
        </View>
        <View className="flex-row items-center">
          <Text className="text-md text-accent-primary font-medium">View</Text>
          <Icon
            name="chevron-forward"
            size={14}
            color={accentPrimary}
            style={{ marginLeft: 2 }}
          />
        </View>
      </View>

      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          {allDone ? (
            <View className="flex-row items-center gap-2">
              <Icon name="checkmark-circle" size={20} color="#22C55E" />
              <Text className="text-base font-semibold text-text-primary">
                All doses logged
              </Text>
            </View>
          ) : (
            <View>
              <Text className="text-base font-semibold text-text-primary">
                {dueCount - loggedCount} dose{dueCount - loggedCount !== 1 ? 's' : ''} remaining
              </Text>
              <Text className="text-sm text-text-muted mt-0.5">
                {loggedCount} of {dueCount} logged today
              </Text>
            </View>
          )}
        </View>

        {/* Quick stats */}
        <View className="flex-row gap-3">
          <View className="items-center">
            <Text className="text-lg font-bold text-text-primary">{meds.length}</Text>
            <Text className="text-[10px] text-text-muted">Active</Text>
          </View>
          {meds.some((m) => m.is_glp1) && (
            <View className="items-center">
              <Text className="text-lg font-bold text-blue-500">
                {meds.filter((m) => m.is_glp1).length}
              </Text>
              <Text className="text-[10px] text-text-muted">GLP-1</Text>
            </View>
          )}
        </View>
      </View>

      {/* Progress bar */}
      {dueCount > 0 && (
        <View className="mt-3">
          <View
            className="h-1.5 rounded-full overflow-hidden"
            style={{ backgroundColor: 'var(--color-progress-track)' }}
          >
            <View
              className="h-1.5 rounded-full"
              style={{
                width: `${Math.min(100, (loggedCount / dueCount) * 100)}%`,
                backgroundColor: allDone ? '#22C55E' : accentPrimary,
              }}
            />
          </View>
        </View>
      )}
    </Pressable>
  );
};

export default MedicationsCard;
