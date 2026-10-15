import { z } from 'zod';

export const GameModeSchema = z.enum(['MOTOR_GRIP', 'GO_NO_GO', 'SEQUENCE_MEMORY']);
export type GameMode = z.infer<typeof GameModeSchema>;
export const FruitVariantSchema = z.enum([
  'STRAWBERRY',
  'TOMATO',
  'BANANA',
  'ORANGE',
  'APPLE',
  'WATERMELON',
]);
export type FruitVariant = z.infer<typeof FruitVariantSchema>;

export const SessionStatusSchema = z.enum([
  'BINDING',
  'COUNTDOWN',
  'PLAYING',
  'PAUSED',
  'ABORTED',
  'INTERRUPTED',
  'COMPLETED',
  'SAVING',
  'SAVED',
  'SAVE_FAILED',
]);
export type SessionStatus = z.infer<typeof SessionStatusSchema>;

export const ParticipantStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);
export const ParticipantGenderSchema = z.enum(['MALE', 'FEMALE']);
export type ParticipantGender = z.infer<typeof ParticipantGenderSchema>;
export const DateOnlySchema = z.string().date();
export const DeviceInventoryStatusSchema = z.enum(['ACTIVE', 'RETIRED', 'REVOKED']);
export const DeviceConnectionStatusSchema = z.enum([
  'ONLINE',
  'OFFLINE',
  'CONNECTING',
  'NOT_AUTHORIZED',
]);
export const DeviceReadinessCodeSchema = z.enum([
  'READY',
  'OFFLINE',
  'NOT_ACTIVE',
  'NOT_COMPATIBLE',
  'RESERVED',
  'CLEANUP_PENDING',
  'NOT_READY_BATTERY_UNKNOWN',
  'NOT_READY_LOW_BATTERY',
  'DEVICE_FAULT',
]);

export const ModeLabel: Readonly<Record<GameMode, string>> = {
  MOTOR_GRIP: 'Peras Jeruk',
  GO_NO_GO: 'Go-No-Go',
  SEQUENCE_MEMORY: 'Ding Dong Dong Nusantara',
};

export const PublicIdSchema = z
  .string()
  .min(20)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/);
export const UuidSchema = z.string().uuid();
export const IsoDateSchema = z.string().datetime();
export const ParticipantReferenceSchema = z
  .string()
  .trim()
  .min(2)
  .max(64)
  .regex(/^[\p{L}\p{N}][\p{L}\p{N}._/-]*$/u);
export const DisplayNameSchema = z.string().trim().min(1).max(100);

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string().min(1).max(80),
    message: z.string().min(1).max(240),
    fields: z.record(z.string(), z.string()).optional(),
    requestId: z.string().optional(),
  }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;
