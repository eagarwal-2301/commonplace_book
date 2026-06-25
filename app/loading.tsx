export default function Loading() {
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#2a1a0a',
      }}
    >
      <div
        style={{
          width: 340,
          height: 480,
          background: '#fdfaf2',
          borderRadius: 3,
          opacity: 0.3,
          boxShadow: '4px 4px 24px rgba(0,0,0,0.6)',
        }}
      />
    </div>
  )
}
