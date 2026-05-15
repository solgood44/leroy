import { HERO_CAROUSEL_URLS } from "@/lib/heroCarouselManifest.generated";
import { LeroyMemories } from "./components/LeroyMemories";

export default function Home() {
  return <LeroyMemories heroCarouselUrls={[...HERO_CAROUSEL_URLS]} />;
}
