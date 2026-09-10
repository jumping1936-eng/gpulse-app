import type { SupportedLocale } from '@/i18n/appTranslations';

// Publication information is intentionally unset until it has been verified for release.
// The runtime UI must use legalPublicationValue rather than displaying identifiers.
export const LEGAL_OPERATOR_NAME = '';
export const LEGAL_OPERATOR_ADDRESS = '';
export const LEGAL_SUPPORT_EMAIL = '';
export const LEGAL_PRIVACY_EMAIL = '';
export const LEGAL_EFFECTIVE_DATE = '';
export const LEGAL_ACCOUNT_DELETION_URL = '';

type LegalPublicationField =
  | 'operatorName'
  | 'operatorAddress'
  | 'supportEmail'
  | 'privacyEmail'
  | 'effectiveDate'
  | 'accountDeletionUrl';

const publicationValues: Record<LegalPublicationField, string> = {
  operatorName: LEGAL_OPERATOR_NAME,
  operatorAddress: LEGAL_OPERATOR_ADDRESS,
  supportEmail: LEGAL_SUPPORT_EMAIL,
  privacyEmail: LEGAL_PRIVACY_EMAIL,
  effectiveDate: LEGAL_EFFECTIVE_DATE,
  accountDeletionUrl: LEGAL_ACCOUNT_DELETION_URL,
};

export function legalPublicationValue(field: LegalPublicationField, locale: SupportedLocale): string {
  const value = publicationValues[field].trim();
  if (value) return value;
  return locale === 'zh-TW' ? '正式上線前提供' : 'To be provided before official launch';
}
