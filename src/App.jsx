import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config } from './config/wagmi'
import GamePanel from './components/GamePanel'
import './App.css'

const queryClient = new QueryClient()

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-950">
          <div className="container mx-auto px-4 py-8">
            <header className="text-center mb-12">
              <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
                Rock Paper Scissors
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Play Rock Paper Scissors with fully encrypted moves using Fully Homomorphic Encryption (FHE)
              </p>
            </header>
            <GamePanel />
          </div>
        </div>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default App

