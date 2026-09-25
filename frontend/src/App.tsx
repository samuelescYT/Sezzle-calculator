import { Calculator } from './components/Calculator'

function App() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-slate-950 p-4 text-slate-100">
      <h1 className="text-xl font-semibold tracking-wide text-slate-300">Calculator</h1>
      <Calculator />
    </main>
  )
}

export default App
