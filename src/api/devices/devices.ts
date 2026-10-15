import { DeviceDtoSchema, type DeviceDto } from '@/schemas';
import { z } from 'zod';
import { apiGet } from '@/config';
import { API_ENDPOINTS } from '@/constants';

const DevicesSchema = z.array(DeviceDtoSchema);

export function getDevices(): Promise<DeviceDto[]> {
  return apiGet(API_ENDPOINTS.devices.list, DevicesSchema);
}
