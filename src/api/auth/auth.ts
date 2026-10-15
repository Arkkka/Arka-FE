import { z } from 'zod';
import {
  AuthCapabilitiesDtoSchema,
  ChangePasswordRequestSchema,
  EmailRegistrationRequestSchema,
  EmailVerificationRequestSchema,
  InstitutionOnboardingRequestSchema,
  InstitutionOnboardingStatusSchema,
  MeDtoSchema,
  SocialSignInResponseSchema,
  UpdateProfileRequestSchema,
  type AuthCapabilitiesDto,
  type ChangePasswordRequest,
  type EmailRegistrationRequest,
  type EmailVerificationRequest,
  type InstitutionOnboardingRequest,
  type InstitutionOnboardingStatus,
  type MeDto,
  type UpdateProfileRequest,
} from '@/schemas';
import {
  apiGet,
  apiPatch,
  apiPost,
  apiPostPublic,
  apiPostWithoutResponse,
  ApiError,
  requestBody,
} from '@/config';
import { API_ENDPOINTS, ROUTES } from '@/constants';

export function getCurrentUser(): Promise<MeDto> {
  return apiGet(API_ENDPOINTS.auth.me, MeDtoSchema);
}

export function getAuthCapabilities(): Promise<AuthCapabilitiesDto> {
  return apiGet(API_ENDPOINTS.auth.capabilities, AuthCapabilitiesDtoSchema, { cache: 'no-store' });
}

export async function signUp(input: EmailRegistrationRequest): Promise<void> {
  const body = requestBody(EmailRegistrationRequestSchema, input);
  try {
    await apiPostWithoutResponse(API_ENDPOINTS.auth.signUp, body);
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.code === 'USER_ALREADY_EXISTS' ||
        error.code === 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL')
    ) {
      throw new ApiError(
        409,
        'EMAIL_ALREADY_REGISTERED',
        'Email ini sudah terdaftar. Silakan masuk.',
      );
    }
    if (error instanceof ApiError && error.status === 429) {
      throw new ApiError(
        429,
        error.code,
        'Terlalu banyak percobaan pendaftaran. Tunggu sebentar lalu coba lagi.',
      );
    }
    if (error instanceof ApiError && error.code === 'FAILED_TO_CREATE_USER') {
      throw new ApiError(
        error.status,
        error.code,
        'Akun belum dapat dibuat. Coba lagi atau gunakan email lain.',
      );
    }
    if (error instanceof ApiError && error.status >= 500) {
      throw new ApiError(
        error.status,
        error.code,
        'Layanan pendaftaran sedang tidak tersedia. Coba lagi nanti.',
      );
    }
    if (error instanceof TypeError) {
      throw new ApiError(
        0,
        'NETWORK_ERROR',
        'Layanan pendaftaran tidak dapat dihubungi. Periksa koneksi lalu coba lagi.',
      );
    }
    throw error;
  }
}

export async function verifyRegistrationEmail(input: EmailVerificationRequest): Promise<void> {
  const body = requestBody(EmailVerificationRequestSchema, input);
  try {
    await apiPostWithoutResponse(API_ENDPOINTS.auth.verifyEmailOtp, body);
  } catch (error) {
    if (error instanceof ApiError && error.code === 'INVALID_OTP') {
      throw new ApiError(error.status, error.code, 'Kode verifikasi tidak sesuai.');
    }
    if (error instanceof ApiError && error.code === 'OTP_EXPIRED') {
      throw new ApiError(error.status, error.code, 'Kode verifikasi sudah kedaluwarsa. Kirim kode baru.');
    }
    if (error instanceof ApiError && error.code === 'TOO_MANY_ATTEMPTS') {
      throw new ApiError(error.status, error.code, 'Terlalu banyak percobaan. Kirim kode baru.');
    }
    throw error;
  }
}

export async function resendRegistrationOtp(email: string): Promise<void> {
  await apiPostWithoutResponse(API_ENDPOINTS.auth.sendVerificationOtp, {
    email: z.string().trim().email().max(254).parse(email),
    type: 'email-verification',
  });
}

