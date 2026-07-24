import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as medicationsApi from '../services/api/medicationsApi';
import type {
  Medication,
  ListMedicationsOptions,
  LogInjectionInput,
  UpdateInjectionInput,
  UpdateTitrationStepInput,
  MedicationPen,
  MedicationSchedule,
  TitrationStep,
  CreateMedicationEntryInput,
  UpdateMedicationEntryInput,
  ListMedicationEntriesOptions,
} from '../types/medications';

// --- Query Keys ------------------------------------------------------------

const medKeys = {
  all: ['medications'] as const,
  list: (opts?: ListMedicationsOptions) =>
    ['medications', opts ?? {}] as const,
  detail: (id: string) => ['medications', 'detail', id] as const,
  pens: (medId: string) => ['medication-pens', medId] as const,
  injections: (medId: string) => ['medication-injections', medId] as const,
  titration: (medId: string) => ['medication-titration', medId] as const,
  serumCurve: (medId: string) => ['glp1-serum-curve', medId] as const,
  siteSuggestion: (medId: string) =>
    ['glp1-site-suggestion', medId] as const,
  entries: (opts?: ListMedicationEntriesOptions) =>
    ['medication-entries', opts ?? {}] as const,
};

// --- Queries ----------------------------------------------------------------

export const useMedications = (opts?: ListMedicationsOptions) =>
  useQuery({
    queryKey: medKeys.list(opts),
    queryFn: () => medicationsApi.listMedications(opts),
    meta: { errorMessage: 'Failed to load medications.' },
  });

export const useMedication = (id: string) =>
  useQuery({
    queryKey: medKeys.detail(id),
    queryFn: () => medicationsApi.getMedication(id),
    enabled: !!id,
    meta: { errorMessage: 'Failed to load medication.' },
  });

export const useMedicationPens = (medId: string) =>
  useQuery({
    queryKey: medKeys.pens(medId),
    queryFn: () => medicationsApi.listPens(medId),
    enabled: !!medId,
    meta: { errorMessage: 'Failed to load pens/vials.' },
  });

export const useMedicationInjections = (medId: string) =>
  useQuery({
    queryKey: medKeys.injections(medId),
    queryFn: () => medicationsApi.listInjections(medId),
    enabled: !!medId,
    meta: { errorMessage: 'Failed to load injections.' },
  });

export const useMedicationTitration = (medId: string) =>
  useQuery({
    queryKey: medKeys.titration(medId),
    queryFn: () => medicationsApi.listTitration(medId),
    enabled: !!medId,
    meta: { errorMessage: 'Failed to load titration plan.' },
  });

export const useSerumCurve = (medId: string) =>
  useQuery({
    queryKey: medKeys.serumCurve(medId),
    queryFn: () => medicationsApi.getSerumCurve(medId),
    enabled: !!medId,
    meta: { errorMessage: 'Failed to load serum curve.' },
  });

export const useSiteSuggestion = (medId: string) =>
  useQuery({
    queryKey: medKeys.siteSuggestion(medId),
    queryFn: () => medicationsApi.getSiteSuggestion(medId),
    enabled: !!medId,
    meta: { errorMessage: 'Failed to load site suggestion.' },
  });

export const useMedicationEntries = (opts?: ListMedicationEntriesOptions) =>
  useQuery({
    queryKey: medKeys.entries(opts),
    queryFn: () => medicationsApi.listMedicationEntries(opts),
    meta: { errorMessage: 'Failed to load logged doses.' },
  });

// --- Mutations --------------------------------------------------------------

export const useCreateMedicationMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Medication> & { name: string }) =>
      medicationsApi.createMedication(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: medKeys.all });
    },
    meta: {
      errorMessage: 'Could not add medication.',
      successMessage: 'Medication added.',
    },
  });
};

export const useUpdateMedicationMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Medication> }) =>
      medicationsApi.updateMedication(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: medKeys.all });
    },
    meta: {
      errorMessage: 'Could not update medication.',
      successMessage: 'Medication updated.',
    },
  });
};

export const useDeleteMedicationMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => medicationsApi.deleteMedication(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: medKeys.all });
    },
    meta: {
      errorMessage: 'Could not remove medication.',
      successMessage: 'Medication removed.',
    },
  });
};

// --- Entry Mutations -------------------------------------------------------

export const useCreateMedicationEntryMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateMedicationEntryInput) =>
      medicationsApi.createMedicationEntry(body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['medication-entries'],
        refetchType: 'all',
      });
      queryClient.invalidateQueries({ queryKey: medKeys.all });
    },
    meta: {
      errorMessage: 'Could not log dose.',
      successMessage: 'Dose logged.',
    },
  });
};

export const useUpdateMedicationEntryMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: UpdateMedicationEntryInput;
    }) => medicationsApi.updateMedicationEntry(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['medication-entries'],
        refetchType: 'all',
      });
    },
    meta: {
      errorMessage: 'Could not update logged dose.',
      successMessage: 'Logged dose updated.',
    },
  });
};

export const useDeleteMedicationEntryMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => medicationsApi.deleteMedicationEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['medication-entries'],
        refetchType: 'all',
      });
      queryClient.invalidateQueries({ queryKey: medKeys.all });
    },
    meta: {
      errorMessage: 'Could not remove logged dose.',
      successMessage: 'Logged dose removed.',
    },
  });
};

// --- Schedule Mutations ----------------------------------------------------

export const useAddScheduleMutation = (medId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      body: Partial<MedicationSchedule> & { schedule_type_id: string }
    ) => medicationsApi.addSchedule(medId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: medKeys.all });
      queryClient.invalidateQueries({ queryKey: medKeys.detail(medId) });
    },
    meta: {
      errorMessage: 'Could not add schedule.',
      successMessage: 'Schedule added.',
    },
  });
};

