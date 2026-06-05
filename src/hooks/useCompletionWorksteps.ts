import { useCallback, useEffect, useState } from 'react';
import { getDataAppStorage } from '@corva/ui/clients/jsonApi';

const PROVIDER = 'ypf';
const COLLECTION = 'completion.worksteps';
const DEFAULT_COMPANY_ID = 375;

interface WorkStepData {
  step_no: string;
  planned_duration: number | null;
  planned_cost: number | null;
  actual_duration: number | null;
  actual_cost: number | null;
  time_from: number;
  time_to: number;
  idrec: string;
}

export interface WorkStepRecord {
  _id: string;
  company_id: number;
  asset_id: number;
  version: number;
  provider: string;
  collection: string;
  data: WorkStepData;
  timestamp: number;
}

export interface UseCompletionWorkstepsParams {
  asset_id?: number;
  company_id?: number;
  enabled?: boolean;
}

export interface UseCompletionWorkstepsResult {
  workSteps: WorkStepRecord[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const fetchWorkSteps = async ({
  asset_id,
  company_id,
}: Required<Pick<UseCompletionWorkstepsParams, 'asset_id'>> &
  Pick<UseCompletionWorkstepsParams, 'company_id'>): Promise<WorkStepRecord[]> => {
  const response = await getDataAppStorage(PROVIDER, COLLECTION, {
    limit: 1000,
    skip: 0,
    sort: JSON.stringify({ timestamp: -1 }),
    query: JSON.stringify({
      asset_id,
      company_id: company_id ?? DEFAULT_COMPANY_ID,
    }),
  });

  return Array.isArray(response) ? response : [];
};

const useCompletionWorksteps = ({
  asset_id,
  company_id,
  enabled = true,
}: UseCompletionWorkstepsParams): UseCompletionWorkstepsResult => {
  const [workSteps, setWorkSteps] = useState<WorkStepRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    if (!asset_id || !enabled) {
      setWorkSteps([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await fetchWorkSteps({ asset_id, company_id });
      setWorkSteps(data);
    } catch (unknownError) {
      setWorkSteps([]);
      setError(unknownError instanceof Error ? unknownError : new Error('Failed to load worksteps'));
    } finally {
      setLoading(false);
    }
  }, [asset_id, company_id, enabled]);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      if (!asset_id || !enabled) {
        setWorkSteps([]);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await fetchWorkSteps({ asset_id, company_id });
        if (isMounted) {
          setWorkSteps(data);
        }
      } catch (unknownError) {
        if (isMounted) {
          setWorkSteps([]);
          setError(
            unknownError instanceof Error ? unknownError : new Error('Failed to load worksteps')
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    run();

    return () => {
      isMounted = false;
    };
  }, [asset_id, company_id, enabled]);

  return {
    workSteps,
    loading,
    error,
    refetch,
  };
};

export default useCompletionWorksteps;
