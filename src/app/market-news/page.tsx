import { fetchNews } from "@/lib/newsApi";
import { MarketNewsClient } from "./MarketNewsClient";

export default async function MarketNewsPage() {
  const data = await fetchNews();
  return <MarketNewsClient initialData={data} />;
}
