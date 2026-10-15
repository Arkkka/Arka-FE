import { z } from 'zod';
import { DisplayNameSchema, FruitVariantSchema, GameModeSchema, SessionStatusSchema, UuidSchema } from './common.ts';
import { GameResultDtoSchema, PreparationStateSchema, SessionCommandSchema } from './browser.ts';

const ClientBaseSchema = z.object({ protocolVersion: z.literal(1), messageId: UuidSchema });
export const AppSetupSubscribeSchema = ClientBaseSchema.extend({
  type: z.literal('app.setup.subscribe'),
  payload: z.object({ setupId: UuidSchema, cursor: z.number().int().nonnegative().optional() }),
});
export const AppSubscribeSchema = ClientBaseSchema.extend({
  type: z.literal('app.subscribe'),
  payload: z.object({ sessionId: UuidSchema, cursor: z.number().int().nonnegative().optional() }),
});
export const AppSessionCommandSchema = ClientBaseSchema.extend({
  type: z.literal('session.command'),
  payload: z.object({ sessionId: UuidSchema, command: SessionCommandSchema }),
});
export const AppClientMessageSchema = z.discriminatedUnion('type', [
  AppSetupSubscribeSchema,
  AppSubscribeSchema,
  AppSessionCommandSchema,
]);
export type AppClientMessage = z.infer<typeof AppClientMessageSchema>;

export const SetupVisualSchema = z.object({
  state: PreparationStateSchema,
  instruction: z.string(),
  setupBound: z.boolean(),
  checkedButton: z.enum(['RED', 'GREEN', 'BLUE', 'YELLOW', 'MULTIPLE']).nullable(),
  buttonCheckComplete: z.boolean(),
  gripPercent: z.number().min(0).max(100).optional(),
  sensorRaw: z.number().int().min(0).max(4095).optional(),
  baselineSampleCount: z.number().int().nonnegative().optional(),
  activeSampleCount: z.number().int().nonnegative().optional(),
  pressed: z.boolean().optional(),
  practiceStimulus: z.enum(['WAYANG', 'BATIK', 'CANDI', 'MONAS', 'ANGKLUNG']).optional(),
  practiceFeedback: z.enum(['CORRECT', 'TRY_AGAIN', 'WAIT']).optional(),
  practiceCompleted: z.boolean(),
  canStart: z.boolean(),
});
export const SessionVisualSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('MOTOR_GRIP'),
    gripPercent: z.number().min(0).max(100),
    kilograms: z.number().min(0).max(120).optional().default(0),
    holdProgressMs: z.number().int().min(0).max(5000),
    activeElapsedMs: z.number().int().min(0).max(30000),
    remainingMs: z.number().int().min(0).max(30000).optional().default(30000),
    gripSamples: z.array(z.object({ elapsedSecond: z.number().int().min(1).max(30), gripPercent: z.number().min(0).max(100), kilograms: z.number().min(0).max(120) })).max(30).optional().default([]),
    fruitVariant: FruitVariantSchema,
    targetKilograms: z.number().positive().max(120),
    averageKilograms: z.number().min(0).max(120),
    timeAtOrAboveTargetMs: z.number().int().min(0).max(30000),
    message: z.string(),
  }),
  z.object({
    mode: z.literal('GO_NO_GO'),
    trialNumber: z.number().int().min(1).max(10),
    questionNumber: z.number().int().min(1).max(10),
    totalQuestions: z.literal(10),
    level: z.number().int().min(1).max(2),
    levelTrialNumber: z.number().int().min(1).max(5),
    levelQuestionNumber: z.number().int().min(1).max(5),
    levelTrialCount: z.literal(5),
    totalLevels: z.literal(2),
    targetStimulus: z.enum(['WAYANG', 'BATIK', 'CANDI', 'MONAS', 'ANGKLUNG']),
    targetAssetIndex: z.number().int().min(0).max(3),
    stimulus: z.enum(['WAYANG', 'BATIK', 'CANDI', 'MONAS', 'ANGKLUNG']).nullable(),
    assetIndex: z.number().int().min(0).max(3).nullable(),
    candidateIndex: z.number().int().nonnegative().nullable(),
    candidateNumber: z.number().int().positive().nullable(),
    targetAppearance: z.union([z.literal(1), z.literal(2)]).nullable(),
    phase: z.enum(['TARGET_PREVIEW', 'TRANSITION', 'STIMULUS']),
    activeElapsedMs: z.number().int().min(0).max(180000),
    remainingMs: z.number().int().min(0).max(180000),
    feedback: z.null(),
    correctTrials: z.number().int().min(0).max(10),
  }),
  z.object({
    mode: z.literal('SEQUENCE_MEMORY'),
    phase: z.enum(['EXAMPLE', 'RESPONSE', 'FEEDBACK']),
    activeItem: z.enum(['RED', 'GREEN', 'BLUE', 'YELLOW']).nullable(),
    activeIndex: z.number().int().min(0).max(5).nullable(),
    cueId: z.string().regex(/^\d+:[0-5]$/).nullable(),
    sequenceLength: z.number().int().min(1),
    responseIndex: z.number().int().nonnegative(),
    remainingAttempts: z.number().int().min(0).max(3),
    errorIndex: z.number().int().min(0).max(5).nullable(),
    feedback: z.enum(['CORRECT', 'REPEAT', 'ONE_BUTTON']).nullable(),
  }),
]);
const ServerBaseSchema = z.object({
  protocolVersion: z.literal(1),
  sequence: z.number().int().nonnegative(),
});
export const AppServerMessageSchema = z.discriminatedUnion('type', [
  ServerBaseSchema.extend({
    type: z.literal('setup.snapshot'),
    setupId: UuidSchema,
    payload: SetupVisualSchema,
  }),
  ServerBaseSchema.extend({
    type: z.literal('session.snapshot'),
    sessionId: UuidSchema,
    payload: z.object({
      status: SessionStatusSchema,
      mode: GameModeSchema,
      displayName: DisplayNameSchema,
      countdown: z.number().int().min(0).max(3).nullable(),
      visual: SessionVisualSchema.nullable(),
      result: GameResultDtoSchema.nullable(),
      message: z.string(),
    }),
  }),
  ServerBaseSchema.extend({
    type: z.literal('app.error'),
    payload: z.object({ code: z.string(), message: z.string() }),
  }),
]);
export type AppServerMessage = z.infer<typeof AppServerMessageSchema>;
