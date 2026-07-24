import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import Button from '../components/ui/Button';
import { useActiveWorkoutBarPadding } from '../components/ActiveWorkoutBar';
import { useHeaderActionColors } from '../hooks/useHeaderActionColors';
import {
  useCreateMedicationMutation,
  useUpdateMedicationMutation,
} from '../hooks/useMedications';
import { MEDICATION_TYPE_LABELS, SCHEDULE_TYPE_LABELS } from '../types/medications';
import type { Medication } from '../types/medications';
import type { RootStackScreenProps } from '../types/navigation';

type Props = RootStackScreenProps<'AddMedication'>;

const MEDICATION_TYPES = Object.entries(MEDICATION_TYPE_LABELS).map(([id, label]) => ({
  id,
  label,
}));

const SCHEDULE_TYPES = Object.entries(SCHEDULE_TYPE_LABELS).map(([id, label]) => ({
  id,
  label,
}));

const DOSE_UNITS = ['mg', 'mcg', 'g', 'mL', 'units', 'puffs', 'drops', 'patches'];

// --- Form Field component --------------------------------------------------

const FormField: React.FC<{
  label: string;
  children: React.ReactNode;
  description?: string;
}> = ({ label, children, description }) => (
  <View className="mb-4">
    <Text className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1.5">
      {label}
    </Text>
    {children}
    {description && (
      <Text className="text-[10px] text-text-muted mt-1">{description}</Text>
    )}
  </View>
);

// --- Main Screen -----------------------------------------------------------

const AddMedicationScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const activeWorkoutBarPadding = useActiveWorkoutBarPadding('stack');
  const { backColor } = useHeaderActionColors();

  // Check if editing
  const editMed = route.params?.editMed as Medication | undefined;
  const isEditing = !!editMed;

  // Form state
  const [name, setName] = useState(editMed?.name ?? '');
  const [displayName, setDisplayName] = useState(editMed?.display_name ?? '');
  const [typeId, setTypeId] = useState(editMed?.type_id ?? 'tablet');
  const [strengthValue, setStrengthValue] = useState(
    editMed?.strength_value?.toString() ?? ''
  );
  const [strengthUnit, setStrengthUnit] = useState(editMed?.strength_unit ?? 'mg');
  const [doseAmount, setDoseAmount] = useState(
    editMed?.dose_amount?.toString() ?? ''
  );
  const [doseUnit, setDoseUnit] = useState(editMed?.dose_unit ?? 'mg');
  const [prescriber, setPrescriber] = useState(editMed?.prescriber ?? '');
  const [pharmacy, setPharmacy] = useState(editMed?.pharmacy ?? '');
  const [rxNumber, setRxNumber] = useState(editMed?.rx_number ?? '');
  const [reason, setReason] = useState(editMed?.reason_text ?? '');
  const [notes, setNotes] = useState(editMed?.notes ?? '');
  const [isActive, setIsActive] = useState(editMed?.is_active ?? true);
  const [isGlp1, setIsGlp1] = useState(editMed?.is_glp1 ?? false);

  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);

  // Schedule state
  const [scheduleTypeId, setScheduleTypeId] = useState('daily');
  const [scheduleTime, setScheduleTime] = useState('08:00');
  const [hasSchedule, setHasSchedule] = useState(!!editMed?.schedules?.length);

  // Mutations
  const createMutation = useCreateMedicationMutation();
  const updateMutation = useUpdateMedicationMutation();

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const handleSave = useCallback(() => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter a medication name.');
      return;
    }

    const medBody: Partial<Medication> & { name: string } = {
      name: name.trim(),
      display_name: displayName.trim() || null,
      type_id: typeId || null,
      strength_value: strengthValue ? parseFloat(strengthValue) : null,
      strength_unit: strengthUnit || null,
      dose_amount: doseAmount ? parseFloat(doseAmount) : null,
      dose_unit: doseUnit || null,
      prescriber: prescriber.trim() || null,
      pharmacy: pharmacy.trim() || null,
      rx_number: rxNumber.trim() || null,
      reason_text: reason.trim() || null,
      notes: notes.trim() || null,
      is_active: isActive,
      is_glp1: isGlp1,
    };

    if (isEditing && editMed) {
      updateMutation.mutate(
        { id: editMed.id, body: medBody },
        {
          onSuccess: () => navigation.goBack(),
          onError: () =>
            Alert.alert('Error', 'Failed to update medication. Please try again.'),
        }
      );
    } else {
      createMutation.mutate(medBody, {
        onSuccess: () => navigation.goBack(),
        onError: () =>
          Alert.alert('Error', 'Failed to create medication. Please try again.'),
      });
    }
  }, [
    name,
    displayName,
    typeId,
    strengthValue,
    strengthUnit,
    doseAmount,
    doseUnit,
    prescriber,
    pharmacy,
    rxNumber,
    reason,
    notes,
    isActive,
    isGlp1,
    isEditing,
    editMed,
    createMutation,
    updateMutation,
    navigation,
  ]);

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
        {isEditing ? 'Edit Medication' : 'Add Medication'}
      </Text>
      <Button
        variant="ghost"
        onPress={handleSave}
        disabled={isSaving}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        className="py-0 px-0"
      >
        {isSaving ? (
          <ActivityIndicator size="small" color="var(--color-accent-primary)" />
        ) : (
          <Text className="text-sm font-semibold text-accent-primary">Save</Text>
        )}
      </Button>
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
        {/* Medication Name */}
        <FormField label="Medication Name *">
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Lisinopril"
            placeholderTextColor="var(--color-text-muted)"
            className="bg-surface rounded-xl px-4 py-3 text-text-primary text-sm"
            autoCapitalize="words"
          />
        </FormField>

        {/* Display Name */}
        <FormField label="Display Name" description="Optional friendly name">
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="e.g. Blood pressure pill"
            placeholderTextColor="var(--color-text-muted)"
            className="bg-surface rounded-xl px-4 py-3 text-text-primary text-sm"
          />
        </FormField>

        {/* Medication Type */}
        <FormField label="Type">
          <Pressable
            onPress={() => setShowTypePicker(!showTypePicker)}
            className="bg-surface rounded-xl px-4 py-3 flex-row items-center justify-between"
          >
            <Text className="text-sm text-text-primary">
              {MEDICATION_TYPE_LABELS[typeId] ?? typeId}
            </Text>
            <Icon
              name={showTypePicker ? 'chevron-up' : 'chevron-down'}
              size={16}
              color="var(--color-text-muted)"
            />
          </Pressable>
          {showTypePicker && (
            <View className="bg-surface rounded-xl mt-1 overflow-hidden">
              {MEDICATION_TYPES.map((type) => (
                <Pressable
                  key={type.id}
                  onPress={() => {
                    setTypeId(type.id);
                    setShowTypePicker(false);
                  }}
                  className={`px-4 py-3 border-b border-border-subtle ${
                    typeId === type.id ? 'bg-accent-primary/10' : ''
                  }`}
                >
                  <Text
                    className={`text-sm ${
                      typeId === type.id
                        ? 'font-semibold text-accent-primary'
                        : 'text-text-primary'
                    }`}
                  >
                    {type.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </FormField>

        {/* Strength */}
        <View className="flex-row gap-3">
          <FormField label="Strength" >
            <TextInput
              value={strengthValue}
              onChangeText={setStrengthValue}
              placeholder="e.g. 10"
              placeholderTextColor="var(--color-text-muted)"
              keyboardType="decimal-pad"
              className="bg-surface rounded-xl px-4 py-3 text-text-primary text-sm"
            />
          </FormField>
          <FormField label="Unit">
            <TextInput
              value={strengthUnit}
              onChangeText={setStrengthUnit}
              placeholder="mg"
              placeholderTextColor="var(--color-text-muted)"
              className="bg-surface rounded-xl px-4 py-3 text-text-primary text-sm"
            />
          </FormField>
        </View>

        {/* Dose */}
        <View className="flex-row gap-3">
          <FormField label="Dose Amount">
            <TextInput
              value={doseAmount}
              onChangeText={setDoseAmount}
              placeholder="e.g. 1"
              placeholderTextColor="var(--color-text-muted)"
              keyboardType="decimal-pad"
              className="bg-surface rounded-xl px-4 py-3 text-text-primary text-sm"
            />
          </FormField>
          <FormField label="Dose Unit">
            <Pressable
              onPress={() => setShowUnitPicker(!showUnitPicker)}
              className="bg-surface rounded-xl px-4 py-3 flex-row items-center justify-between"
            >
              <Text className="text-sm text-text-primary">{doseUnit || 'Select'}</Text>
              <Icon
                name={showUnitPicker ? 'chevron-up' : 'chevron-down'}
                size={16}
                color="var(--color-text-muted)"
              />
            </Pressable>
            {showUnitPicker && (
              <View className="bg-surface rounded-xl mt-1 overflow-hidden">
                {DOSE_UNITS.map((unit) => (
                  <Pressable
                    key={unit}
                    onPress={() => {
                      setDoseUnit(unit);
                      setShowUnitPicker(false);
                    }}
                    className={`px-4 py-2.5 border-b border-border-subtle ${
                      doseUnit === unit ? 'bg-accent-primary/10' : ''
                    }`}
                  >
                    <Text
                      className={`text-sm ${
                        doseUnit === unit
                          ? 'font-semibold text-accent-primary'
                          : 'text-text-primary'
                      }`}
                    >
                      {unit}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </FormField>
        </View>

        {/* Toggle switches */}
        <View className="flex-row gap-4 mb-4">
          <View className="flex-1 flex-row items-center justify-between bg-surface rounded-xl px-4 py-3">
            <Text className="text-sm text-text-primary">Active</Text>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ true: 'var(--color-accent-primary)' }}
            />
          </View>
          <View className="flex-1 flex-row items-center justify-between bg-surface rounded-xl px-4 py-3">
            <Text className="text-sm text-text-primary">GLP-1</Text>
            <Switch
              value={isGlp1}
              onValueChange={setIsGlp1}
              trackColor={{ true: '#3B82F6' }}
            />
          </View>
        </View>

        {/* Prescriber */}
        <FormField label="Prescriber">
          <TextInput
            value={prescriber}
            onChangeText={setPrescriber}
            placeholder="e.g. Dr. Smith"
            placeholderTextColor="var(--color-text-muted)"
            className="bg-surface rounded-xl px-4 py-3 text-text-primary text-sm"
          />
        </FormField>

        {/* Pharmacy */}
        <FormField label="Pharmacy">
          <TextInput
            value={pharmacy}
            onChangeText={setPharmacy}
            placeholder="e.g. CVS"
            placeholderTextColor="var(--color-text-muted)"
            className="bg-surface rounded-xl px-4 py-3 text-text-primary text-sm"
          />
        </FormField>

        {/* Rx Number */}
        <FormField label="Rx Number">
          <TextInput
            value={rxNumber}
            onChangeText={setRxNumber}
            placeholder="e.g. 1234567"
            placeholderTextColor="var(--color-text-muted)"
            className="bg-surface rounded-xl px-4 py-3 text-text-primary text-sm"
          />
        </FormField>

        {/* Reason */}
        <FormField label="Reason / Condition">
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="e.g. Hypertension"
            placeholderTextColor="var(--color-text-muted)"
            className="bg-surface rounded-xl px-4 py-3 text-text-primary text-sm"
          />
        </FormField>

        {/* Notes */}
        <FormField label="Notes">
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Any additional notes..."
            placeholderTextColor="var(--color-text-muted)"
            multiline
            numberOfLines={3}
            className="bg-surface rounded-xl px-4 py-3 text-text-primary text-sm"
            style={{ minHeight: 80, textAlignVertical: 'top' }}
          />
        </FormField>

        {/* Save Button */}
        <Button
          variant="primary"
          onPress={handleSave}
          disabled={isSaving || !name.trim()}
          className="mt-2"
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text className="text-white font-semibold">
              {isEditing ? 'Update Medication' : 'Add Medication'}
            </Text>
          )}
        </Button>
      </ScrollView>
    </View>
  );
};

export default AddMedicationScreen;
