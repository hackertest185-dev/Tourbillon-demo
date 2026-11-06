import CinematicExperience from '@/components/cinematic/CinematicExperience';

export default function TourbillonPage() {
  return <>
    <link rel="preload" as="image" href="/tourbillon-video-poster-mobile.webp" media="(max-width: 767px)" />
    <link rel="preload" as="image" href="/tourbillon-video-poster-desktop.webp" media="(min-width: 768px)" />
    <CinematicExperience />
  </>;
}
