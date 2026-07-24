import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import Icon from '../components/Icon';
import Button from '../components/ui/Button';
import { useActiveWorkoutBarPadding } from '../components/ActiveWorkoutBar';
import { useHeaderActionColors } from '../hooks/useHeaderActionColors';
import { usePreferences } from '../hooks';
import { fetchNutritionTrends, fetchReportsData } from '../services/api/reportsApi';
import { useMedicationEntries } from '../hooks/useMedications';
import type { RootStackScreenProps } from '../types/navigation';
import { toLocalDateString, addDays } from '../utils/dateUtils';

type Props = RootStackScreenProps<'Reports'>;

type ReportTab = 'nutrition' | 'medications' | 'exercise' | 'measurements';

const RANGE_OPTIONS = [
  { key: '7d', label: '7 Days', days: 7 },
  { key: '14d', label: '14 Days', days: 14 },
  { key: '30d', label: '30 Days', days: 30 },
  { key: '90d', label: '90 Days', days: 90 },
];

// --- Tab Button component --------------------------------------------------

const TabButton: React.FC<{
  label: string;
  active: boolean;
  onPress: () => void;
}> = ({ label, active, onPress }) => (
  <Pressable
    onPress={onPress}
    className={`px-4 py-2 rounded-full ${
      active ? 'bg-surface shadow-sm' : ''
    }`}
    style={({ pressed }) => (pressed ? { opacity: 0.7 } : null)}
  >
    <Text
      className={`text-xs font-semibold ${
        active ? 'text-text-primary' : 'text-text-muted'
      }`}
    >
      {label}
    </Text>
  </Pressable>
);

// --- Stat Card component ---------------------------------------------------

const StatCard: React.FC<{
  label: string;
  value: string;
  sublabel?: string;
  color?: string;
}> = ({ label, value, sublabel, color = 'text-text-primary' }) => (
  <View className="flex-1 bg-surface rounded-xl p-3">
    <Text className="text-[10px] font-semibold uppercase text-text-muted tracking-wide">
      {label}
    </Text>
    <Text className={`text-xl font-bold mt-1 ${color}`}>{value}</Text>
    {sublabel && <Text className="text-[10px] text-text-muted mt-0.5">{sublabel}</Text>}
  </View>
);

// --- Simple Bar Chart (text-based) -----------------------------------------

const SimpleBarChart: React.FC<{
  data: { label: string; value: number; max: number }[];
  color?: string;
}> = ({ data, color = 'var(--color-accent-primary)' }) => (
  <View className="gap-2">
    {data.map((item, index) => (
      <View key={index} className="flex-row items-center gap-2">
        <Text className="text-[10px] text-text-muted w-10 text-right" numberOfLines={1}>
          {item.label}
        </Text>
        <View className="flex-1 h-4 bg-progress-track rounded-full overflow-hidden">
          <View
            className="h-4 rounded-full"
            style={{
              width: `${Math.min(100, (item.value / Math.max(item.max, 1)) * 100)}%`,
              backgroundColor: color,
            }}
          />
        </View>
        <Text className="text-[10px] text-text-secondary w-12" numberOfLines={1}>
          {Math.round(item.value)}
        </Text>
      </View>
    ))}
  </View>
);

// --- Nutrition Report Tab ---------------------------------------------------

