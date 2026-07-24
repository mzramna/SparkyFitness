import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import Icon from '../components/Icon';
import Button from '../components/ui/Button';
import { useActiveWorkoutBarPadding } from '../components/ActiveWorkoutBar';
import { useHeaderActionColors } from '../hooks/useHeaderActionColors';
import {
  useMedications,
  useMedicationEntries,
  useCreateMedicationEntryMutation,
  useDeleteMedicationMutation,
  useDeleteMedicationEntryMutation,
  useLogGlpInjectionEntryMutation,
} from '../hooks/useMedications';
import { useSymptomEntries } from '../hooks/useSymptoms';
import { getDueDosesForDate } from '@workspace/shared';
import type { Medication, MedicationDetail, MedicationEntry } from '../types/medications';
import type { RootStackScreenProps } from '../types/navigation';
import { toLocalDateString } from '../utils/dateUtils';

type Props = RootStackScreenProps<'Medications'>;
type TabId = 'today' | 'cabinet' | 'symptoms';

// --- Helpers ---------------------------------------------------------------

function formatScheduleShort(schedule: {
  schedule_type_id: string;
  time_of_day?: string | null;
  days_of_week?: number[] | null;
}): string {
  const time = schedule.time_of_day
    ? ` at ${schedule.time_of_day.substring(0, 5)}`
    : '';
  switch (schedule.schedule_type_id) {
    case 'daily':
      return `Daily${time}`;
    case 'weekly':
    case 'specific_days':
      return `Weekly${time}`;
    case 'every_n_days':
      return `Every N days${time}`;
    case 'prn':
      return 'As needed';
    default:
      return schedule.schedule_type_id;
  }
}

function medicationTypeIcon(typeId: string | null, isGlp1?: boolean): string {
  if (isGlp1) return 'syringe';
  switch (typeId) {
    case 'tablet':
    case 'capsule':
      return 'pill';
    case 'liquid':
    case 'drops':
      return 'drop';
    case 'injection':
      return 'syringe';
    case 'inhaler':
      return 'wind';
    case 'cream':
    case 'gel':
      return 'hand-left';
    case 'patch':
      return 'bandage';
    case 'nasal_spray':
      return 'nose';
    default:
      return 'medkit';
  }
}

// --- Tab Button component --------------------------------------------------

const TabButton: React.FC<{
  label: string;
  iconName: string;
  active: boolean;
  onPress: () => void;
}> = ({ label, iconName, active, onPress }) => (
  <Pressable
    onPress={onPress}
    className={`flex-row items-center gap-1.5 px-4 py-2 rounded-full ${
      active ? 'bg-surface shadow-sm' : ''
    }`}
    style={({ pressed }) => (pressed ? { opacity: 0.7 } : null)}
  >
    <Icon
      name={iconName}
      size={16}
      color={active ? 'var(--color-text-primary)' : 'var(--color-text-muted)'}
    />
    <Text
      className={`text-xs font-semibold ${
        active ? 'text-text-primary' : 'text-text-muted'
      }`}
    >
      {label}
    </Text>
  </Pressable>
);

// --- KPI Card component ----------------------------------------------------

const KpiCard: React.FC<{
  label: string;
  value: number;
  iconName: string;
  color: string;
}> = ({ label, value, iconName, color }) => (
  <View className="flex-1 bg-surface rounded-xl p-3">
    <View className="flex-row items-center gap-2">
      <View className={`rounded-lg p-1.5 ${color}`}>
        <Icon name={iconName} size={16} color="#FFFFFF" />
      </View>
      <View>
        <Text className="text-xl font-bold text-text-primary">{value}</Text>
        <Text className="text-[10px] font-medium text-text-muted">{label}</Text>
      </View>
    </View>
  </View>
);

// --- Today Tab (Log) -------------------------------------------------------

