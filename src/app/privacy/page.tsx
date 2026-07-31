import Link from 'next/link';
import styles from './privacy.module.css';

export default function PrivacyPolicy() {
  return (
    <div className={styles.container}>
      <main className={styles.content}>
        <h1 className={styles.title}>Privacy Policy</h1>
        <p className={styles.lastUpdated}>Last Updated: {new Date().toLocaleDateString()}</p>

        <section className={styles.section}>
          <h2>1. Introduction</h2>
          <p>
            Welcome to BuzzyReader ("we," "our," or "us"). We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our application.
          </p>
        </section>

        <section className={styles.section}>
          <h2>2. Information We Collect</h2>
          <p>
            When you sign in using your Google Account, we receive the following basic profile information provided by Google:
          </p>
          <ul>
            <li>Your email address</li>
            <li>Your name</li>
            <li>Your profile picture</li>
          </ul>
          <p>
            This information is used strictly to authenticate you and display your profile within the app.
          </p>
        </section>

        <section className={styles.section}>
          <h2>3. How Your Data is Stored</h2>
          <p>
            BuzzyReader operates completely on top of your personal Google Drive. 
          </p>
          <ul>
            <li><strong>Books and Reading Data:</strong> Any EPUB files you upload, along with your reading progress, highlights, and notes, are stored directly in a hidden "App Data" folder within your personal Google Drive.</li>
            <li><strong>Zero Developer Access:</strong> We (the developers of BuzzyReader) do not have access to read, view, or modify your books, highlights, or reading data. The data flows directly between your device and your Google Drive.</li>
            <li><strong>No Central Database:</strong> We do not store your reading history, books, or personal information on any central servers.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>4. Permissions and API Usage</h2>
          <p>
            BuzzyReader requests the <code>https://www.googleapis.com/auth/drive.appdata</code> scope to read and write files strictly within the isolated application data folder created for this app in your Google Drive. We also request basic profile scopes to enable login.
          </p>
          <p>
            BuzzyReader's use and transfer to any other app of information received from Google APIs will adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">Google API Services User Data Policy</a>, including the Limited Use requirements.
          </p>
        </section>

        <section className={styles.section}>
          <h2>5. Data Deletion</h2>
          <p>
            Because your data is stored in your personal Google Drive, you have full control over it. You can delete your data at any time by revoking BuzzyReader's access to your Google account in your Google Security settings, which will automatically clear the hidden app data folder.
          </p>
        </section>

        <section className={styles.section}>
          <h2>6. Contact Us</h2>
          <p>
            If you have any questions or concerns about this Privacy Policy, please contact us at arussellturner@gmail.com.
          </p>
        </section>

        <div className={styles.footer}>
          <Link href="/" className={styles.backLink}>← Back to Home</Link>
        </div>
      </main>
    </div>
  );
}