export const useDeleteScheduleMutation = (medId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => medicationsApi.deleteSchedule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: medKeys.all });
      queryClient.invalidateQueries({ queryKey: medKeys.detail(medId) });
    },
    meta: {
      errorMessage: 'Could not delete schedule.',
      successMessage: 'Schedule deleted.',
    },
  });
};

// --- Pen Mutations ---------------------------------------------------------

export const useCreatePenMutation = (medId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<MedicationPen>) =>
      medicationsApi.createPen(medId, body),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: medKeys.pens(medId) }),
    meta: {
      errorMessage: 'Could not add pen/vial.',
      successMessage: 'Pen/vial added.',
    },
  });
};

export const useUpdatePenMutation = (medId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<MedicationPen> }) =>
      medicationsApi.updatePen(id, body),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: medKeys.pens(medId) }),
    meta: {
      errorMessage: 'Could not update pen/vial.',
      successMessage: 'Pen/vial updated.',
    },
  });
};

export const useDeletePenMutation = (medId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => medicationsApi.deletePen(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: medKeys.pens(medId) }),
    meta: {
      errorMessage: 'Could not remove pen/vial.',
      successMessage: 'Pen/vial removed.',
    },
  });
};

// --- Injection Mutations ---------------------------------------------------

export const useLogInjectionMutation = (medId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: LogInjectionInput) =>
      medicationsApi.logInjection(body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: medKeys.injections(medId),
      });
      queryClient.invalidateQueries({ queryKey: medKeys.pens(medId) });
      queryClient.invalidateQueries({ queryKey: medKeys.serumCurve(medId) });
      queryClient.invalidateQueries({
        queryKey: medKeys.siteSuggestion(medId),
      });
      queryClient.invalidateQueries({
        queryKey: ['medication-entries'],
        refetchType: 'all',
      });
    },
    meta: {
      errorMessage: 'Could not log injection.',
      successMessage: 'Injection logged.',
    },
  });
};

export const useUpdateInjectionMutation = (medId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: UpdateInjectionInput;
    }) => medicationsApi.updateInjection(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: medKeys.injections(medId),
      });
      queryClient.invalidateQueries({ queryKey: medKeys.serumCurve(medId) });
      queryClient.invalidateQueries({
        queryKey: medKeys.siteSuggestion(medId),
      });
      queryClient.invalidateQueries({
        queryKey: ['medication-entries'],
        refetchType: 'all',
      });
    },
    meta: {
      errorMessage: 'Could not update injection entry.',
      successMessage: 'Injection entry updated.',
    },
  });
};

export const useDeleteInjectionMutation = (medId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => medicationsApi.deleteInjection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: medKeys.injections(medId),
      });
      queryClient.invalidateQueries({ queryKey: medKeys.pens(medId) });
      queryClient.invalidateQueries({ queryKey: medKeys.serumCurve(medId) });
      queryClient.invalidateQueries({
        queryKey: medKeys.siteSuggestion(medId),
      });
      queryClient.invalidateQueries({
        queryKey: ['medication-entries'],
        refetchType: 'all',
      });
    },
    meta: {
      errorMessage: 'Could not remove injection entry.',
      successMessage: 'Injection entry removed.',
    },
  });
};

// --- Titration Mutations ---------------------------------------------------

export const useAddTitrationStepMutation = (medId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<TitrationStep> & { dose_mg: number }) =>
      medicationsApi.addTitrationStep(medId, body),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: medKeys.titration(medId) }),
    meta: {
      errorMessage: 'Could not add titration step.',
      successMessage: 'Titration step added.',
    },
  });
};

export const useUpdateTitrationStepMutation = (medId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: UpdateTitrationStepInput;
    }) => medicationsApi.updateTitrationStep(id, body),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: medKeys.titration(medId) }),
    meta: {
      errorMessage: 'Could not update titration step.',
      successMessage: 'Titration step updated.',
    },
  });
};

export const useDeleteTitrationStepMutation = (medId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => medicationsApi.deleteTitrationStep(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: medKeys.titration(medId) }),
    meta: {
      errorMessage: 'Could not remove titration step.',
    },
  });
};

// --- Med-agnostic injection mutations for Log tab -------------------------

export const useLogGlpInjectionEntryMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: LogInjectionInput) =>
      medicationsApi.logInjection(body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['medication-injections'],
      });
      queryClient.invalidateQueries({ queryKey: ['medication-pens'] });
      queryClient.invalidateQueries({ queryKey: ['glp1-serum-curve'] });
      queryClient.invalidateQueries({ queryKey: ['glp1-site-suggestion'] });
      queryClient.invalidateQueries({
        queryKey: ['medication-entries'],
        refetchType: 'all',
      });
      queryClient.invalidateQueries({ queryKey: medKeys.all });
    },
    meta: {
      errorMessage: 'Could not log injection.',
      successMessage: 'Injection logged.',
    },
  });
};

export const useDeleteInjectionEntryMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => medicationsApi.deleteInjection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['medication-injections'],
      });
      queryClient.invalidateQueries({ queryKey: ['medication-pens'] });
      queryClient.invalidateQueries({ queryKey: ['glp1-serum-curve'] });
      queryClient.invalidateQueries({ queryKey: ['glp1-site-suggestion'] });
      queryClient.invalidateQueries({
        queryKey: ['medication-entries'],
        refetchType: 'all',
      });
      queryClient.invalidateQueries({ queryKey: medKeys.all });
    },
    meta: {
      errorMessage: 'Could not remove injection entry.',
      successMessage: 'Injection entry removed.',
    },
  });
};
