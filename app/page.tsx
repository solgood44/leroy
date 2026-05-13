import { HERO_CAROUSEL_FILES } from "@/lib/heroCarouselManifest.generated";
import { LeroyMemories } from "./components/LeroyMemories";

function getHeroCarouselUrls(): string[] {
  return [
    "/leroy-hero.jpeg",
    ...HERO_CAROUSEL_FILES.map((n) => `/hero-carousel/${n}`),
  ];
}

export default function Home() {
  const heroCarouselUrls = getHeroCarouselUrls();
  return <LeroyMemories heroCarouselUrls={heroCarouselUrls} />;
}
