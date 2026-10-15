import { useQuery } from '@tanstack/react-query';
import { getDevices } from './devices.ts';
import { QUERY_KEYS } from '@/constants/query-keys.ts';

export function useQueryGetDevices(enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.devices.all,
    queryFn: getDevices,
    enabled,
  });
}
