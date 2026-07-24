import { apiFetch } from './apiClient';
import type {
  Medication,
  MedicationDetail,
  MedicationSchedule,
  MedicationPen,
  InjectionEntry,
  TitrationStep,
  SerumCurveResponse,
  SiteSuggestionResponse,
  ListMedicationsOptions,
  LogInjectionInput,
  UpdateInjectionInput,
  UpdateTitrationStepInput,
  MedicationEntry,
  CreateMedicationEntryInput,
  UpdateMedicationEntryInput,
  ListMedicationEntriesOptions,
} from '../../types/medications';

const SERVICE_NAME = 'Medications API';

// --- Medications -----------------------------------------------------------

export const listMedications = async (
  opts?: ListMedicationsOptions
): Promise<Medication[]> => {
  const params = new URLSearchParams();
  if (opts?.glp1Only != null) params.set('glp1Only', String(opts.glp1Only));
  if (opts?.activeOnly != null) params.set('activeOnly', String(opts.activeOnly));
  const qs = params.toString();
  return apiFetch<Medication[]>({
    endpoint: `/api/v2/medications${qs ? `?${qs}` : ''}`,
    serviceName: SERVICE_NAME,
    operation: 'list medications',
  });
};

export const getMedication = async (id: string): Promise<MedicationDetail> => {
  return apiFetch<MedicationDetail>({
    endpoint: `/api/v2/medications/${encodeURIComponent(id)}`,
    serviceName: SERVICE_NAME,
    operation: 'get medication',
  });
};

export const createMedication = async (
  body: Partial<Medication> & { name: string }
): Promise<Medication> => {
  return apiFetch<Medication>({
    endpoint: '/api/v2/medications',
    serviceName: SERVICE_NAME,
    operation: 'create medication',
    method: 'POST',
    body,
  });
};

export const updateMedication = async (
  id: string,
  body: Partial<Medication>
): Promise<Medication> => {
  return apiFetch<Medication>({
    endpoint: `/api/v2/medications/${encodeURIComponent(id)}`,
    serviceName: SERVICE_NAME,
    operation: 'update medication',
    method: 'PUT',
    body,
  });
};

export const deleteMedication = async (id: string): Promise<void> => {
  return apiFetch<void>({
    endpoint: `/api/v2/medications/${encodeURIComponent(id)}`,
    serviceName: SERVICE_NAME,
    operation: 'delete medication',
    method: 'DELETE',
  });
};

// --- Medication Entries (Adherence) ---------------------------------------

export const listMedicationEntries = async (
  opts?: ListMedicationEntriesOptions
): Promise<MedicationEntry[]> => {
  const params = new URLSearchParams();
  if (opts?.fromDate) params.set('fromDate', opts.fromDate);
  if (opts?.toDate) params.set('toDate', opts.toDate);
  if (opts?.medicationId) params.set('medicationId', opts.medicationId);
  const qs = params.toString();
  return apiFetch<MedicationEntry[]>({
    endpoint: `/api/v2/medications/entries${qs ? `?${qs}` : ''}`,
    serviceName: SERVICE_NAME,
    operation: 'list medication entries',
  });
};

export const createMedicationEntry = async (
  body: CreateMedicationEntryInput
): Promise<MedicationEntry> => {
  return apiFetch<MedicationEntry>({
    endpoint: '/api/v2/medications/entries',
    serviceName: SERVICE_NAME,
    operation: 'create medication entry',
    method: 'POST',
    body,
  });
};

export const updateMedicationEntry = async (
  id: string,
  body: UpdateMedicationEntryInput
): Promise<MedicationEntry> => {
  return apiFetch<MedicationEntry>({
    endpoint: `/api/v2/medications/entries/${encodeURIComponent(id)}`,
    serviceName: SERVICE_NAME,
    operation: 'update medication entry',
    method: 'PUT',
    body,
  });
};

export const deleteMedicationEntry = async (id: string): Promise<void> => {
  return apiFetch<void>({
    endpoint: `/api/v2/medications/entries/${encodeURIComponent(id)}`,
    serviceName: SERVICE_NAME,
    operation: 'delete medication entry',
    method: 'DELETE',
  });
};

// --- Schedules -------------------------------------------------------------

export const addSchedule = async (
  medicationId: string,
  body: Partial<MedicationSchedule> & { schedule_type_id: string }
): Promise<MedicationSchedule> => {
  return apiFetch<MedicationSchedule>({
    endpoint: `/api/v2/medications/${encodeURIComponent(medicationId)}/schedules`,
    serviceName: SERVICE_NAME,
    operation: 'add schedule',
    method: 'POST',
    body,
  });
};

export const deleteSchedule = async (id: string): Promise<void> => {
  return apiFetch<void>({
    endpoint: `/api/v2/medications/schedules/${encodeURIComponent(id)}`,
    serviceName: SERVICE_NAME,
    operation: 'delete schedule',
    method: 'DELETE',
  });
};

// --- Pens / vials ----------------------------------------------------------

export const listPens = async (
  medicationId: string
): Promise<MedicationPen[]> => {
  return apiFetch<MedicationPen[]>({
    endpoint: `/api/v2/medications/${encodeURIComponent(medicationId)}/pens`,
    serviceName: SERVICE_NAME,
    operation: 'list pens',
  });
};

