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
