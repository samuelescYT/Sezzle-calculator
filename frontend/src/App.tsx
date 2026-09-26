import { BrandGlow } from './components/BrandGlow'
import { Calculator } from './components/Calculator'

function App() {
  return (
    <main className="relative isolate flex min-h-dvh items-center justify-center bg-sezzle-night text-white sm:p-4">
      <BrandGlow />
      <Calculator />
    </main>
  )
}

export default App