export async function beginGoogleSignIn(intent: 'login' | 'register'): Promise<string> {
  const onboardingUrl = new URL(ROUTES.onboarding, window.location.origin).toString();
  const errorUrl = new URL(intent === 'login' ? ROUTES.login : ROUTES.register, window.location.origin);
  errorUrl.searchParams.set('oauthError', '1');
  const response = await apiPostPublic(
    API_ENDPOINTS.auth.socialSignIn,
    {
      provider: 'google',
      callbackURL: onboardingUrl,
      errorCallbackURL: errorUrl.toString(),
      ...(intent === 'register'
        ? { requestSignUp: true, newUserCallbackURL: onboardingUrl }
        : {}),
    },
    SocialSignInResponseSchema,
  );
  if (!response.redirect || !response.url) {
    throw new ApiError(502, 'OAUTH_REDIRECT_MISSING', 'Google belum dapat dihubungkan. Coba lagi.');
  }
  return response.url;
}

export function getInstitutionOnboarding(): Promise<InstitutionOnboardingStatus> {
  return apiGet(API_ENDPOINTS.auth.onboarding, InstitutionOnboardingStatusSchema, { cache: 'no-store' });
}

export function completeInstitutionOnboarding(
  input: InstitutionOnboardingRequest,
  csrfToken: string,
): Promise<InstitutionOnboardingStatus> {
  const body = requestBody(InstitutionOnboardingRequestSchema, input);
  return apiPost(
    API_ENDPOINTS.auth.onboarding,
    body,
    InstitutionOnboardingStatusSchema,
    csrfToken,
  );
}

export async function signIn(email: string, password: string): Promise<void> {
  try {
    await apiPostWithoutResponse(API_ENDPOINTS.auth.signIn, { email, password });
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.status === 401 ||
        error.code === 'INVALID_CREDENTIALS' ||
        error.code === 'INVALID_EMAIL_OR_PASSWORD')
    ) {
      throw new ApiError(error.status, 'SIGN_IN_FAILED', 'Email atau kata sandi tidak sesuai.');
    }
    if (error instanceof ApiError && error.status === 403) {
      throw new ApiError(
        403,
        error.code,
        'Akses masuk ditolak. Muat ulang halaman lalu coba lagi.',
      );
    }
    if (error instanceof ApiError && error.status === 429) {
      throw new ApiError(
        429,
        error.code,
        'Terlalu banyak percobaan masuk. Tunggu sebentar lalu coba lagi.',
      );
    }
    if (error instanceof ApiError && error.status >= 500) {
      throw new ApiError(
        error.status,
        error.code,
        'Layanan masuk sedang tidak tersedia. Coba lagi nanti.',
      );
    }
    if (error instanceof TypeError) {
      throw new ApiError(
        0,
        'NETWORK_ERROR',
        'Layanan masuk tidak dapat dihubungi. Periksa koneksi lalu coba lagi.',
      );
    }
    throw error;
  }
}

export async function updateProfile(
  input: UpdateProfileRequest,
  csrfToken: string,
): Promise<void> {
  const body = requestBody(UpdateProfileRequestSchema, input);
  await apiPatch(API_ENDPOINTS.auth.profile, body, z.null(), csrfToken);
}

export async function changePassword(input: ChangePasswordRequest): Promise<void> {
  const parsed = requestBody(ChangePasswordRequestSchema, input);
  try {
    await apiPostWithoutResponse(API_ENDPOINTS.auth.changePassword, {
      currentPassword: parsed.currentPassword,
      newPassword: parsed.newPassword,
      revokeOtherSessions: true,
    });
  } catch (error) {
    if (error instanceof ApiError && error.code === 'INVALID_PASSWORD') {
      throw new ApiError(error.status, error.code, 'Kata sandi saat ini tidak sesuai.');
    }
    if (error instanceof ApiError && error.code === 'CREDENTIAL_ACCOUNT_NOT_FOUND') {
      throw new ApiError(
        error.status,
        error.code,
        'Akun ini masuk melalui Google dan belum memiliki kata sandi.',
      );
    }
    throw error;
  }
}

export async function signOut(me: MeDto): Promise<void> {
  try {
    await apiPostWithoutResponse(
      API_ENDPOINTS.auth.signOut,
      {},
      {
        'X-CSRF-Token': me.csrfToken,
      },
    );
  } catch (error) {
    if (error instanceof ApiError) {
      throw new ApiError(
        error.status,
        'SIGN_OUT_FAILED',
        'Tidak dapat keluar dengan aman. Coba lagi.',
      );
    }
    throw error;
  }
}
