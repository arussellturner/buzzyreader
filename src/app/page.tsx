import styles from './page.module.css';
import LandingClient from './LandingClient';

const features = [
  {
    icon: '📱',
    title: 'Cross-Device Sync',
    description:
      'Pick up exactly where you left off. Your reading position, bookmarks, and highlights sync seamlessly across every device.',
  },
  {
    icon: '🎨',
    title: 'Beautiful Reading',
    description:
      'A distraction-free reading experience with customizable fonts, themes, and spacing designed for hours of comfortable reading.',
  },
  {
    icon: '🔖',
    title: 'Smart Highlights',
    description:
      'Highlight passages, add notes, and organize your thoughts. Everything is searchable and synced to your Drive.',
  },
  {
    icon: '🔊',
    title: 'Read to Me',
    description:
      'Built-in text-to-speech with natural voices. Listen to your books while cooking, exercising, or on the go.',
  },
  {
    icon: '🔒',
    title: 'Your Data, Your Drive',
    description:
      'Your books live in your own Google Drive. No third-party servers, no tracking. You stay in complete control.',
  },
  {
    icon: '⚡',
    title: 'Lightning Fast',
    description:
      'Built with modern web technology for instant page turns, smooth scrolling, and a snappy interface that never keeps you waiting.',
  },
] as const;

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

      {/* Divider */}
      <div className={styles.divider} aria-hidden="true" />

      {/* Features */}
      <section className={styles.featuresSection}>
        <p className={styles.featuresLabel}>Why BuzzyReader?</p>
        <div className={styles.features}>
          {features.map((feature) => (
            <article key={feature.title} className={styles.featureCard}>
              <span className={styles.featureIcon} role="img" aria-label={feature.title}>
                {feature.icon}
              </span>
              <h3 className={styles.featureTitle}>{feature.title}</h3>
              <p className={styles.featureDescription}>{feature.description}</p>
            </article>
          ))}
        </div>
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
