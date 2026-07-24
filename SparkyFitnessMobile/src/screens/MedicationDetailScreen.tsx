import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import Button from '../components/ui/Button';
import { useActiveWorkoutBarPadding } from '../components/ActiveWorkoutBar';
import { useHeaderActionColors } from '../hooks/useHeaderActionColors';
import {
  useMedication,
  useMedicationPens,
  useMedicationInjections,
  useMedicationTitration,
  useSerumCurve,
  useSiteSuggestion,
  useLogInjectionMutation,
  useCreatePenMutation,
  useAddTitrationStepMutation,
} from '../hooks/useMedications';
import type { RootStackScreenProps } from '../types/navigation';
import type { MedicationPen, TitrationStep } from '../types/medications';

type Props = RootStackScreenProps<'MedicationDetail'>;

// --- Injection Site Map ----------------------------------------------------

const INJECTION_SITES = [
  { id: 'abdomen-left', label: 'Abdomen L', x: 35, y: 45, region: 'abdomen', side: 'left' },
  { id: 'abdomen-right', label: 'Abdomen R', x: 65, y: 45, region: 'abdomen', side: 'right' },
  { id: 'thigh-left', label: 'Thigh L', x: 30, y: 70, region: 'thigh', side: 'left' },
  { id: 'thigh-right', label: 'Thigh R', x: 70, y: 70, region: 'thigh', side: 'right' },
  { id: 'arm-left', label: 'Arm L', x: 15, y: 40, region: 'arm', side: 'left' },
  { id: 'arm-right', label: 'Arm R', x: 85, y: 40, region: 'arm', side: 'right' },
  { id: 'buttock-left', label: 'Hip L', x: 35, y: 55, region: 'buttock', side: 'left' },
  { id: 'buttock-right', label: 'Hip R', x: 65, y: 55, region: 'buttock', side: 'right' },
];

