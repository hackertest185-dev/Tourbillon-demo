import type { Metadata } from 'next';
import CinematicExperience from '@/components/cinematic/CinematicExperience';

export const metadata: Metadata = {
  title: "Tourbillon — كل ساعة وراها حكاية",
  description: "اكتشف عالم الساعات الفخمة مع Tourbillon.",
};

export default function HomePage() {
  return <CinematicExperience />;
}
