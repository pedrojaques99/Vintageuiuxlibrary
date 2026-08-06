import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
    },
  },

  /*
   * Porta fixa, e fora da 5173.
   *
   * A 5173 é o padrão do Vite, então ela é de quem chegar primeiro — e é a porta
   * declarada do jaques-os no ports.json. Com esta vitrine de pé, o supervisor do
   * Jaques Studio encontrava a 5173 ocupada, ADOTAVA o processo achando que era a
   * interface dele, e a janela do Studio abria mostrando esta library.
   *
   * strictPort porque cair pra 5183 em silêncio traria o problema de volta pela
   * porta dos fundos: o endereço que você tem aberto deixaria de ser este app.
   */
  server: { port: 5182, strictPort: true },
  preview: { port: 5182, strictPort: true },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],

  build: {
    rollupOptions: {
      output: {
        /*
         * Vendor separado do nosso código.
         *
         * Era um arquivo só de 620KB: qualquer ajuste de texto na vitrine
         * invalidava o cache do React e do framer-motion junto. Separando, o
         * visitante que volta baixa só o que mudou, e o primeiro carregamento
         * pega os pedaços em paralelo em vez de um bloco serial.
         *
         * O corte é por peso e por ritmo de mudança — não por gosto: react quase
         * nunca muda, motion e dnd mudam de vez em quando, a vitrine muda toda
         * semana.
         */
        /*
         * `@dnd-kit` NÃO entra aqui de propósito.
         *
         * Nomeá-lo num chunk manual o promove a dependência do grafo inicial, e
         * o Vite passa a pré-carregá-lo no `index.html` — desfazendo o lazy da
         * demo do kanban, que é justamente quem o usa. Deixando o Rollup decidir,
         * ele cai dentro do chunk da demo e só é buscado quando o card aparece.
         */
        manualChunks: {
          react: ['react', 'react-dom'],
          motion: ['framer-motion'],
        },
      },
    },
  },
})
