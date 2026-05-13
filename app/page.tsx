import { readdir } from "fs/promises";
import { join } from "path";
import { LeroyMemories } from "./components/LeroyMemories";

async function getHeroCarouselUrls(): Promise<string[]> {
  const urls: string[] = ["/leroy-hero.jpeg"];
  const dir = join(process.cwd(), "public", "hero-carousel");
  let names: string[] = [];
  try {
    names = (await readdir(dir))
      .filter(
        (n) =>
          /\.(jpe?g|png|gif|webp)$/i.test(n) &&
          !n.startsWith("."),
      )
      .sort();
  } catch {
    /* optional folder */
  }
  for (const n of names) {
    urls.push(`/hero-carousel/${n}`);
  }
  return urls;
}

export default async function Home() {
  const heroCarouselUrls = await getHeroCarouselUrls();
  return <LeroyMemories heroCarouselUrls={heroCarouselUrls} />;
}
