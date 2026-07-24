import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Icon from '../components/Icon';
import Button from '../components/ui/Button';
import { useActiveWorkoutBarPadding } from '../components/ActiveWorkoutBar';
import { useHeaderActionColors } from '../hooks/useHeaderActionColors';
import { apiFetch } from '../services/api/apiClient';
import type { DailyGoals } from '../types/goals';
import type { RootStackScreenProps } from '../types/navigation';
import { toLocalDateString } from '../utils/dateUtils';

type Props = RootStackScreenProps<'Goals'>;

// --- Goal field config ------------------------------------------------------

interface GoalField {
  key: keyof DailyGoals;
  label: string;
  unit: string;
  group: string;
}

const GOAL_FIELDS: GoalField[] = [
  { key: 'calories', label: 'Calories', unit: 'kcal', group: 'Energy & Macros' },
  { key: 'protein', label: 'Protein', unit: 'g', group: 'Energy & Macros' },
  { key: 'carbs', label: 'Carbs', unit: 'g', group: 'Energy & Macros' },
  { key: 'fat', label: 'Fat', unit: 'g', group: 'Energy & Macros' },
  { key: 'dietary_fiber', label: 'Fiber', unit: 'g', group: 'Fiber & Sugar' },
  { key: 'sugars', label: 'Sugars', unit: 'g', group: 'Fiber & Sugar' },
  { key: 'saturated_fat', label: 'Saturated Fat', unit: 'g', group: 'Fats' },
  { key: 'trans_fat', label: 'Trans Fat', unit: 'g', group: 'Fats' },
  { key: 'cholesterol', label: 'Cholesterol', unit: 'mg', group: 'Minerals' },
  { key: 'sodium', label: 'Sodium', unit: 'mg', group: 'Minerals' },
  { key: 'potassium', label: 'Potassium', unit: 'mg', group: 'Minerals' },
  { key: 'calcium', label: 'Calcium', unit: 'mg', group: 'Minerals' },
  { key: 'iron', label: 'Iron', unit: 'mg', group: 'Minerals' },
  { key: 'vitamin_a', label: 'Vitamin A', unit: 'mcg', group: 'Vitamins' },
  { key: 'vitamin_c', label: 'Vitamin C', unit: 'mg', group: 'Vitamins' },
  { key: 'water_goal_ml', label: 'Water', unit: 'ml', group: 'Water & Exercise' },
  { key: 'target_exercise_calories_burned', label: 'Exercise Calories', unit: 'kcal', group: 'Water & Exercise' },
  { key: 'target_exercise_duration_minutes', label: 'Exercise Minutes', unit: 'min', group: 'Water & Exercise' },
];

// --- Goal Input Row ---------------------------------------------------------

const GoalInputRow: React.FC<{
  label: string;
  value: string;
  unit: string;
  onChangeText: (text: string) => void;
}> = ({ label, value, unit, onChangeText }) => (
  <View className="flex-row items-center justify-between py-3 border-b border-border-subtle">
    <View className="flex-1">
      <Text className="text-sm text-text-primary">{label}</Text>
      <Text className="text-[10px] text-text-muted">{unit}</Text>
    </View>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      keyboardType="decimal-pad"
      placeholder="0"
      placeholderTextColor="var(--color-text-muted)"
      className="bg-background rounded-lg px-3 py-2 text-text-primary text-sm text-right"
      style={{ width: 100, minWidth: 80 }}
    />
  </View>
);

// --- Goal Presets Section ---------------------------------------------------

const PRESET_GOALS = [
  {
    name: 'Balanced',
    description: 'Standard balanced diet (40/30/30)',
    icon: 'nutrition',
    calories: 2000, protein: 150, carbs: 200, fat: 67,
    dietary_fiber: 25, water_goal_ml: 2500,
  },
  {
    name: 'High Protein',
    description: 'Muscle building focus (30/40/30)',
    icon: 'barbell',
    calories: 2200, protein: 165, carbs: 220, fat: 73,
    dietary_fiber: 30, water_goal_ml: 3000,
  },
  {
    name: 'Low Carb',
    description: 'Keto-friendly (25/5/70)',
    icon: 'flame',
    calories: 1800, protein: 112, carbs: 22, fat: 140,
    dietary_fiber: 20, water_goal_ml: 2500,
  },
  {
    name: 'Weight Loss',
    description: 'Moderate deficit (35/40/25)',
    icon: 'trending-down',
    calories: 1600, protein: 140, carbs: 160, fat: 44,
    dietary_fiber: 28, water_goal_ml: 2800,
  },
];