export const createPen = async (
  medicationId: string,
  body: Partial<MedicationPen>
): Promise<MedicationPen> => {
  return apiFetch<MedicationPen>({
    endpoint: `/api/v2/medications/${encodeURIComponent(medicationId)}/pens`,
    serviceName: SERVICE_NAME,
    operation: 'create pen',
    method: 'POST',
    body,
  });
};

export const updatePen = async (
  id: string,
  body: Partial<MedicationPen>
): Promise<MedicationPen> => {
  return apiFetch<MedicationPen>({
    endpoint: `/api/v2/medications/pens/${encodeURIComponent(id)}`,
    serviceName: SERVICE_NAME,
    operation: 'update pen',
    method: 'PUT',
    body,
  });
};

export const deletePen = async (id: string): Promise<void> => {
  return apiFetch<void>({
    endpoint: `/api/v2/medications/pens/${encodeURIComponent(id)}`,
    serviceName: SERVICE_NAME,
    operation: 'delete pen',
    method: 'DELETE',
  });
};

// --- Injections ------------------------------------------------------------

export const listInjections = async (
  medicationId: string
): Promise<InjectionEntry[]> => {
  return apiFetch<InjectionEntry[]>({
    endpoint: `/api/v2/medications/${encodeURIComponent(medicationId)}/injections`,
    serviceName: SERVICE_NAME,
    operation: 'list injections',
  });
};

export const logInjection = async (
  body: LogInjectionInput
): Promise<InjectionEntry & { pen: MedicationPen | null }> => {
  return apiFetch<InjectionEntry & { pen: MedicationPen | null }>({
    endpoint: '/api/v2/medications/injections',
    serviceName: SERVICE_NAME,
    operation: 'log injection',
    method: 'POST',
    body,
  });
};

export const updateInjection = async (
  id: string,
  body: UpdateInjectionInput
): Promise<InjectionEntry> => {
  return apiFetch<InjectionEntry>({
    endpoint: `/api/v2/medications/injections/${encodeURIComponent(id)}`,
    serviceName: SERVICE_NAME,
    operation: 'update injection',
    method: 'PUT',
    body,
  });
};

export const deleteInjection = async (id: string): Promise<void> => {
  return apiFetch<void>({
    endpoint: `/api/v2/medications/injections/${encodeURIComponent(id)}`,
    serviceName: SERVICE_NAME,
    operation: 'delete injection',
    method: 'DELETE',
  });
};

// --- Titration / taper steps -----------------------------------------------

export const listTitration = async (
  medicationId: string
): Promise<TitrationStep[]> => {
  return apiFetch<TitrationStep[]>({
    endpoint: `/api/v2/medications/${encodeURIComponent(medicationId)}/titration`,
    serviceName: SERVICE_NAME,
    operation: 'list titration steps',
  });
};

export const addTitrationStep = async (
  medicationId: string,
  body: Partial<TitrationStep> & { dose_mg: number }
): Promise<TitrationStep> => {
  return apiFetch<TitrationStep>({
    endpoint: `/api/v2/medications/${encodeURIComponent(medicationId)}/titration`,
    serviceName: SERVICE_NAME,
    operation: 'add titration step',
    method: 'POST',
    body,
  });
};

export const updateTitrationStep = async (
  id: string,
  body: UpdateTitrationStepInput
): Promise<TitrationStep> => {
  return apiFetch<TitrationStep>({
    endpoint: `/api/v2/medications/titration/${encodeURIComponent(id)}`,
    serviceName: SERVICE_NAME,
    operation: 'update titration step',
    method: 'PUT',
    body,
  });
};

export const deleteTitrationStep = async (id: string): Promise<void> => {
  return apiFetch<void>({
    endpoint: `/api/v2/medications/titration/${encodeURIComponent(id)}`,
    serviceName: SERVICE_NAME,
    operation: 'delete titration step',
    method: 'DELETE',
  });
};

// --- GLP-1 derived data ----------------------------------------------------

export const getSerumCurve = async (
  medicationId: string,
  query?: { fromDay?: number; toDay?: number; stepDays?: number }
): Promise<SerumCurveResponse> => {
  const params = new URLSearchParams();
  if (query?.fromDay != null) params.set('fromDay', String(query.fromDay));
  if (query?.toDay != null) params.set('toDay', String(query.toDay));
  if (query?.stepDays != null) params.set('stepDays', String(query.stepDays));
  const qs = params.toString();
  return apiFetch<SerumCurveResponse>({
    endpoint: `/api/v2/medications/${encodeURIComponent(medicationId)}/glp1/serum-curve${qs ? `?${qs}` : ''}`,
    serviceName: SERVICE_NAME,
    operation: 'get serum curve',
  });
};

export const getSiteSuggestion = async (
  medicationId: string
): Promise<SiteSuggestionResponse> => {
  return apiFetch<SiteSuggestionResponse>({
    endpoint: `/api/v2/medications/${encodeURIComponent(medicationId)}/glp1/site-suggestion`,
    serviceName: SERVICE_NAME,
    operation: 'get site suggestion',
  });
};