const TodayTab: React.FC<{
  selectedDate: string;
  meds: Medication[];
  entries: MedicationEntry[];
  loading: boolean;
  onLogDose: (medicationId: string, scheduleId?: string | null, status?: 'taken' | 'skipped' | 'prn_taken') => void;
  onLogGlpInjection: (medicationId: string) => void;
  navigation?: any;
}> = ({ selectedDate, meds, entries, loading, onLogDose, onLogGlpInjection, navigation }) => {
  const dueDoses = useMemo(
    () => getDueDosesForDate(meds as MedicationDetail[], selectedDate),
    [meds, selectedDate]
  );

  // PRN medications (always available to log)
  const prnMeds = useMemo(
    () =>
      meds.filter(
        (m) =>
          m.is_active &&
          m.schedules?.some((s) => s.schedule_type_id === 'prn')
      ),
    [meds]
  );

  // GLP-1 medications
  const glp1Meds = useMemo(
    () => meds.filter((m) => m.is_active && m.is_glp1),
    [meds]
  );

  // Already logged entry ids for today
  const loggedScheduleIds = useMemo(() => {
    const ids = new Set<string>();
    for (const e of entries) {
      if (e.schedule_id) ids.add(e.schedule_id);
      ids.add(e.medication_id); // Also track that med has any entry
    }
    return ids;
  }, [entries]);

  if (loading) {
    return (
      <View className="py-10 items-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View className="gap-4">
      {/* Due Today */}
      <View>
        <Text className="text-xs font-semibold uppercase text-text-muted tracking-wide mb-3">
          Due Today ({dueDoses.length})
        </Text>
        {dueDoses.length === 0 ? (
          <View className="bg-surface rounded-xl p-4 items-center">
            <Icon name="checkmark-circle" size={32} color="var(--color-accent-primary)" />
            <Text className="text-sm text-text-muted mt-2">All caught up for today!</Text>
          </View>
        ) : (
          dueDoses.map(({ medication, schedule }) => {
            const isLogged = entries.some(
              (e) =>
                e.medication_id === medication.id &&
                (e.schedule_id === schedule.id || !schedule.id)
            );
            return (
              <View
                key={`${medication.id}-${schedule.id}`}
                className={`bg-surface rounded-xl p-4 mb-2 flex-row items-center justify-between ${
                  isLogged ? 'opacity-50' : ''
                }`}
              >
                <View className="flex-row items-center gap-3 flex-1">
                  <View className="w-10 h-10 rounded-full bg-accent-primary/10 items-center justify-center">
                    <Icon
                      name={medicationTypeIcon(medication.type_id, medication.is_glp1)}
                      size={20}
                      color="var(--color-accent-primary)"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-text-primary" numberOfLines={1}>
                      {medication.display_name || medication.name}
                    </Text>
                    <Text className="text-xs text-text-muted">
                      {schedule.dose_amount
                        ? `${schedule.dose_amount} ${medication.dose_unit ?? ''}`
                        : medication.strength_value
                        ? `${medication.strength_value} ${medication.strength_unit ?? ''}`
                        : formatScheduleShort(schedule)}
                      {schedule.time_of_day ? ` · ${schedule.time_of_day.substring(0, 5)}` : ''}
                    </Text>
                  </View>
                </View>
                <View className="flex-row gap-2">
                  {!isLogged && (
                    <>
                      <Pressable
                        onPress={() => onLogDose(medication.id, schedule.id, 'taken')}
                        className="w-9 h-9 rounded-full bg-green-500 items-center justify-center"
                        accessibilityLabel="Mark as taken"
                      >
                        <Icon name="checkmark" size={18} color="#FFFFFF" />
                      </Pressable>
                      <Pressable
                        onPress={() => onLogDose(medication.id, schedule.id, 'skipped')}
                        className="w-9 h-9 rounded-full bg-red-400 items-center justify-center"
                        accessibilityLabel="Mark as skipped"
                      >
                        <Icon name="close" size={18} color="#FFFFFF" />
                      </Pressable>
                    </>
                  )}
                  {isLogged && (
                    <View className="px-3 py-1.5 rounded-full bg-green-500/20">
                      <Text className="text-xs font-semibold text-green-600">Logged</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* PRN / As Needed */}
      {prnMeds.length > 0 && (
        <View>
          <Text className="text-xs font-semibold uppercase text-text-muted tracking-wide mb-3">
            As Needed (PRN)
          </Text>
          {prnMeds.map((med) => (
            <View
              key={med.id}
              className="bg-surface rounded-xl p-4 mb-2 flex-row items-center justify-between"
            >
              <View className="flex-row items-center gap-3 flex-1">
                <View className="w-10 h-10 rounded-full bg-amber-500/10 items-center justify-center">
                  <Icon
                    name={medicationTypeIcon(med.type_id, med.is_glp1)}
                    size={20}
                    color="var(--color-amber-500)"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-text-primary" numberOfLines={1}>
                    {med.display_name || med.name}
                  </Text>
                  <Text className="text-xs text-text-muted">
                    {med.schedules?.[0]?.prn_reason ?? 'As needed'}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => onLogDose(med.id, null, 'prn_taken')}
                className="px-3 py-1.5 rounded-full bg-amber-500/20"
              >
                <Text className="text-xs font-semibold text-amber-600">Log PRN</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {/* GLP-1 Injections */}
      {glp1Meds.length > 0 && (
        <View>
          <Text className="text-xs font-semibold uppercase text-text-muted tracking-wide mb-3">
            GLP-1 Injections
          </Text>
          {glp1Meds.map((med) => (
            <View
              key={med.id}
              className="bg-surface rounded-xl p-4 mb-2 flex-row items-center justify-between"
            >
              <View className="flex-row items-center gap-3 flex-1">
                <View className="w-10 h-10 rounded-full bg-blue-500/10 items-center justify-center">
                  <Icon name="syringe" size={20} color="#3B82F6" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-text-primary" numberOfLines={1}>
                    {med.display_name || med.name}
                  </Text>
                  <Text className="text-xs text-text-muted">
                    {med.strength_value
                      ? `${med.strength_value} ${med.strength_unit ?? ''}`
                      : 'GLP-1'}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => navigation.navigate('MedicationDetail', { medicationId: med.id })}
                className="px-3 py-1.5 rounded-full bg-blue-500/20"
              >
                <Text className="text-xs font-semibold text-blue-600">GLP-1 Coach</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {/* Today's logged entries */}
      {entries.length > 0 && (
        <View>
          <Text className="text-xs font-semibold uppercase text-text-muted tracking-wide mb-3">
            Logged Today ({entries.length})
          </Text>
          {entries.map((entry) => (
            <View
              key={entry.id}
              className="bg-surface rounded-xl p-3 mb-2 flex-row items-center justify-between"
            >
              <View className="flex-row items-center gap-2 flex-1">
                <Icon
                  name={
                    entry.status === 'taken' || entry.status === 'prn_taken'
                      ? 'checkmark-circle'
                      : entry.status === 'skipped'
                      ? 'close-circle'
                      : 'time'
                  }
                  size={18}
                  color={
                    entry.status === 'taken' || entry.status === 'prn_taken'
                      ? '#22C55E'
                      : entry.status === 'skipped'
                      ? '#EF4444'
                      : '#F59E0B'
                  }
                />
                <View className="flex-1">
                  <Text className="text-sm text-text-primary" numberOfLines={1}>
                    {entry.med_name_snapshot ?? 'Medication'}
                  </Text>
                  <Text className="text-[10px] text-text-muted">
                    {entry.entry_type === 'injection' ? 'Injection' : entry.status}
                    {entry.dose_amount_snapshot
                      ? ` · ${entry.dose_amount_snapshot} ${entry.dose_unit_snapshot ?? ''}`
                      : ''}
                    {entry.taken_at
                      ? ` · ${new Date(entry.taken_at).toLocaleTimeString([], {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}`
                      : ''}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

// --- Cabinet Tab -----------------------------------------------------------

const CabinetTab: React.FC<{
  meds: Medication[];
  loading: boolean;
  onSelectMed: (id: string) => void;
  onDeleteMed: (id: string) => void;
  onOpenDetail: (id: string) => void;
  selectedId: string | null;
}> = ({ meds, loading, onSelectMed, onDeleteMed, onOpenDetail, selectedId }) => {
  const selected = meds.find((m) => m.id === selectedId) as MedicationDetail | undefined;

  if (loading) {
    return (
      <View className="py-10 items-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View className="gap-4">
      {/* KPI Tiles */}
      <View className="flex-row gap-2">
        <KpiCard
          label="Active"
          value={meds.filter((m) => m.is_active).length}
          iconName="medkit"
          color="bg-rose-500"
        />
        <KpiCard
          label="GLP-1"
          value={meds.filter((m) => m.is_active && m.is_glp1).length}
          iconName="syringe"
          color="bg-blue-500"
        />
        <KpiCard
          label="Total"
          value={meds.length}
          iconName="list"
          color="bg-slate-500"
        />
      </View>

      {meds.length === 0 ? (
        <View className="bg-surface rounded-xl p-6 items-center">
          <Icon name="medkit-outline" size={40} color="var(--color-text-muted)" />
          <Text className="text-sm text-text-muted mt-3 text-center">
            No medications yet.{'\n'}Add your first one to get started.
          </Text>
        </View>
      ) : (
        <View>
          {/* Medication List */}
          {meds.map((med) => (
            <Pressable
              key={med.id}
              onPress={() => onSelectMed(med.id)}
              className={`bg-surface rounded-xl p-4 mb-2 flex-row items-center justify-between ${
                selectedId === med.id ? 'border border-accent-primary' : ''
              }`}
              style={({ pressed }) => (pressed ? { opacity: 0.8 } : null)}
            >
              <View className="flex-row items-center gap-3 flex-1">
                <View className="w-10 h-10 rounded-full bg-accent-primary/10 items-center justify-center">
                  <Icon
                    name={medicationTypeIcon(med.type_id, med.is_glp1)}
                    size={20}
                    color="var(--color-accent-primary)"
                  />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center gap-1">
                    <Text className="text-sm font-semibold text-text-primary" numberOfLines={1}>
                      {med.display_name || med.name}
                    </Text>
                    {med.is_glp1 && (
                      <View className="bg-blue-500 rounded px-1.5 py-0.5">
                        <Text className="text-[9px] font-bold text-white">GLP-1</Text>
                      </View>
                    )}
                    {!med.is_active && (
                      <View className="bg-gray-300 rounded px-1.5 py-0.5">
                        <Text className="text-[9px] font-bold text-gray-600">Inactive</Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-xs text-text-muted" numberOfLines={1}>
                    {med.strength_value
                      ? `${med.strength_value} ${med.strength_unit ?? ''}`
                      : med.type_id ?? 'Medication'}
                    {med.schedules?.[0] ? ` · ${formatScheduleShort(med.schedules[0])}` : ''}
                  </Text>
                </View>
              </View>
              <Icon name="chevron-forward" size={16} color="var(--color-text-muted)" />
            </Pressable>
          ))}
        </View>
      )}

      {/* Selected Medication Detail */}
      {selected && (
        <View className="bg-surface rounded-xl p-4 gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-bold text-text-primary flex-1">
              {selected.display_name || selected.name}
            </Text>
            <View className="flex-row gap-2">
              <Pressable
                onPress={() => onDeleteMed(selected.id)}
                className="w-8 h-8 rounded-full bg-red-500/10 items-center justify-center"
              >
                <Icon name="trash" size={16} color="#EF4444" />
              </Pressable>
            </View>
          </View>

          {selected.strength_value && (
            <Text className="text-sm text-text-secondary">
              {selected.strength_value} {selected.strength_unit ?? ''}
            </Text>
          )}

          {selected.prescriber && (
            <View className="flex-row items-center gap-2">
              <Icon name="person" size={14} color="var(--color-text-muted)" />
              <Text className="text-xs text-text-muted">Dr. {selected.prescriber}</Text>
            </View>
          )}

          {selected.pharmacy && (
            <View className="flex-row items-center gap-2">
              <Icon name="storefront" size={14} color="var(--color-text-muted)" />
              <Text className="text-xs text-text-muted">{selected.pharmacy}</Text>
            </View>
          )}

          {selected.reason_text && (
            <View>
              <Text className="text-xs font-semibold text-text-muted mb-1">Reason</Text>
              <Text className="text-sm text-text-primary">{selected.reason_text}</Text>
            </View>
          )}

          {selected.notes && (
            <View>
              <Text className="text-xs font-semibold text-text-muted mb-1">Notes</Text>
              <Text className="text-sm text-text-primary">{selected.notes}</Text>
            </View>
          )}

          {/* Schedules */}
          {selected.schedules && selected.schedules.length > 0 && (
            <View>
              <Text className="text-xs font-semibold text-text-muted mb-2">Schedules</Text>
              {selected.schedules.map((sched) => (
                <View
                  key={sched.id}
                  className="flex-row items-center gap-2 mb-1"
                >
                  <Icon
                    name={sched.schedule_type_id === 'prn' ? 'flash' : 'time'}
                    size={14}
                    color="var(--color-accent-primary)"
                  />
                  <Text className="text-xs text-text-secondary">
                    {formatScheduleShort(sched)}
                    {sched.dose_amount ? ` · ${sched.dose_amount}` : ''}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* View Detail button */}
          <Pressable
            onPress={() => onOpenDetail(selected.id)}
            className="mt-2 bg-accent-primary/10 rounded-xl py-3 items-center flex-row justify-center gap-1"
          >
            <Icon name="open-outline" size={16} color="var(--color-accent-primary)" />
            <Text className="text-sm font-semibold text-accent-primary">
              {selected.is_glp1 ? 'GLP-1 Coach' : 'View Details'}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
};

// --- Symptoms Tab ----------------------------------------------------------

const SymptomsTab: React.FC<{
  selectedDate: string;
}> = ({ selectedDate }) => {
  const { entries: symptoms = [], isLoading } = useSymptomEntries({ fromDate: selectedDate, toDate: selectedDate });

  if (isLoading) {
    return (
      <View className="py-10 items-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (symptoms.length === 0) {
    return (
      <View className="bg-surface rounded-xl p-6 items-center">
        <Icon name="pulse" size={40} color="var(--color-text-muted)" />
        <Text className="text-sm text-text-muted mt-3 text-center">
          No symptoms logged yet.{'\n'}Symptoms can be logged from the Chat or CheckIn.
        </Text>
      </View>
    );
  }

  return (
    <View className="gap-2">
      {symptoms.map((symptom) => (
        <View key={symptom.id} className="bg-surface rounded-xl p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-semibold text-text-primary">
              {symptom.symptom_name_snapshot}
            </Text>
            <View className="flex-row items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <View
                  key={i}
                  className={`w-2 h-2 rounded-full ${
                    i < symptom.severity ? 'bg-orange-500' : 'bg-gray-200'
                  }`}
                />
              ))}
            </View>
          </View>
          <Text className="text-xs text-text-muted mt-1">
            {symptom.entry_date}
            {symptom.notes ? ` · ${symptom.notes}` : ''}
          </Text>
        </View>
      ))}
    </View>
  );
};

// --- Disclaimer Component --------------------------------------------------

const MedicationDisclaimer: React.FC<{ onAccept: () => void }> = ({
  onAccept,
}) => (
  <View className="flex-1 bg-background px-6 justify-center">
    <View className="bg-surface rounded-2xl p-6 gap-4">
      <View className="items-center">
        <View className="w-16 h-16 rounded-full bg-amber-500/10 items-center justify-center mb-3">
          <Icon name="warning" size={32} color="#F59E0B" />
        </View>
        <Text className="text-lg font-bold text-text-primary text-center">
          Medical Disclaimer
        </Text>
      </View>
      <Text className="text-sm text-text-secondary text-center leading-5">
        This medication tracker is for informational and organizational purposes only. It is not
        medical advice. Always consult your healthcare provider regarding your medications, dosages,
        and treatment plan. Never change or stop a medication without consulting your doctor.
      </Text>
      <Button variant="primary" onPress={onAccept} className="mt-2">
        I Understand
      </Button>
    </View>
  </View>
);

// --- Main Screen -----------------------------------------------------------

const MedicationsScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const activeWorkoutBarPadding = useActiveWorkoutBarPadding('stack');
  const { backColor } = useHeaderActionColors();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabId>('today');
  const [selectedCabinetId, setSelectedCabinetId] = useState<string | null>(null);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);

  const today = toLocalDateString(new Date());

  // Queries
  const { data: meds = [], isLoading: loadingMeds } = useMedications({
    activeOnly: false,
  });
  const { data: entries = [], isLoading: loadingEntries } = useMedicationEntries({
    fromDate: today,
    toDate: today,
  });
  const { entries: anySymptoms = [] } = useSymptomEntries({ fromDate: today, toDate: today });

  // Mutations
  const createEntryMutation = useCreateMedicationEntryMutation();
  const deleteMedMutation = useDeleteMedicationMutation();
  const deleteEntryMutation = useDeleteMedicationEntryMutation();
  const logGlpInjection = useLogGlpInjectionEntryMutation();

  const hasExistingData = meds.length > 0 || anySymptoms.length > 0;

  const handleLogDose = useCallback(
    (
      medicationId: string,
      scheduleId?: string | null,
      status: 'taken' | 'skipped' | 'prn_taken' = 'taken'
    ) => {
      const med = meds.find((m) => m.id === medicationId);
      createEntryMutation.mutate({
        medication_id: medicationId,
        schedule_id: scheduleId ?? undefined,
        status,
        entry_date: today,
        med_name_snapshot: med?.display_name || med?.name || null,
        dose_amount_snapshot: med?.dose_amount ?? med?.strength_value ?? null,
        dose_unit_snapshot: med?.dose_unit ?? med?.strength_unit ?? null,
      });
    },
    [meds, today, createEntryMutation]
  );

  const handleLogGlpInjection = useCallback(
    (medicationId: string) => {
      Alert.alert('Log Injection', 'Log a GLP-1 injection for today?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log',
          onPress: () => {
            logGlpInjection.mutate({
              medication_id: medicationId,
              entry_date: today,
              deduct_pen: true,
            });
          },
        },
      ]);
    },
    [today, logGlpInjection]
  );

  const handleDeleteMed = useCallback(
    (id: string) => {
      Alert.alert('Delete Medication', 'Are you sure you want to delete this medication?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteMedMutation.mutate(id, {
              onSuccess: () => setSelectedCabinetId(null),
            });
          },
        },
      ]);
    },
    [deleteMedMutation]
  );

  // Show disclaimer gate if no existing data
  if (!loadingMeds && !hasExistingData && !disclaimerAccepted) {
    return (
      <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
        <MedicationDisclaimer onAccept={() => setDisclaimerAccepted(true)} />
      </View>
    );
  }

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
        Medications
      </Text>
      <Button
        variant="ghost"
        onPress={() => navigation.navigate('AddMedication', {})}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        className="py-0 px-0"
      >
        <Icon name="add-circle" size={22} color="var(--color-accent-primary)" />
      </Button>
    </View>
  );

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {header}

      {/* Tab Bar */}
      <View className="flex-row justify-center gap-1 px-4 mb-3">
        <TabButton
          label="Log"
          iconName="time-outline"
          active={activeTab === 'today'}
          onPress={() => setActiveTab('today')}
        />
        <TabButton
          label="Cabinet"
          iconName="medkit-outline"
          active={activeTab === 'cabinet'}
          onPress={() => setActiveTab('cabinet')}
        />
        <TabButton
          label="Symptoms"
          iconName="pulse"
          active={activeTab === 'symptoms'}
          onPress={() => setActiveTab('symptoms')}
        />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 32 + activeWorkoutBarPadding,
        }}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'today' && (
          <TodayTab
            selectedDate={today}
            meds={meds}
            entries={entries}
            loading={loadingMeds || loadingEntries}
            onLogDose={handleLogDose}
            onLogGlpInjection={handleLogGlpInjection}
            navigation={navigation}
          />
        )}
        {activeTab === 'cabinet' && (
          <CabinetTab
            meds={meds}
            loading={loadingMeds}
            onSelectMed={setSelectedCabinetId}
            onDeleteMed={handleDeleteMed}
            onOpenDetail={(id) => navigation.navigate('MedicationDetail', { medicationId: id })}
            selectedId={selectedCabinetId}
          />
        )}
        {activeTab === 'symptoms' && <SymptomsTab selectedDate={today} />}
      </ScrollView>
    </View>
  );
};

export default MedicationsScreen;
