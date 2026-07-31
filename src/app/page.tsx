import styles from './page.module.css';
import LandingClient from './LandingClient';


export default function Home() {
  return (
    <div className={styles.landing}>
      {/* Animated background orbs */}
      <div className={styles.backgroundOrbs} aria-hidden="true">
        <div className={styles.gradientOrb} />
        <div className={styles.gradientOrb} />
        <div className={styles.gradientOrb} />
        <div className={styles.gradientOrb} />
        <div className={styles.gradientOrb} />
      </div>

      {/* Noise texture overlay */}
      <div className={styles.noiseOverlay} aria-hidden="true" />

      {/* Hero */}
      <section className={styles.hero}>
        <img src="/logo.png" alt="BuzzyReader" className={styles.beeIcon} width={80} height={80} />
        <h1 className={styles.title} style={{ display: 'none' }}>BuzzyReader</h1>
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
