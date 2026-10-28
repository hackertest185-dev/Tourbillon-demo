const countries: Record<string, string> = {
  Egypt: 'مصر', Australia: 'أستراليا', Afghanistan: 'أفغانستان', Albania: 'ألبانيا', Algeria: 'الجزاير',
  'United States': 'أمريكا', 'United Kingdom': 'بريطانيا', France: 'فرنسا', Germany: 'ألمانيا', Italy: 'إيطاليا',
  Spain: 'إسبانيا', Portugal: 'البرتغال', Switzerland: 'سويسرا', Austria: 'النمسا', Belgium: 'بلجيكا',
  Netherlands: 'هولندا', Sweden: 'السويد', Norway: 'النرويج', Denmark: 'الدنمارك', Finland: 'فنلندا',
  Poland: 'بولندا', 'Czech Republic': 'التشيك', Hungary: 'المجر', Romania: 'رومانيا', Greece: 'اليونان',
  Turkey: 'تركيا', Russia: 'روسيا', China: 'الصين', Japan: 'اليابان', 'South Korea': 'كوريا الجنوبية',
  India: 'الهند', Pakistan: 'باكستان', Bangladesh: 'بنجلاديش', 'Hong Kong': 'هونج كونج', Singapore: 'سنغافورة',
  Malaysia: 'ماليزيا', Thailand: 'تايلاند', Indonesia: 'إندونيسيا', Philippines: 'الفلبين', Vietnam: 'فيتنام',
  Taiwan: 'تايوان', 'United Arab Emirates': 'الإمارات', 'Saudi Arabia': 'السعودية', Qatar: 'قطر', Israel: 'إسرائيل',
  'South Africa': 'جنوب أفريقيا', Nigeria: 'نيجيريا', Kenya: 'كينيا', Brazil: 'البرازيل', Argentina: 'الأرجنتين',
  Chile: 'تشيلي', Mexico: 'المكسيك', Colombia: 'كولومبيا', 'New Zealand': 'نيوزيلندا', Ireland: 'أيرلندا',
  Iceland: 'آيسلندا', Luxembourg: 'لوكسمبورج', Monaco: 'موناكو',
};

export const phoneRegionName = (name: string) => countries[name] ?? name;
export const salutationLabel = (value: string) => ({ 'Mr.': 'أستاذ', 'Mrs.': 'أستاذة', 'Ms.': 'أستاذة', 'Dr.': 'دكتور / دكتورة', 'Prof.': 'بروفيسور' }[value] ?? value);
export const timeSlotLabel = (value: string) => value.replace(' AM', ' صباحًا').replace(' PM', ' مساءً');

export const inquiryLabel = (value: string) => ({
  received: 'وصلنا طلبك', pending: 'مستني التأكيد', inreview: 'بنراجع طلبك', confirmed: 'اتأكد',
  completed: 'تم', cancelled: 'اتلغى', rejected: 'متقبلش',
  discovercollections: 'اكتشاف الساعات', valuation: 'تقييم ساعة', purchase: 'شراء ساعة',
}[value.toLowerCase().replace(/[\s_-]/g, '')] ?? 'طلبك قيد المتابعة');
