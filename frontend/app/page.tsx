import type { Metadata } from 'next';
import CinematicExperience from '@/components/cinematic/CinematicExperience';

export const metadata: Metadata = {
  title: 'Tourbillon — The art of keeping time',
  description: 'Explore the world of fine watchmaking through Tourbillon.',
};

export default function HomePage() {
  return <CinematicExperience />;
}
