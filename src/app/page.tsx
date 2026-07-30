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
        <span className={styles.beeIcon} role="img" aria-label="Bee">
          🐝
        </span>
        <h1 className={styles.title}>BuzzyReader</h1>
        <p className={styles.tagline}>Your Books. Everywhere.</p>
        <p className={styles.description}>
          A premium ePub reader that syncs across all your devices.
          Powered by your Google Drive.
        </p>
        <LandingClient />
      </section>



      {/* Footer */}
      <footer className={styles.footer}>
        <p className={styles.footerText}>
          Made with <span className={styles.footerHeart}>♥</span> for book lovers everywhere
        </p>
      </footer>
    </div>
  );
}
