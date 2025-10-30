export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <main className="flex flex-col items-center justify-center px-4 py-16 text-center">
        <div className="mb-8 rounded-3xl bg-white/80 p-12 shadow-xl backdrop-blur-sm dark:bg-gray-800/80 md:p-16">
          <h1 className="mb-4 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 bg-clip-text text-6xl font-bold text-transparent md:text-8xl">
            Moneta
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 md:text-2xl">
            Your modern Next.js application
          </p>
        </div>
        <div className="space-y-4 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 md:text-base">
            Built with Next.js 16, React 19, TypeScript, and Tailwind CSS
          </p>
        </div>
      </main>
    </div>
  );
}
