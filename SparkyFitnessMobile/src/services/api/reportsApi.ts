import { apiFetch } from './apiClient';

export interface ReportsData {
  nutritionSummary: {
    avgCalories: number;
    avgProtein: number;
    avgCarbs: number;
    avgFat: number;
    totalDays: number;
  };
  exerciseSummary: {
    totalMinutes: number;
    totalCalories: number;
    totalSessions: number;
    avgMinutesPerDay: number;
  };
  measurementTrends: MeasurementTrendPoint[];
  medicationSummary?: {
    totalDoses: number;
    takenDoses: number;
    missedDoses: number;
    adherenceRate: number;
  };
}

export interface MeasurementTrendPoint {
  date: string;
  weight?: number | null;
  body_fat?: number | null;
  waist?: number | null;
  steps?: number | null;
  [key: string]: string | number | null | undefined;
}

export interface NutritionTrendPoint {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  dietary_fiber: number;
  [customNutrient: string]: string | number;
}

const SERVICE_NAME = 'Reports API';

export const fetchReportsData = async (
  startDate: string,
  endDate: string
): Promise<ReportsData> => {
  return apiFetch<ReportsData>({
    endpoint: `/api/reports?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
    serviceName: SERVICE_NAME,
    operation: 'fetch reports data',
  });
};

export const fetchNutritionTrends = async (
  startDate: string,
  endDate: string
): Promise<NutritionTrendPoint[]> => {
  return apiFetch<NutritionTrendPoint[]>({
    endpoint: `/api/reports/mini-nutrition-trends?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
    serviceName: SERVICE_NAME,
    operation: 'fetch nutrition trends',
  });
};

export const fetchMedicationReport = async (
  startDate: string,
  endDate: string
): Promise<MedicationReportData[]> => {
  return apiFetch<MedicationReportData[]>({
    endpoint: `/api/v2/reports/medications?fromDate=${encodeURIComponent(startDate)}&toDate=${encodeURIComponent(endDate)}`,
    serviceName: SERVICE_NAME,
    operation: 'fetch medication report',
  });
};

export interface MedicationReportData {
  medication_id: string;
  medication_name: string;
  total_doses: number;
  taken_doses: number;
  missed_doses: number;
  adherence_rate: number;
  last_taken?: string;
}
