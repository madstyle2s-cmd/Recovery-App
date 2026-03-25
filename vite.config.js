import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // This tells Vite your files are in the root, not a src folder
  root: './', 
})
