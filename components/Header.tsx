import Image from 'next/image'

export default function Header({ children }: { children?: React.ReactNode }) {
  return (
    <header className="flex items-center justify-between px-8 py-4 bg-white/60 backdrop-blur-md shadow-sm">
      <div className="flex items-center gap-3">
        <Image
          src="/logo.jpeg"
          alt="Spotty Zebras logo"
          width={44}
          height={44}
          className="rounded-full object-cover"
        />
        <span className="text-2xl font-bold text-slate-900">Spotty Zebras</span>
      </div>
      {children}
    </header>
  )
}