const NutritionReport: React.FC<{
  startDate: string;
  endDate: string;
}> = ({ startDate, endDate }) => {
  const { data: trends = [], isLoading } = useQuery({
    queryKey: ['nutrition-trends', startDate, endDate],
    queryFn: () => fetchNutritionTrends(startDate, endDate),
  });

  if (isLoading) {
    return (
      <View className="py-10 items-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (trends.length === 0) {
    return (
      <View className="bg-surface rounded-xl p-6 items-center">
        <Icon name="nutrition" size={40} color="var(--color-text-muted)" />
        <Text className="text-sm text-text-muted mt-3 text-center">
          No nutrition data for this period.
        </Text>
      </View>
    );
  }

  const avgCalories = trends.reduce((s, t) => s + t.calories, 0) / trends.length;
  const avgProtein = trends.reduce((s, t) => s + t.protein, 0) / trends.length;
  const avgCarbs = trends.reduce((s, t) => s + t.carbs, 0) / trends.length;
  const avgFat = trends.reduce((s, t) => s + t.fat, 0) / trends.length;

  const maxCalories = Math.max(...trends.map((t) => t.calories), 1);

  return (
    <View className="gap-4">
      {/* Summary Cards */}
      <View className="flex-row gap-2">
        <StatCard label="Avg Calories" value={Math.round(avgCalories).toString()} sublabel="kcal/day" />
        <StatCard label="Days Tracked" value={trends.length.toString()} />
      </View>

      <View className="flex-row gap-2">
        <StatCard label="Avg Protein" value={`${Math.round(avgProtein)}g`} color="text-rose-500" />
        <StatCard label="Avg Carbs" value={`${Math.round(avgCarbs)}g`} color="text-amber-500" />
        <StatCard label="Avg Fat" value={`${Math.round(avgFat)}g`} color="text-blue-500" />
      </View>

      {/* Calorie Trend Bar Chart */}
      <View className="bg-surface rounded-xl p-4">
        <Text className="text-sm font-semibold text-text-primary mb-3">
          Daily Calories
        </Text>
        <SimpleBarChart
          data={trends.slice(-14).map((t) => ({
            label: t.date.substring(5), // MM-DD
            value: t.calories,
            max: maxCalories,
          }))}
        />
      </View>

      {/* Protein Trend */}
      <View className="bg-surface rounded-xl p-4">
        <Text className="text-sm font-semibold text-text-primary mb-3">
          Daily Protein
        </Text>
        <SimpleBarChart
          data={trends.slice(-14).map((t) => ({
            label: t.date.substring(5),
            value: t.protein,
            max: Math.max(...trends.map((x) => x.protein), 1),
          }))}
          color="#F43F5E"
        />
      </View>
    </View>
  );
};

// --- Medication Report Tab --------------------------------------------------

const MedicationReport: React.FC<{
  startDate: string;
  endDate: string;
}> = ({ startDate, endDate }) => {
  const { data: entries = [], isLoading } = useMedicationEntries({
    fromDate: startDate,
    toDate: endDate,
  });

  if (isLoading) {
    return (
      <View className="py-10 items-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (entries.length === 0) {
    return (
      <View className="bg-surface rounded-xl p-6 items-center">
        <Icon name="medkit" size={40} color="var(--color-text-muted)" />
        <Text className="text-sm text-text-muted mt-3 text-center">
          No medication entries for this period.
        </Text>
      </View>
    );
  }

  // Group by medication
  const byMed = new Map<string, { name: string; taken: number; skipped: number; total: number }>();
  for (const entry of entries) {
    const key = entry.medication_id;
    const existing = byMed.get(key) ?? { name: entry.med_name_snapshot ?? 'Medication', taken: 0, skipped: 0, total: 0 };
    existing.total++;
    if (entry.status === 'taken' || entry.status === 'prn_taken') existing.taken++;
    if (entry.status === 'skipped') existing.skipped++;
    byMed.set(key, existing);
  }

  const adherenceData = Array.from(byMed.entries()).map(([id, data]) => ({
    id,
    ...data,
    rate: data.total > 0 ? Math.round((data.taken / data.total) * 100) : 0,
  }));

  return (
    <View className="gap-4">
      {/* Summary */}
      <View className="flex-row gap-2">
        <StatCard label="Total Doses" value={entries.length.toString()} />
        <StatCard
          label="Taken"
          value={entries.filter((e) => e.status === 'taken' || e.status === 'prn_taken').length.toString()}
          color="text-green-500"
        />
        <StatCard
          label="Missed"
          value={entries.filter((e) => e.status === 'skipped').length.toString()}
          color="text-red-500"
        />
      </View>

      {/* Per-medication adherence */}
      <View className="bg-surface rounded-xl p-4">
        <Text className="text-sm font-semibold text-text-primary mb-3">
          Adherence by Medication
        </Text>
        <SimpleBarChart
          data={adherenceData.map((m) => ({
            label: m.name.substring(0, 10),
            value: m.rate,
            max: 100,
          }))}
          color="#22C55E"
        />
        {adherenceData.map((m) => (
          <View key={m.id} className="flex-row items-center justify-between mt-2 py-2 border-t border-border-subtle">
            <Text className="text-sm text-text-primary flex-1" numberOfLines={1}>{m.name}</Text>
            <Text className="text-xs text-text-muted">{m.taken}/{m.total} taken</Text>
            <View className={`ml-2 px-2 py-0.5 rounded-full ${m.rate >= 80 ? 'bg-green-500/20' : m.rate >= 50 ? 'bg-amber-500/20' : 'bg-red-500/20'}`}>
              <Text className={`text-[10px] font-bold ${m.rate >= 80 ? 'text-green-600' : m.rate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                {m.rate}%
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Recent entries */}
      <View className="bg-surface rounded-xl p-4">
        <Text className="text-sm font-semibold text-text-primary mb-3">
          Recent Entries
        </Text>
        {entries.slice(0, 20).map((entry) => (
          <View
            key={entry.id}
            className="flex-row items-center gap-2 py-2 border-b border-border-subtle"
          >
            <Icon
              name={
                entry.status === 'taken' || entry.status === 'prn_taken'
                  ? 'checkmark-circle'
                  : entry.status === 'skipped'
                  ? 'close-circle'
                  : 'time'
              }
              size={16}
              color={
                entry.status === 'taken' || entry.status === 'prn_taken'
                  ? '#22C55E'
                  : entry.status === 'skipped'
                  ? '#EF4444'
                  : '#F59E0B'
              }
            />
            <View className="flex-1">
              <Text className="text-xs text-text-primary" numberOfLines={1}>
                {entry.med_name_snapshot ?? 'Medication'}
              </Text>
              <Text className="text-[10px] text-text-muted">
                {entry.entry_date} · {entry.status}
                {entry.entry_type === 'injection' ? ' (injection)' : ''}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

// --- Exercise Report Tab ---------------------------------------------------

const ExerciseReport: React.FC<{
  startDate: string;
  endDate: string;
}> = ({ startDate, endDate }) => {
  const { data: reportsData, isLoading } = useQuery({
    queryKey: ['reports-data', startDate, endDate],
    queryFn: () => fetchReportsData(startDate, endDate),
  });

  if (isLoading) {
    return (
      <View className="py-10 items-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const exercise = reportsData?.exerciseSummary;
  if (!exercise || exercise.totalSessions === 0) {
    return (
      <View className="bg-surface rounded-xl p-6 items-center">
        <Icon name="barbell" size={40} color="var(--color-text-muted)" />
        <Text className="text-sm text-text-muted mt-3 text-center">
          No exercise data for this period.
        </Text>
      </View>
    );
  }

  return (
    <View className="gap-4">
      <View className="flex-row gap-2">
        <StatCard label="Sessions" value={exercise.totalSessions.toString()} />
        <StatCard label="Total Minutes" value={exercise.totalMinutes.toString()} sublabel="min" />
        <StatCard label="Calories" value={Math.round(exercise.totalCalories).toString()} sublabel="kcal" />
      </View>
      <View className="flex-row gap-2">
        <StatCard
          label="Avg/Day"
          value={Math.round(exercise.avgMinutesPerDay).toString()}
          sublabel="min"
          color="text-accent-primary"
        />
      </View>
      <View className="bg-surface rounded-xl p-4">
        <Text className="text-sm font-semibold text-text-primary mb-2">Summary</Text>
        <Text className="text-xs text-text-secondary leading-5">
          Over this period, you completed {exercise.totalSessions} exercise sessions
          totaling {exercise.totalMinutes} minutes and burning approximately{' '}
          {Math.round(exercise.totalCalories)} calories.
          That's an average of {Math.round(exercise.avgMinutesPerDay)} minutes per day.
        </Text>
      </View>
    </View>
  );
};

// --- Measurements Report Tab ------------------------------------------------

const MeasurementsReport: React.FC<{
  startDate: string;
  endDate: string;
}> = ({ startDate, endDate }) => {
  const { data: reportsData, isLoading } = useQuery({
    queryKey: ['reports-data', startDate, endDate],
    queryFn: () => fetchReportsData(startDate, endDate),
  });

  if (isLoading) {
    return (
      <View className="py-10 items-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const trends = reportsData?.measurementTrends ?? [];
  if (trends.length === 0) {
    return (
      <View className="bg-surface rounded-xl p-6 items-center">
        <Icon name="body" size={40} color="var(--color-text-muted)" />
        <Text className="text-sm text-text-muted mt-3 text-center">
          No measurement data for this period.{'\n'}Log measurements from Check-In.
        </Text>
      </View>
    );
  }

  const weightPoints = trends.filter((t) => t.weight != null);
  const latestWeight = weightPoints.length > 0 ? weightPoints[weightPoints.length - 1].weight : null;
  const firstWeight = weightPoints.length > 0 ? weightPoints[0].weight : null;
  const weightChange = latestWeight && firstWeight ? latestWeight - firstWeight : null;

  const stepsPoints = trends.filter((t) => t.steps != null);
  const avgSteps = stepsPoints.length > 0
    ? stepsPoints.reduce((s, t) => s + (t.steps ?? 0), 0) / stepsPoints.length
    : 0;

  return (
    <View className="gap-4">
      {/* Weight Summary */}
      {weightPoints.length > 0 && (
        <View className="gap-2">
          <View className="flex-row gap-2">
            <StatCard
              label="Latest Weight"
              value={latestWeight ? `${latestWeight.toFixed(1)}` : '—'}
              sublabel="kg"
            />
            <StatCard
              label="Change"
              value={weightChange ? `${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)}` : '—'}
              sublabel="kg"
              color={weightChange && weightChange > 0 ? 'text-red-500' : 'text-green-500'}
            />
          </View>
          {/* Weight trend bar chart */}
          <View className="bg-surface rounded-xl p-4">
            <Text className="text-sm font-semibold text-text-primary mb-3">
              Weight Trend
            </Text>
            <SimpleBarChart
              data={weightPoints.slice(-14).map((t) => ({
                label: t.date.substring(5),
                value: t.weight ?? 0,
                max: Math.max(...weightPoints.map((w) => w.weight ?? 0), 1),
              }))}
              color="#8B5CF6"
            />
          </View>
        </View>
      )}

      {/* Steps Summary */}
      {stepsPoints.length > 0 && (
        <View className="bg-surface rounded-xl p-4">
          <Text className="text-sm font-semibold text-text-primary mb-2">
            Daily Steps
          </Text>
          <Text className="text-2xl font-bold text-text-primary mb-1">
            {Math.round(avgSteps).toLocaleString()}
          </Text>
          <Text className="text-xs text-text-muted mb-3">average per day</Text>
          <SimpleBarChart
            data={stepsPoints.slice(-14).map((t) => ({
              label: t.date.substring(5),
              value: t.steps ?? 0,
              max: Math.max(...stepsPoints.map((s) => s.steps ?? 0), 1),
            }))}
            color="#22C55E"
          />
        </View>
      )}

      {/* Data points count */}
      <View className="bg-surface rounded-xl p-4">
        <Text className="text-xs text-text-muted">
          {trends.length} data points in this period.
          Log more measurements from Check-In for richer trends.
        </Text>
      </View>
    </View>
  );
};

// --- Main Screen -----------------------------------------------------------

const ReportsScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const activeWorkoutBarPadding = useActiveWorkoutBarPadding('stack');
  const { backColor } = useHeaderActionColors();

  const [activeTab, setActiveTab] = useState<ReportTab>('nutrition');
  const [rangeKey, setRangeKey] = useState('14d');

  const range = RANGE_OPTIONS.find((r) => r.key === rangeKey) ?? RANGE_OPTIONS[1];
  const today = toLocalDateString(new Date());
  const startDate = addDays(today, -range.days);

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
        Reports
      </Text>
      <View style={{ width: 22 }} />
    </View>
  );

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {header}

      {/* Tab Bar */}
      <View className="flex-row justify-center gap-1 px-4 mb-2">
        <TabButton label="Nutrition" active={activeTab === 'nutrition'} onPress={() => setActiveTab('nutrition')} />
        <TabButton label="Meds" active={activeTab === 'medications'} onPress={() => setActiveTab('medications')} />
        <TabButton label="Exercise" active={activeTab === 'exercise'} onPress={() => setActiveTab('exercise')} />
        <TabButton label="Body" active={activeTab === 'measurements'} onPress={() => setActiveTab('measurements')} />
      </View>

      {/* Range Selector */}
      <View className="flex-row justify-center gap-1 px-4 mb-3">
        {RANGE_OPTIONS.map((r) => (
          <Pressable
            key={r.key}
            onPress={() => setRangeKey(r.key)}
            className={`px-3 py-1 rounded-full ${
              rangeKey === r.key ? 'bg-accent-primary' : 'bg-surface'
            }`}
          >
            <Text
              className={`text-[10px] font-semibold ${
                rangeKey === r.key ? 'text-white' : 'text-text-muted'
              }`}
            >
              {r.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 32 + activeWorkoutBarPadding,
        }}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'nutrition' && <NutritionReport startDate={startDate} endDate={today} />}
        {activeTab === 'medications' && <MedicationReport startDate={startDate} endDate={today} />}
        {activeTab === 'exercise' && <ExerciseReport startDate={startDate} endDate={today} />}
        {activeTab === 'measurements' && <MeasurementsReport startDate={startDate} endDate={today} />}
      </ScrollView>
    </View>
  );
};

export default ReportsScreen;
