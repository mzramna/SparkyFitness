import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Icon from '../components/Icon';
import Button from '../components/ui/Button';
import DateNavigator from '../components/DateNavigator';
import { useActiveWorkoutBarPadding } from '../components/ActiveWorkoutBar';
import { useHeaderActionColors } from '../hooks/useHeaderActionColors';
import { usePreferences, useMeasurements } from '../hooks';
import { apiFetch } from '../services/api/apiClient';
import { useMedicationEntries } from '../hooks/useMedications';
import type { RootStackScreenProps } from '../types/navigation';
import { toLocalDateString } from '../utils/dateUtils';

type Props = RootStackScreenProps<'CheckIn'>;

// --- Mood options -----------------------------------------------------------

const MOOD_OPTIONS = [
  { value: 1, emoji: '😢', label: 'Terrible' },
  { value: 2, emoji: '😕', label: 'Bad' },
  { value: 3, emoji: '😐', label: 'Okay' },
  { value: 4, emoji: '🙂', label: 'Good' },
  { value: 5, emoji: '😄', label: 'Great' },
];

const MOOD_TAGS = [
  'Energetic', 'Tired', 'Stressed', 'Relaxed', 'Anxious',
  'Happy', 'Sad', 'Motivated', 'Sore', 'Sick',
];

// --- Measurement field config -----------------------------------------------

interface MeasurementField {
  key: string;
  label: string;
  unit: string;
  keyboardType: 'decimal-pad' | 'number-pad';
}

const MEASUREMENT_FIELDS: MeasurementField[] = [
  { key: 'weight', label: 'Weight', unit: 'kg', keyboardType: 'decimal-pad' },
  { key: 'body_fat', label: 'Body Fat %', unit: '%', keyboardType: 'decimal-pad' },
  { key: 'waist', label: 'Waist', unit: 'cm', keyboardType: 'decimal-pad' },
  { key: 'hips', label: 'Hips', unit: 'cm', keyboardType: 'decimal-pad' },
  { key: 'neck', label: 'Neck', unit: 'cm', keyboardType: 'decimal-pad' },
  { key: 'steps', label: 'Steps', unit: 'steps', keyboardType: 'number-pad' },
];

// --- Form Section component -------------------------------------------------

const FormSection: React.FC<{
  title: string;
  iconName: string;
  children: React.ReactNode;
}> = ({ title, iconName, children }) => (
  <View className="bg-surface rounded-xl p-4 mb-4">
    <View className="flex-row items-center gap-2 mb-3">
      <Icon name={iconName} size={18} color="var(--color-accent-primary)" />
      <Text className="text-sm font-semibold text-text-primary">{title}</Text>
    </View>
    {children}
  </View>
);

// --- Main Screen -----------------------------------------------------------

const CheckInScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const activeWorkoutBarPadding = useActiveWorkoutBarPadding('stack');
  const { backColor } = useHeaderActionColors();
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState(toLocalDateString(new Date()));
  const goToPreviousDay = useCallback(() => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    setSelectedDate(toLocalDateString(d));
  }, [selectedDate]);
  const goToNextDay = useCallback(() => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    setSelectedDate(toLocalDateString(d));
  }, [selectedDate]);
  const goToToday = useCallback(() => {
    setSelectedDate(toLocalDateString(new Date()));
  }, []);

  // Form state
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [waist, setWaist] = useState('');
  const [hips, setHips] = useState('');
  const [neck, setNeck] = useState('');
  const [steps, setSteps] = useState('');
  const [mood, setMood] = useState<number | null>(null);
  const [moodNotes, setMoodNotes] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  // Sleep state
  const [sleepBedTime, setSleepBedTime] = useState('');
  const [sleepWakeTime, setSleepWakeTime] = useState('');
  const [sleepQuality, setSleepQuality] = useState<number | null>(null);
  const [sleepNotes, setSleepNotes] = useState('');

  // Fetch existing measurements for the date
  const { isLoading: loadingMeasurements } = useQuery({
    queryKey: ['checkin-measurements', selectedDate],
    queryFn: async () => {
      try {
        const data = await apiFetch<any>({
          endpoint: `/api/measurements?date=${selectedDate}`,
          serviceName: 'CheckIn API',
          operation: 'fetch measurements',
        });
        if (data) {
          if (data.weight) setWeight(String(data.weight));
          if (data.body_fat) setBodyFat(String(data.body_fat));
          if (data.waist) setWaist(String(data.waist));
          if (data.hips) setHips(String(data.hips));
          if (data.neck) setNeck(String(data.neck));
          if (data.steps) setSteps(String(data.steps));
        }
        return data;
      } catch {
        return null;
      }
    },
  });

  // Fetch mood entries
  const { data: moodData } = useQuery({
    queryKey: ['mood', selectedDate],
    queryFn: async () => {
      try {
        const data = await apiFetch<any[]>({
          endpoint: `/api/mood?fromDate=${selectedDate}&toDate=${selectedDate}`,
          serviceName: 'CheckIn API',
          operation: 'fetch mood',
        });
        if (data && data.length > 0) {
          const entry = data[0];
          if (entry.mood_score) setMood(entry.mood_score);
          if (entry.notes) setMoodNotes(entry.notes);
          if (entry.tags) setSelectedTags(entry.tags);
        }
        return data;
      } catch {
        return [];
      }
    },
  });

  // Medication adherence for the day
  const { data: medEntries = [] } = useMedicationEntries({
    fromDate: selectedDate,
    toDate: selectedDate,
  });

  // Save measurements mutation
  const saveMeasurementsMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, any> = { date: selectedDate };
      if (weight) body.weight = parseFloat(weight);
      if (bodyFat) body.body_fat = parseFloat(bodyFat);
      if (waist) body.waist = parseFloat(waist);
      if (hips) body.hips = parseFloat(hips);
      if (neck) body.neck = parseFloat(neck);
      if (steps) body.steps = parseInt(steps, 10);

      return apiFetch({
        endpoint: '/api/measurements',
        serviceName: 'CheckIn API',
        operation: 'save measurements',
        method: 'POST',
        body,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['measurements'] });
      Alert.alert('Saved', 'Measurements saved successfully.');
    },
    onError: () => {
      Alert.alert('Error', 'Failed to save measurements.');
    },
  });

  // Save mood mutation
  const saveMoodMutation = useMutation({
    mutationFn: async () => {
      if (mood == null) return;
      return apiFetch({
        endpoint: '/api/mood',
        serviceName: 'CheckIn API',
        operation: 'save mood',
        method: 'POST',
        body: {
          entry_date: selectedDate,
          mood_score: mood,
          notes: moodNotes || null,
          tags: selectedTags,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mood'] });
      Alert.alert('Saved', 'Mood logged successfully.');
    },
    onError: () => {
      Alert.alert('Error', 'Failed to save mood.');
    },
  });

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const medTakenCount = medEntries.filter(
    (e) => e.status === 'taken' || e.status === 'prn_taken'
  ).length;
  const medTotalCount = medEntries.length;

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
        Check-In
      </Text>
      <View style={{ width: 22 }} />
    </View>
  );

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {header}

      {/* Date Navigator */}
      <DateNavigator
        title=""
        selectedDate={selectedDate}
        onPreviousDay={goToPreviousDay}
        onNextDay={goToNextDay}
        onToday={goToToday}
        showDateAlways
      />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 32 + activeWorkoutBarPadding,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Body Measurements */}
        <FormSection title="Body Measurements" iconName="body">
          <View className="gap-2">
            {MEASUREMENT_FIELDS.map((field) => (
              <View
                key={field.key}
                className="flex-row items-center justify-between py-2 border-b border-border-subtle"
              >
                <View>
                  <Text className="text-sm text-text-primary">{field.label}</Text>
                  <Text className="text-[10px] text-text-muted">{field.unit}</Text>
                </View>
                <TextInput
                  value={
                    field.key === 'body_fat'
                      ? bodyFat
                      : field.key === 'weight'
                      ? weight
                      : field.key === 'waist'
                      ? waist
                      : field.key === 'hips'
                      ? hips
                      : field.key === 'neck'
                      ? neck
                      : steps
                  }
                  onChangeText={(text) => {
                    switch (field.key) {
                      case 'weight': setWeight(text); break;
                      case 'body_fat': setBodyFat(text); break;
                      case 'waist': setWaist(text); break;
                      case 'hips': setHips(text); break;
                      case 'neck': setNeck(text); break;
                      case 'steps': setSteps(text); break;
                    }
                  }}
                  keyboardType={field.keyboardType}
                  placeholder="—"
                  placeholderTextColor="var(--color-text-muted)"
                  className="bg-background rounded-lg px-3 py-2 text-text-primary text-sm text-right"
                  style={{ width: 100 }}
                />
              </View>
            ))}
          </View>
          <Button
            variant="primary"
            onPress={() => saveMeasurementsMutation.mutate()}
            disabled={saveMeasurementsMutation.isPending}
            className="mt-4"
          >
            {saveMeasurementsMutation.isPending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text className="text-white font-semibold text-sm">Save Measurements</Text>
            )}
          </Button>
        </FormSection>

        {/* Mood */}
        <FormSection title="How are you feeling?" iconName="happy">
          {/* Mood Selector */}
          <View className="flex-row justify-between mb-3">
            {MOOD_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => setMood(option.value)}
                className={`items-center py-2 px-3 rounded-xl ${
                  mood === option.value ? 'bg-accent-primary/20' : ''
                }`}
                style={({ pressed }) => (pressed ? { opacity: 0.7 } : null)}
              >
                <Text className="text-2xl">{option.emoji}</Text>
                <Text
                  className={`text-[10px] mt-1 ${
                    mood === option.value
                      ? 'font-semibold text-accent-primary'
                      : 'text-text-muted'
                  }`}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Mood Tags */}
          <Text className="text-xs text-text-muted mb-2">Tags (optional)</Text>
          <View className="flex-row flex-wrap gap-1.5 mb-3">
            {MOOD_TAGS.map((tag) => (
              <Pressable
                key={tag}
                onPress={() => toggleTag(tag)}
                className={`px-3 py-1.5 rounded-full ${
                  selectedTags.includes(tag)
                    ? 'bg-accent-primary'
                    : 'bg-background'
                }`}
              >
                <Text
                  className={`text-xs ${
                    selectedTags.includes(tag)
                      ? 'text-white font-semibold'
                      : 'text-text-muted'
                  }`}
                >
                  {tag}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Mood Notes */}
          <TextInput
            value={moodNotes}
            onChangeText={setMoodNotes}
            placeholder="Any notes about how you're feeling..."
            placeholderTextColor="var(--color-text-muted)"
            multiline
            className="bg-background rounded-lg px-3 py-2 text-text-primary text-sm"
            style={{ minHeight: 60, textAlignVertical: 'top' }}
          />

          <Button
            variant="primary"
            onPress={() => saveMoodMutation.mutate()}
            disabled={mood == null || saveMoodMutation.isPending}
            className="mt-3"
          >
            {saveMoodMutation.isPending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text className="text-white font-semibold text-sm">Log Mood</Text>
            )}
          </Button>
        </FormSection>

        {/* Sleep */}
        <FormSection title="Sleep" iconName="moon">
          <View className="gap-3">
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-xs text-text-muted mb-1">Bedtime</Text>
                <TextInput
                  value={sleepBedTime}
                  onChangeText={setSleepBedTime}
                  placeholder="22:30"
                  placeholderTextColor="var(--color-text-muted)"
                  className="bg-background rounded-lg px-3 py-2.5 text-text-primary text-sm"
                />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-text-muted mb-1">Wake Time</Text>
                <TextInput
                  value={sleepWakeTime}
                  onChangeText={setSleepWakeTime}
                  placeholder="06:30"
                  placeholderTextColor="var(--color-text-muted)"
                  className="bg-background rounded-lg px-3 py-2.5 text-text-primary text-sm"
                />
              </View>
            </View>

            {/* Sleep Quality */}
            <View>
              <Text className="text-xs text-text-muted mb-2">Sleep Quality</Text>
              <View className="flex-row justify-between">
                {[1, 2, 3, 4, 5].map((q) => (
                  <Pressable
                    key={q}
                    onPress={() => setSleepQuality(q)}
                    className={`w-12 h-12 rounded-xl items-center justify-center ${
                      sleepQuality === q ? 'bg-indigo-500' : 'bg-background'
                    }`}
                  >
                    <Text
                      className={`text-lg font-bold ${
                        sleepQuality === q ? 'text-white' : 'text-text-muted'
                      }`}
                    >
                      {q}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View className="flex-row justify-between mt-1">
                <Text className="text-[9px] text-text-muted">Poor</Text>
                <Text className="text-[9px] text-text-muted">Fair</Text>
                <Text className="text-[9px] text-text-muted">Good</Text>
                <Text className="text-[9px] text-text-muted">Great</Text>
                <Text className="text-[9px] text-text-muted">Perfect</Text>
              </View>
            </View>

            {/* Sleep duration display */}
            {sleepBedTime && sleepWakeTime && (
              <View className="bg-indigo-500/10 rounded-lg p-3 flex-row items-center gap-2">
                <Icon name="moon" size={16} color="#6366F1" />
                <Text className="text-xs text-indigo-600 font-semibold">
                  {(() => {
                    try {
                      const [bh, bm] = sleepBedTime.split(':').map(Number);
                      const [wh, wm] = sleepWakeTime.split(':').map(Number);
                      let mins = (wh * 60 + wm) - (bh * 60 + bm);
                      if (mins < 0) mins += 24 * 60;
                      const hrs = Math.floor(mins / 60);
                      const m = mins % 60;
                      return `${hrs}h ${m}m sleep duration`;
                    } catch {
                      return '';
                    }
                  })()}
                </Text>
              </View>
            )}

            <TextInput
              value={sleepNotes}
              onChangeText={setSleepNotes}
              placeholder="Sleep notes (e.g. woke up during night)..."
              placeholderTextColor="var(--color-text-muted)"
              multiline
              className="bg-background rounded-lg px-3 py-2 text-text-primary text-sm"
              style={{ minHeight: 50, textAlignVertical: 'top' }}
            />
          </View>
        </FormSection>

        {/* Medication Adherence Summary */}
        {medTotalCount > 0 && (
          <FormSection title="Medication Adherence" iconName="medkit">
            <View className="flex-row items-center gap-3">
              <View className="flex-1">
                <Text className="text-2xl font-bold text-text-primary">
                  {medTakenCount}/{medTotalCount}
                </Text>
                <Text className="text-xs text-text-muted">doses taken today</Text>
              </View>
              <View
                className={`px-3 py-1.5 rounded-full ${
                  medTakenCount === medTotalCount
                    ? 'bg-green-500/20'
                    : 'bg-amber-500/20'
                }`}
              >
                <Text
                  className={`text-sm font-bold ${
                    medTakenCount === medTotalCount
                      ? 'text-green-600'
                      : 'text-amber-600'
                  }`}
                >
                  {medTotalCount > 0
                    ? Math.round((medTakenCount / medTotalCount) * 100)
                    : 0}
                  %
                </Text>
              </View>
            </View>
          </FormSection>
        )}

        {/* Daily Notes */}
        <FormSection title="Daily Notes" iconName="document-text">
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="How was your day? Any observations..."
            placeholderTextColor="var(--color-text-muted)"
            multiline
            className="bg-background rounded-lg px-3 py-2 text-text-primary text-sm"
            style={{ minHeight: 80, textAlignVertical: 'top' }}
          />
        </FormSection>
      </ScrollView>
    </View>
  );
};

export default CheckInScreen;
