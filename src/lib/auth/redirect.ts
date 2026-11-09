export function friendlyAuthError(message: string): string {
  const text = message.toLowerCase();
  if (text.includes("invalid login credentials"))
    return "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
  if (text.includes("email not confirmed"))
    return "يرجى تأكيد البريد الإلكتروني أولاً من الرسالة التي وصلتك.";
  if (text.includes("user already registered"))
    return "هذا البريد الإلكتروني مسجل بالفعل. جرّب تسجيل الدخول.";
  if (text.includes("password should be at least"))
    return "كلمة المرور يجب أن تكون 6 أحرف على الأقل.";
  if (text.includes("unable to validate email")) return "صيغة البريد الإلكتروني غير صحيحة.";
  if (text.includes("rate limit"))
    return "محاولات كثيرة في وقت قصير. انتظر قليلاً ثم حاول مرة أخرى.";
  if (text.includes("supabase غير")) return message;
  return message || "حدث خطأ غير متوقع. حاول مرة أخرى.";
}

export function safeRedirectPath(value: string | undefined): string {
  if (!value) return "/";
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/";
  return value;
}
