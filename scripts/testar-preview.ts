/**
 * Testa a extração com links reais e mostra o que funcionou e o que cai no plano B.
 * Uso: npm run preview:testar -- <url> [<url> ...]
 * Rode numa máquina com acesso às lojas (seu computador ou depois do deploy).
 */
import { ExtractionError, extractProduct } from "../src/lib/extraction";

const urls = process.argv.slice(2);
if (urls.length === 0) {
  console.error("Informe pelo menos um link de produto.");
  process.exit(1);
}

async function main() {
  for (const url of urls) {
    const inicio = Date.now();
    try {
      const p = await extractProduct(url);
      const ms = Date.now() - inicio;
      const completo = Boolean(p.titulo && p.preco !== null && p.imagens.length);
      console.log(`\n${completo ? "✅ FUNCIONOU" : "⚠️  PARCIAL"}  ${p.loja}  (${ms} ms)`);
      console.log(`   título:  ${p.titulo ?? "—"}`);
      console.log(`   preço:   ${p.preco ?? "—"}`);
      console.log(`   imagens: ${p.imagens.length}${p.imagens[0] ? `  (${p.imagens[0]})` : ""}`);
    } catch (e) {
      const codigo = e instanceof ExtractionError ? e.codigo + (e.status ? ` HTTP ${e.status}` : "") : String(e);
      console.log(`\n❌ PLANO B  ${new URL(url).hostname}  →  ${codigo}`);
    }
}
}

void main();
