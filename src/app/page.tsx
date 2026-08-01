import styles from './page.module.css';
import LandingClient from './LandingClient';


import LightRays from '@/components/Backgrounds/LightRays/LightRays';

export default function Home() {
  return (
    <div className={styles.landing}>
      {/* LightRays background */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, overflow: 'hidden' }}>
        <LightRays
          raysOrigin="top-center"
          raysColor="#f59e0b" // amber-500
          raysSpeed={1.5}
          pulsating={true}
          lightSpread={1.5}
        />
      </div>
      {/* Noise texture overlay */}
      <div className={styles.noiseOverlay} aria-hidden="true" />

      {/* Hero */}
      <section className={styles.hero}>
        <h1 className={styles.title}>BuzzyReader</h1>
        <img src="/logo.png" alt="BuzzyReader" className={styles.beeIcon} width={80} height={80} />
        <p className={styles.tagline}>Your books. Everywhere.</p>
        <p className={styles.description}>
          A premium ePub reader that syncs across all your devices.
          Powered by your Google Drive.
        </p>
        <LandingClient />
      </section>



      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.legalLinks}>
          <a href="/privacy" className={styles.legalLink}>Privacy Policy</a>
          <span className={styles.legalDivider}>•</span>
          <a href="/terms" className={styles.legalLink}>Terms of Service</a>
        </div>
      </footer>
    </div>
  );
}
