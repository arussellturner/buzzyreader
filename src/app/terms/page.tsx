import Link from 'next/link';
import styles from '../privacy/privacy.module.css'; // Reusing privacy styles

export default function TermsOfService() {
  return (
    <div className={styles.container}>
      <main className={styles.content}>
        <h1 className={styles.title}>Terms of Service</h1>
        <p className={styles.lastUpdated}>Last Updated: {new Date().toLocaleDateString()}</p>

        <section className={styles.section}>
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using BuzzyReader ("the Service"), you agree to be bound by these Terms of Service. If you disagree with any part of the terms, then you may not access the Service.
          </p>
        </section>

        <section className={styles.section}>
          <h2>2. Description of Service</h2>
          <p>
            BuzzyReader is a web-based e-reader application that allows users to upload, read, and sync EPUB files across devices. The Service operates purely as a client-side interface connecting to your personal Google Drive account.
          </p>
        </section>

        <section className={styles.section}>
          <h2>3. User Data and Content Ownership</h2>
          <p>
            You retain all rights and ownership to the EPUB files, notes, and highlights you upload or create using the Service. All user data is stored exclusively in your personal Google Drive account within a hidden "App Data" folder.
          </p>
          <p>
            <strong>By uploading or storing files via the Service, you represent and warrant that:</strong>
          </p>
          <ul>
            <li>You own the data or have the necessary rights, licenses, consents, and permissions to use and authorize the Service to use such data.</li>
            <li>The data does not violate the privacy rights, publicity rights, copyrights, contract rights, or any other rights of any person or entity.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>4. Limitation of Liability</h2>
          <p>
            In no event shall BuzzyReader, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from:
          </p>
          <ul>
            <li>Your access to or use of or inability to access or use the Service;</li>
            <li>Any conduct or content of any third party on the Service;</li>
            <li>Any content obtained from the Service; and</li>
            <li>Unauthorized access, use or alteration of your transmissions or content.</li>
          </ul>
          <p>
            We assume zero liability for copyright infringement or data loss related to the files you upload or interact with using the Service.
          </p>
        </section>

        <section className={styles.section}>
          <h2>5. "As Is" and "As Available" Disclaimer</h2>
          <p>
            The Service is provided on an "AS IS" and "AS AVAILABLE" basis. The Service is provided without warranties of any kind, whether express or implied, including, but not limited to, implied warranties of merchantability, fitness for a particular purpose, non-infringement, or course of performance.
          </p>
        </section>

        <section className={styles.section}>
          <h2>6. Changes to Terms</h2>
          <p>
            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will provide notice of any changes by updating the "Last Updated" date at the top of these Terms.
          </p>
        </section>

        <div className={styles.footer}>
          <Link href="/" className={styles.backLink}>← Back to Home</Link>
        </div>
      </main>
    </div>
  );
}
