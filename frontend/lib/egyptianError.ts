// API messages are not interface copy. Translate known failures and keep a
// contextual Egyptian fallback for unknown server errors.
const messages: Record<string, string> = {
  'Invalid email or password.': 'الإيميل أو الباسورد مش مظبوط.',
  'Invalid authenticator code.': 'كود تطبيق التحقق مش مظبوط.',
  'Invalid or expired code.': 'الكود غلط أو صلاحيته خلصت. اطلب كود جديد.',
  'Invalid or expired OTP.': 'الكود غلط أو صلاحيته خلصت. اطلب كود جديد.',
  'Incorrect password.': 'الباسورد الحالي مش مظبوط.',
  'Current password is incorrect.': 'الباسورد الحالي مش مظبوط.',
  'Password must be at least 12 characters.': 'الباسورد لازم يكون 12 حرف على الأقل.',
  'New password must be different from current password.': 'اختار باسورد مختلف عن الباسورد الحالي.',
  'Too many requests. Please try again later.': 'حاولت كذا مرة بسرعة. استنى شوية وجرّب تاني.',
  'Not authenticated': 'سجّل دخولك الأول عشان تكمّل.',
  'CSRF validation failed.': 'الجلسة محتاجة تتحدّث. حدّث الصفحة وجرّب تاني.',
};

export function egyptianError(error: unknown, fallback = 'حصلت مشكلة. جرّب تاني بعد شوية.'): string {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  return messages[message] ?? (/^[\s\d\p{P}]*[\u0600-\u06ff]/u.test(message) && !/[A-Za-z]{2}/.test(message) ? message : fallback);
}
