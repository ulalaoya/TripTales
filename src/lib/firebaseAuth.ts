/**
 * Firebase Phone OTP — WIRED BUT STUBBED (R1).
 *
 * The prototype trusts the typed number and does not send a real SMS. In production
 * this module is replaced by a real Firebase Auth Phone flow.
 *
 * TODO(production): wire real Firebase Auth Phone OTP.
 *   import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth'
 *   const auth = getAuth(app)
 *   const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' })
 *   const confirmation = await signInWithPhoneNumber(auth, '+972' + phone.slice(1), verifier)
 *   await confirmation.confirm(code)
 */

export interface OtpConfirmation {
  /** In production: verifies the 6-digit SMS code. Stub always resolves true. */
  confirm(code: string): Promise<boolean>
}

/** Stub: pretends to send an OTP. Returns a confirmation whose `confirm` is a no-op. */
export async function sendOtpStub(phone: string): Promise<OtpConfirmation> {
  // TODO(production): replace with signInWithPhoneNumber(...).
  void phone
  return {
    async confirm(_code: string) {
      void _code
      return true
    },
  }
}