const InjectionSitePicker: React.FC<{
  selectedSite: string | null;
  onSelect: (site: string) => void;
  restingSites?: string[];
  suggestedSite?: string;
}> = ({ selectedSite, onSelect, restingSites = [], suggestedSite }) => (
  <View className="bg-surface rounded-xl p-4">
    <Text className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">
      Injection Site
    </Text>
    {/* Simple body map using positioned dots */}
    <View className="items-center mb-3">
      <View
        className="bg-background rounded-2xl overflow-hidden"
        style={{ width: 220, height: 260, position: 'relative' }}
      >
        {/* Body outline (simplified) */}
        <View className="absolute inset-0 items-center justify-center">
          <Icon name="body" size={200} color="var(--color-border-subtle)" />
        </View>
        {/* Site dots */}
        {INJECTION_SITES.map((site) => {
          const isResting = restingSites.includes(site.id);
          const isSuggested = suggestedSite === site.id;
          const isSelected = selectedSite === site.id;
          return (
            <Pressable
              key={site.id}
              onPress={() => !isResting && onSelect(site.id)}
              disabled={isResting}
              style={{
                position: 'absolute',
                left: `${site.x}%`,
                top: `${site.y}%`,
                transform: [{ translateX: -14 }, { translateY: -14 }],
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: isSelected
                  ? 'var(--color-accent-primary)'
                  : isSuggested
                  ? '#22C55E'
                  : isResting
                  ? '#6B7280'
                  : 'var(--color-surface)',
                borderWidth: 2,
                borderColor: isSelected
                  ? '#FFFFFF'
                  : isSuggested
                  ? '#22C55E'
                  : 'var(--color-border-subtle)',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: isResting ? 0.4 : 1,
              }}
            >
              {isSelected && <Icon name="checkmark" size={14} color="#FFFFFF" />}
              {isSuggested && !isSelected && (
                <Icon name="star" size={12} color="#FFFFFF" />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
    {/* Legend */}
    <View className="flex-row flex-wrap gap-3 justify-center">
      <View className="flex-row items-center gap-1">
        <View className="w-3 h-3 rounded-full bg-accent-primary" />
        <Text className="text-[10px] text-text-muted">Selected</Text>
      </View>
      <View className="flex-row items-center gap-1">
        <View className="w-3 h-3 rounded-full bg-green-500" />
        <Text className="text-[10px] text-text-muted">Suggested</Text>
      </View>
      <View className="flex-row items-center gap-1">
        <View className="w-3 h-3 rounded-full bg-gray-400 opacity-40" />
        <Text className="text-[10px] text-text-muted">Resting</Text>
      </View>
    </View>
    {/* Site label */}
    {selectedSite && (
      <View className="mt-3 items-center">
        <Text className="text-sm font-semibold text-text-primary">
          {INJECTION_SITES.find((s) => s.id === selectedSite)?.label ?? selectedSite}
        </Text>
      </View>
    )}
  </View>
);

// --- Serum Curve Visualization ----------------------------------------------

const SerumCurveChart: React.FC<{
  data: { day: number; level: number; fraction: number }[];
  currentLevel: number | null;
  doseDays: number[];
}> = ({ data, currentLevel, doseDays }) => {
  if (data.length === 0) return null;
  const maxLevel = Math.max(...data.map((d) => d.level), 1);
  const chartWidth = 280;
  const chartHeight = 120;

  return (
    <View className="bg-surface rounded-xl p-4">
      <Text className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
        Modeled Serum Level
      </Text>
      {currentLevel != null && (
        <Text className="text-2xl font-bold text-text-primary mb-1">
          {Math.round(currentLevel * 100)}%
        </Text>
      )}
      <Text className="text-[10px] text-text-muted mb-3">
        Estimated drug level based on pharmacokinetic model
      </Text>
      {/* Simple line chart representation */}
      <View
        style={{ width: chartWidth, height: chartHeight, position: 'relative' }}
        className="self-center"
      >
        {/* Y-axis labels */}
        <Text className="absolute text-[8px] text-text-muted" style={{ left: 0, top: 0 }}>
          100%
        </Text>
        <Text className="absolute text-[8px] text-text-muted" style={{ left: 0, top: chartHeight / 2 }}>
          50%
        </Text>
        <Text className="absolute text-[8px] text-text-muted" style={{ left: 0, bottom: 0 }}>
          0%
        </Text>
        {/* Bars representing the curve */}
        <View className="flex-row items-end ml-6" style={{ width: chartWidth - 30, height: chartHeight }}>
          {data.slice(-20).map((point, index) => (
            <View
              key={index}
              style={{
                flex: 1,
                height: `${Math.max(2, (point.level / maxLevel) * 100)}%`,
                backgroundColor: doseDays.includes(point.day)
                  ? '#3B82F6'
                  : 'var(--color-accent-primary)',
                marginHorizontal: 0.5,
                borderTopLeftRadius: 2,
                borderTopRightRadius: 2,
              }}
            />
          ))}
        </View>
        {/* X-axis */}
        <View className="flex-row justify-between ml-6 mt-1">
          <Text className="text-[8px] text-text-muted">Day {data[0]?.day ?? 0}</Text>
          <Text className="text-[8px] text-text-muted">
            Day {data[data.length - 1]?.day ?? 0}
          </Text>
        </View>
      </View>
      <Text className="text-[9px] text-text-muted mt-2 text-center italic">
        Modeled pharmacokinetic estimate — not measured blood levels
      </Text>
    </View>
  );
};

// --- Pen/Vial Card ---------------------------------------------------------

const PenCard: React.FC<{
  pen: MedicationPen;
}> = ({ pen }) => {
  const remaining = (pen.doses_total ?? 0) - pen.doses_used;
  const progress = pen.doses_total ? pen.doses_used / pen.doses_total : 0;

  return (
    <View className="bg-surface rounded-xl p-3 mb-2">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center gap-2">
          <Icon
            name={pen.kind === 'pen' ? 'syringe' : 'flask'}
            size={16}
            color="var(--color-accent-primary)"
          />
          <Text className="text-sm font-semibold text-text-primary">
            {pen.label ?? `${pen.kind} #${pen.id.substring(0, 6)}`}
          </Text>
        </View>
        <View
          className={`px-2 py-0.5 rounded-full ${
            pen.status === 'sealed'
              ? 'bg-blue-500/20'
              : pen.status === 'in_use'
              ? 'bg-green-500/20'
              : 'bg-gray-300/20'
          }`}
        >
          <Text
            className={`text-[9px] font-bold ${
              pen.status === 'sealed'
                ? 'text-blue-600'
                : pen.status === 'in_use'
                ? 'text-green-600'
                : 'text-gray-500'
            }`}
          >
            {pen.status.toUpperCase().replace('_', ' ')}
          </Text>
        </View>
      </View>
      {/* Progress bar */}
      <View className="h-2 bg-progress-track rounded-full overflow-hidden mb-1">
        <View
          className="h-2 rounded-full"
          style={{
            width: `${Math.min(100, progress * 100)}%`,
            backgroundColor: remaining <= 2 ? '#EF4444' : 'var(--color-accent-primary)',
          }}
        />
      </View>
      <View className="flex-row justify-between">
        <Text className="text-[10px] text-text-muted">
          {remaining} doses remaining
        </Text>
        <Text className="text-[10px] text-text-muted">
          {pen.doses_used}/{pen.doses_total ?? '?'} used
        </Text>
      </View>
      {pen.dose_mg && (
        <Text className="text-[10px] text-text-muted mt-1">
          {pen.dose_mg} mg per dose
          {pen.concentration_mg_ml ? ` · ${pen.concentration_mg_ml} mg/mL` : ''}
        </Text>
      )}
      {pen.expiry_date && (
        <Text className="text-[10px] text-text-muted mt-0.5">
          Expires: {pen.expiry_date}
        </Text>
      )}
    </View>
  );
};

// --- Titration Step Card ---------------------------------------------------

const TitrationStepCard: React.FC<{
  step: TitrationStep;
}> = ({ step }) => (
  <View
    className={`flex-row items-center gap-3 py-3 border-b border-border-subtle ${
      step.status === 'active' ? 'bg-accent-primary/5 -mx-2 px-2 rounded-lg' : ''
    }`}
  >
    <View
      className={`w-8 h-8 rounded-full items-center justify-center ${
        step.status === 'done'
          ? 'bg-green-500'
          : step.status === 'active'
          ? 'bg-accent-primary'
          : 'bg-gray-300'
      }`}
    >
      {step.status === 'done' ? (
        <Icon name="checkmark" size={16} color="#FFFFFF" />
      ) : (
        <Text className="text-xs font-bold text-white">{step.step_order}</Text>
      )}
    </View>
    <View className="flex-1">
      <Text className="text-sm font-semibold text-text-primary">
        {step.dose_mg} {step.dose_unit || 'mg'}
      </Text>
      <Text className="text-[10px] text-text-muted">
        {step.start_date ? `From ${step.start_date}` : ''}
        {step.planned_weeks ? ` · ${step.planned_weeks} weeks` : ''}
        {step.is_taper ? ' · Taper' : ''}
      </Text>
    </View>
    <View
      className={`px-2 py-0.5 rounded-full ${
        step.status === 'done'
          ? 'bg-green-500/20'
          : step.status === 'active'
          ? 'bg-accent-primary/20'
          : 'bg-gray-200'
      }`}
    >
      <Text
        className={`text-[9px] font-bold ${
          step.status === 'done'
            ? 'text-green-600'
            : step.status === 'active'
            ? 'text-accent-primary'
            : 'text-gray-500'
        }`}
      >
        {step.status.toUpperCase()}
      </Text>
    </View>
  </View>
);

// --- Injection History Entry ------------------------------------------------

const InjectionHistoryEntry: React.FC<{
  entry: { injected_at: string; site: string | null; dose_mg: number | null; notes: string | null };
}> = ({ entry }) => (
  <View className="flex-row items-center gap-3 py-2.5 border-b border-border-subtle">
    <View className="w-8 h-8 rounded-full bg-blue-500/10 items-center justify-center">
      <Icon name="syringe" size={14} color="#3B82F6" />
    </View>
    <View className="flex-1">
      <Text className="text-sm text-text-primary">
        {entry.dose_mg ? `${entry.dose_mg} mg` : 'Injection'}
      </Text>
      <Text className="text-[10px] text-text-muted">
        {new Date(entry.injected_at).toLocaleDateString()}{' '}
        {new Date(entry.injected_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
        {entry.site ? ` · ${INJECTION_SITES.find((s) => s.id === entry.site)?.label ?? entry.site}` : ''}
      </Text>
      {entry.notes && (
        <Text className="text-[10px] text-text-muted mt-0.5">{entry.notes}</Text>
      )}
    </View>
  </View>
);

// --- Main Screen -----------------------------------------------------------

const MedicationDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const activeWorkoutBarPadding = useActiveWorkoutBarPadding('stack');
  const { backColor } = useHeaderActionColors();

  const { medicationId } = route.params;
  const [activeTab, setActiveTab] = useState<'coach' | 'pens' | 'titration' | 'log'>('coach');
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const [logDose, setLogDose] = useState('');

  // Queries
  const { data: med, isLoading: loadingMed } = useMedication(medicationId);
  const { data: pens = [] } = useMedicationPens(medicationId);
  const { data: injections = [] } = useMedicationInjections(medicationId);
  const { data: titration = [] } = useMedicationTitration(medicationId);
  const { data: serumCurve } = useSerumCurve(medicationId);
  const { data: siteSuggestion } = useSiteSuggestion(medicationId);

  // Mutations
  const logInjectionMutation = useLogInjectionMutation(medicationId);

  const handleLogInjection = useCallback(() => {
    const dose = logDose ? parseFloat(logDose) : undefined;
    logInjectionMutation.mutate(
      {
        medication_id: medicationId,
        site: selectedSite ?? undefined,
        dose_mg: dose,
        deduct_pen: true,
      },
      {
        onSuccess: () => {
          setSelectedSite(null);
          setLogDose('');
          Alert.alert('Logged', 'Injection logged successfully.');
        },
        onError: () => {
          Alert.alert('Error', 'Failed to log injection.');
        },
      }
    );
  }, [medicationId, selectedSite, logDose, logInjectionMutation]);

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
      <Text className="flex-1 text-center text-lg font-semibold text-text-primary" numberOfLines={1}>
        {med?.display_name || med?.name || 'Medication'}
      </Text>
      <View style={{ width: 22 }} />
    </View>
  );

  if (loadingMed) {
    return (
      <View className="flex-1 bg-background items-center justify-center" style={{ paddingTop: insets.top }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!med) {
    return (
      <View className="flex-1 bg-background items-center justify-center" style={{ paddingTop: insets.top }}>
        {header}
        <Text className="text-text-muted">Medication not found.</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {header}

      {/* Tab Bar */}
      <View className="flex-row justify-center gap-1 px-4 mb-3">
        {[
          { key: 'coach' as const, label: 'GLP-1', icon: 'pulse' },
          { key: 'pens' as const, label: 'Pens', icon: 'flask' },
          { key: 'titration' as const, label: 'Titration', icon: 'trending-up' },
          { key: 'log' as const, label: 'Log', icon: 'time' },
        ].map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            className={`flex-row items-center gap-1 px-3 py-2 rounded-full ${
              activeTab === tab.key ? 'bg-surface shadow-sm' : ''
            }`}
          >
            <Icon
              name={tab.icon}
              size={14}
              color={activeTab === tab.key ? 'var(--color-text-primary)' : 'var(--color-text-muted)'}
            />
            <Text
              className={`text-[10px] font-semibold ${
                activeTab === tab.key ? 'text-text-primary' : 'text-text-muted'
              }`}
            >
              {tab.label}
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
        {/* GLP-1 Coach Tab */}
        {activeTab === 'coach' && (
          <View className="gap-4">
            {/* Site Suggestion */}
            {siteSuggestion && (
              <View className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 flex-row items-center gap-2">
                <Icon name="bulb" size={18} color="#3B82F6" />
                <View className="flex-1">
                  <Text className="text-xs font-semibold text-blue-600">Suggested Site</Text>
                  <Text className="text-xs text-blue-500/80">
                    {INJECTION_SITES.find((s) => s.id === siteSuggestion.suggestedSiteId)?.label ?? 'Rotate injection site'}
                    {siteSuggestion.restDays > 0 ? ` (${siteSuggestion.restDays}d rest window)` : ''}
                  </Text>
                </View>
              </View>
            )}

            {/* Injection Site Picker */}
            <InjectionSitePicker
              selectedSite={selectedSite}
              onSelect={setSelectedSite}
              restingSites={siteSuggestion?.restingSiteIds}
              suggestedSite={siteSuggestion?.suggestedSiteId}
            />

            {/* Log Injection */}
            <View className="bg-surface rounded-xl p-4">
              <Text className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">
                Log Injection
              </Text>
              <View className="flex-row gap-2 mb-3">
                <TextInput
                  value={logDose}
                  onChangeText={setLogDose}
                  placeholder="Dose (mg)"
                  placeholderTextColor="var(--color-text-muted)"
                  keyboardType="decimal-pad"
                  className="flex-1 bg-background rounded-lg px-3 py-2.5 text-text-primary text-sm"
                />
                <Button
                  variant="primary"
                  onPress={handleLogInjection}
                  disabled={logInjectionMutation.isPending}
                  className="px-5"
                >
                  {logInjectionMutation.isPending ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text className="text-white font-semibold text-sm">Log</Text>
                  )}
                </Button>
              </View>
              {selectedSite && (
                <Text className="text-xs text-text-muted">
                  Site: {INJECTION_SITES.find((s) => s.id === selectedSite)?.label}
                </Text>
              )}
            </View>

            {/* Serum Curve */}
            {serumCurve && serumCurve.curve.length > 0 && (
              <SerumCurveChart
                data={serumCurve.curve}
                currentLevel={serumCurve.currentLevelFraction}
                doseDays={serumCurve.doseDays}
              />
            )}

            {/* Disclaimer */}
            <View className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex-row items-start gap-2">
              <Icon name="warning" size={16} color="#F59E0B" />
              <Text className="text-[10px] text-amber-700 flex-1">
                {serumCurve?.disclaimer ?? 'Serum level is a pharmacokinetic model estimate, not a measured blood level. Consult your healthcare provider for medical decisions.'}
              </Text>
            </View>
          </View>
        )}

        {/* Pens Tab */}
        {activeTab === 'pens' && (
          <View className="gap-4">
            <Text className="text-xs font-semibold text-text-muted uppercase tracking-wide">
              Pen & Vial Inventory ({pens.length})
            </Text>
            {pens.length === 0 ? (
              <View className="bg-surface rounded-xl p-6 items-center">
                <Icon name="flask" size={40} color="var(--color-text-muted)" />
                <Text className="text-sm text-text-muted mt-3 text-center">
                  No pens/vials tracked yet.{'\n'}Add one from the web interface.
                </Text>
              </View>
            ) : (
              pens.map((pen) => <PenCard key={pen.id} pen={pen} />)
            )}
          </View>
        )}

        {/* Titration Tab */}
        {activeTab === 'titration' && (
          <View className="gap-4">
            <Text className="text-xs font-semibold text-text-muted uppercase tracking-wide">
              Titration Plan ({titration.length} steps)
            </Text>
            {titration.length === 0 ? (
              <View className="bg-surface rounded-xl p-6 items-center">
                <Icon name="trending-up" size={40} color="var(--color-text-muted)" />
                <Text className="text-sm text-text-muted mt-3 text-center">
                  No titration plan set up yet.{'\n'}Add steps from the web interface.
                </Text>
              </View>
            ) : (
              <View className="bg-surface rounded-xl px-4">
                {titration.map((step) => (
                  <TitrationStepCard key={step.id} step={step} />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Log Tab */}
        {activeTab === 'log' && (
          <View className="gap-4">
            <Text className="text-xs font-semibold text-text-muted uppercase tracking-wide">
              Injection History ({injections.length})
            </Text>
            {injections.length === 0 ? (
              <View className="bg-surface rounded-xl p-6 items-center">
                <Icon name="syringe" size={40} color="var(--color-text-muted)" />
                <Text className="text-sm text-text-muted mt-3 text-center">
                  No injections logged yet.
                </Text>
              </View>
            ) : (
              <View className="bg-surface rounded-xl px-4">
                {injections.map((injection) => (
                  <InjectionHistoryEntry key={injection.id} entry={injection} />
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default MedicationDetailScreen;