const GoalPresetsSection: React.FC<{
  onApplyPreset: (preset: Record<string, number>) => void;
}> = ({ onApplyPreset }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <View className="bg-surface rounded-xl p-4 mb-4">
      <Pressable
        onPress={() => setExpanded(!expanded)}
        className="flex-row items-center justify-between"
      >
        <View className="flex-row items-center gap-2">
          <Icon name="sparkles" size={18} color="var(--color-accent-primary)" />
          <Text className="text-sm font-semibold text-text-primary">Quick Presets</Text>
        </View>
        <Icon
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color="var(--color-text-muted)"
        />
      </Pressable>
      {expanded && (
        <View className="mt-3 gap-2">
          {PRESET_GOALS.map((preset) => (
            <Pressable
              key={preset.name}
              onPress={() => onApplyPreset(preset)}
              className="bg-background rounded-xl p-3 flex-row items-center gap-3"
              style={({ pressed }) => (pressed ? { opacity: 0.7 } : null)}
            >
              <View className="w-10 h-10 rounded-full bg-accent-primary/10 items-center justify-center">
                <Icon name={preset.icon} size={20} color="var(--color-accent-primary)" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-text-primary">{preset.name}</Text>
                <Text className="text-[10px] text-text-muted">{preset.description}</Text>
              </View>
              <Text className="text-xs text-text-muted">{preset.calories} kcal</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
};

// --- Main Screen -----------------------------------------------------------

const GoalsScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const activeWorkoutBarPadding = useActiveWorkoutBarPadding('stack');
  const { backColor } = useHeaderActionColors();
  const queryClient = useQueryClient();

  const today = toLocalDateString(new Date());
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [isEditing, setIsEditing] = useState(false);

  // Fetch goals
  const { data: goals, isLoading } = useQuery({
    queryKey: ['daily-goals', today],
    queryFn: () =>
      apiFetch<DailyGoals>({
        endpoint: `/api/goals/for-date?date=${today}`,
        serviceName: 'Goals API',
        operation: 'fetch goals',
      }),
  });

  // Save goals mutation
  const saveMutation = useMutation({
    mutationFn: async (updates: Record<string, number>) => {
      return apiFetch({
        endpoint: '/api/goals/manage-timeline',
        serviceName: 'Goals API',
        operation: 'update goals',
        method: 'POST',
        body: { date: today, goals: updates },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-goals'] });
      setIsEditing(false);
      Alert.alert('Saved', 'Goals updated successfully.');
    },
    onError: () => {
      Alert.alert('Error', 'Failed to save goals. Please try again.');
    },
  });

  // Initialize edit values when goals load
  const currentValues = useMemo(() => {
    if (!goals) return {};
    const values: Record<string, string> = {};
    for (const field of GOAL_FIELDS) {
      const val = goals[field.key];
      values[field.key] = val != null ? String(val) : '';
    }
    return values;
  }, [goals]);

  const displayValues = isEditing ? { ...currentValues, ...editValues } : currentValues;

  const handleSave = () => {
    const updates: Record<string, number> = {};
    for (const [key, val] of Object.entries(editValues)) {
      if (val !== '' && val !== currentValues[key]) {
        updates[key] = parseFloat(val);
      }
    }
    if (Object.keys(updates).length === 0) {
      setIsEditing(false);
      return;
    }
    saveMutation.mutate(updates);
  };

  const handleChange = (key: string, value: string) => {
    setEditValues((prev) => ({ ...prev, [key]: value }));
  };

  // Group fields
  const groups = useMemo(() => {
    const grouped = new Map<string, GoalField[]>();
    for (const field of GOAL_FIELDS) {
      const list = grouped.get(field.group) ?? [];
      list.push(field);
      grouped.set(field.group, list);
    }
    return Array.from(grouped.entries());
  }, []);

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
        Goals
      </Text>
      {isEditing ? (
        <Button
          variant="ghost"
          onPress={handleSave}
          disabled={saveMutation.isPending}
          className="py-0 px-0"
        >
          {saveMutation.isPending ? (
            <ActivityIndicator size="small" color="var(--color-accent-primary)" />
          ) : (
            <Text className="text-sm font-semibold text-accent-primary">Save</Text>
          )}
        </Button>
      ) : (
        <Button
          variant="ghost"
          onPress={() => setIsEditing(true)}
          className="py-0 px-0"
        >
          <Icon name="pencil" size={20} color="var(--color-accent-primary)" />
        </Button>
      )}
    </View>
  );

  if (isLoading) {
    return (
      <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
        {header}
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      </View>
    );
  }

  // Macro percentages
  const macroPercentages = goals
    ? [
        { label: 'Protein', value: goals.protein_percentage ?? 0, color: 'bg-rose-500' },
        { label: 'Carbs', value: goals.carbs_percentage ?? 0, color: 'bg-amber-500' },
        { label: 'Fat', value: goals.fat_percentage ?? 0, color: 'bg-blue-500' },
      ]
    : [];

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
        {/* Macro Split Visualization */}
        {macroPercentages.some((m) => m.value > 0) && (
          <View className="bg-surface rounded-xl p-4 mb-4">
            <Text className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">
              Macro Split
            </Text>
            <View className="flex-row h-4 rounded-full overflow-hidden">
              {macroPercentages.map((m) => (
                <View
                  key={m.label}
                  className={`${m.color}`}
                  style={{ width: `${m.value}%` }}
                />
              ))}
            </View>
            <View className="flex-row justify-between mt-2">
              {macroPercentages.map((m) => (
                <View key={m.label} className="flex-row items-center gap-1">
                  <View className={`w-2 h-2 rounded-full ${m.color}`} />
                  <Text className="text-[10px] text-text-muted">
                    {m.label} {m.value}%
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Meal Distribution */}
        {goals && (goals.breakfast_percentage ?? goals.lunch_percentage ?? goals.dinner_percentage ?? goals.snacks_percentage) && (
          <View className="bg-surface rounded-xl p-4 mb-4">
            <Text className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">
              Meal Distribution
            </Text>
            <View className="flex-row gap-2">
              {[
                { label: 'Breakfast', value: goals.breakfast_percentage ?? 0 },
                { label: 'Lunch', value: goals.lunch_percentage ?? 0 },
                { label: 'Dinner', value: goals.dinner_percentage ?? 0 },
                { label: 'Snacks', value: goals.snacks_percentage ?? 0 },
              ].map((m) => (
                <View key={m.label} className="flex-1 items-center">
                  <Text className="text-lg font-bold text-text-primary">{m.value}%</Text>
                  <Text className="text-[10px] text-text-muted">{m.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Goal Presets */}
        <GoalPresetsSection onApplyPreset={(preset) => {
          // Apply preset values to edit values
          const newValues: Record<string, string> = {};
          for (const [key, val] of Object.entries(preset)) {
            if (typeof val === 'number' && GOAL_FIELDS.some(f => f.key === key)) {
              newValues[key] = String(val);
            }
          }
          setEditValues(newValues);
          setIsEditing(true);
        }} />

        {/* Goal Fields by Group */}
        {groups.map(([groupName, fields]) => (
          <View key={groupName} className="bg-surface rounded-xl p-4 mb-4">
            <Text className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">
              {groupName}
            </Text>
            {fields.map((field) => (
              <GoalInputRow
                key={field.key}
                label={field.label}
                value={displayValues[field.key] ?? ''}
                unit={field.unit}
                onChangeText={(text) => handleChange(field.key, text)}
              />
            ))}
          </View>
        ))}

        {/* Save Button (bottom) */}
        {isEditing && (
          <Button
            variant="primary"
            onPress={handleSave}
            disabled={saveMutation.isPending}
            className="mt-2"
          >
            {saveMutation.isPending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text className="text-white font-semibold">Save Goals</Text>
            )}
          </Button>
        )}
      </ScrollView>
    </View>
  );
};

export default GoalsScreen;
