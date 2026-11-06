import BassfitClientApp from "@/components/BassfitClientApp";
import { getHeadlessProducts } from "@/lib/woocommerce";

// Revalidación incremental en segundo plano (ISR cada 120 segundos)
export const revalidate = 120;

export default async function HomePage() {
  const products = await getHeadlessProducts();
  return <BassfitClientApp initialProducts={products} />;
}
